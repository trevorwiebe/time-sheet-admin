
export function setupOrganizationForm(db, addDoc, doc, getDoc, setDoc, collection, org, updateCallback) {
    
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