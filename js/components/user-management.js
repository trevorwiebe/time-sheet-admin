export function loadUserManagement() {
    const userSection = document.getElementById("user-management");
    userSection.innerHTML = `
      <h2>User Management</h2>
      <button onclick="addUser()">Add New User</button>
      <div id="user-list"></div>
    `;
  }
  
  function addUser() {
    alert("User added!");
  }