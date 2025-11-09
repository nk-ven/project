// Firebase project configuration (replace values if you need to)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDC60L5Y2Qs1Guch_7OAoUj_MkS0il4x9M",
  authDomain: "start-aa0c2.firebaseapp.com",
  projectId: "start-aa0c2",
  storageBucket: "start-aa0c2.appspot.com",
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
    const app = firebase.app();
    const auth = firebase.auth();
    const firestore = firebase.firestore();
    const storage = firebase.storage();

    // Helps in corporate/VPN environments that block the default Firestore streaming transport.
    const firestoreSettings = {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: true,
      useFetchStreams: false
    };
    try {
      if (!firestore._settingsFrozen) {
        firestore.settings(firestoreSettings);
      }
    } catch (settingsErr) {
      console.warn('Unable to update Firestore settings (already initialized?):', settingsErr);
    }

    if (window.FIREBASE_EMULATORS && window.location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
      const { auth: authCfg, firestore: dbCfg, storage: storageCfg } = window.FIREBASE_EMULATORS;
      if (authCfg) auth.useEmulator(`http://${authCfg.host}:${authCfg.port}`);
      if (dbCfg) firestore.useEmulator(dbCfg.host, dbCfg.port);
      if (storageCfg && storage.useEmulator) storage.useEmulator(storageCfg.host, storageCfg.port);
    }

    window.firebaseApp = app;
    window.firebaseAuth = auth;
    window.firebaseDB = firestore;
    window.firebaseStorage = storage;
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
  }
})();
