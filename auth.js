// This file uses the Firebase compat (UMD) globals provided by
// the CDN scripts and `js/firebase-config.js` which initializes them.

// Helpers to access global Firebase services initialized in firebase-config.js
const auth = window.firebaseAuth;
const db = window.firebaseDB;
const storage = window.firebaseStorage;

// Helpers
const q = (s) => document.querySelector(s);

async function uploadProfilePhoto(uid, file) {
  if (!file) return null;
  const storageRef = storage.ref(`profilePhotos/${uid}/${file.name}`);
  const snapshot = await storageRef.put(file);
  const url = await snapshot.ref.getDownloadURL();
  return url;
}

// Registration
const registerForm = q('#registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = q('#fullName').value.trim();
    const email = q('#email').value.trim();
    const password = q('#password').value;
    const photoFile = q('#photo').files[0];
    const alertEl = q('#registerAlert');
    alertEl.innerHTML = '';
    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const user = cred.user;
      const uid = user.uid;
      let photoURL = null;
      if (photoFile) {
        photoURL = await uploadProfilePhoto(uid, photoFile);
        await user.updateProfile({ displayName: name, photoURL });
      } else {
        await user.updateProfile({ displayName: name });
      }
      // Save student doc
      await db.collection('students').doc(uid).set({
        name,
        email,
        photoURL: photoURL || null,
        role: 'student',
        createdAt: new Date().toISOString()
      });
      alertEl.innerHTML = `<div class="alert alert-success">Account created. Redirecting to profile...</div>`;
      setTimeout(() => { window.location = 'profile.html'; }, 1000);
    } catch (err) {
      console.error(err);
      // Friendly handling for common error: email already in use
      if (err.code === 'auth/email-already-in-use') {
        alertEl.innerHTML = `
          <div class="alert alert-warning">
            The email address <strong>${email}</strong> is already registered.
            <div class="mt-2">
              <a class="btn btn-sm btn-primary me-2" href="login.html">Go to Login</a>
              <button class="btn btn-sm btn-outline-primary" onclick="sendPasswordResetFromRegister('${email.replace(/'/g, "\\'")}')">Send password reset</button>
            </div>
          </div>`;
      } else {
        alertEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      }
    }
  });
}

// Expose a helper so the inline button can trigger password reset from the register page
window.sendPasswordResetFromRegister = async function (email) {
  try {
    const alertEl = document.querySelector('#registerAlert');
    alertEl.innerHTML = '';
    await auth.sendPasswordResetEmail(email);
    alertEl.innerHTML = `<div class="alert alert-success">Password reset email sent to <strong>${email}</strong>. Check your inbox.</div>`;
  } catch (err) {
    console.error(err);
    const alertEl = document.querySelector('#registerAlert');
    alertEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
};

// Login
const loginForm = q('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = q('#email').value.trim();
    const password = q('#password').value;
    const alertEl = q('#loginAlert');
    alertEl.innerHTML = '';
    try {
      await auth.signInWithEmailAndPassword(email, password);
      window.location = 'profile.html';
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      console.error(err);
    }
  });
}

// Password reset (login page modal)
const resetForm = q('#resetForm');
if (resetForm) {
  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = q('#resetEmail').value.trim();
    const alertEl = q('#resetAlert');
    alertEl.innerHTML = '';
    try {
      await auth.sendPasswordResetEmail(email);
      alertEl.innerHTML = `<div class="alert alert-success">Password reset email sent to <strong>${email}</strong>. Check your inbox.</div>`;
    } catch (err) {
      console.error(err);
      alertEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
  });
}

// Auth state handling and profile page logic
auth.onAuthStateChanged(async (user) => {
  const profileForm = q('#profileForm');
  const logoutBtn = q('#logoutBtn');
  const studentsList = q('#studentsList');

  if (user) {
    // If on profile page, populate
    if (profileForm) {
      q('#email').value = user.email || '';
      q('#fullName').value = user.displayName || '';
      q('#profilePhoto').src = user.photoURL || 'https://via.placeholder.com/150?text=No+Photo';

      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = q('#fullName').value.trim();
        const newPhotoFile = q('#newPhoto').files[0];
        const alertEl = q('#profileAlert');
        alertEl.innerHTML = '';
        try {
          let photoURL = user.photoURL || null;
          if (newPhotoFile) {
            photoURL = await uploadProfilePhoto(user.uid, newPhotoFile);
          }
          await user.updateProfile({ displayName: newName, photoURL });
          // update Firestore doc
          await db.collection('students').doc(user.uid).set({
            name: newName,
            email: user.email,
            photoURL: photoURL || null,
            role: 'student',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          alertEl.innerHTML = `<div class="alert alert-success">Profile updated.</div>`;
          // refresh
          setTimeout(() => location.reload(), 700);
        } catch (err) {
          console.error(err);
          alertEl.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
        }
      });
    }

    // Admin page: list students if this user is admin
    if (studentsList) {
      try {
        const snap = await db.collection('students').doc(user.uid).get();
        const isAdmin = snap.exists && snap.data().role === 'admin';
        if (!isAdmin) {
          studentsList.innerHTML = `<div class="alert alert-danger">Access denied. Admins only.</div>`;
          return;
        }
        const snaps = await db.collection('students').get();
        studentsList.innerHTML = '';
        snaps.forEach(s => {
          const data = s.data();
          const card = document.createElement('div');
          card.className = 'col-md-4 mb-3';
          card.innerHTML = `
            <div class="card h-100">
              <div class="card-body text-center">
                <img src="${data.photoURL || 'https://via.placeholder.com/100'}" class="rounded-circle mb-2" style="width:100px;height:100px;object-fit:cover;">
                <h5 class="card-title">${data.name || '(no name)'}</h5>
                <p class="small">${data.email || ''}</p>
                <p class="text-muted small">Role: ${data.role || 'student'}</p>
              </div>
            </div>`;
          studentsList.appendChild(card);
        });
      } catch (err) {
        console.error(err);
        studentsList.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
      }
    }

    // Wire logout buttons
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        window.location = 'index.html';
      });
    }
  } else {
    // Not logged in: if viewing profile or admin, redirect to login
    if (q('#profileForm') || q('#studentsList')) {
      window.location = 'login.html';
    }
  }
});

