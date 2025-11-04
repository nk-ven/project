# Student Registration & Login System

This is a small student registration and login system (front-end) built with HTML, CSS, Bootstrap and Firebase (Auth, Firestore, Storage).

Features
- Student registration with optional profile photo
- Secure login (Firebase Authentication)
- Profile page with photo upload and name update
- Admin page to list registered students (requires a student doc with `role: 'admin'`)

Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication -> Email/Password
3. Enable Firestore (start in test mode for development)
4. Enable Storage
5. Create a Web App in Firebase and copy the config
6. Open `js/firebase-config.js` and replace the placeholder values with your Firebase config

Running locally
- This is static HTML/JS. You can open `index.html` directly in your browser, or serve with a simple static server.

Notes & Security
- Firestore rules should be configured to restrict who can read/write student documents in production.
- Admin detection in this demo is based on a `role` field in the `students` document. In production, restrict access with security rules or use Firebase Admin SDK on server.

Next steps
- Add email verification on register
- Add password reset
- Harden Firestore rules

