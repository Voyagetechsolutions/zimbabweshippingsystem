import { updateUserSession } from '../services/userSession.js';
import { sendMessage } from '../utils/messageUtils.js';

const FAQ_CATEGORIES = {
  '1': {
    name: 'Shipping',
    questions: [
      {
        q: 'How long does shipping take?',
        a: '🚢 Shipping from Ireland to Zimbabwe takes approximately *6 weeks* for drums and *10-14 days* for parcels. Transit times may vary slightly depending on customs clearance.'
      },
      {
        q: 'What items can I ship?',
        a: '📦 You can ship most personal effects, clothing, non-perishable food, electronics, household goods, and gifts. Prohibited items include weapons, illegal substances, and hazardous materials.'
      },
      {
        q: 'Is insurance included?',
        a: '🛡️ Basic coverage is included. We recommend purchasing additional insurance elsewhere to cover the full declared value of your shipment.'
      }
    ]
  },
  '2': {
    name: 'Payment',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: '💳 We accept:\n• Cash on collection\n• Card payments\n• Bank transfers\n• Mobile payments\n\nAll methods are secure and encrypted.'
      },
      {
        q: 'Can I pay in installments?',
        a: '💰 Yes! For business accounts with regular shipping needs, we offer payment terms and invoicing options. Contact us to set this up.'
      },
      {
        q: 'Do you offer discounts?',
        a: '🎉 Yes! Volume discounts are available:\n• 5+ drums: Best rate (€340)\n• 2-4 drums: €350\n• 1 drum: €360'
      }
    ]
  },
  '3': {
    name: 'Collection',
    questions: [
      {
        q: 'How does collection work?',
        a: '🚚 We offer FREE scheduled collections across Ireland. Once you book, we\'ll assign the next available collection date for your area. Our driver will arrive at your address within the specified time window.'
      },
      {
        q: 'Do you collect from all areas?',
        a: '🇮🇪 Yes! We cover all of Ireland including:\n• Dublin & surrounding areas\n• Cork, Limerick, Galway\n• Belfast & Northern Ireland\n• All major towns and cities'
      },
      {
        q: 'What if I miss my collection?',
        a: '📅 If you miss your collection, you can:\n• Wait for the next scheduled date\n• Drop off at our depot\n• Arrange a special collection (fees may apply)'
      }
    ]
  }
};

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
    await updateUserSession(phoneNumber, { step: 'CATEGORIES' });
    await sendMessage(
      sock,
      phoneNumber,
      `❓ *Frequently Asked Questions*\n\nChoose a category:\n\n1️⃣ Shipping\n2️⃣ Payment\n3️⃣ Collection\n\nType the number (1-3) or *menu* to return.`
    );
    return;
  }

  if (['1', '2', '3'].includes(text)) {
    const category = FAQ_CATEGORIES[text];
    let response = `*${category.name} FAQs*\n\n`;
    
    category.questions.forEach((item, index) => {
      response += `*Q${index + 1}: ${item.q}*\n${item.a}\n\n`;
    });
    
    response += `Type *faq* for more questions or *menu* for main menu.`;
    
    await sendMessage(sock, phoneNumber, response);
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
    return;
  }

  await sendMessage(sock, phoneNumber, '❌ Please type 1, 2, or 3 to select a category.');
}
