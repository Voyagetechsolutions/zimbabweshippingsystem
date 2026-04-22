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

/**
 * Send a list message (tap to open a scrollable menu — like Mukuru)
 * @param {object} sock
 * @param {string} phoneNumber
 * @param {string} bodyText - main message text
 * @param {string} buttonLabel - label on the button that opens the list
 * @param {Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>} sections
 */
export async function sendListMessage(sock, phoneNumber, bodyText, buttonLabel, sections) {
  try {
    await sock.sendMessage(phoneNumber, {
      listMessage: {
        title: '',
        text: bodyText,
        footerText: 'Tap the button below to see options',
        buttonText: buttonLabel,
        listType: 1,
        sections
      }
    });
    return true;
  } catch (error) {
    console.error('Error sending list message:', error?.message || error);
    // Fallback to plain text
    const fallback = buildListFallback(bodyText, sections);
    return sendMessage(sock, phoneNumber, fallback);
  }
}

/**
 * Send reply buttons (up to 3 tappable buttons)
 * @param {object} sock
 * @param {string} phoneNumber
 * @param {string} bodyText
 * @param {Array<{id: string, displayText: string}>} buttons
 */
export async function sendButtonMessage(sock, phoneNumber, bodyText, buttons) {
  try {
    await sock.sendMessage(phoneNumber, {
      buttonMessage: {
        text: bodyText,
        footerText: '',
        buttons: buttons.map(b => ({
          buttonId: b.id,
          buttonText: { displayText: b.displayText },
          type: 1
        })),
        headerType: 1
      }
    });
    return true;
  } catch (error) {
    console.error('Error sending button message:', error?.message || error);
    // Fallback to plain text
    const fallback = buildButtonFallback(bodyText, buttons);
    return sendMessage(sock, phoneNumber, fallback);
  }
}

function buildListFallback(bodyText, sections) {
  let text = bodyText + '\n\n';
  for (const section of sections) {
    if (section.title) text += `*${section.title}*\n\n`;
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
    section.rows.forEach((row, i) => {
      text += `${emojis[i] || `${i+1}.`} ${row.title}`;
      if (row.description) text += `\n   _${row.description}_`;
      text += '\n\n';
    });
  }
  text += '_Reply with a number to choose_';
  return text;
}

function buildButtonFallback(bodyText, buttons) {
  let text = bodyText + '\n\n';
  buttons.forEach((b, i) => {
    text += `${i + 1}️⃣ ${b.displayText}\n`;
  });
  text += '\n_Reply with the number of your choice_';
  return text;
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
