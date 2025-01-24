let mRateList = ""

export async function setupOrganizationForm(db, addDoc, doc, getDoc, getDocs, setDoc, collection, org, updateCallback) {
    
    // Edit organization
    const form = document.getElementById("org-form");
    const name = document.getElementById("org-name-field");
    const payPeriodDOWStart = document.getElementById("day-selector");
    const payPeriodDuration = document.getElementById("payperiod-value");
    const payperiodUnit = document.getElementById("unit-selector");

    name.value = org.name || "";
    payPeriodDOWStart.value = org.payPeriodDOWStart || "Monday";
    payPeriodDuration.value = org.payPeriodDuration || "2";
    payperiodUnit.value = org.payperiodUnit || "week";

    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const newOrg = {
                id: org.id,
                name: name.value,
                payPeriodDOWStart: payPeriodDOWStart.value,
                payPeriodDuration: payPeriodDuration.value,
                payperiodUnit: payperiodUnit.value
            };

            await updateOrg(db, addDoc, doc, getDoc, setDoc, collection, newOrg);

            updateCallback(newOrg)
        });
    }

    // Fetch any available rates
    mRateList = await fetchRates(db, org.id, collection, getDocs);
    setupRatesLi(doc, setDoc, db, org.id)

    // Add or edit rates
    const rateForm = document.getElementById('new-rate-form');
    if(rateForm){
        rateForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const rateName = document.getElementById('rate-name-field');
     
            // Call the saveRate function
            await saveRate(db, addDoc, collection, org.id, rateName.value)
                .then((rate) => {
                    mRateList = updateRatesList(mRateList, rateName, false);
                    setupRatesLi(doc, setDoc, db, org.id)
                })
        });
    }


    // Check if user clicks on anything that should close the edit_user-box dialog
    const editRatesDialog = document.getElementById("edit_rate_dialog");
    const ratesListItems = document.querySelectorAll('.timesheet-list-item');
    window.addEventListener("click", (event) => {
        // Check if the click was outside the dialog
        if (
            editRatesDialog && 
            !editRatesDialog.contains(event.target) && 
            !Array.from(ratesListItems).includes(event.target) &&
            event.target.id != "edit-rate-form-btn"
        ) {
            editRatesDialog.style.display = "none";
        }
    });
}

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

function setupRatesLi(doc, setDoc, db, orgId){
    const rateList = document.getElementById("rates_list");
    rateList.innerHTML = '';
    if(mRateList.length !== 0){
        mRateList.forEach(rate => {
            const rateListItem = createRateListItem(rate, doc, setDoc, db, orgId);
            rateList.appendChild(rateListItem);
        })
    }
}

function createRateListItem(rate, doc, setDoc, db, organizationId){
    const rateItem = document.createElement('li');
    rateItem.textContent = rate.description;
    rateItem.classList.add('timesheet-list-item');

    rateItem.addEventListener('click', (e)=>{
        e.preventDefault();

        const editRateDialog = document.getElementById("edit_rate_dialog")
        editRateDialog.style.display = "block";

        const rateField = document.getElementById("edit-rate-name-field");
        rateField.value = rate.description;

        const editRateForm = document.getElementById("edit-rate-form")
        editRateForm.addEventListener('submit', async(e) =>{
            e.preventDefault();

            const rateId = rate.id;
            delete rate.id;
            rate.description = rateField.value;
            const newRate = await updateRate(db, doc, setDoc, organizationId, rateId, rate);
            mRateList = updateRatesList(mRateList, newRate, false);
            setupRatesLi(doc, setDoc, db, organizationId)

            editRateDialog.style.display = "none";
        })
    })
    
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