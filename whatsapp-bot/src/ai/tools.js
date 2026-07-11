import { getSupabase, createBookingRecords, getShipmentByTracking } from '../services/database.js';
import { getCityToRouteMap } from '../menus/mainMenu.js';
import { updateUserSession, getUserSession, enableHumanTakeover } from '../services/userSession.js';
import {
  getBotSettings,
  calculatePricing,
  getDrumPrice,
  getTrunkPrice,
  getMetalSealPrice,
  formatMoney,
} from '../utils/pricingUtils.js';
import { getCatalogueText } from './catalogue.js';
import { notifyRepresentative } from '../services/representativeAlerts.js';

// ── helpers ────────────────────────────────────────────────────────
async function lookupPickupDate(route) {
  const supabase = getSupabase();
  if (!supabase || !route) return null;
  try {
    const { data } = await supabase
      .from('collection_schedules')
      .select('pickup_date')
      .eq('country', 'Ireland')
      .ilike('route', `%${route}%`)
      .limit(1);
    const date = data?.[0]?.pickup_date;
    if (date && date !== 'Not set' && date !== 'To be confirmed' && date.trim() !== '') return date;
  } catch (err) {
    console.warn('Pickup date lookup failed:', err?.message || err);
  }
  return null;
}

// ── OpenAI tool schemas (what the model sees) ──────────────────────
export const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'get_pricing',
      description: 'Get current Ireland shipping prices and what is included. Call this for any general price question.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'quote_shipment',
      description: 'Calculate the exact total for a specific combination of drums, trunks, seals and payment method.',
      parameters: {
        type: 'object',
        properties: {
          drums: { type: 'integer', description: 'Number of drums (0 if none)' },
          trunks: { type: 'integer', description: 'Number of trunks/storage boxes (0 if none)' },
          metalSeal: { type: 'boolean', description: 'Whether metal coded seals are added' },
          paymentMethod: {
            type: 'string',
            enum: ['standard', 'cashOnCollection', 'payOnArrival'],
            description: 'Payment option; payOnArrival adds a 20% premium',
          },
        },
        required: ['drums', 'trunks'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_city',
      description: 'Check whether we collect from a given Irish town/city, and find its collection route and next collection date.',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string', description: 'Irish town or city name' } },
        required: ['city'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_collection_areas',
      description: 'List the collection routes across Ireland and their next collection dates.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'track_shipment',
      description: 'Look up a shipment by its tracking number (format ZS-XXXXXXXX) and return its current status.',
      parameters: {
        type: 'object',
        properties: { trackingNumber: { type: 'string', description: 'Tracking number, e.g. ZS-ABC12345' } },
        required: ['trackingNumber'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Create a confirmed booking once ALL sender, receiver and item details are gathered and the customer has agreed. Returns the tracking number.',
      parameters: {
        type: 'object',
        properties: {
          senderFirstName: { type: 'string' },
          senderLastName: { type: 'string' },
          senderEmail: { type: 'string' },
          senderPhone: { type: 'string' },
          senderPhone2: { type: 'string', description: 'Optional second phone' },
          senderAddress: { type: 'string', description: 'Full pickup address in Ireland' },
          senderCity: { type: 'string', description: 'Irish town/city' },
          receiverName: { type: 'string' },
          receiverPhone: { type: 'string' },
          receiverPhone2: { type: 'string', description: 'Optional second phone' },
          receiverAddress: { type: 'string', description: 'Delivery address in Zimbabwe' },
          receiverCity: { type: 'string', description: 'City/town in Zimbabwe' },
          drumQuantity: { type: 'integer', description: 'Number of drums (0 if none)' },
          drumsDescription: { type: 'string', description: 'What the drums look like' },
          trunkQuantity: { type: 'integer', description: 'Number of trunks/boxes (0 if none)' },
          trunksDescription: { type: 'string', description: 'What the trunks look like' },
          otherItemsDescription: { type: 'string', description: 'Description of other items needing a custom quote, if any' },
          wantMetalSeal: { type: 'boolean' },
          paymentMethod: {
            type: 'string',
            enum: ['standard', 'cashOnCollection', 'payOnArrival', 'agentQuote'],
          },
        },
        required: [
          'senderFirstName', 'senderLastName', 'senderPhone', 'senderAddress', 'senderCity',
          'receiverName', 'receiverPhone', 'receiverAddress', 'receiverCity',
        ],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_catalogue',
      description: "Read the company's product/service catalogue to answer questions about what we offer, items, or prices listed there. Call this whenever the customer asks about the catalogue or a specific product.",
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_human_agent',
      description: 'Hand the conversation to a human agent when the customer asks for a person, is unhappy, or needs something you cannot do.',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string', description: 'Short reason for the handoff' } },
        required: ['reason'],
        additionalProperties: false,
      },
    },
  },
];

// ── tool executor (what actually runs) ─────────────────────────────
export async function executeTool(name, args, ctx) {
  const { phoneNumber, sock } = ctx;
  try {
    switch (name) {
      case 'get_pricing': {
        const s = await getBotSettings();
        return {
          currency: 'EUR',
          drumPerUnit: getDrumPrice(1, s),
          trunkPerUnit: getTrunkPrice(1, s),
          metalSealPerItem: getMetalSealPrice(s),
          otherItems: 'custom quote by the team',
          included: ['free collection across Ireland', 'full tracking', 'professional handling'],
          deliveryTime: '~6 weeks for drums, 10–14 days for parcels',
          paymentOptions: ['standard', 'cashOnCollection', 'payOnArrival (+20%)'],
          collectionsStart: 'August 2026',
        };
      }

      case 'quote_shipment': {
        const s = await getBotSettings();
        const bookingData = {
          includeDrums: (args.drums || 0) > 0,
          drumQuantity: args.drums || 0,
          includeTrunks: (args.trunks || 0) > 0,
          trunkQuantity: args.trunks || 0,
          wantMetalSeal: !!args.metalSeal,
          paymentMethod: args.paymentMethod || 'standard',
        };
        const p = calculatePricing(bookingData, s);
        return {
          breakdown: {
            drums: p.drumQty ? `${p.drumQty} × ${formatMoney(p.drumUnit)} = ${formatMoney(p.drumTotal)}` : null,
            trunks: p.trunkQty ? `${p.trunkQty} × ${formatMoney(p.trunkUnit)} = ${formatMoney(p.trunkTotal)}` : null,
            seals: p.sealQty ? `${p.sealQty} × ${formatMoney(p.sealUnit)} = ${formatMoney(p.sealCost)}` : null,
          },
          subtotal: formatMoney(p.baseTotal),
          payOnArrivalPremium: p.payOnArrivalPremium ? formatMoney(p.payOnArrivalPremium) : null,
          total: formatMoney(p.finalTotal),
        };
      }

      case 'check_city': {
        const key = (args.city || '').trim().toUpperCase();
        const route = getCityToRouteMap()[key];
        if (!route) {
          return { recognized: false, message: `We don't have "${args.city}" on a collection route. Ask the customer to confirm the town, or offer a human agent.` };
        }
        const date = await lookupPickupDate(route);
        return { recognized: true, city: args.city, collectionRoute: route, nextCollectionDate: date || 'to be confirmed' };
      }

      case 'get_collection_areas': {
        const supabase = getSupabase();
        let routes = [];
        if (supabase) {
          const { data } = await supabase
            .from('collection_schedules')
            .select('route, pickup_date')
            .eq('country', 'Ireland')
            .order('route');
          routes = (data || []).map(r => ({
            route: r.route,
            nextDate: r.pickup_date && r.pickup_date !== 'Not set' ? r.pickup_date : 'to be confirmed',
          }));
        }
        if (!routes.length) {
          routes = ['Londonderry', 'Belfast', 'Cavan', 'Athlone', 'Limerick', 'Dublin City', 'Cork']
            .map(route => ({ route, nextDate: 'to be confirmed' }));
        }
        return { coverage: 'free collection anywhere in Ireland', routes };
      }

      case 'track_shipment': {
        const tn = (args.trackingNumber || '').trim().toUpperCase();
        if (!/^ZS-[A-Z0-9]{8}$/.test(tn)) {
          return { found: false, message: 'Tracking numbers look like ZS-ABC12345. Ask the customer to recheck.' };
        }
        const shipment = await getShipmentByTracking(tn);
        if (!shipment) return { found: false, message: `No shipment found for ${tn}.` };
        return {
          found: true,
          trackingNumber: shipment.tracking_number,
          status: shipment.status,
          from: shipment.origin,
          to: shipment.destination,
        };
      }

      case 'create_booking':
        return createBookingFromArgs(sock, phoneNumber, args);

      case 'read_catalogue': {
        const catalogue = await getCatalogueText();
        if (!catalogue) {
          return { available: false, message: 'The catalogue is not set up yet. Offer to have the team share product details, or answer from what you already know about our drum/trunk shipping.' };
        }
        return { available: true, catalogue };
      }

      case 'request_human_agent': {
        await enableHumanTakeover(phoneNumber, 'Pending human');
        await notifyRepresentative(sock, {
          type: 'Human assistance requested',
          customerJid: phoneNumber,
          reason: args.reason,
        });
        return { ok: true, message: 'A human agent has been notified and will take over. Tell the customer warmly that someone from the team will be with them shortly.' };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`Tool ${name} failed:`, err);
    return { error: `The ${name} step failed. Apologise and offer to have the team follow up.` };
  }
}

async function createBookingFromArgs(sock, phoneNumber, args) {
  const drumQty = args.drumQuantity || 0;
  const trunkQty = args.trunkQuantity || 0;
  const hasOther = !!(args.otherItemsDescription && args.otherItemsDescription.trim());

  if (drumQty <= 0 && trunkQty <= 0 && !hasOther) {
    return { ok: false, error: 'No items selected. Ask the customer what they are shipping (drums, trunks, or other items).' };
  }

  const route = getCityToRouteMap()[(args.senderCity || '').trim().toUpperCase()] || null;
  const collectionDate = (await lookupPickupDate(route)) || 'To be confirmed';

  const hasPricedItems = drumQty > 0 || trunkQty > 0;
  const paymentMethod = hasPricedItems ? (args.paymentMethod || 'standard') : 'agentQuote';

  const bookingData = {
    senderFirstName: args.senderFirstName,
    senderLastName: args.senderLastName,
    senderEmail: args.senderEmail || null,
    senderPhone: args.senderPhone,
    senderPhone2: args.senderPhone2 || null,
    senderAddress: args.senderAddress,
    senderCity: args.senderCity,
    senderPostcode: 'N/A',
    receiverName: args.receiverName,
    receiverPhone: args.receiverPhone,
    receiverPhone2: args.receiverPhone2 || null,
    receiverAddress: args.receiverAddress,
    receiverCity: args.receiverCity,
    includeDrums: drumQty > 0,
    drumQuantity: drumQty,
    drumsDescription: args.drumsDescription || null,
    includeTrunks: trunkQty > 0,
    trunkQuantity: trunkQty,
    trunksDescription: args.trunksDescription || null,
    includeBoxes: hasOther,
    boxesDescription: hasOther ? args.otherItemsDescription : null,
    wantMetalSeal: !!args.wantMetalSeal,
    paymentMethod,
    collectionRoute: route,
    collectionDate,
  };

  const settings = await getBotSettings();
  const pricing = calculatePricing(bookingData, settings);
  const { trackingNumber, receiptNumber } = await createBookingRecords(phoneNumber, bookingData, pricing);

  await notifyRepresentative(sock, {
    type: hasOther ? 'Booking and custom quote request' : 'New WhatsApp booking',
    customerJid: phoneNumber,
    customerName: `${bookingData.senderFirstName} ${bookingData.senderLastName}`.trim(),
    trackingNumber,
    summary: hasOther
      ? bookingData.boxesDescription
      : `${drumQty} drum(s), ${trunkQty} trunk(s) — ${bookingData.senderCity}`,
  });

  // Save details for re-use next time, and record in history.
  const current = await getUserSession(phoneNumber);
  await updateUserSession(phoneNumber, {
    userFirstName: bookingData.senderFirstName,
    userLastName: bookingData.senderLastName,
    userName: bookingData.senderFirstName,
    userEmail: bookingData.senderEmail,
    userPhone: bookingData.senderPhone,
    userAddress: bookingData.senderAddress,
    userCity: bookingData.senderCity,
    receiverName: bookingData.receiverName,
    receiverPhone: bookingData.receiverPhone,
    receiverPhone2: bookingData.receiverPhone2,
    receiverAddress: bookingData.receiverAddress,
    receiverCity: bookingData.receiverCity,
    bookingHistory: [
      ...(current.bookingHistory || []),
      { trackingNumber, receiptNumber, date: new Date().toISOString(), drums: drumQty, trunks: trunkQty },
    ],
  });

  return {
    ok: true,
    trackingNumber,
    receiptNumber,
    total: pricing.finalTotal > 0 ? formatMoney(pricing.finalTotal) : 'team will quote',
    collectionRoute: route || 'to be confirmed',
    nextCollectionDate: collectionDate,
    note: 'Booking saved. Give the customer the tracking number and say the team will confirm collection within 24 hours.',
  };
}
