import { calculatePayPeriodStartDate, formatDate} from "../utils/utils.js";

export function loadUsers(
  db, org, getDocs, collection, query, where,
  users,
) {
  const userList = document.getElementById("user-list");

  // Function to render the user list
  function renderUserList(users) {
    const emptyListNote = document.getElementById("empty_user_list");
    userList.innerHTML = ''; // Clear existing list
    if(users.length !== 0){
      users.forEach(user => {

        const totalHours = "45";
        const statusCards = ["status", "status", "status"];

        // Call liStructure to create the list item
        const listItem = liStructure(user.name, totalHours, statusCards);
        userList.appendChild(listItem);
      });
      emptyListNote.style.display = "none";
    }else{
      emptyListNote.style.display = "block";
    }
  }

  renderUserList(users);

  const todaysDate = new Date()
  todaysDate.setHours(0, 0, 0, 0);
  const startDate = calculatePayPeriodStartDate(org.goLiveDate, todaysDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 14);

  const isoStartDate = startDate.toISOString();
  const isoTodaysDate = todaysDate.toISOString();

  getAllEmployeePunches(db, org.id, getDocs, collection, query, where, isoStartDate, isoTodaysDate)
    .then(punchesData => {
      console.log(punchesData);
    });


  // Current pay period
  const payPeriodText = document.getElementById("current-pay-period");
  payPeriodText.textContent = `Current Pay Period: ${formatDate(startDate)} - ${formatDate(endDate)}`;

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

function liStructure(name, totalHours, statusCards) {
  // Create a div for the employee details
  const employeeDiv = document.createElement('div');
  employeeDiv.classList.add('employee-details'); // Add a class for styling

  // Create the employee name and total hours worked
  const nameElement = document.createElement('h4');
  nameElement.classList.add('employee-name'); // Add a class for styling
  nameElement.textContent = name;

  const hoursElement = document.createElement('p');
  hoursElement.classList.add('hours-worked'); // Add a class for styling
  hoursElement.textContent = `Hours Worked: ${totalHours}`;

  // Append name and hours to the employee div
  employeeDiv.appendChild(nameElement);
  employeeDiv.appendChild(hoursElement);

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
 