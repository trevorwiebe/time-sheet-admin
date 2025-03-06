export function convertToISOString(dateString) {
  // Create a Date object from the input date string
  // Note: The date will be interpreted in the local timezone
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date format");
  }
  
  // Convert to ISO string (automatically converts to UTC)
  return date.toISOString();
}

export function isoToHtmlDateFormat(isoString) {
  // Create a Date object from the ISO string
  const date = new Date(isoString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    throw new Error("Invalid ISO date format");
  }
  
  // Format as YYYY-MM-DD (which is what HTML date inputs expect)
  const year = date.getUTCFullYear();
  // Month is 0-indexed in JavaScript, so add 1
  // padStart ensures two-digit format (e.g., "01" instead of "1")
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}