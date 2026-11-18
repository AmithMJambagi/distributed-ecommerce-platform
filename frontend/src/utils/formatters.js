/**
 * Formats a numeric value into Indian Rupees (INR - ₹)
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(numericAmount);
}

/**
 * Formats ISO date string, unix timestamp, or array into readable format
 * @param {string|number|Array} val
 * @returns {string}
 */
export function formatDate(val) {
  if (!val) return '';

  let date;

  if (typeof val === 'number') {
    // If seconds (< 100 billion), convert to milliseconds
    date = new Date(val < 100000000000 ? val * 1000 : val);
  } else if (typeof val === 'string') {
    // If it's a numeric string like "1793619110"
    if (!isNaN(val) && !isNaN(parseFloat(val))) {
      const num = parseFloat(val);
      date = new Date(num < 100000000000 ? num * 1000 : num);
    } else {
      // ISO string
      date = new Date(val);
    }
  } else if (Array.isArray(val)) {
    // Jackson array format: [year, month, day, hour, min, sec]
    date = new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0, val[5] || 0);
  } else {
    date = new Date(val);
  }

  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Generates a random UUID v4 for idempotency keys
 * @returns {string}
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Minimalist neutral placeholder image SVG with zero watermarks or text
 */
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' fill='none'%3E%3Crect width='400' height='400' fill='%23F4F4F5'/%3E%3Cpath d='M150 240L190 190L220 225L245 195L275 240H150Z' fill='%23D4D4D8'/%3E%3Ccircle cx='180' cy='160' r='18' fill='%23D4D4D8'/%3E%3C/svg%3E";

