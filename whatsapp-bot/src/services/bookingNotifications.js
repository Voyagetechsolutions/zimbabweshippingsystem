import QRCode from 'qrcode';
import { sendImageBuffer, sendMessage } from '../utils/messageUtils.js';

export async function sendBookingConfirmation(sock, customerJid, booking, bookingData) {
  const caption = [
    '✅ *Booking confirmed*',
    '',
    `Customer reference: *${booking.customerReference}*`,
    `Tracking number: *${booking.trackingNumber}*`,
    bookingData.collectionDate ? `Collection date: ${bookingData.collectionDate}` : null,
    `Collection address: ${bookingData.senderAddress}, ${bookingData.senderCity}`,
    `Payment method: ${bookingData.paymentMethod || 'To be confirmed'}`,
    '',
    'Show this QR code to the driver when your goods are collected.',
  ].filter(Boolean).join('\n');

  try {
    const qr = await QRCode.toBuffer(booking.qrToken, { type: 'png', width: 640, margin: 2 });
    return sendImageBuffer(sock, customerJid, qr, caption);
  } catch (error) {
    console.error('QR confirmation failed:', error?.message || error);
    return sendMessage(sock, customerJid, caption);
  }
}
