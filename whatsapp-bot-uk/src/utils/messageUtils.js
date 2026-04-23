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

/**
 * Send a list message (tap to open a scrollable menu).
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
    // Fallback to plain text if list not supported on the device
    const fallback = buildListFallback(bodyText, sections);
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

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
