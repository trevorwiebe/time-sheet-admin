let mRateList = "";
let mAccountantList = "";

import { convertToISOString } from "../utils/utils.js";

export async function setupOrganizationForm(db, addDoc, doc, getDoc, getDocs, setDoc, deleteDoc, collection, org, updateCallback) {
    
    // Edit organization
    const form = document.getElementById("org-form");
    const name = document.getElementById("org-name-field");
    const goLiveDate = document.getElementById("golive-date");

    name.value = org.name || "";
    goLiveDate.value = org.goLiveDate || "";

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const newOrg = {
                id: org.id,
                name: name.value,
                goLiveDate: convertToISOString(goLiveDate.value),
            };

            await updateOrg(db, addDoc, doc, getDoc, setDoc, collection, newOrg);

            updateCallback(newOrg)
        });
    }

    // Fetch any available rates
    mRateList = await fetchRates(db, org.id, collection, getDocs);
    setupRatesLi(doc, setDoc, deleteDoc, db, org.id)

    // Add or edit rates
    const rateForm = document.getElementById('new-rate-form');
    if(rateForm){
        rateForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const rateName = document.getElementById('rate-name-field');
     
            // Call the saveRate function
            await saveRate(db, addDoc, collection, org.id, rateName.value)
                .then((rate) => {
                    mRateList = updateRatesList(mRateList, rate, false);
                    setupRatesLi(doc, setDoc, deleteDoc, db, org.id);
                    rateName.value = "";
                })
        });
    }

    const accountantForm = document.getElementById('new-accountant-form');
    if(accountantForm){
        accountantForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = document.getElementById('accountant-name-field');
            const email = document.getElementById('accountant-email-field');

            const accountant = { name: name.value, email: email.value };
            await saveAccountant(db, addDoc, collection, org.id, accountant)
                .then((accountant) => {
                    mAccountantList = updateAccountList(mAccountantList, accountant, false);
                    setupAccountantsLi(db, org.id, collection, getDocs, doc, setDoc, deleteDoc);
                    name.value = "";
                    email.value = "";
                });
        })
    }

    mAccountantList = await fetchAccountants(db, org.id, collection, getDocs);
    setupAccountantsLi(db, org.id, collection, getDocs, doc, setDoc, deleteDoc);

    window.addEventListener("click", (event) => {
        // Check if user clicks on anything that should close the edit_user-box dialog
        const editRatesDialog = document.getElementById("edit_rate_dialog");
        const editAccountantDialog = document.getElementById("edit_accountant_dialog");
        const listItems = document.querySelectorAll('.timesheet-list-item');

        // Check if the click was outside the dialog
        if (
            editRatesDialog && editAccountantDialog &&
            !editRatesDialog.contains(event.target) && !editAccountantDialog.contains(event.target)  &&
            !Array.from(listItems).includes(event.target) &&
            event.target.id != "edit-rate-form-btn" && event.target.id != "edit-accountant-form-btn"
        ) {
            editRatesDialog.style.display = "none";
            editAccountantDialog.style.display = "none";
        }
    });
}

// Add or update current organization
async function updateOrg(db, addDoc, doc, getDoc, setDoc, collection, org) {
    try {
        if(org.id == undefined){
            delete org.id;
            // Add a new organization
            await addDoc(collection(db, 'organizations'), org);
        }else{
            const orgDocRef = doc(db, `organizations/${org.id}`);
            const orgDoc = await getDoc(orgDocRef);
    
            if (orgDoc.exists()) {
                // Update the existing organization
                await setDoc(orgDocRef, org);
            } else {
                // Add a new organization
                await addDoc(collection(db, 'organizations'), org);
            }
        }

        document.getElementById("update_success_box").style.visibility = "visible";
        document.getElementById("message").innerHTML = "Organization saved successfully"
    } catch (e) {
        console.error('Error adding or updating organization:', e);
    }
}


// Rate helper functions
async function saveRate(db, addDoc, collection, organizationId, rate) {
    try {
        // Create a reference to the rates collection for the organization
        const ratesCollectionRef = collection(db, `organizations/${organizationId}/rates`);

        // Save the rate in Firestore with an auto-generated ID
        const docRef = await addDoc(ratesCollectionRef, { description: rate });

        return { id: docRef.id, description: rate };
    } catch (error) {
        console.error('Error saving rate:', error);
        return { success: false, message: 'Error saving rate.' };
    }
}

async function fetchRates(db, organizationId, collection, getDocs) {
    try {
        // Create a reference to the rates collection for the organization
        const ratesCollectionRef = collection(db, `organizations/${organizationId}/rates`);

        // Fetch all rates from Firestore
        const ratesSnapshot = await getDocs(ratesCollectionRef);
        const rates = ratesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return rates;
    } catch (error) {
        console.error('Error fetching rates:', error);
        return []; // Return an empty array on error
    }
}

function setupRatesLi(doc, setDoc, deleteDoc, db, orgId){
    const rateList = document.getElementById("rates_list");
    rateList.innerHTML = '';
    if(mRateList.length !== 0){
        document.getElementById("no-rates-p").style.display = "none";
        mRateList.forEach(rate => {
            const rateListItem = createRateListItem(rate, doc, setDoc, deleteDoc, db, orgId);
            rateList.appendChild(rateListItem);
        })
    }else{
        document.getElementById("no-rates-p").style.display = "block";
    }
}

function createRateListItem(rate, doc, setDoc, deleteDoc, db, organizationId){
    const rateItem = document.createElement('li');
    rateItem.textContent = rate.description;
    rateItem.classList.add('timesheet-list-item');

    rateItem.addEventListener('click', (e)=>{
        e.preventDefault();

        const editRateDialog = document.getElementById("edit_rate_dialog");
        editRateDialog.style.display = "block";

        const rateField = document.getElementById("edit-rate-name-field");
        rateField.value = rate.description;

        const editRateForm = document.getElementById("edit-rate-form");
        editRateForm.addEventListener('submit', async(e) =>{
            e.preventDefault();

            const rateId = rate.id;
            delete rate.id;
            rate.description = rateField.value;
            const newRate = await updateRate(db, doc, setDoc, organizationId, rateId, rate);
            mRateList = updateRatesList(mRateList, newRate, false);
            setupRatesLi(doc, setDoc, deleteDoc, db, organizationId);

            editRateDialog.style.display = "none";
        })

        const deleteRateBtn = document.getElementById('delete-rate-form-btn');
        deleteRateBtn.addEventListener('click', async (e)=>{
            e.preventDefault();

            const rateId = rate.id;
            const deletedRate = await deleteRate(db, doc, deleteDoc, organizationId, rateId);

            mRateList = updateRatesList(mRateList, deletedRate, true);
            setupRatesLi(doc, setDoc, deleteDoc, db, organizationId);

            editRateDialog.style.display = "none";
        })
    });
    
    return rateItem;
}

async function updateRate(db, doc, setDoc, organizationId, rateId, newRate) {
    try {
        // Create a reference to the rate document
        const rateDocRef = doc(db, `organizations/${organizationId}/rates/${rateId}`);

        // Update the rate in Firestore
        await setDoc(rateDocRef, { description: newRate.description }, { merge: true });

        // Return new rate
        return newRate;
    } catch (error) {
        console.error('Error updating rate:', error);
        return { success: false, message: 'Error updating rate.' };
    }
}

function updateRatesList(ratesList, rate, shouldDelete) {
    if (shouldDelete) {
        // Remove the rate from the list
        return ratesList.filter(existingRate => existingRate.id !== rate.id);
    } else {
        // Check if the rate already exists in the list
        const existingRateIndex = ratesList.findIndex(existingRate => existingRate.id === rate.id);

        if (existingRateIndex !== -1) {
            // Update the existing rate
            ratesList[existingRateIndex] = rate;
        } else {
            // Add the new rate to the list
            ratesList.push(rate);
        }
        return ratesList;
    }
}

async function deleteRate(db, doc, deleteDoc, organizationId, rateId) {
    try {
        // Create a reference to the rate document
        const rateDocRef = doc(db, `organizations/${organizationId}/rates/${rateId}`);

        // Delete the rate from Firestore
        await deleteDoc(rateDocRef);

        return { id: rateId, description: undefined };
    } catch (error) {
        return { success: false, message: 'Error deleting rate.' };
    }
}


// Accountant functions
async function saveAccountant(db, addDoc, collection, organizationId, accountant) {
    try {
        // Create a reference to the accountants collection for the organization
        const accountantsCollectionRef = collection(db, `organizations/${organizationId}/accountants`);

        // Save the accountant in Firestore with an auto-generated ID
        const docRef = await addDoc(accountantsCollectionRef, accountant);

        return { id: docRef.id, ...accountant }; // Return the saved accountant with its ID
    } catch (error) {
        console.error('Error saving accountant:', error);
        return { success: false, message: 'Error saving accountant.' };
    }
}

async function fetchAccountants(db, organizationId, collection, getDocs) {
    try {
        // Create a reference to the accountants collection for the organization
        const accountantsCollectionRef = collection(db, `organizations/${organizationId}/accountants`);

        // Fetch all accountants from Firestore
        const accountantsSnapshot = await getDocs(accountantsCollectionRef);
        const accountants = accountantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return accountants;
    } catch (error) {
        console.error('Error fetching accountants:', error);
        return []; // Return an empty array on error
    }
}

async function updateAccountant(db, doc, setDoc, organizationId, accountantId, updatedAccountant) {
    try {
        // Create a reference to the accountant document
        const accountantDocRef = doc(db, `organizations/${organizationId}/accountants/${accountantId}`);

        // Update the accountant in Firestore
        await setDoc(accountantDocRef, updatedAccountant, { merge: true });

        // Return the updated accountant
        return updatedAccountant;
    } catch (error) {
        console.error('Error updating accountant:', error);
        return { success: false, message: 'Error updating accountant.' };
    }
}

async function setupAccountantsLi(db, organizationId, collection, getDocs, doc, setDoc, deleteDoc) {
    const accountantsList = document.getElementById('accountant_list');

    const accountants = await fetchAccountants(db, organizationId, collection, getDocs);

    accountantsList.innerHTML = ''; // Clear existing list
    if (accountants.length !== 0) {
        document.getElementById('no-accountants-p').style.display = 'none';
        accountants.forEach(accountant => {
            const listItem = createAccountantListItem(accountant, doc, setDoc, deleteDoc, collection, getDocs, db, organizationId);
            accountantsList.appendChild(listItem);
        });
    } else {
        document.getElementById('no-accountants-p').style.display = 'block';
    }
}

function createAccountantListItem(accountant, doc, setDoc, deleteDoc, collection, getDocs, db, organizationId) {
    const listItem = document.createElement('li');
    listItem.textContent = `${accountant.name} (${accountant.email})`; // Customize the display text
    listItem.classList.add('timesheet-list-item'); // Add a class for styling

    listItem.addEventListener('click', (e) => {
        e.preventDefault();

        const editAccountantDialog = document.getElementById("edit_accountant_dialog");
        editAccountantDialog.style.display = "block";

        const accountantName = document.getElementById("edit-accountant-name-field");
        accountantName.value = accountant.name;

        const accountantEmail = document.getElementById("edit-accountant-email-field");
        accountantEmail.value = accountant.email;

        const editAccountantForm = document.getElementById("edit-accountant-form");
        editAccountantForm.addEventListener('submit', async(e) => {
            e.preventDefault();

            const accountantId = accountant.id;
            accountant.name = accountantName.value;
            accountant.email = accountantEmail.value;

            const newAccountant = await updateAccountant(db, doc, setDoc, organizationId, accountantId, accountant);
            mAccountantList = updateAccountList(mAccountantList, newAccountant, false);
            setupAccountantsLi(db, organizationId, collection, getDocs, doc, setDoc, deleteDoc);

            editAccountantDialog.style.display = "none";
        })

        const deleteAccountantBtn = document.getElementById("delete-accountant-form-btn");
        deleteAccountantBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const accountantId = accountant.id;
            await deleteAccountant(db, doc, deleteDoc, organizationId, accountantId);
            const accountantToDelete = {id: accountantId, name: undefined, email: undefined};
            mAccountantList = updateAccountList(mAccountantList, accountantToDelete, true);
            setupAccountantsLi(db, organizationId, collection, getDocs, doc, setDoc, deleteDoc);

            editAccountantDialog.style.display = "none";
        })
    });

    return listItem;
}

function updateAccountList(accountantsList, accountant, shouldDelete) {
    if (shouldDelete) {
        // Remove the accountant from the list
        return accountantsList.filter(existingAccountant => existingAccountant.id !== accountant.id);
    } else {
        // Check if the accountant already exists in the list
        const existingAccountantIndex = accountantsList.findIndex(existingAccountant => existingAccountant.id === accountant.id);

        if (existingAccountantIndex !== -1) {
            // Update the existing accountant
            accountantsList[existingAccountantIndex] = accountant;
        } else {
            // Add the new accountant to the list
            accountantsList.push(accountant);
        }
        return accountantsList;
    }
}

async function deleteAccountant(db, doc, deleteDoc, organizationId, accountantId) {
    try {
        // Create a reference to the accountant document
        const accountantDocRef = doc(db, `organizations/${organizationId}/accountants/${accountantId}`);

        // Use deleteDoc to remove the accountant document
        await deleteDoc(accountantDocRef);

        return { id: accountantId, success: true }; // Return success message
    } catch (error) {
        console.error('Error deleting accountant:', error);
        return { success: false, message: 'Error deleting accountant.' };
    }
}