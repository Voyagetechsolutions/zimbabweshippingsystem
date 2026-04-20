export async function sendMessage(sock, phoneNumber, text) {
  try {
    await sock.sendMessage(phoneNumber, { text });
    console.log(`Message sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
