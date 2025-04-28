import { deleteDoc, getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

export async function loadTimeOffUsers(db, organizationId){

  const userList = document.getElementById("user-list");
  userList.innerHTML = ''; // Clear existing list

  const employees = await fetchAllEmployeesWithRequests(db, organizationId);

  if (employees.length > 0) {
      employees.forEach(employee => {

          // Create a div for the employee details
          const employeeDiv = document.createElement('div');
          employeeDiv.classList.add('employee-time-off'); // Add a class for styling

          // Create the employee name
          const nameElement = document.createElement('h4');
          nameElement.classList.add('employee-name'); // Add a class for styling
          nameElement.textContent = employee.name; // Set the employee name

          // Create a sublist for time-off requests
          const timeOffList = document.createElement('ul');
          employee.timeOffRequests.forEach(request => {
              const requestItem = document.createElement('div');
              requestItem.classList.add('request-item'); // Add a class for styling

              const timeOff = document.createElement('p');
              timeOff.classList.add('request-time-off'); // Add a class for styling
              timeOff.textContent = `Request: ${request.requestOffTime}`
              requestItem.appendChild(timeOff); // Append the time-off request to the item
            
              if(request.timeOffRequestApproveTime) {
                const dateApproved = document.createElement('p');
                dateApproved.classList.add('request-date-approved'); // Add a class for styling
                dateApproved.textContent = `Date Approved: ${request.timeOffRequestApproveTime}`;
                requestItem.appendChild(dateApproved); // Append the date approved to the item
              }
            
              // Create the Approve button if date approved is null
              if (!request.timeOffRequestApproveTime) {
                  const approveButton = document.createElement('button');
                  approveButton.classList.add('approve-button'); // Add a class for styling
                  approveButton.textContent = 'Approve';
                  approveButton.addEventListener('click', async () => {
                      await approveTimeOffRequest(db, organizationId, employee.id, request.id);
                      // Optionally, refresh the employee list after approval
                      loadTimeOffUsers(db, organizationId);
                  });
                  requestItem.appendChild(approveButton);

                  const denyButton = document.createElement('button');
                  denyButton.classList.add('deny-button'); // Add a class for styling
                  denyButton.textContent = 'Deny';
                  denyButton.addEventListener('click', async () => {
                      await deleteTimeOffRequest(db, organizationId, employee.id, request.id);
                      loadTimeOffUsers(db, organizationId);
                  });
                  requestItem.appendChild(denyButton);
              }

              const divider = document.createElement('divider');
              divider.classList.add('divider'); // Add a class for styling
              requestItem.appendChild(divider); // Append the divider to the request item

              timeOffList.appendChild(requestItem);
          });

          // Append the name and time-off list to the employee div
          employeeDiv.appendChild(nameElement);
          employeeDiv.appendChild(timeOffList);
          userList.appendChild(employeeDiv); // Append the employee div to the user list
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

async function deleteTimeOffRequest(db, organizationId, userId, requestId) {
  const requestDocRef = doc(db, `organizations/${organizationId}/users/${userId}/timeOffRequests/${requestId}`);
  try {
      await deleteDoc(requestDocRef);
      console.log('Time off request deleted successfully.');
  } catch (error) {
      console.error('Error deleting time off request:', error);
  }
}
