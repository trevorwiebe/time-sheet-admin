import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js"

export function setupOrganizationForm(db) {
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

            await updateOrg(db, org);
        });
    }
}

async function updateOrg(db, org){
    try {
        const docRef = await addDoc(collection(db, "organizations"), org);
        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}