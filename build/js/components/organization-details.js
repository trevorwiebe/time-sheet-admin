
export function setupOrganizationForm(db, addDoc, collection) {
    
    const form = document.getElementById("org-form");
    const name = document.getElementById("org-name-field");
    const payPeriodDOWStart = document.getElementById("day-selector");
    const payPeriodDuration = document.getElementById("payperiod-value");
    const payperiodUnit = document.getElementById("unit-selector");
    if (form) {
        form.addEventListener("submit", async (event) => {
        event.preventDefault();
            const org = {
                name: name.value,
                payPeriodDOWStart: payPeriodDOWStart.value,
                payPeriodDuration: payPeriodDuration.value,
                payperiodUnit: payperiodUnit.value
            };

            await updateOrg(db, addDoc, collection, org);
        });
    }
}

async function updateOrg(db, addDoc, collection, org){
    try {
        const docRef = await addDoc(collection(db, "organizations"), org);
        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}