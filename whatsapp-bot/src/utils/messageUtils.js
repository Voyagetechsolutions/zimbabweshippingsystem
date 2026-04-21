const SEND_RETRIES = 2;
const SEND_RETRY_BASE_MS = 400;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendMessage(sock, phoneNumber, text) {
  let lastError = null;
  for (let attempt = 0; attempt <= SEND_RETRIES; attempt++) {
    try {
      await sock.sendMessage(phoneNumber, { text });
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < SEND_RETRIES) {
        await sleep(SEND_RETRY_BASE_MS * Math.pow(2, attempt));
      }
    }
  }
  console.error(`Error sending message after ${SEND_RETRIES + 1} attempts:`, lastError?.message || lastError);
  return false;
}

export async function sendImage(sock, phoneNumber, imageUrl, caption = '') {
  try {
    await sock.sendMessage(phoneNumber, {
      image: { url: imageUrl },
      caption
    });
    return true;
  } catch (error) {
    console.error('Error sending image:', error);
    return false;
  }
}

export async function sendDocument(sock, phoneNumber, documentUrl, fileName, caption = '') {
  try {
    await sock.sendMessage(phoneNumber, {
      document: { url: documentUrl },
      fileName,
      caption
    });
    return true;
  } catch (error) {
    console.error('Error sending document:', error);
    return false;
  }
}

export function formatPhoneNumber(phone) {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add country code if not present
  if (!cleaned.startsWith('353') && !cleaned.startsWith('44')) {
    cleaned = '353' + cleaned;
  }
  
  // Format for WhatsApp (with @s.whatsapp.net)
  return cleaned + '@s.whatsapp.net';
}
