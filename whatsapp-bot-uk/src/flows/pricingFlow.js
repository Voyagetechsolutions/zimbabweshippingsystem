import { sendMessage } from '../utils/messageUtils.js';
import { getPricingMenu } from '../menus/mainMenu.js';

export async function handlePricingInquiry(sock, phoneNumber, session) {
  await sendMessage(sock, phoneNumber, getPricingMenu());
}
