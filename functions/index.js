const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.setCustomClaims = functions.https.onCall(async (data, context) => {
    const uid = data.data.uid;
    const organizationId = data.data.organizationId;
    if (!uid || !organizationId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with two arguments: "uid" and "organizationId".');
    }
    try {
        // Set custom claims
        await admin.auth().setCustomUserClaims(uid, { organizationId: organizationId });
        const result = { "uid": uid, "organizationId": organizationId };
        return result
    } catch (error) {
        console.error('Error setting custom claims:', error);
        throw new functions.https.HttpsError('internal', 'Unable to set custom claims.');
    }
})