export async function sendMessage(sock, phoneNumber, text) {
  try {
    await sock.sendMessage(phoneNumber, { text });
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
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
