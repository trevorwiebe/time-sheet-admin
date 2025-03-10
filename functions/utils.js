/**
 * Calculates the start date of a pay period
 * @param {string|Date} goLiveDate - The initial go-live date
 * @param {string|Date} currentDate - The current date
 * @return {Date} The calculated pay period start date
 */
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
  const payPeriodStartDate = new Date(
      currentDateMs - (hoursToSubtract * 60 * 60 * 1000),
  );

  return payPeriodStartDate;
}

/**
 * Process an organization by creating timesheets for all users
 * @param {object} db - Database reference
 * @param {string} organizationId - Organization ID
 * @param {string|Date} goLiveDate - The initial go-live date
 * @param {string|Date} todayAtStart - Start of current day
 * @return {Promise} Promise resolving to results of all user processing
 */
export async function processOrg(db, organizationId, goLiveDate, todayAtStart) {
  const usersSnapshot = await db
      .collection(`organizations/${organizationId}/users`)
      .get();
  const payPeriodStart = calculatePayPeriodStartDate(goLiveDate, todayAtStart);
  const payPeriodEnd = new Date(payPeriodStart);

  payPeriodEnd.setDate(payPeriodEnd.getDate() + 13);

  const userPromises = [];

  usersSnapshot.forEach((userDoc) => {
    const userId = userDoc.id;
    userPromises.push(
        processUser(db, organizationId, userId, payPeriodStart, payPeriodEnd),
    );
  });

  return Promise.all(userPromises);
}

/**
 * Process a user by creating or verifying timesheet existence
 * @param {object} db - Database reference
 * @param {string} organizationId - Organization ID
 * @param {string} userId - User ID
 * @param {Date} payPeriodStart - Start date of pay period
 * @param {Date} payPeriodEnd - End date of pay period
 * @return {Promise} Promise resolving when user processing is complete
 */
export async function processUser(
    db,
    organizationId,
    userId,
    payPeriodStart,
    payPeriodEnd,
) {
  const timeSheetRef = db.collection(
      `organizations/${organizationId}/users/${userId}/timeSheets`,
  );
  const timeSheetDoc = await timeSheetRef
      .where("payPeriodStart", "==", payPeriodStart.toISOString())
      .get();

  // Check if TimeSheet object exists
  if (timeSheetDoc.empty) {
    // Create a new TimeSheet object
    const newTimeSheet = {
      payPeriodStart: payPeriodStart.toISOString(),
      payPeriodEnd: payPeriodEnd.toISOString(),
      vacationHours: 0.0,
      holidayHours: 0.0,
      confirmedByUser: false,
      submitted: false,
    };

    // Use add to create a new document with a generated ID
    await timeSheetRef.add(newTimeSheet);
    console.log(
        `Created new TimeSheet for user ${userId}
         in organization ${organizationId}`,
    );
  } else {
    console.log(
        `TimeSheet already exists for user ${userId} 
        in organization ${organizationId}`,
    );
  }
}
