import { proto, generateMessageIDV2 } from '@whiskeysockets/baileys';

const SEND_RETRIES = 2;
const SEND_RETRY_BASE_MS = 400;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sendMessage(sock, phoneNumber, text) {
  console.log(`📤 Attempting to send message to: ${phoneNumber}`);
  console.log(`📝 Message preview: ${text.substring(0, 100)}...`);
  
  let lastError = null;
  for (let attempt = 0; attempt <= SEND_RETRIES; attempt++) {
    try {
      const result = await sock.sendMessage(phoneNumber, { text });
      console.log(`✅ Message sent successfully to: ${phoneNumber}`);
      console.log(`📊 Send result:`, JSON.stringify(result?.key || result, null, 2));
      return true;
    } catch (error) {
      lastError = error;
      console.log(`⚠️  Send attempt ${attempt + 1} failed: ${error?.message || error}`);
      console.log(`📊 Error details:`, JSON.stringify({
        name: error?.name,
        message: error?.message,
        code: error?.code,
        statusCode: error?.output?.statusCode
      }, null, 2));
      if (attempt < SEND_RETRIES) {
        const waitTime = SEND_RETRY_BASE_MS * Math.pow(2, attempt);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
      }
    }
  }
  console.error(`❌ Error sending message after ${SEND_RETRIES + 1} attempts:`, lastError?.message || lastError);
  return false;
}

export async function sendImage(sock, phoneNumber, imageUrl, caption = '') {
  try {
    await sock.sendMessage(phoneNumber, { image: { url: imageUrl }, caption });
    return true;
  } catch (error) {
    console.error('Error sending image:', error);
    return false;
  }
}

export async function sendDocument(sock, phoneNumber, documentUrl, fileName, caption = '') {
  try {
    await sock.sendMessage(phoneNumber, { document: { url: documentUrl }, fileName, caption });
    return true;
  } catch (error) {
    console.error('Error sending document:', error);
    return false;
  }
}

/**
 * Send reply buttons using proto InteractiveMessage.
 * Falls back to numbered plain text if it fails.
 */
export async function sendButtonMessage(sock, phoneNumber, bodyText, buttons) {
  console.log(`📤 Sending plain text buttons to: ${phoneNumber}`);
  // Always use plain text numbered list (no interactive messages)
  const textMessage = buildButtonFallback(bodyText, buttons);
  return sendMessage(sock, phoneNumber, textMessage);
}

/**
 * Send a list message as interactive buttons.
 * Falls back to numbered plain text if it fails.
 */
export async function sendListMessage(sock, phoneNumber, bodyText, buttonLabel, sections) {
  console.log(`📤 Sending plain text menu to: ${phoneNumber}`);
  console.log(`📋 Sections count: ${sections.length}, Total rows: ${sections.reduce((sum, s) => sum + s.rows.length, 0)}`);
  
  // Always use plain text numbered list (no interactive messages)
  const textMessage = buildListFallback(bodyText, sections);
  console.log(`📝 Generated message length: ${textMessage.length} characters`);
  
  const result = await sendMessage(sock, phoneNumber, textMessage);
  console.log(`${result ? '✅' : '❌'} Menu message ${result ? 'sent' : 'failed'}`);
  return result;
}

function buildButtonFallback(bodyText, buttons) {
  let text = bodyText + '\n\n';
  const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'];
  buttons.forEach((b, i) => {
    text += `${emojis[i] || `${i+1}.`} ${b.displayText}\n`;
  });
  text += '\n_Reply with the number of your choice_';
  return text;
}

function buildListFallback(bodyText, sections) {
  let text = bodyText + '\n\n';
  const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
  let i = 0;
  for (const section of sections) {
    if (section.title) text += `*${section.title}*\n\n`;
    for (const row of section.rows) {
      text += `${emojis[i] || `${i+1}.`} ${row.title}`;
      if (row.description) text += `\n   _${row.description}_`;
      text += '\n\n';
      i++;
    }
  }
  text += '_Reply with a number to choose_';
  return text;
}

export function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('353') && !cleaned.startsWith('44')) {
    cleaned = '353' + cleaned;
  }
  return cleaned + '@s.whatsapp.net';
}
