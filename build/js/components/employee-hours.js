import { convertDateFormat, getAllRelevantPayPeriods, getLastTwoTimesheetsForUsers } from "../utils/employee-utils.js";

export function loadUsers(
  db, org, getDocs, collection, query, where,
  users, rateList
) {
  const userList = document.getElementById("user-list");

  // Function to render the user list
  function renderUserList(users, punchData, timeSheetData) {
    const emptyListNote = document.getElementById("empty_user_list");
    userList.innerHTML = ''; // Clear existing list
    if(users.length !== 0){
      users.forEach(user => {
        const userPunchData = punchData[user.id];
        const timeSheets = timeSheetData[user.id];

        // Call liStructure to create the list item
        const listItem = liStructure(user.name, userPunchData, rateList, timeSheets.previousTimeSheet, timeSheets.currentTimeSheet);
        userList.appendChild(listItem);
      });
      emptyListNote.style.display = "none";
    }else{
      emptyListNote.style.display = "block";
    }
  }

  const relevantPayPeriods = getAllRelevantPayPeriods(org.goLiveDate);

  // get the previousPayPeriodStart date and the currentPayPeriodEnd date so we can get all the past
  // and current pay period punches. We will split them in half later
  const previousPayPeriodISOStart = relevantPayPeriods.previousPeriod.isoStartDate;
  const previousPayPeriodISOEnd = relevantPayPeriods.previousPeriod.isoEndDate;
  const currentPayPeriodISOStart = relevantPayPeriods.currentPeriod.isoStartDate;
  const currentPayPeriodISOEnd = relevantPayPeriods.currentPeriod.isoEndDate;

  // Chain the asynchronous operations
  Promise.all([
    getAllEmployeePunches(
      db, org.id, getDocs, collection, query, where, previousPayPeriodISOStart, currentPayPeriodISOStart, currentPayPeriodISOEnd
    ),
    getLastTwoTimesheetsForUsers(db, org.id)
  ]).then(([punchData, timesheetsData]) => {
    renderUserList(users, punchData, timesheetsData);
  });

  // Current pay period
  const payPeriodText = document.getElementById("current-pay-period");
  payPeriodText.textContent = `Current Pay Period: 
    ${convertDateFormat(currentPayPeriodISOStart)} - ${convertDateFormat(currentPayPeriodISOEnd)
  }`;

  // Previous pay period
  const previousPayPeriodText = document.getElementById("previous-pay-period");
  previousPayPeriodText.textContent = `Previous Pay Period: 
    ${convertDateFormat(previousPayPeriodISOStart)} - ${convertDateFormat(previousPayPeriodISOEnd)
  }`;
}

async function getAllEmployeePunches(db, organizationId, getDocs, collection, query, where, previousPayPeriodISOStart, currentPayPeriodISOStart, currentPayPeriodISOEnd) {
  const usersSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
  const punchesData = {};

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id;

    // Create a query to fetch punches within the date range
    const punchesQuery = query(
      collection(db, `organizations/${organizationId}/users/${userId}/punches`),
      where("dateTime", ">=", previousPayPeriodISOStart),
      where("dateTime", "<=", currentPayPeriodISOEnd)
    );

    // Make query a snapshotRequest
    const punchesSnapshot = await getDocs(punchesQuery);
    const punches = punchesSnapshot.docs.map(punchDoc => ({ id: punchDoc.id, ...punchDoc.data() }));

    // Split punches into previous and current pay periods
    punchesData[userId] = {
      previousPeriod: punches.filter(punch => punch.dateTime < currentPayPeriodISOStart),
      currentPeriod: punches.filter(punch => punch.dateTime >= currentPayPeriodISOStart)
    };
  }

  return punchesData;
}

function liStructure(name, userPunchData, rateList, previousTimeSheet, currentTimeSheet) {

  const punchesPrevious = userPunchData.previousPeriod;
  const punchesCurrent = userPunchData.currentPeriod;
  const previousRateHours = calculateTotalHours(punchesPrevious);
  const currentRateHours = calculateTotalHours(punchesCurrent);


  // Create a div for the employee details
  const employeeDiv = document.createElement('div');
  employeeDiv.classList.add('employee-details'); // Add a class for styling

  // Create the employee name
  const nameElement = document.createElement('h4');
  nameElement.classList.add('employee-name'); // Add a class for styling
  nameElement.textContent = name;

  // Create a div to display total hours by rate
  const hoursContainer = document.createElement('div');
  hoursContainer.classList.add('hours-worked'); // Add a class for styling

  const currentPayPeriodDate = document.createElement('h5');
  currentPayPeriodDate.textContent = 'Current Pay Period Hours:';
  currentPayPeriodDate.classList.add('pay-period-text');
  hoursContainer.appendChild(currentPayPeriodDate);

  // Loop through totalHours and create elements for each rate
  for (const [rateId, hours] of Object.entries(currentRateHours)) {
      const hoursElement = document.createElement('p');
      hoursElement.classList.add('rate-hours'); // Add a class for styling
      const rate = rateList.find(rate => rate.id === rateId);
      hoursElement.textContent = `${rate.description} Hours: ${hours}`;
      hoursContainer.appendChild(hoursElement);
  }

  const previousHoursContainer = document.createElement('div');
  previousHoursContainer.classList.add('hours-worked'); // Add a class for styling

  const previousPayPeriodText = document.createElement('h5');
  previousPayPeriodText.textContent = 'Previous Pay Period Hours:';
  previousPayPeriodText.classList.add('pay-period-text');
  previousHoursContainer.appendChild(previousPayPeriodText);

  // Loop through previousPayPeriodHours and create elements for each rate
  for (const [rateId, hours] of Object.entries(previousRateHours)) {
      const hoursElement = document.createElement('p');
      hoursElement.classList.add('rate-hours'); // Add a class for styling
      const rate = rateList.find(rate => rate.id === rateId);
      hoursElement.textContent = `${rate.description} Hours: ${hours}`;
      previousHoursContainer.appendChild(hoursElement);
  }

  // Append name and hours to the employee div
  employeeDiv.appendChild(nameElement);
  employeeDiv.appendChild(hoursContainer);
  employeeDiv.appendChild(previousHoursContainer);

  // Create a div for confirmation status
  const confirmationContainer = document.createElement('div');
  confirmationContainer.classList.add('confirmation-status');

  // Determine confirmation status
  const confirmationStatus = document.createElement('div');
  confirmationStatus.classList.add('confirmation-status-card');
  if(previousTimeSheet){
    if (previousTimeSheet.confirmedByUser) {
      confirmationStatus.textContent = "Confirmed";
      confirmationStatus.classList.add('confirmed');
    } else {
      confirmationStatus.textContent = "Needs to Confirm";
      confirmationStatus.classList.add('unconfirmed');
    }
    confirmationContainer.appendChild(confirmationStatus);
  }else{
    confirmationStatus.textContent = "No Previous Time Sheet";
    confirmationStatus.classList.add('unconfirmed');
    confirmationContainer.appendChild(confirmationStatus);
  }

  // Append confirmation status to the employee div
  employeeDiv.appendChild(confirmationContainer);

  // Add a class to the main employee div for styling
  employeeDiv.classList.add('employee-list-item'); // New class for styling

  return employeeDiv;
}

function calculateTotalHours(punches) {
  const totalHours = {};
  
  for (let i = 0; i < punches.length; i += 2) {
    const punch1 = punches[i];
    const punch2 = punches[i + 1];
    const startDate = new Date(punch1.dateTime);
    const endDate = new Date(punch2.dateTime);
    
    // Calculate difference in milliseconds
    const diffMs = endDate - startDate;
    
    // Convert to minutes and truncate to whole minutes (like Kotlin's inWholeMinutes)
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    // Convert minutes to hours
    const hoursWorked = diffMinutes / 60;
    
    // Round to 2 decimal places
    const hoursWorkedRounded = Math.round(hoursWorked * 100) / 100;
    
    // Use the rateId from the first punch
    const rateId = punch1.rateId;
    
    // Initialize the rateId in the totalHours object if it doesn't exist
    if (!totalHours[rateId]) {
      totalHours[rateId] = 0;
    }
    
    // Add the hours worked to the corresponding rateId
    totalHours[rateId] += hoursWorkedRounded;
  }
  
  // Ensure all final values in totalHours are rounded to the nearest hundredth
  for (const rateId in totalHours) {
    totalHours[rateId] = Math.round(totalHours[rateId] * 100) / 100;
  }
  
  return totalHours;
}
