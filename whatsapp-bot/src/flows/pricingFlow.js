import { sendMessage } from '../utils/messageUtils.js';
import { getPricingMenu } from '../menus/mainMenu.js';

export async function handlePricingInquiry(sock, phoneNumber, session) {
  await sendMessage(sock, phoneNumber, getPricingMenu());
}

export function calculateDrumPrice(quantity) {
  return 360;
}

export function calculateBoxPrice(quantity) {
  return 220;
}
