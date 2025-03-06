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

export function calculatePayPeriodStartDate(goLiveDate, currentDate) {
  // Convert both dates to milliseconds for calculation
  const goLiveDateMs = new Date(goLiveDate).getTime();
  const currentDateMs = new Date(currentDate).getTime();
  
  // Calculate elapsed time in days
  const elapsedTimeMs = currentDateMs - goLiveDateMs;
  const elapsedDays = Math.floor(elapsedTimeMs / (1000 * 60 * 60 * 24));
  
  // Calculate days into the new pay period (mod 14)
  const daysIntoNewPayPeriod = elapsedDays % 14;
  
  // Convert days to hours
  const hoursToSubtract = daysIntoNewPayPeriod * 24;
  
  // Calculate pay period start date by subtracting the hours
  const payPeriodStartDate = new Date(currentDateMs - (hoursToSubtract * 60 * 60 * 1000));
  
  return payPeriodStartDate;
}

export function formatDate(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}