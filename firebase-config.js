// Firebase project configuration (replace values if you need to)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDC60L5Y2Qs1Guch_7OAoUj_MkS0il4x9M",
  authDomain: "start-aa0c2.firebaseapp.com",
  projectId: "start-aa0c2",
  storageBucket: "start-aa0c2.firebasestorage.app",
  messagingSenderId: "8089273047",
  appId: "1:8089273047:web:7bdf304a3b8a619f876692",
  measurementId: "G-WR673YJ23D"
};

// Initialize Firebase using the compat UMD SDK and expose globals so pages
// can be opened directly (file://) without a bundler.
(function () {
  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    console.error('Firebase SDK not found. Make sure you included the Firebase compat CDN scripts before this file.');
    return;
  }

  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    window.firebaseApp = firebase.app();
    window.firebaseAuth = firebase.auth();
    window.firebaseDB = firebase.firestore();
    window.firebaseStorage = firebase.storage();
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
  }
})();
