(() => {
  const $ = (selector, root = document) => root.querySelector(selector);

  const services = {
    auth: window.firebaseAuth,
    db: window.firebaseDB,
    storage: window.firebaseStorage || null,
  };

  const elements = {
    registerForm: document.getElementById('registerForm'),
    registerAlert: document.getElementById('registerAlert'),
    loginForm: document.getElementById('loginForm'),
    loginAlert: document.getElementById('loginAlert'),
    resetForm: document.getElementById('resetForm'),
    resetAlert: document.getElementById('resetAlert'),
    profileForm: document.getElementById('profileForm'),
    profileAlert: document.getElementById('profileAlert'),
    logoutBtn: document.getElementById('logoutBtn'),
    studentsList: document.getElementById('studentsList'),
  };

  const placeholderProfilePhoto = (() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150">
      <rect width="150" height="150" fill="#e9ecef"/>
      <text x="50%" y="50%" font-size="16" fill="#6c757d" text-anchor="middle" dominant-baseline="middle" font-family="Arial,Helvetica,sans-serif">No Photo</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s{2,}/g, ' '))}`;
  })();

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function renderAlert(el, type, message, { allowHtml = false } = {}) {
    if (!el) return;
    const safe = allowHtml ? message : escapeHtml(message);
    el.innerHTML = `<div class="alert alert-${type}" role="alert">${safe}</div>`;
  }

  function setButtonLoading(button, isLoading, loadingLabel = 'Please wait...') {
    if (!button) return;
    if (isLoading) {
      if (!button.dataset.originalHtml) {
        button.dataset.originalHtml = button.innerHTML;
      }
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${escapeHtml(loadingLabel)}`;
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
        delete button.dataset.originalHtml;
      }
    }
  }

  function formatError(err) {
    if (!err) return 'Something went wrong. Please try again.';
    if (typeof err === 'string') return err;
    const code = err.code || '';
    if (code.startsWith('auth/')) {
      switch (code) {
        case 'auth/invalid-login-credentials':
        case 'auth/wrong-password':
          return 'Email or password is incorrect.';
        case 'auth/user-not-found':
          return 'No account exists for that email.';
        case 'auth/too-many-requests':
          return 'Too many attempts. Please wait a moment and try again.';
        case 'auth/network-request-failed':
          return 'Network error. Check your connection and try again.';
        case 'auth/weak-password':
          return 'Passwords must be at least 6 characters long.';
        case 'auth/email-already-in-use':
          return 'That email is already registered.';
        default:
          break;
      }
    }
    if (code === 'permission-denied') {
      return 'You are not allowed to perform that action. Check Firestore security rules or sign in with the correct account.';
    }
    if (code === 'unavailable') {
      return 'Firestore is currently unavailable or blocked by your network. Try again after checking your connection/firewall.';
    }
    if (code === 'failed-precondition') {
      return 'Firestore rejected the write. Ensure the emulator is running or required indexes/rules are in place.';
    }
    if (code === 'resource-exhausted') {
      return 'Quota exceeded. Wait a bit and try again.';
    }
    return err.message || 'Unexpected error. Please try again.';
  }

  function shouldAttemptRestFallback(err) {
    if (!window.fetch || !services.auth || !services.auth.currentUser) return false;
    if (!err) return false;
    const code = err.code || '';
    if (['unavailable', 'unknown', 'internal', 'deadline-exceeded'].includes(code)) return true;
    if (code === 'failed-precondition' && /stream|webchannel/i.test(err.message || '')) return true;
    return /Write channel/i.test(err.message || '');
  }

  function encodeFirestoreValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (Array.isArray(value)) {
      return { arrayValue: { values: value.map(encodeFirestoreValue) } };
    }
    switch (typeof value) {
      case 'string': return { stringValue: value };
      case 'number': return Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
      case 'boolean': return { booleanValue: value };
      case 'object': return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeFirestoreValue(v)])) } };
      default: return { stringValue: String(value) };
    }
  }

  function encodeFirestoreFields(data) {
    return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeFirestoreValue(value)]));
  }

  async function saveStudentViaRest(uid, data, { merge } = {}) {
    const projectId = window.firebaseApp?.options?.projectId;
    const user = services.auth.currentUser;
    if (!projectId || !user) {
      throw new Error('Missing Firebase project information for REST fallback.');
    }
    const token = await user.getIdToken(true);
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/students/${uid}`;
    const url = new URL(baseUrl);
    if (merge) {
      Object.keys(data).forEach((field) => url.searchParams.append('updateMask.fieldPaths', field));
    }
    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firestore REST fallback failed (${response.status}): ${text || response.statusText}`);
    }
  }

  async function saveStudentDocument(uid, data, { merge = false } = {}) {
    const docRef = services.db.collection('students').doc(uid);
    try {
      if (merge) {
        await docRef.set(data, { merge: true });
      } else {
        await docRef.set(data);
      }
    } catch (err) {
      if (shouldAttemptRestFallback(err)) {
        await saveStudentViaRest(uid, data, { merge });
        return;
      }
      throw err;
    }
  }

  function broadcastFatal(message) {
    console.error(message);
    ['registerAlert', 'loginAlert', 'profileAlert', 'resetAlert'].forEach((key) => {
      renderAlert(elements[key], 'danger', message);
    });
  }

  if (!services.auth || !services.db) {
    broadcastFatal('Firebase SDK failed to initialize. Refresh the page and verify js/firebase-config.js is configured.');
    return;
  }

  async function uploadProfilePhoto(uid, file) {
    if (!file) return null;
    if (!services.storage) {
      throw new Error('Profile photos are unavailable because Firebase Storage is not configured.');
    }
    const storageRef = services.storage.ref(`profilePhotos/${uid}/${file.name}`);
    const snapshot = await storageRef.put(file);
    return snapshot.ref.getDownloadURL();
  }

  // Registration
  if (elements.registerForm) {
    const submitBtn = elements.registerForm.querySelector('[type="submit"]');
    elements.registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const nameInput = $('#fullName', elements.registerForm);
      const emailInput = $('#email', elements.registerForm);
      const passwordInput = $('#password', elements.registerForm);
      const photoInput = $('#photo', elements.registerForm);
      const alertEl = elements.registerAlert;

      if (!nameInput || !emailInput || !passwordInput) {
        renderAlert(alertEl, 'danger', 'Registration form is missing required fields. Refresh and try again.');
        return;
      }

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const photoFile = photoInput?.files?.[0] || null;

      renderAlert(alertEl, 'info', 'Creating your account...');
      setButtonLoading(submitBtn, true, 'Creating...');

      try {
        const cred = await services.auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;
        let photoURL = null;

        if (photoFile) {
          photoURL = await uploadProfilePhoto(user.uid, photoFile);
        }

        await user.updateProfile({ displayName: name, photoURL });

        await saveStudentDocument(user.uid, {
          name,
          email,
          photoURL: photoURL || null,
          role: 'student',
          createdAt: new Date().toISOString(),
        });

        renderAlert(alertEl, 'success', 'Account created. Redirecting to your profile...');
        setTimeout(() => { window.location = 'profile.html'; }, 1200);
      } catch (err) {
        console.error('Failed to register user', err);
        if (err.code === 'auth/email-already-in-use') {
          showEmailInUseMessage(alertEl, email);
        } else {
          renderAlert(alertEl, 'danger', formatError(err));
        }
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  function showEmailInUseMessage(alertEl, email) {
    if (!alertEl) return;
    const safeEmail = escapeHtml(email);
    alertEl.innerHTML = `
      <div class="alert alert-warning" role="alert">
        The email address <strong>${safeEmail}</strong> is already registered.
        <div class="mt-2 d-flex flex-wrap gap-2">
          <a class="btn btn-sm btn-primary" href="login.html">Go to Login</a>
          <button type="button" class="btn btn-sm btn-outline-primary" data-action="send-reset">Send password reset</button>
        </div>
      </div>
    `;
    const resetBtn = alertEl.querySelector('[data-action="send-reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        setButtonLoading(resetBtn, true, 'Sending...');
        try {
          await services.auth.sendPasswordResetEmail(email);
          renderAlert(alertEl, 'success', `Password reset email sent to <strong>${safeEmail}</strong>. Check your inbox.`, { allowHtml: true });
        } catch (err) {
          console.error('Failed to send password reset email', err);
          renderAlert(alertEl, 'danger', formatError(err));
        } finally {
          setButtonLoading(resetBtn, false);
        }
      }, { once: true });
    }
  }

  // Login
  if (elements.loginForm) {
    const submitBtn = elements.loginForm.querySelector('[type="submit"]');
    elements.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const emailInput = $('#email', elements.loginForm);
      const passwordInput = $('#password', elements.loginForm);
      const alertEl = elements.loginAlert;

      if (!emailInput || !passwordInput) {
        renderAlert(alertEl, 'danger', 'Login form is missing required fields. Refresh and try again.');
        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      renderAlert(alertEl, 'info', 'Signing you in...');
      setButtonLoading(submitBtn, true, 'Signing in...');

      try {
        await services.auth.signInWithEmailAndPassword(email, password);
        window.location = 'profile.html';
      } catch (err) {
        console.error('Failed to sign in', err);
        renderAlert(alertEl, 'danger', formatError(err));
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  // Password reset modal
  if (elements.resetForm) {
    const submitBtn = elements.resetForm.querySelector('[type="submit"]');
    elements.resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const emailInput = $('#resetEmail', elements.resetForm);
      const alertEl = elements.resetAlert;

      if (!emailInput) {
        renderAlert(alertEl, 'danger', 'Unable to find the email field. Close and reopen the dialog.');
        return;
      }

      const email = emailInput.value.trim();
      renderAlert(alertEl, 'info', 'Sending password reset email...');
      setButtonLoading(submitBtn, true, 'Sending...');

      try {
        await services.auth.sendPasswordResetEmail(email);
        renderAlert(alertEl, 'success', `Password reset email sent to <strong>${escapeHtml(email)}</strong>.`, { allowHtml: true });
      } catch (err) {
        console.error('Failed to send reset email', err);
        renderAlert(alertEl, 'danger', formatError(err));
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });
  }

  services.auth.onAuthStateChanged(async (user) => {
    if (user) {
      if ((elements.registerForm || elements.loginForm) && !elements.profileForm) {
        window.location = 'profile.html';
        return;
      }

      populateProfile(user);
      renderStudents(user);
      bindLogout();
    } else if (elements.profileForm || elements.studentsList) {
      window.location = 'login.html';
    }
  });

  function populateProfile(user) {
    if (!elements.profileForm) return;
    const emailInput = $('#email', elements.profileForm);
    const nameInput = $('#fullName', elements.profileForm);
    const photoPreview = document.getElementById('profilePhoto');

    if (emailInput) emailInput.value = user.email || '';
    if (nameInput) nameInput.value = user.displayName || '';
    if (photoPreview) photoPreview.src = user.photoURL || placeholderProfilePhoto;

    if (!elements.profileForm.dataset.bound) {
      elements.profileForm.dataset.bound = 'true';
      const submitBtn = elements.profileForm.querySelector('[type="submit"]');
      elements.profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const currentUser = services.auth.currentUser;
        if (!currentUser) {
          renderAlert(elements.profileAlert, 'danger', 'Your session expired. Please sign in again.');
          return;
        }

        const newName = nameInput ? nameInput.value.trim() : '';
        const newPhotoInput = $('#newPhoto', elements.profileForm);
        const newPhotoFile = newPhotoInput?.files?.[0] || null;

        renderAlert(elements.profileAlert, 'info', 'Saving profile...');
        setButtonLoading(submitBtn, true, 'Saving...');

        try {
          let photoURL = currentUser.photoURL || null;
          if (newPhotoFile) {
            photoURL = await uploadProfilePhoto(currentUser.uid, newPhotoFile);
          }

          await currentUser.updateProfile({ displayName: newName, photoURL });
          await saveStudentDocument(currentUser.uid, {
            name: newName,
            email: currentUser.email,
            photoURL: photoURL || null,
            role: 'student',
            updatedAt: new Date().toISOString(),
          }, { merge: true });

          renderAlert(elements.profileAlert, 'success', 'Profile updated.');
          setTimeout(() => window.location.reload(), 700);
        } catch (err) {
          console.error('Failed to update profile', err);
          renderAlert(elements.profileAlert, 'danger', formatError(err));
        } finally {
          setButtonLoading(submitBtn, false);
        }
      });
    }
  }

  async function renderStudents(user) {
    if (!elements.studentsList) return;
    elements.studentsList.innerHTML = '<div class="col-12"><div class="alert alert-info" role="alert">Loading students...</div></div>';

    try {
      const doc = await services.db.collection('students').doc(user.uid).get();
      const isAdmin = doc.exists && doc.data().role === 'admin';

      if (!isAdmin) {
        elements.studentsList.innerHTML = '<div class="col-12"><div class="alert alert-danger" role="alert">Access denied. Admins only.</div></div>';
        return;
      }

      const snap = await services.db.collection('students').get();
      if (snap.empty) {
        elements.studentsList.innerHTML = '<div class="col-12"><div class="alert alert-secondary" role="alert">No students found.</div></div>';
        return;
      }

      elements.studentsList.innerHTML = '';
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-3';
        const safeName = escapeHtml(data.name || '(no name)');
        const safeEmail = escapeHtml(data.email || '');
        const safeRole = escapeHtml(data.role || 'student');
        const photo = data.photoURL || placeholderProfilePhoto;
        card.innerHTML = `
          <div class="card h-100">
            <div class="card-body text-center">
              <img src="${photo}" class="rounded-circle mb-2" style="width:100px;height:100px;object-fit:cover;" alt="${safeName}">
              <h5 class="card-title">${safeName}</h5>
              <p class="small mb-1">${safeEmail}</p>
              <p class="text-muted small mb-0">Role: ${safeRole}</p>
            </div>
          </div>
        `;
        elements.studentsList.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to fetch students', err);
      renderAlertInList(formatError(err));
    }
  }

  function renderAlertInList(message) {
    if (!elements.studentsList) return;
    elements.studentsList.innerHTML = `<div class="col-12"><div class="alert alert-danger" role="alert">${escapeHtml(message)}</div></div>`;
  }

  function bindLogout() {
    if (!elements.logoutBtn || elements.logoutBtn.dataset.bound) return;
    elements.logoutBtn.dataset.bound = 'true';
    elements.logoutBtn.addEventListener('click', async () => {
      setButtonLoading(elements.logoutBtn, true, 'Signing out...');
      try {
        await services.auth.signOut();
        window.location = 'index.html';
      } catch (err) {
        console.error('Failed to sign out', err);
        const targetAlert = elements.profileAlert || elements.loginAlert || elements.registerAlert;
        if (targetAlert) {
          renderAlert(targetAlert, 'danger', formatError(err));
        } else {
          alert(formatError(err));
        }
      } finally {
        setButtonLoading(elements.logoutBtn, false);
      }
    });
  }
})();
