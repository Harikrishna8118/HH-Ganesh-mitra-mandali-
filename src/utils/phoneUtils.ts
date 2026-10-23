/**
 * Phone and WhatsApp redirection utilities
 * Ensures clicking dial/call opens the device's native phone dialpad,
 * and clicking WhatsApp opens WhatsApp chat directly.
 */

export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function formatIndianPhoneNumber(phone?: string | null): string {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned) return '';
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const main = cleaned.slice(2);
    return `+91 ${main.slice(0, 5)} ${main.slice(5)}`;
  }
  return phone || '';
}

/**
 * Redirects directly to the device dialpad with the phone number pre-filled.
 * Works seamlessly across Android WebView, mobile browsers, and desktop telephony.
 */
export function openDialer(phone: string, event?: React.MouseEvent): void {
  if (event) {
    event.stopPropagation();
  }
  const digits = cleanPhoneNumber(phone);
  if (!digits) return;

  // Format with country code for India if standard 10-digit number
  const dialNumber =
    digits.length === 10
      ? `+91${digits}`
      : digits.length === 12 && digits.startsWith('91')
      ? `+${digits}`
      : digits;

  const telUrl = `tel:${dialNumber}`;

  // Execute redirection via anchor click to trigger ACTION_DIAL intent
  const link = document.createElement('a');
  link.href = telUrl;
  link.setAttribute('target', '_self');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens WhatsApp chat directly with the phone number and optional message.
 * Targets the official WhatsApp app on mobile and web.whatsapp.com on desktop.
 */
export function openWhatsApp(phone: string, message?: string, event?: React.MouseEvent): void {
  if (event) {
    event.stopPropagation();
  }
  const digits = cleanPhoneNumber(phone);
  if (!digits) return;

  const phone10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const fullPhone = `91${phone10}`;
  const defaultMsg = message || 'Namaskara, regarding Shri Ganesh Mitra Mandali, H. Hosahalli...';
  const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(defaultMsg)}`;

  // Open WhatsApp in new tab or trigger WhatsApp intent
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}
