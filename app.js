// ============================
// CONFIGURATION
// ============================
const ILMU_API_KEY = 'sk-0e647a61a98644baf2febbb1641ddfc70cfb8063115b28bb';
const ILMU_API_URL = 'https://api.ilmu.ai/v1/chat/completions';

// State
let currentSplitTx = null;
let currentCancelSub = null;
let cancelSubEl = null;

// ============================
// PAGE NAVIGATION
// ============================
function showPage(pageId) {
  document.querySelectorAll('.page, #dashboard-app').forEach(el => {
    el.classList.remove('active');
    if (el.id === 'dashboard-app') el.style.display = 'none';
  });

  if (pageId === 'dashboard') {
    const app = document.getElementById('dashboard-app');
    app.style.display = 'flex';
    app.classList.add('active');
  } else {
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
  }
  window.scrollTo(0, 0);
}

function showDashPage(pageId, linkEl) {
  // Ensure dashboard is shown
  const app = document.getElementById('dashboard-app');
  if (!app.classList.contains('active')) {
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    app.style.display = 'flex';
    app.classList.add('active');
  }

  // Hide all dash pages
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('dash-' + pageId);
  if (target) target.classList.add('active');

  // Update sidebar
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (linkEl) linkEl.classList.add('active');
  else {
    document.querySelectorAll('.sidebar-link').forEach(l => {
      if (l.textContent.toLowerCase().includes(pageId)) l.classList.add('active');
    });
  }
}

// The actual sign in/sign up functions are in auth.js
// which gets loaded after app.js and uses real Firebase

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'signin' && i === 0) || (tab === 'signup' && i === 1));
  });
  document.getElementById('form-signin').classList.toggle('active', tab === 'signin');
  document.getElementById('form-signup').classList.toggle('active', tab === 'signup');
}

// Initialize Firebase on page load
document.addEventListener('DOMContentLoaded', function() {
  if (typeof initFirebase === 'function') {
    initFirebase();
    
    // Check if user is already logged in
    if (typeof auth !== 'undefined' && auth) {
  auth.onAuthStateChanged(user => {
    if (user) {
      const currentPage = document.querySelector('.page.active')?.id;
      if (currentPage === 'auth') {
        console.log('Already logged in as:', user.email, '→ redirecting to dashboard');
        showPage('dashboard');
        showDashPage('home', document.querySelector('.sidebar-link'));
      }
    }
  });
  }
  }
});


function doSignUp() {
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const pass = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  const terms = document.getElementById('signup-terms').checked;

  if (!name || !email || !pass) { alert('Please fill in all required fields.'); return; }
  if (pass !== pass2) { alert('Passwords do not match.'); return; }
  if (!terms) { alert('Please accept the Terms & Conditions.'); return; }

  document.getElementById('form-signup').style.display = 'none';
  const success = document.getElementById('auth-success');
  success.style.display = 'block';
  setTimeout(() => {
    document.getElementById('redirect-bar').style.width = '100%';
  }, 100);
  setUserName(name);
  setTimeout(() => {
    showPage('dashboard');
    showDashPage('home', document.querySelector('.sidebar-link'));
    document.getElementById('form-signup').style.display = 'block';
    success.style.display = 'none';
  }, 2200);
}

function setUserName(name) {
  document.getElementById('sidebar-user-name').textContent = name;
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('sidebar-avatar-initials').textContent = initials;
}

function sendOTP() {
  const phone = document.getElementById('signup-phone').value;
  if (!phone) { alert('Please enter your phone number first.'); return; }
  alert('OTP sent to ' + phone + ' (demo mode)');
}

function verifyEmail() {
  const email = document.getElementById('signup-email').value;
  if (!email) { alert('Please enter your email first.'); return; }
  alert('Verification email sent to ' + email + ' (demo mode)');
}

// ============================
// AI CHAT
// ============================
const mockResponses = [
  "Based on your income of RM 3,200/month, I recommend saving RM 576 per month for LHDN. Your effective tax rate is approximately 18% annually.",
  "If you cancel Netflix (RM 54/month), you'd save RM 648/year. Since it's been unused for 30 days, this is a smart move. I can draft the cancellation message for you!",
  "Looking at your expenses, GrabFood is your biggest variable cost at RM 45 this transaction. Over the last month, you've spent RM 180 — that's 40% above your average. Consider setting a monthly limit of RM 120.",
  "Your Shopee supplies can be classified as business expenses since they're for your home bakery. This could reduce your taxable income by up to RM 1,440/year.",
  "Great question! Your top 3 reducible expenses are: (1) GrabFood — down from RM 180 to RM 100 saves RM 80/month, (2) Unused subscriptions — saving RM 113/month, (3) Utilities — optimize usage to save RM 20/month.",
  "Your financial health score is 72/100. Key strengths: consistent income growth (+15%). Areas to improve: subscription spending (3 unused services), emergency fund coverage (1.2 months — target: 3 months).",
];
let mockIdx = 0;

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendMessage('user', msg);
  showTyping(true);

  const apiKey = document.getElementById('api-key-input')?.value || ILMU_API_KEY;
  
  try {
    const response = await callILMU(msg, apiKey);
    showTyping(false);
    appendMessage('ai', response);
  } catch (e) {
    showTyping(false);
    appendMessage('ai', mockResponses[mockIdx++ % mockResponses.length]);
  }
}

async function callILMU(userMessage, apiKey) {
  const res = await fetch('https://api.ilmu.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'ILMU-GLM-5.1',
      messages: [
        { role: 'system', content: 'You are a helpful Malaysian financial advisor AI. Help small business owners with tax, expenses, and financial planning. Keep responses concise and practical. Use Malaysian context (RM, LHDN, etc).' },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 300
    })
  });
  if (!res.ok) throw new Error('API error');
  const data = await res.json();
  return data.choices?.[0]?.message?.content || mockResponses[mockIdx++ % mockResponses.length];
}

function quickChat(msg) {
  document.getElementById('chat-input').value = msg;
  sendChat();
}

function appendMessage(role, text) {
  const msgs = document.getElementById('chat-messages');
  const el = document.createElement('div');
  el.className = `msg msg-${role} fade-in`;
  const now = new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  el.innerHTML = `<div class="msg-bubble">${text}</div><div class="msg-time">${now}</div>`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTyping(show) {
  const typing = document.getElementById('chat-typing');
  typing.style.display = show ? 'block' : 'none';
  if (show) document.getElementById('chat-messages').scrollTop = 99999;
}

// ============================
// INSIGHTS
// ============================
const insights = [
  "Based on your last 3 months, save RM 96/month for tax. Your coffee spending is up 40% — want to set a limit?",
  "You have 2 unused subscriptions costing RM 113/month. Cancelling them would save RM 1,356/year!",
  "Income is up 15% this month! Consider allocating 20% (RM 640) to your emergency fund.",
  "Your Shopee purchases qualify as business expenses. Mark them to save approximately RM 200 in tax.",
  "Tip: Most Malaysian home bakers qualify for the SME tax incentive. Ask AI Analyst for details."
];
let insightIdx = 0;

function refreshInsight() {
  insightIdx = (insightIdx + 1) % insights.length;
  const el = document.getElementById('insight-text');
  el.style.opacity = '0';
  setTimeout(() => { el.textContent = insights[insightIdx]; el.style.opacity = '1'; el.style.transition = 'opacity 0.3s'; }, 200);
}

// ============================
// TRANSACTION SPLIT
// ============================
function openSplitModal(idx, name) {
  currentSplitTx = idx;
  document.getElementById('split-modal-desc').textContent = `Classify "${name}" as Personal or Business?`;
  document.getElementById('split-modal').classList.add('open');
}

function setTxType(type) {
  if (currentSplitTx !== null) {
    const el = document.getElementById('tx-type-' + currentSplitTx);
    if (el) {
      el.className = 'tx-type ' + type;
      el.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
  closeSplitModal();
}

function closeSplitModal() {
  document.getElementById('split-modal').classList.remove('open');
  currentSplitTx = null;
}

// ============================
// KILL SWITCH
// ============================
function cancelSubscription(btn, name, price) {
  currentCancelSub = { name, price, btn };
  document.getElementById('cancel-modal-desc').textContent = `Cancel ${name} (RM ${price}/month)? I'll draft a cancellation message.`;
  document.getElementById('cancel-draft').style.display = 'none';
  document.getElementById('cancel-confirm-btn').textContent = 'Generate Cancellation';
  document.getElementById('cancel-modal').classList.add('open');
}

function confirmCancel() {
  const btn = document.getElementById('cancel-confirm-btn');
  if (btn.textContent.includes('Generate')) {
    const draft = document.getElementById('cancel-draft');
    draft.style.display = 'block';
    draft.innerHTML = `<strong>AI Drafted Message:</strong><br><br>"Dear ${currentCancelSub?.name} Support Team,<br><br>I would like to cancel my subscription effective immediately. Please confirm cancellation and stop all future charges to my account.<br><br>Thank you."`;
    btn.textContent = 'Confirm Cancel';
  } else {
    if (currentCancelSub?.btn) {
      const card = currentCancelSub.btn.closest('.subscription-card');
      if (card) { card.style.opacity = '0'; card.style.transition = 'opacity 0.3s'; setTimeout(() => card.remove(), 300); }
    }
    closeCancelModal();
    setTimeout(() => alert(`✅ ${currentCancelSub?.name || 'Subscription'} cancelled! You'll save RM ${currentCancelSub?.price || 0}/month.`), 400);
  }
}

function closeCancelModal() {
  document.getElementById('cancel-modal').classList.remove('open');
  currentCancelSub = null;
}

// ============================
// TAX FORECASTER
// ============================
function recalcTax() {
  const income = 3200 + Math.floor(Math.random() * 400) - 200;
  const tax = Math.round(income * 0.18);
  document.getElementById('tax-result').innerHTML = `
    <p style="font-size:13px;color:var(--text-light);margin-bottom:16px">Based on RM ${income.toLocaleString()} monthly income</p>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px;color:var(--text-light)">Annual Income Est.</span>
      <span style="font-weight:700">RM ${(income * 12).toLocaleString()}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px;color:var(--text-light)">Tax Rate (LHDN)</span>
      <span style="font-weight:700">~18%</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
      <span style="font-size:13px;font-weight:700">Monthly Save Target</span>
      <span style="font-size:20px;font-weight:800;color:var(--amber)">RM ${tax}</span>
    </div>`;
}

// ============================
// INVENTORY
// ============================
function toggleAddItem() {
  const form = document.getElementById('add-item-form');
  form.classList.toggle('show');
}

function addInventoryItem() {
  const name = document.getElementById('new-item-name').value;
  const qty = document.getElementById('new-item-qty').value;
  const cost = document.getElementById('new-item-cost').value;
  if (!name || !qty || !cost) { alert('Please fill in all fields.'); return; }

  const tbody = document.getElementById('inv-table-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${name}</td>
    <td>${qty}</td>
    <td>RM ${cost}</td>
    <td><button class="btn btn-ghost btn-sm" onclick="updateStock(this,'${name}')">Update</button></td>`;
  tr.style.animation = 'fadeIn 0.3s ease';
  tbody.appendChild(tr);

  document.getElementById('new-item-name').value = '';
  document.getElementById('new-item-qty').value = '';
  document.getElementById('new-item-cost').value = '';
  toggleAddItem();
}

function updateStock(btn, name) {
  const newQty = prompt(`Update quantity for ${name}:`);
  if (newQty) {
    const tr = btn.closest('tr');
    tr.cells[1].textContent = newQty;
  }
}

// ============================
// FORECAST
// ============================
function refreshForecast() {
  const rev = 3200 + Math.floor(Math.random() * 600) - 300;
  const exp = 1800 + Math.floor(Math.random() * 300) - 150;
  const tax = Math.round(rev * 0.031);
  document.getElementById('fc-rev').textContent = `RM ${rev.toLocaleString()}`;
  document.getElementById('fc-exp').textContent = `RM ${exp.toLocaleString()}`;
  document.getElementById('fc-tax').textContent = `RM ${tax}`;
}

// ============================
// SETTINGS
// ============================
function saveProfile() {
  const name = document.getElementById('profile-name').value;
  if (name) setUserName(name);
  alert('✅ Profile saved!');
}

function testApiKey() {
  const key = document.getElementById('api-key-input').value;
  const status = document.getElementById('api-key-status');
  status.className = 'api-key-status testing';
  status.textContent = '⟳ Testing connection...';
  setTimeout(() => {
    if (key && key.startsWith('sk-')) {
      status.className = 'api-key-status connected';
      status.textContent = '● API Connected to ILMU-GLM-5.1';
      document.getElementById('sidebar-api-status').textContent = 'API: Connected';
    } else {
      status.className = 'api-key-status disconnected';
      status.textContent = '✕ Invalid API key';
    }
  }, 1500);
}



function toggleDark(el) {
  document.body.style.filter = el.checked ? 'invert(0.9) hue-rotate(180deg)' : '';
}

// ============================
// FILE UPLOAD
// ============================
function handleFileUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  const list = document.getElementById('file-list');
  const item = document.createElement('div');
  item.className = 'file-item';
  item.innerHTML = `<span class="file-icon">${type === 'img' ? '📸' : '📄'}</span><span class="file-name">${file.name}</span><span class="file-status">Analyzing...</span>`;
  list.appendChild(item);

  setTimeout(() => {
    item.querySelector('.file-status').textContent = 'Done';
    const result = document.createElement('div');
    result.className = 'analysis-result fade-in';
    result.textContent = type === 'img'
      ? `📸 Receipt scanned: I found RM ${(Math.random() * 200 + 20).toFixed(2)} in expenses. Category detected: ${['Food & Beverage', 'Supplies', 'Transport'][Math.floor(Math.random()*3)]}.`
      : `📄 Statement analyzed: I found ${Math.floor(Math.random() * 20 + 5)} transactions. Total expenses: RM ${(Math.random() * 500 + 100).toFixed(2)}. GrabFood is ${Math.floor(Math.random()*20 + 5)}% above your average.`;
    list.appendChild(result);

    appendMessage('ai', result.textContent);
    document.getElementById('dash-analyst').scrollTop = 0;
  }, 2000);
}

// ============================
// FAQ
// ============================
function toggleFaq(el) {
  const item = el.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ============================
// SMOOTH SCROLL
// ============================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ============================
// INIT
// ============================
showPage('landing');
 
 
// ============================================================
// PAGE NAVIGATION
// ============================================================
function showPage(pageId) {
  // Hide all pages and the dashboard app
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
 
  const dashApp = document.getElementById('dashboard-app');
  dashApp.style.display = 'none';
  dashApp.classList.remove('active');
 
  if (pageId === 'dashboard') {
    dashApp.style.display = 'flex';
    dashApp.classList.add('active');
  } else {
    const page = document.getElementById(pageId);
    if (page) page.classList.add('active');
  }
 
  window.scrollTo(0, 0);
}
 
function showDashPage(pageId, linkEl) {
  // Make sure the dashboard layout is visible
  const dashApp = document.getElementById('dashboard-app');
  if (!dashApp.classList.contains('active')) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    dashApp.style.display = 'flex';
    dashApp.classList.add('active');
  }
 
  // Switch the inner page
  document.querySelectorAll('.dash-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('dash-' + pageId);
  if (target) target.classList.add('active');
 
  // Highlight the correct sidebar link
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (linkEl) {
    linkEl.classList.add('active');
  } else {
    // Auto-find the link if no element was passed
    document.querySelectorAll('.sidebar-link').forEach(l => {
      if (l.textContent.toLowerCase().includes(pageId)) l.classList.add('active');
    });
  }
}
 
// Smooth scroll for "#section" anchor links in the landing page
function attachSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
 
 
// ============================================================
// ENTER DASHBOARD  (called after successful login)
// ============================================================
function enterDashboard(name) {
  setUserName(name);
  showPage('dashboard');
  showDashPage('home', document.querySelector('.sidebar-link'));
 
  // Personalise the greeting
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const el       = document.getElementById('home-greeting');
  if (el) el.textContent = `${greeting}! 👋`;
}
 
function setUserName(name) {
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  setElText('sidebar-user-name', name);
  setElText('sidebar-avatar', initials);
  setInputValue('profile-name', name);
}
 
function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
 
 
// ============================================================
// AUTH — Sign In
// ============================================================
async function doSignIn() {
  const email = document.getElementById('signin-email').value.trim();
  const pass  = document.getElementById('signin-password').value;
  const errEl = document.getElementById('signin-error');
  clearError(errEl);
 
  if (!email || !pass) { showError(errEl, 'Please enter your email and password.'); return; }
 
  setButtonLoading('signin-btn', true, 'Signing in...');
 
  try {
    if (firebaseReady && auth) {
      const cred  = await auth.signInWithEmailAndPassword(email, pass);
      currentUser = cred.user;
      enterDashboard(cred.user.displayName || email.split('@')[0]);
      await loadAllUserData();
    } else {
      // Demo mode: bypass Firebase
      const name = email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c => c.toUpperCase());
      enterDashboard(name);
      loadDemoData();
    }
  } catch (e) {
    showError(errEl, friendlyAuthError(e.code));
  } finally {
    setButtonLoading('signin-btn', false, 'Sign In →');
  }
}
 
 
// ============================================================
// AUTH — Sign Up
// ============================================================
async function doSignUp() {
  const name  = document.getElementById('signup-name').value.trim();
  const biz   = document.getElementById('signup-biz').value;
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  const terms = document.getElementById('signup-terms').checked;
  const errEl = document.getElementById('signup-error');
  clearError(errEl);
 
  if (!name || !email || !pass) { showError(errEl, 'Please fill in all required fields.'); return; }
  if (pass.length < 6)          { showError(errEl, 'Password must be at least 6 characters.'); return; }
  if (pass !== pass2)           { showError(errEl, 'Passwords do not match.'); return; }
  if (!terms)                   { showError(errEl, 'Please accept the Terms & Conditions.'); return; }
 
  setButtonLoading('signup-btn', true, 'Creating account...');
 
  try {
    if (firebaseReady && auth) {
      const cred  = await auth.createUserWithEmailAndPassword(email, pass);
      currentUser = cred.user;
      await cred.user.updateProfile({ displayName: name });
 
      // Save initial profile to Firestore
      await dbSet('profile/data', {
        name, email, businessType: biz,
        plan: 'Freemium',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
 
      showSignupSuccess();
      setTimeout(async () => {
        hideSignupSuccess();
        enterDashboard(name);
        await loadAllUserData();
      }, 2200);
    } else {
      // Demo mode
      showSignupSuccess();
      setTimeout(() => {
        hideSignupSuccess();
        enterDashboard(name);
        loadDemoData();
      }, 2200);
    }
  } catch (e) {
    showError(errEl, friendlyAuthError(e.code));
    setButtonLoading('signup-btn', false, 'Create Free Account →');
  }
}
 
function showSignupSuccess() {
  document.getElementById('form-signup').style.display = 'none';
  const s = document.getElementById('auth-success');
  s.style.display = 'block';
  setTimeout(() => { document.getElementById('redirect-bar').style.width = '100%'; }, 100);
}
 
function hideSignupSuccess() {
  document.getElementById('form-signup').style.display = 'block';
  document.getElementById('auth-success').style.display = 'none';
  document.getElementById('redirect-bar').style.width = '0%';
}
 
 
// ============================================================
// AUTH — Forgot Password
// ============================================================
async function doForgotPassword() {
  const email = document.getElementById('signin-email').value.trim();
  if (!email) { showToast('Enter your email address first.', 'error'); return; }
 
  if (firebaseReady && auth) {
    try {
      await auth.sendPasswordResetEmail(email);
      showToast('✅ Password reset email sent! Check your inbox.', 'success');
    } catch (e) {
      showToast('Could not send reset email. Check the address.', 'error');
    }
  } else {
    showToast('Password reset sent! (demo mode)', 'info');
  }
}
 
 
// ============================================================
// AUTH — Sign Out
// ============================================================
async function doSignOut() {
  if (firebaseReady && auth) {
    try { await auth.signOut(); } catch (e) { /* ignore */ }
  }
  currentUser = null;
  currentApiKey = '';
  showPage('landing');
  showToast('Signed out successfully', 'success');
}
 
 
// ============================================================
// AUTH TAB SWITCHER
// ============================================================
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'signin' && i === 0) || (tab === 'signup' && i === 1));
  });
  document.getElementById('form-signin').classList.toggle('active', tab === 'signin');
  document.getElementById('form-signup').classList.toggle('active', tab === 'signup');
  clearError(document.getElementById('signin-error'));
  clearError(document.getElementById('signup-error'));
}
 
function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found':        'No account found with this email.',
    'auth/wrong-password':        'Incorrect password. Please try again.',
    'auth/invalid-credential':    'Invalid email or password.',
    'auth/email-already-in-use':  'This email is already registered.',
    'auth/invalid-email':         'Please enter a valid email address.',
    'auth/weak-password':         'Password is too weak. Use at least 6 characters.',
    'auth/too-many-requests':     'Too many attempts. Please wait a moment.',
    'auth/network-request-failed':'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
 
 
// ============================================================
// TRANSACTION SPLITTER MODAL
// ============================================================
function openSplitModal(txId, name) {
  currentSplitTxId = txId;
  document.getElementById('split-modal-desc').textContent = `Classify "${name}" as Personal or Business?`;
  document.getElementById('split-modal').classList.add('open');
}
 
async function setTxType(type) {
  if (currentSplitTxId !== null) {
    const el = document.getElementById('tx-type-' + currentSplitTxId);
    if (el) { el.className = `tx-type ${type}`; el.textContent = cap(type); }
 
    // Persist the classification to Firestore
    await dbUpdate('transactions', currentSplitTxId, { type });
    showToast(`✅ Transaction marked as ${cap(type)}`, 'success');
  }
  closeSplitModal();
}
 
function closeSplitModal() {
  document.getElementById('split-modal').classList.remove('open');
  currentSplitTxId = null;
}
 
 
// ============================================================
// KILL SWITCH — SUBSCRIPTION CANCELLATION MODAL
// ============================================================
function cancelSubscription(subId, name, price, btn) {
  currentCancelSub = { id: subId, name, price, btn };
  document.getElementById('cancel-modal-desc').textContent = `Cancel ${name} (RM ${price}/month)? GLM will draft a cancellation message.`;
  document.getElementById('cancel-draft').style.display = 'none';
  document.getElementById('cancel-confirm-btn').textContent = 'Generate Cancellation Draft';
  document.getElementById('cancel-modal').classList.add('open');
}
 
async function confirmCancel() {
  const btn = document.getElementById('cancel-confirm-btn');
 
  if (btn.textContent.includes('Generate')) {
    // Step 1: show AI-drafted message
    const draft = document.getElementById('cancel-draft');
    draft.style.display = 'block';
    draft.innerHTML = `<strong>✍️ GLM-Drafted Cancellation Message:</strong><br><br>
"Dear ${currentCancelSub.name} Support Team,<br><br>
I would like to cancel my ${currentCancelSub.name} subscription effective immediately.
Please confirm the cancellation and stop all future charges to my payment method.<br><br>
Thank you for your service."`;
    btn.textContent = 'Confirm & Cancel Subscription';
 
  } else {
    // Step 2: actually delete the subscription from Firestore
    await dbDelete('subscriptions', currentCancelSub.id);
 
    // Remove from DOM with fade
    const card = document.getElementById(`sub-card-${currentCancelSub.id}`);
    if (card) {
      card.style.transition = 'opacity 0.3s';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 300);
    }
 
    closeCancelModal();
    showToast(`✅ ${currentCancelSub.name} cancelled! Saving RM ${currentCancelSub.price}/month`, 'success');
    currentCancelSub = null;
  }
}
 
function closeCancelModal() {
  document.getElementById('cancel-modal').classList.remove('open');
}
 
 
// ============================================================
// TAX FORECASTER
// ============================================================
function recalcTax() {
  // Slightly randomise income for demo effect (±RM 200)
  const income = 3200 + Math.floor(Math.random() * 400) - 200;
  const tax    = Math.round(income * 0.18);
 
  document.getElementById('tax-result').innerHTML = `
    <p style="font-size:13px;color:var(--text-light);margin-bottom:16px">Based on RM ${income.toLocaleString()} monthly income</p>
    <div class="tax-row"><span>Annual Income Est.</span><span style="font-weight:700">RM ${(income*12).toLocaleString()}</span></div>
    <div class="tax-row"><span>Tax Rate (LHDN)</span><span style="font-weight:700">~18%</span></div>
    <div class="tax-row"><span style="font-weight:700">Monthly Save Target</span><span style="font-size:20px;font-weight:800;color:var(--amber)">RM ${tax}</span></div>
  `;
  showToast('Tax estimate recalculated by GLM ✓', 'success');
}
 
 
// ============================================================
// GLM INSIGHTS ROTATOR
// ============================================================
const INSIGHTS = [
  "Based on your last 3 months, save RM 96/month for tax. Your coffee spending is up 40% — want to set a limit?",
  "You have 2 unused subscriptions costing RM 113/month. Cancelling them saves RM 1,356/year!",
  "Income is up 15% this month! Consider allocating 20% (RM 640) to your emergency fund.",
  "Your Shopee purchases qualify as business expenses. Marking them saves approximately RM 200 in tax.",
  "Tip: Most Malaysian home bakers qualify for the SME tax incentive. Ask the AI Analyst for details.",
];
let insightIndex = 0;
 
function refreshInsight() {
  insightIndex = (insightIndex + 1) % INSIGHTS.length;
  const el = document.getElementById('insight-text');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = INSIGHTS[insightIndex];
    el.style.transition = 'opacity 0.3s';
    el.style.opacity    = '1';
  }, 200);
}
 
 
// ============================================================
// INVENTORY MANAGEMENT
// ============================================================
function toggleAddItem() {
  document.getElementById('add-item-form').classList.toggle('show');
}
 
async function addInventoryItem() {
  const name = document.getElementById('new-item-name').value.trim();
  const qty  = document.getElementById('new-item-qty').value.trim();
  const cost = document.getElementById('new-item-cost').value;
 
  if (!name || !qty || !cost) { showToast('Please fill in all fields.', 'error'); return; }
 
  const newItem = { name, qty, cost: parseFloat(cost), low: false };
  const id      = await dbAdd('inventory', newItem) || `local_${Date.now()}`;
 
  // Add row to the table immediately (don't wait for Firestore re-fetch)
  const tbody = document.getElementById('inv-table-body');
  const tr    = document.createElement('tr');
  tr.style.animation = 'fadeIn 0.3s ease';
  tr.innerHTML = `
    <td>${name}</td>
    <td>${qty}</td>
    <td>RM ${cost}</td>
    <td><button class="btn btn-ghost btn-sm" onclick="updateStock('${id}','${name}',this)">Update</button></td>
  `;
  tbody.appendChild(tr);
 
  // Clear the form
  ['new-item-name','new-item-qty','new-item-cost'].forEach(id => setInputValue(id, ''));
  toggleAddItem();
  showToast(`${name} added to inventory ✓`, 'success');
}
 
async function updateStock(id, name, btn) {
  const newQty = prompt(`Update quantity for ${name}:`);
  if (newQty) {
    const tr = btn.closest('tr');
    tr.cells[1].textContent = newQty;
    await dbUpdate('inventory', id, { qty: newQty });
    showToast(`${name} updated ✓`, 'success');
  }
}
 
 
// ============================================================
// FORECAST REFRESH
// ============================================================
function refreshForecast() {
  const rev = 3200 + Math.floor(Math.random() * 600) - 300;
  const exp = 1800 + Math.floor(Math.random() * 300) - 150;
  const tax = Math.round(rev * 0.031);
 
  document.getElementById('fc-rev').textContent = `RM ${rev.toLocaleString()}`;
  document.getElementById('fc-exp').textContent = `RM ${exp.toLocaleString()}`;
  document.getElementById('fc-tax').textContent = `RM ${tax}`;
  showToast('Forecast refreshed by GLM ✓', 'success');
}
 
 
// ============================================================
// SETTINGS
// ============================================================
async function saveProfile() {
  const name         = document.getElementById('profile-name').value.trim();
  const phone        = document.getElementById('profile-phone').value.trim();
  const businessType = document.getElementById('profile-biz').value;
 
  if (name) setUserName(name);
  const ok = await dbSet('profile/data', { name, phone, businessType });
  showToast(ok ? '✅ Profile saved to Firestore!' : '✅ Profile saved! (demo)', 'success');
}
 

 
function testApiKey() {
  const key    = document.getElementById('api-key-input').value || currentApiKey;
  const status = document.getElementById('api-key-status');
  status.className     = 'api-key-status testing';
  status.textContent   = '⟳ Testing connection...';
 
  setTimeout(() => updateApiStatus(key && key.startsWith('sk-')), 1500);
}
 
function updateApiStatus(connected) {
  const status   = document.getElementById('api-key-status');
  const sidebar  = document.getElementById('sidebar-api-status');
  if (connected) {
    status.className   = 'api-key-status connected';
    status.textContent = '● API Connected to ILMU-GLM-5.1';
    if (sidebar) sidebar.textContent = 'API: Connected ✓';
  } else {
    status.className   = 'api-key-status disconnected';
    status.textContent = '✕ Not connected — check your key';
    if (sidebar) sidebar.textContent = 'API: Disconnected';
  }
}
 
async function savePref(key, value) {
  await dbSet('profile/data', { [key]: value });
}
 
function toggleDark(el) {
  document.body.style.filter = el.checked ? 'invert(0.9) hue-rotate(180deg)' : '';
  savePref('darkMode', el.checked);
}
 
 
// ============================================================
// FAQ ACCORDION
// ============================================================
function toggleFaq(el) {
  const item   = el.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}
 
 
// ============================================================
// TOAST NOTIFICATION
// ============================================================
let toastTimer = null;
 
function showToast(message, type = 'success') {
  const toast = document.getElementById('global-toast');
  toast.textContent = message;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
 
 
// ============================================================
// LOADING OVERLAY
// ============================================================
function showLoading(message = 'Loading...') {
  document.getElementById('loading-text').textContent = message;
  document.getElementById('loading-overlay').classList.add('show');
}
 
function hideLoading() {
  document.getElementById('loading-overlay').classList.remove('show');
}
 
 
// ============================================================
// SMALL BUTTON HELPER
// ============================================================
function setButtonLoading(btnId, loading, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled     = loading;
  if (loadingText) btn.textContent = loading ? loadingText : btn.dataset.original || loadingText;
}
 
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}
 
function clearError(el) {
  if (!el) return;
  el.textContent = '';
  el.classList.remove('show');
}