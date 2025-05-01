const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const {log, error} = require("firebase-functions/logger");
const {onRequest} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {processOrg} = require("./utils.js");
admin.initializeApp();

exports.setCustomClaims = functions.https.onCall(async (data, context) => {
  const uid = data.data.uid;
  const organizationId = data.data.organizationId;
  if (!uid || !organizationId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with two arguments: uid, organizationId.",
    );
  }
  try {
    // Set custom claims
    await admin.auth()
        .setCustomUserClaims(uid, {organizationId: organizationId});
    const result = {"uid": uid, "organizationId": organizationId};
    log("customClaims set successfully");
    return result;
  } catch (er) {
    error(`Error setting custom claims: ${er}`);
    throw new functions.https.HttpsError(
        "internal", "Unable to set custom claims.",
    );
  }
});

exports.updateUser = functions.https.onCall(async (data, context) => {
  const {uid, email, displayName} = data.data;
  try {
    await admin.auth().updateUser(uid, {email, displayName});
    log("User updated successfully");
    return {success: true, message: "User updated successfully."};
  } catch (er) {
    error(er);
    return {success: false, message: er.message};
  }
});

exports.deleteUser = functions.https.onCall(async (data, context) => {
  const {uid} = data.data;
  try {
    await admin.auth().deleteUser(uid);
    log("User deleted successfully");
    return {success: true, message: "User deleted successfully."};
  } catch (er) {
    error(er);
    return {success: false, message: er.message};
  }
});

// Configure Nodemailer transport
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.APP_PASSWORD,
  },
});

exports.sendWelcomeEmail = functions.https.onCall(async (data, context) => {
  const {email, password} = data.data;
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: email,
    subject: "Welcome to Timesheet!",
    text: `Welcome! Your account has been created successfully. 
        Your password is: ${password}`,
  };
  try {
    await transporter.sendMail(mailOptions);
    log("Welcome email sent successfully");
    return {message: "Welcome email sent successfully!"};
  } catch (er) {
    error(er);
    throw new functions.https.HttpsError("internal", "Unable to send email.");
  }
});

exports.setNewTimeSheets = onSchedule("1 0 * * *", async (event) => {
  const db = admin.firestore();
  try {
    // Fetch all organizations
    const organizationsSnapshot = await db.collection("organizations").get();

    // Create an array to hold all promises
    const promises = [];

    organizationsSnapshot.forEach((doc) => {
      const organizationId = doc.id;
      const goLiveDate = doc.data().goLiveDate;

      // Get the current date
      const date = new Date();
      const todayAtStart = new Date(date);
      todayAtStart.setHours(0, 0, 0, 0);

      // Push the promise into our array
      promises.push(
          processOrg(db, organizationId, goLiveDate, todayAtStart),
      );
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    console.log("Time sheets created successfully");
    return null; // Return null when successful
  } catch (error) {
    console.error("Error in setNewTimeSheets function:", error);
    throw new Error("Failed to create time sheets: " + error.message);
  }
});

exports.manualTimesheetCreation = onRequest(async (req, res) => {
  const db = admin.firestore();
  try {
    // Fetch all organizations
    const organizationsSnapshot = await db.collection("organizations").get();

    // Create an array to hold all promises
    const promises = [];

    organizationsSnapshot.forEach((doc) => {
      const organizationId = doc.id;
      const goLiveDate = doc.data().goLiveDate;

      // Get the current date
      const date = new Date();
      const todayAtStart = new Date(date);
      todayAtStart.setHours(0, 0, 0, 0);

      // Push the promise into our array
      promises.push(
          processOrg(db, organizationId, goLiveDate, todayAtStart),
      );
    });

    // Wait for all promises to resolve
    await Promise.all(promises);

    res.status(200).send("Time sheets created successfully");
  } catch (error) {
    res.status(500).send(error);
    log("Error fetching organizations:", error);
    console.error("Error fetching organizations:", error);
  }
});

exports.calculateEmployeePTO = onSchedule("1 0 * * *", async (event) => {
  const db = admin.firestore();

  try {
    // Fetch all organizations
    const organizationsSnapshot = await db.collection("organizations").get();

    // Iterate through each organization
    for (const orgDoc of organizationsSnapshot.docs) {
      const organizationId = orgDoc.id;

      // Fetch all users in the organization
      const usersSnapshot = await db
          .collection(`organizations/${organizationId}/users`)
          .get();

      // Iterate through each user
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const hireDate = userData.hireDate;

        if (!hireDate || !userData.fullTime) continue;

        const [hireYear, hireMonth, hireDay] = hireDate.split("-").map(Number);
        const hireDateObj = new Date(hireYear, hireMonth - 1, hireDay);

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        // Handle leap year scenario
        const isLeapYearHire = hireMonth === 2 && hireDay === 29;
        const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) ||
          year % 400 === 0;

        const isAnniversary =
          isLeapYearHire ?
            (isLeapYear(today.getFullYear()) &&
              currentMonth === 1 && currentDay === 29) ||
              (!isLeapYear(today.getFullYear()) &&
                currentMonth === 1 && currentDay === 28) :
            currentMonth === hireDateObj.getMonth() &&
              currentDay === hireDateObj.getDate();

        if (isAnniversary) {
          const yearsWorked = today.getFullYear() - hireDateObj.getFullYear();

          // Determine PTO based on years worked
          let ptoDays = 0;
          if (yearsWorked === 1) ptoDays = 7;
          else if (yearsWorked >= 2 && yearsWorked <= 4) ptoDays = 12;
          else if (yearsWorked >= 5) ptoDays = 17;

          // Update user's PTO balance
          const currentPTO = userData.ptoBalance || 0;
          const newPTOBalance = currentPTO + ptoDays;

          await db
              .collection(`organizations/${organizationId}/users`)
              .doc(userDoc.id)
              .update({ptoBalance: newPTOBalance});

          log(`PTO updated for user ${userDoc.id} 
            in organization ${organizationId}`);
        }
      }
    }

    log("PTO calculation completed successfully");
    return null;
  } catch (error) {
    error("Error calculating PTO:", error);
    throw new Error("Failed to calculate PTO: " + error.message);
  }
});
