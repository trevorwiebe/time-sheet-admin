export function loadUsers(
  usersList,
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

  renderUserList(usersList)

}

function createUserListItem(user) {
    const listItem = document.createElement('li');
    listItem.textContent = `${user.name} \n\n(${user.email})`; // Customize the display text
    listItem.classList.add('timesheet-list-item'); // Add a class for styling
  
    listItem.addEventListener('click', () => {
      

  
    });
  
    return listItem;
  }