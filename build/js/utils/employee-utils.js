import { getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

/**
 * Retrieves the last two timesheet objects for each user.
 * 
 * @param {object} db - The Firestore database instance.
 * @param {string} organizationId - The organization ID.
 * @returns {object} An object containing the last two timesheet objects for each user.
 */
export async function getLastTwoTimesheetsForUsers(db, organizationId) {
  const usersSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
  const timesheetsData = {};

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    // Create a query to fetch the last two timesheets
    const timesheetsQuery = query(
      collection(db, `organizations/${organizationId}/users/${userId}/timeSheets`),
      orderBy("payPeriodStart", "desc"),
      limit(2)
    );

    // Execute the query
    const timesheetsSnapshot = await getDocs(timesheetsQuery);
    const timesheets = timesheetsSnapshot.docs.map(timesheetDoc => ({ id: timesheetDoc.id, ...timesheetDoc.data() }));

    // Assign the timesheets to the timesheetsData object
    timesheetsData[userId] = {
      previousTimeSheet: timesheets[1] || null,
      currentTimeSheet: timesheets[0] || null
    };
  }

  return timesheetsData;
}

export function convertToISOString(dateString) {
  // Create a Date object from the input date string
  // Note: The date will be interpreted in the local timezone
  const date = new Date(dateString);
  // const timezoneOffset = date.getTimezoneOffset() * 60000; // Offset in milliseconds
  // const utcGoLiveDate = new Date(date.getTime() + timezoneOffset);
  
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
  // const timezoneOffset = date.getTimezoneOffset() * 60000; // Offset in milliseconds
  // const utcGoLiveDate = new Date(date.getTime() - timezoneOffset);

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

export function formatDate(date) {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

export function convertDateFormat(dateString) {
  // Remove any asterisks or extra whitespace
  const cleanedDateString = dateString.replace(/\*/g, '').trim();
  
  // Create a Date object from the ISO string
  const date = new Date(cleanedDateString);
  
  // Extract month, day, and year
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  // Return the formatted date string
  return `${month}/${day}/${year}`;
}

/**
 * Calculates the start date of the current pay period using the current date.
 * Handles all date corner cases including leap years and DST transitions.
 * 
 * @param {string|Date} goLiveDate - The initial pay period start date (when the system went live)
 * @returns {Date} The start date of the current pay period in UTC
 */
export function calculatePayPeriodStartDate(goLiveDate) {
  // Get current date internally
  const currentDateObj = new Date();
  
  // Convert goLiveDate to a Date object if it's not already
  const goLiveDateObj = new Date(goLiveDate);
  
  // Convert both dates to UTC midnight
  const goLiveUtc = new Date(Date.UTC(
    goLiveDateObj.getUTCFullYear(),
    goLiveDateObj.getUTCMonth(),
    goLiveDateObj.getUTCDate(),
    0, 0, 0, 0
  ));
  
  const currentDateUtc = new Date(Date.UTC(
    currentDateObj.getUTCFullYear(),
    currentDateObj.getUTCMonth(),
    currentDateObj.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // Calculate the number of milliseconds in 14 days (a pay period)
  const payPeriodMs = 14 * 24 * 60 * 60 * 1000;
  
  // Calculate the elapsed time in milliseconds
  const elapsedMs = currentDateUtc.getTime() - goLiveUtc.getTime();
  
  // Calculate how many complete pay periods have elapsed
  const completePeriods = Math.floor(elapsedMs / payPeriodMs);
  
  // Calculate the most recent pay period start date
  // by adding the appropriate number of complete pay periods to the go-live date
  const payPeriodStartDate = new Date(goLiveUtc.getTime() + (completePeriods * payPeriodMs));
  
  return payPeriodStartDate;
}

/**
 * Calculates both the start and end dates for a pay period
 * properly handling DST transitions and leap years.
 * 
 * @param {string|Date} goLiveDate - The initial pay period start date
 * @param {number} periodOffset - Optional offset to get different periods (0 = current, -1 = previous, 1 = next)
 * @returns {Object} Object containing start and end dates as Date objects and ISO strings
 */
export function getPayPeriodDates(goLiveDate, periodOffset = 0) {
  // First get the current pay period start
  const currentPayPeriodStart = calculatePayPeriodStartDate(goLiveDate);
  
  // Calculate milliseconds in one pay period (14 days)
  const payPeriodMs = 14 * 24 * 60 * 60 * 1000;
  
  // Apply the offset to get the requested pay period
  const payPeriodStart = new Date(currentPayPeriodStart.getTime() + (periodOffset * payPeriodMs));
  
  // Calculate the end date (13 days, 23 hours, 59 minutes, 59 seconds, and 999 milliseconds after start)
  const payPeriodEnd = new Date(payPeriodStart.getTime() + payPeriodMs - 1);
  
  return {
    startDate: payPeriodStart,
    endDate: payPeriodEnd,
    isoStartDate: payPeriodStart.toISOString(),
    isoEndDate: payPeriodEnd.toISOString()
  };
}

/**
 * Utility function to get current, previous, and next pay periods at once
 * 
 * @param {string|Date} goLiveDate - The initial pay period start date
 * @returns {Object} Object containing current, previous, and next pay periods
 */
export function getAllRelevantPayPeriods(goLiveDate) {
  return {
    previousPeriod: getPayPeriodDates(goLiveDate, -1),
    currentPeriod: getPayPeriodDates(goLiveDate, 0),
  };
}