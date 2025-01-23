export function setupOrganizationForm(db, addDoc, doc, getDoc, setDoc, collection, org, updateCallback) {
    
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

    // Add or edit rates
    const rateForm = document.getElementById('new-rate-form');
    if(rateForm){
        rateForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const rateName = document.getElementById('rate-name-field').value;
     
            // Call the saveRate function
            const result = await saveRate(db, addDoc, collection, org.id, rateName);
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

        console.log('Rate saved successfully with ID:', docRef.id);
        return { success: true, message: 'Rate saved successfully!', rateId: docRef.id };
    } catch (error) {
        console.error('Error saving rate:', error);
        return { success: false, message: 'Error saving rate.' };
    }
}