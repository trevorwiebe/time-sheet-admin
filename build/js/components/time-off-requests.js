import { deleteDoc, getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

export async function loadTimeOffUsers(db, organizationId){

  const userList = document.getElementById("user-list");
  userList.innerHTML = ''; // Clear existing list

  const employees = await fetchAllEmployeesWithRequests(db, organizationId);

  if (employees.length > 0) {

    // Create a map to keep track of existing employee list items
    const existingItems = {};

      employees.forEach(employee => {
          if (!existingItems[employee.id]) {

              // Create a div for the employee details
              const employeeDiv = document.createElement('div');
              employeeDiv.classList.add('employee-time-off'); 

              // Create the employee name
              const nameElement = document.createElement('h4');
              nameElement.classList.add('employee-name'); 
              nameElement.textContent = employee.name;

              employeeDiv.appendChild(nameElement);

              userList.appendChild(employeeDiv);
              existingItems[employee.id] = employeeDiv; 
          }

          // Create a sublist for time-off requests
          const timeOffList = document.createElement('ul');
          employee.timeOffRequests.forEach(request => {
              const requestItem = document.createElement('div');
              if(request.timeOffRequestApproveTime != null) {
                requestItem.textContent = `Request: ${request.requestOffTime} - Date Approved: ${request.timeOffRequestApproveTime}`;
              } else {
                requestItem.textContent = `Request: ${request.requestOffTime}`;
              }

              // Create the Approve button if date approved is null
              if (!request.timeOffRequestApproveTime) {
                  const approveButton = document.createElement('button');
                  approveButton.textContent = 'Approve';
                  approveButton.classList.add('approve-button'); // Add a class for styling
                  approveButton.addEventListener('click', async () => {
                      await approveTimeOffRequest(db, organizationId, employee.id, request.id);
                      // Update the request item without re-rendering the list
                      requestItem.textContent = `Request: ${request.requestOffTime} - Date Approved: ${new Date().toISOString().split('T')[0]}`;
                      // Create the Deny button
                      const denyButton = document.createElement('button');
                      denyButton.classList.add('deny-button'); // Add a class for styling
                      denyButton.textContent = 'Delete';
                      denyButton.addEventListener('click', async () => {
                          await deleteTimeOffRequest(db, organizationId, employee.id, request.id);
                          // Remove the request item from the list
                          requestItem.remove();
                      });
                      requestItem.appendChild(denyButton);
                  });
                  requestItem.appendChild(approveButton);

                  // Create the Deny button
                  const denyButton = document.createElement('button');
                  denyButton.classList.add('deny-button'); // Add a class for styling
                  denyButton.textContent = 'Deny';
                  denyButton.addEventListener('click', async () => {
                      await deleteTimeOffRequest(db, organizationId, employee.id, request.id);
                      // Remove the request item from the list
                      requestItem.remove();
                  });
                  requestItem.appendChild(denyButton);
              }else{

                  // Create the Deny button
                  const denyButton = document.createElement('button');
                  denyButton.classList.add('deny-button'); // Add a class for styling
                  denyButton.textContent = 'Delete';
                  denyButton.addEventListener('click', async () => {
                      await deleteTimeOffRequest(db, organizationId, employee.id, request.id);
                      // Remove the request item from the list
                      requestItem.remove();
                  });
                  requestItem.appendChild(denyButton);
              }

              timeOffList.appendChild(requestItem);
          });
          existingItems[employee.id].appendChild(timeOffList);
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
  } catch (error) {
      console.error('Error approving time off request:', error);
  }
}

async function deleteTimeOffRequest(db, organizationId, userId, requestId) {
  const requestDocRef = doc(db, `organizations/${organizationId}/users/${userId}/timeOffRequests/${requestId}`);
  try {
      await deleteDoc(requestDocRef);
  } catch (error) {
      console.error('Error deleting time off request:', error);
  }
}
