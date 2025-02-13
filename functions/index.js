const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const {log, error} = require("firebase-functions/logger");
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
