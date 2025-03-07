import { calculatePayPeriodStartDate, formatDate} from "../utils/utils.js";

export function loadUsers(
  db, org, getDocs, collection, query, where,
  users, rateList
) {
  const userList = document.getElementById("user-list");

  // Function to render the user list
  function renderUserList(users, punchData) {
    const emptyListNote = document.getElementById("empty_user_list");
    userList.innerHTML = ''; // Clear existing list
    if(users.length !== 0){
      users.forEach(user => {

        const punches = punchData[user.id].punches;
        const rateHours = calculateTotalHours(punches);

        const statusCards = ["status", "status", "status"];

        // Call liStructure to create the list item
        const listItem = liStructure(user.name, rateHours, rateList, statusCards);
        userList.appendChild(listItem);
      });
      emptyListNote.style.display = "none";
    }else{
      emptyListNote.style.display = "block";
    }
  }

  const date = new Date();
  const todayAtStart = new Date(date);
  todayAtStart.setHours(0, 0, 0, 0);
  
  const todayAtEnd = new Date(date);
  todayAtEnd.setHours(23, 59, 59, 999);
  
  const payPeriodStart = calculatePayPeriodStartDate(org.goLiveDate, todayAtStart);
  const payPeriodEnd = todayAtEnd;
  
  const isoStartDate = payPeriodStart.toISOString();
  const isoEndDate = payPeriodEnd.toISOString();

  getAllEmployeePunches(db, org.id, getDocs, collection, query, where, isoStartDate, isoEndDate)
    .then(punchData => {
      renderUserList(users, punchData);
    });


  // Current pay period
  const payPeriodText = document.getElementById("current-pay-period");
  payPeriodText.textContent = `Current Pay Period: ${formatDate(payPeriodStart)} - ${formatDate(payPeriodEnd)}`;

}

async function getAllEmployeePunches(db, organizationId, getDocs, collection, query, where, startDate, endDate) {
  const usersSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
  const punchesData = {};

  for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Create a query to fetch punches within the date range
      const punchesQuery = query(
        collection(db, `organizations/${organizationId}/users/${userId}/punches`),
        where("dateTime", ">=", startDate),
        where("dateTime", "<=", endDate)
      );

      // Make query a snapshotRequest
      const punchesSnapshot = await getDocs(punchesQuery);
      const punches = punchesSnapshot.docs.map(punchDoc => ({ id: punchDoc.id, ...punchDoc.data() }));
      punchesData[userId] = {
          user: { id: userId, ...userDoc.data() },
          punches: punches
      };
  }

  return punchesData;
}

function liStructure(name, totalHours, rateList, statusCards) {
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

  // Loop through totalHours and create elements for each rate
  for (const [rateId, hours] of Object.entries(totalHours)) {
      const hoursElement = document.createElement('p');
      hoursElement.classList.add('rate-hours'); // Add a class for styling
      const rate = rateList.find(rate => rate.id === rateId);
      hoursElement.textContent = `${rate.description} Hours: ${hours}`;
      hoursContainer.appendChild(hoursElement);
  }

  // Append name and hours to the employee div
  employeeDiv.appendChild(nameElement);
  employeeDiv.appendChild(hoursContainer);

  // Create a div for status cards
  const statusContainer = document.createElement('div');
  statusContainer.classList.add('status-cards');

  // Create status cards
  statusCards.forEach(status => {
      const statusCard = document.createElement('div');
      statusCard.classList.add('status-card');
      statusCard.textContent = status; // Assuming status is a string
      statusContainer.appendChild(statusCard);
  });

  // Append status cards to the employee div
  employeeDiv.appendChild(statusContainer);

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
    const hoursWorked = (endDate - startDate) / (1000 * 60 * 60);

    const hoursWorkedRounded = Math.round(hoursWorked * 100) / 100

    // Use the rateId from the first punch (assuming they are the same for pairs)
    const rateId = punch1.rateId;

    // Initialize the rateId in the totalHours object if it doesn't exist
    if (!totalHours[rateId]) {
        totalHours[rateId] = 0;
    }

    // Add the hours worked to the corresponding rateId
    totalHours[rateId] += hoursWorkedRounded;
  }

  return totalHours;
}
 