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
          const listItem = createUserListItem(user);
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

function createUserListItem(user) {
  const listItem = document.createElement('li');
  listItem.textContent = `${user.name} \n\n(${user.email})`; // Customize the display text
  listItem.classList.add('timesheet-list-item'); // Add a class for styling

  listItem.addEventListener('click', () => {

  });

  return listItem;
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