#!/bin/bash
# based on https://medium.com/evenbit/configuring-firebase-app-hosting-with-google-secrets-manager-2b83c09f3ad9
source ./env.local
echo $GEMINI_API_KEY | firebase apphosting:secrets:set --force --data-file - gemini-api-key
echo $AUTH_SECRET | firebase apphosting:secrets:set --force --data-file - auth-secret
echo $NEXT_PUBLIC_FIREBASE_API_KEY | firebase apphosting:secrets:set --force --data-file - firebase-api-key
echo $NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | firebase apphosting:secrets:set --force --data-file - firebase-auth-domain
echo $NEXT_PUBLIC_FIREBASE_PROJECT_ID | firebase apphosting:secrets:set --force --data-file - firebase-project-id
echo $NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | firebase apphosting:secrets:set --force --data-file - firebase-storage-bucket
echo $NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | firebase apphosting:secrets:set --force --data-file - firebase-messaging-sender-id
echo $NEXT_PUBLIC_FIREBASE_APP_ID | firebase apphosting:secrets:set --force --data-file - firebase-app-id
echo $FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY_JSON | firebase apphosting:secrets:set --force --data-file - firebase-admin-service-account-key-json

echo "setup secrets done"
echo "you can now deploy your app with firebase deploy"
echo "or deploy your app with firebase deploy --only hosting"
