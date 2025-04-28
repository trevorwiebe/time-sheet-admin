import { getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

export async function loadTimeOffUsers(db, organizationId){

  const userList = document.getElementById("user-list");
  userList.innerHTML = ''; // Clear existing list

  const employees = await fetchAllEmployeesWithRequests(db, organizationId);

  if (employees.length > 0) {
      employees.forEach(employee => {
          const listItem = document.createElement('li');
          listItem.textContent = employee.name; // Set the employee name
          userList.appendChild(listItem); // Append the list item to the user list

          // Create a sublist for time-off requests
          const timeOffList = document.createElement('ul');
          employee.timeOffRequests.forEach(request => {
              const requestItem = document.createElement('li');
              console.log(request);
              requestItem.textContent = `Request: ${request.requestOffTime} - Date Approved: ${request.timeOffRequestApproveTime}`;

              // Create the Approve button if date approved is null
              if (!request.timeOffRequestApproveTime) {
                  const approveButton = document.createElement('button');
                  approveButton.textContent = 'Approve';
                  approveButton.addEventListener('click', async () => {
                      await approveTimeOffRequest(db, organizationId, employee.id, request.id);
                      // Optionally, refresh the employee list after approval
                      loadTimeOffUsers(db, organizationId);
                  });
                  requestItem.appendChild(approveButton); // Append the button to the request item
              }

              timeOffList.appendChild(requestItem);
          });
          listItem.appendChild(timeOffList); // Append the time-off requests list to the employee list item
      });
  } else {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = "No employees found.";
      userList.appendChild(emptyMessage);
  }
  
}

async function fetchAllEmployeesWithRequests(db, organizationId) {
  try {
      const employeesSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users`));
      const employees = await Promise.all(employeesSnapshot.docs.map(async (doc) => {
          const employeeData = { id: doc.id, ...doc.data() };
          // Fetch time-off requests for each employee
          const timeOffRequestsSnapshot = await getDocs(collection(db, `organizations/${organizationId}/users/${doc.id}/timeOffRequests`));
          employeeData.timeOffRequests = timeOffRequestsSnapshot.docs.map(reqDoc => ({ id: reqDoc.id, ...reqDoc.data() }));
          employeeData.timeOffRequests.sort((a, b) => new Date(a.requestOffTime) - new Date(b.requestOffTime));
          return employeeData;
      }));
      return employees;
  } catch (error) {
      console.error('Error fetching employees with time-off requests:', error);
      return []; // Return an empty array on error
  }
}

async function approveTimeOffRequest(db, organizationId, userId, requestId) {
  const currentDate = new Date();
  // Format the date as YYYY-MM-DD
  const formattedDate = currentDate.toISOString().split('T')[0];
  const requestDocRef = doc(db, `organizations/${organizationId}/users/${userId}/timeOffRequests/${requestId}`);
  try {
      await updateDoc(requestDocRef, { timeOffRequestApproveTime: formattedDate });
      console.log('Time off request approved successfully.');
  } catch (error) {
      console.error('Error approving time off request:', error);
  }
}
