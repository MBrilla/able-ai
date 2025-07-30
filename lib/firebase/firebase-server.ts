import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";

const serviceAccountKeyString =
  process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_JSON;

if (!admin.apps.length) {
  let serviceAccount;
  if (!serviceAccountKeyString) {
    serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
    };
  } else {
    serviceAccount = JSON.parse(serviceAccountKeyString);

  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const dbdoc = admin.firestore();
export default admin;
export const authServer = getAuth(admin.app());
