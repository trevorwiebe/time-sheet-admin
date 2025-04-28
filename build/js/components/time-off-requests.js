import { deleteDoc, getDocs, collection, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { formatDateString, formatDateToLongString } from "../utils/time-off-utils.js";

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
              const nameElement = document.createElement('p');
              nameElement.classList.add('employee-name'); 
              nameElement.textContent = employee.name;

              const labelDiv = document.createElement('div');
              labelDiv.classList.add('label-div');
        
              const timeOffLabel = document.createElement('p');
              timeOffLabel.classList.add('label');
              timeOffLabel.textContent = "Date Time Off Request";
        
              const approvedRequestDate = document.createElement('p');
              approvedRequestDate.classList.add('label');
              approvedRequestDate.textContent = "Approved Date";

              labelDiv.appendChild(timeOffLabel);
              labelDiv.appendChild(approvedRequestDate);

              employeeDiv.appendChild(nameElement);
              employeeDiv.appendChild(labelDiv);

              userList.appendChild(employeeDiv);
              existingItems[employee.id] = employeeDiv; 
          }

          // Create a sublist for time-off requests
          const timeOffList = document.createElement('ul');
          employee.timeOffRequests.forEach(request => {
              const requestItem = document.createElement('div');
              requestItem.classList.add('request-item');

              const datesDiv = document.createElement('div');
              datesDiv.classList.add('dates-div');

              if(request.timeOffRequestApproveTime != null) {
                const requestDate = document.createElement('p');
                requestDate.classList.add('date');
                requestDate.textContent = `${formatDateString(request.requestOffTime)}`;

                const approveDate = document.createElement('p');
                approveDate.classList.add('date');
                approveDate.textContent = `${formatDateString(request.timeOffRequestApproveTime)}`;

                datesDiv.appendChild(requestDate);
                datesDiv.appendChild(approveDate);
              } else {
                const requestDate = document.createElement('p');
                requestDate.classList.add('date');
                requestDate.textContent = `${formatDateString(request.requestOffTime)}`;
                datesDiv.appendChild(requestDate);
              }

              requestItem.appendChild(datesDiv);

              // Create the Approve button if date approved is null
              if (!request.timeOffRequestApproveTime) {
                const buttonSetDiv = document.createElement('div');
                buttonSetDiv.classList.add('button-set'); // Add a class for styling

                  const approveButton = document.createElement('button');
                  approveButton.textContent = 'Approve';
                  approveButton.classList.add('approve-button'); // Add a class for styling
                  approveButton.addEventListener('click', async () => {
                      await approveTimeOffRequest(db, organizationId, employee.id, request.id);
                      // Update the request item without re-rendering the list

                      datesDiv.innerHTML = ''; // Clear existing dates
                      buttonSetDiv.innerHTML = ''; // Clear existing buttons

                      const requestDate = document.createElement('p');
                      requestDate.classList.add('date');
                      requestDate.textContent = `${formatDateString(request.requestOffTime)}`;

                      const approveDate = document.createElement('p');
                      approveDate.classList.add('date');
                      approveDate.textContent = `${formatDateToLongString(new Date())}`;

                      datesDiv.appendChild(requestDate);
                      datesDiv.appendChild(approveDate);

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
                  buttonSetDiv.appendChild(approveButton);

                  // Create the Deny button
                  const denyButton = document.createElement('button');
                  denyButton.classList.add('deny-button'); // Add a class for styling
                  denyButton.textContent = 'Deny';
                  denyButton.addEventListener('click', async () => {
                      await deleteTimeOffRequest(db, organizationId, employee.id, request.id);
                      // Remove the request item from the list
                      requestItem.remove();
                  });
                  buttonSetDiv.appendChild(denyButton);

                  requestItem.appendChild(buttonSetDiv);
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
