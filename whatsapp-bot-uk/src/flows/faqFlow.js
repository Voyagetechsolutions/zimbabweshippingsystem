import { updateUserSession } from '../services/userSession.js';
import { sendMessage } from '../utils/messageUtils.js';

export async function handleFAQFlow(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase();
  
  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
    const { getMainMenu } = await import('../menus/mainMenu.js');
    await sendMessage(sock, phoneNumber, getMainMenu());
    return;
  }

  const step = session.step || 'CATEGORIES';

  if (step === 'CATEGORIES' || lowerText === 'start') {
    await sendMessage(sock, phoneNumber, getFAQCategories());
    await updateUserSession(phoneNumber, { step: 'SELECT_CATEGORY' });
    return;
  }

  if (step === 'SELECT_CATEGORY') {
    const category = text;
    
    switch (category) {
      case '1':
        await sendMessage(sock, phoneNumber, getShippingFAQs());
        break;
      case '2':
        await sendMessage(sock, phoneNumber, getPricingFAQs());
        break;
      case '3':
        await sendMessage(sock, phoneNumber, getCollectionFAQs());
        break;
      case '4':
        await sendMessage(sock, phoneNumber, getDeliveryFAQs());
        break;
      case '5':
        await sendMessage(sock, phoneNumber, getPaymentFAQs());
        break;
      default:
        await sendMessage(sock, phoneNumber, '❌ Please select a number from 1-5.');
        return;
    }
    
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU', step: null });
  }
}

function getFAQCategories() {
  return `❓ *Frequently Asked Questions*

Select a category:

1️⃣ Shipping & Transit
2️⃣ Pricing & Discounts
3️⃣ Collection Process
4️⃣ Delivery in Zimbabwe
5️⃣ Payment Methods

Type a number (1-5) or *menu* to go back.`;
}

function getShippingFAQs() {
  return `📦 *Shipping & Transit FAQs*

*Q: How long does shipping take?*
A: Standard shipping from UK to Zimbabwe takes approximately 6 weeks. Parcels take 10-14 days.

*Q: What can I ship?*
A: You can ship household items, clothing, electronics, furniture, and personal effects. Prohibited items include weapons, drugs, and perishable goods.

*Q: Are my items insured?*
A: Yes, all shipments include basic insurance coverage.

*Q: How do I track my shipment?*
A: Use your tracking number (ZS-XXXXXXXX) by typing *track* in the main menu.

Type *menu* to return to main menu.`;
}

function getPricingFAQs() {
  return `💰 *Pricing & Discounts FAQs*

*Q: What are your prices?*
A: 
• Drums: £75 (1), £70 (2-4), £65 (5+)
• Boxes: £25 (1), £23 (2-4), £20 (5+)

*Q: Are there volume discounts?*
A: Yes! The more you ship, the lower the price per item.

*Q: What's included in the price?*
A: FREE collection, tracking, insurance, and delivery to our Zimbabwe depot.

*Q: Are there extra charges?*
A: Optional: Metal seals (£7), Door-to-door delivery in Zimbabwe (£25)

Type *menu* to return to main menu.`;
}

function getCollectionFAQs() {
  return `🚚 *Collection Process FAQs*

*Q: Is collection really free?*
A: Yes! We offer FREE collection anywhere in England & Wales.

*Q: When will you collect?*
A: Collections are scheduled based on your postcode and route. We'll confirm the date within 24 hours of booking.

*Q: What areas do you cover?*
A: We cover most of England & Wales. Some remote areas (Scotland, Northern Ireland) may have restrictions.

*Q: Do I need to be home?*
A: Yes, someone must be present to hand over the items and sign.

Type *menu* to return to main menu.`;
}

function getDeliveryFAQs() {
  return `🏠 *Delivery in Zimbabwe FAQs*

*Q: Where do you deliver in Zimbabwe?*
A: We deliver to all major cities: Harare, Bulawayo, Mutare, Gweru, and more.

*Q: What's the difference between depot and door-to-door?*
A: Standard delivery is to our depot where you collect. Door-to-door (£25 extra) delivers directly to the address.

*Q: How will I know when it arrives?*
A: We'll notify you via SMS and WhatsApp when your shipment arrives in Zimbabwe.

*Q: What documents are needed?*
A: The receiver needs a valid ID to collect from the depot.

Type *menu* to return to main menu.`;
}

function getPaymentFAQs() {
  return `💳 *Payment Methods FAQs*

*Q: What payment methods do you accept?*
A: We accept:
• Cash on collection
• Card payment (online)
• Bank transfer
• Mobile payment

*Q: When do I pay?*
A: Payment is due at or before collection.

*Q: Can I pay in installments?*
A: For large shipments, we may offer payment plans. Contact us to discuss.

*Q: Do you accept Zimbabwe currency?*
A: No, all payments must be in GBP (£).

Type *menu* to return to main menu.`;
}
