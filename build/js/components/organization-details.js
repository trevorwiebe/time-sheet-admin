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
    const rateList = document.getElementById("rates_list");
    const rates = await fetchRates(db, org.id, collection, getDocs);
    rateList.innerHTML = '';
    if(rates.length !== 0){
        rates.forEach(rate => {
            const rateListItem = createRateListItem(rate);
            rateList.appendChild(rateListItem);
        })
    }

    // Add or edit rates
    const rateForm = document.getElementById('new-rate-form');
    if(rateForm){
        rateForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const rateName = document.getElementById('rate-name-field');
     
            // Call the saveRate function
            await saveRate(db, addDoc, collection, org.id, rateName.value)
                .then((rate) => {
                    const rateListItem = createRateListItem(rate);
                    rateList.appendChild(rateListItem);
                    rateName.value = "";
                })
        });
    }
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

function createRateListItem(rate){
    const rateItem = document.createElement('li');
    rateItem.textContent = rate.description;
    rateItem.classList.add('user-list-item');
    
    return rateItem;
}