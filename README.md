# Student Registration & Login System

This is a small student registration and login system (front-end) built with HTML, CSS, Bootstrap and Firebase (Auth, Firestore, Storage).

Features
- Student registration with optional profile photo
- Secure login (Firebase Authentication)
- Profile page with photo upload and name update
- Admin page to list registered students (requires a student doc with `role: 'admin'`)

Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Authentication → Email/Password**
3. Enable **Firestore** (start in test mode for development)
4. Enable **Storage**
5. Create a Web App in Firebase and copy the config values
6. Open `js/firebase-config.js` and replace the placeholder values with your config
7. **Enable the Cloud Firestore API** in the Google Cloud Console (https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=<your-project-id>).  
   - Select the same project ID shown in Firebase (e.g. `start-aa0c2`).  
   - Click **Enable**. If you just enabled it, wait a minute before retrying profile saves—our fallback uses the REST API and will throw the “Cloud Firestore API has not been used…” error until this step is completed.

Running locally
1. Install deps once: `npm install`
2. Start the static server: `npm run start` (serves at http://127.0.0.1:8000)
   - Alternatively you can open the HTML files directly, but running through `http-server` avoids browser restrictions around file uploads.

Auth experience
- Every page includes the Firebase SDK; if you’re already signed in, guest-only pages (`index.html`, `register.html`, `login.html`) automatically redirect you to `profile.html`.
- The navbar and landing hero show Register/Login buttons for guests and your name/email + Profile/Logout buttons once authenticated.
- The profile form uploads optional photos to Storage and writes to Firestore. If Firestore’s streaming transport is blocked (common on VPNs), the UI retries via the REST API—you still need the Cloud Firestore API enabled (see step 7).

Notes & Security
- Firestore rules should be configured to restrict who can read/write student documents in production.
- Admin detection in this demo is based on a `role` field in the `students` document. In production, restrict access with security rules or use Firebase Admin SDK on server.

Next steps
- Add email verification on register
- Add password reset
- Harden Firestore rules

