import { updateUserSession } from '../services/userSession.js';
import { sendMessage } from '../utils/messageUtils.js';
import { getBotMessage } from '../services/botMessages.js';

export async function handleFAQFlow(sock, phoneNumber, text, session) {
  const lowerText = text.toLowerCase();

  if (lowerText === 'cancel' || lowerText === 'menu') {
    await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
    const { sendMainMenuList } = await import('../handlers/messageHandler.js');
    await sendMainMenuList(sock, phoneNumber, session.userName);
    return;
  }

  // Always redirect to the FAQ page
  const msg = await getBotMessage('faq_redirect');
  await sendMessage(sock, phoneNumber, msg);
  await updateUserSession(phoneNumber, { state: 'MAIN_MENU' });
}
