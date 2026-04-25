// ============================================================
// auth.js  —  Sign In / Sign Up logic
//
// BUG THAT WAS HERE (now fixed):
//   Old auth.js used a FAKE Firebase config 
//   so login never actually worked with Firebase.
//   Now it calls initFirebase() from db.js which has the REAL config.
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  // Connect to the REAL Firebase (using db.js config)
  initFirebase();

  // If user is ALREADY logged in (e.g., they visited before),
  // skip the login page and go straight to dashboard
  if (auth) {
    auth.onAuthStateChanged(user => {
      if (user) {
        console.log('Already logged in as:', user.email, '→ redirecting to dashboard');
        window.location.href = 'dashboard.html';
      }
    });
  }
});

// Switch between Sign In and Sign Up tabs
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  if (tab === 'signin') {
    document.querySelector('.auth-tab:first-child').classList.add('active');
    document.getElementById('form-signin').classList.add('active');
  } else {
    document.querySelector('.auth-tab:last-child').classList.add('active');
    document.getElementById('form-signup').classList.add('active');
  }
}

// ── SIGN IN ──────────────────────────────────────────────────
async function doSignIn() {
  const email = document.getElementById('signin-email').value.trim();
  const pass  = document.getElementById('signin-password').value;

  if (!email || !pass) { alert('Please enter your email and password.'); return; }

  const btn = document.querySelector('#form-signin .btn-primary');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    // REAL Firebase sign in
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    console.log('✅ Signed in:', cred.user.email);

    // Save the logged-in user's UID in sessionStorage so dashboard.js can read it
    sessionStorage.setItem('kaone_uid', cred.user.uid);
    sessionStorage.setItem('kaone_name', cred.user.displayName || email.split('@')[0]);

    window.location.href = 'dashboard.html';

  } catch (e) {
    btn.textContent = 'Sign In →';
    btn.disabled = false;
    alert(friendlyError(e.code));
  }
}

// ── SIGN UP ──────────────────────────────────────────────────
async function doSignUp() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  const terms = document.getElementById('signup-terms').checked;
  const biz   = document.getElementById('signup-biz') ? document.getElementById('signup-biz').value : 'Other';

  if (!name || !email || !pass) { alert('Please fill in all fields.'); return; }
  if (pass.length < 6)          { alert('Password must be at least 6 characters.'); return; }
  if (pass !== pass2)            { alert('Passwords do not match.'); return; }
  if (!terms)                    { alert('Please accept the Terms & Conditions.'); return; }

  const btn = document.querySelector('#form-signup .btn-primary');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    // REAL Firebase create account
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    console.log('✅ Account created:', cred.user.uid);

    // Save initial profile to Firestore straight away
    currentUser = cred.user; // needed for dbSet
    await dbSet('profile/data', {
      name, email, businessType: biz, plan: 'Freemium',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Show the success animation
    document.getElementById('form-signup').style.display = 'none';
    const successEl = document.getElementById('auth-success');
    successEl.style.display  = 'block';
    setTimeout(() => {
      document.getElementById('redirect-bar').style.width = '100%';
    }, 100);

    sessionStorage.setItem('kaone_uid', cred.user.uid);
    sessionStorage.setItem('kaone_name', name);

    setTimeout(() => { window.location.href = 'dashboard.html'; }, 2400);

  } catch (e) {
    btn.textContent = 'Create Free Account →';
    btn.disabled = false;
    alert(friendlyError(e.code));
  }
}

// Forgot password
async function doForgotPassword() {
  const email = document.getElementById('signin-email').value.trim();
  if (!email) { alert('Enter your email above first.'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    alert('Password reset email sent! Check your inbox.');
  } catch (e) {
    alert('Could not send reset email: ' + e.message);
  }
}

// Human-friendly Firebase error messages
function friendlyError(code) {
  const map = {
    'auth/user-not-found':        'No account found with this email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/invalid-credential':    'Invalid email or password.',
    'auth/email-already-in-use':  'This email is already registered.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/weak-password':         'Password is too weak (min 6 characters).',
    'auth/too-many-requests':     'Too many attempts. Please wait.',
    'auth/network-request-failed':'No internet connection.',
  };
  return map[code] || 'Error: ' + code;
}
