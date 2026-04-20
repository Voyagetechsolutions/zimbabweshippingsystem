import { sendMessage } from '../utils/messageUtils.js';
import { getPricingMenu } from '../menus/mainMenu.js';

export async function handlePricingInquiry(sock, phoneNumber, session) {
  await sendMessage(sock, phoneNumber, getPricingMenu());
}

export function calculateDrumPrice(quantity) {
  if (quantity >= 5) return 340;
  if (quantity >= 2) return 350;
  return 360;
}

export function calculateBoxPrice(quantity) {
  if (quantity >= 5) return 200;
  if (quantity >= 2) return 210;
  return 220;
}
