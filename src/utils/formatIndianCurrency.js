// utils/formatIndianCurrency.js

/**
 * Formats a number in Indian currency format with commas
 * Example: 1234567.89 -> 12,34,567.89
 * @param {number|string} amount - The amount to format
 * @param {boolean} showDecimals - Whether to show decimal places (default: true)
 * @returns {string} Formatted amount
 */
export function formatIndianCurrency(amount, showDecimals = true) {
  if (amount === null || amount === undefined || amount === "") {
    return "0";
  }

  // Convert to number and handle invalid values
  const num = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return "0";
  }

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = num.toFixed(2).split(".");

  // Indian numbering system:
  // Last 3 digits, then groups of 2 from right to left
  let result = "";
  let count = 0;

  // Process from right to left
  for (let i = integerPart.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) {
      result = "," + result;
    }
    result = integerPart[i] + result;
    count++;
  }

  // Add decimal part if needed
  if (showDecimals && decimalPart) {
    result += "." + decimalPart;
  }

  return result;
}

/**
 * Formats amount with Rupee symbol
 * @param {number|string} amount - The amount to format
 * @param {boolean} showDecimals - Whether to show decimal places (default: true)
 * @returns {string} Formatted amount with ₹ symbol
 */
export function formatINR(amount, showDecimals = false) {
  return "₹" + formatIndianCurrency(amount, showDecimals);
}
