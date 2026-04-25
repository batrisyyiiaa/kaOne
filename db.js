// ============================================================
// db.js  —  Firebase Configuration + All Firestore Functions
//
// BUG THAT WAS HERE (now fixed):
//   The old check was:  if (apiKey === "AIzaSy...realkey...")
//   That is ALWAYS true, so Firebase NEVER connected.
//   We just removed that broken check entirely.
//
// WHERE DOES FIRESTORE STORE DATA?
//   NOT on your computer. Firebase Firestore is Google's cloud
//   database. Data is stored on Google's servers.
//   You see it at: https://console.firebase.google.com
//   → your project → Firestore Database → Data tab
//
//   Structure (like folders):
//   users/
//     {userId}/
//       profile/data      ← name, phone, API key
//       transactions/     ← each transaction is one document
//       subscriptions/    ← each subscription is one document
//       inventory/        ← each item is one document
//       chatHistory/      ← each message is one document
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDDNYAiNRtKx9yVnZTIThp6z5oA7uH4T2o",
  authDomain:        "hackathon2winx1.firebaseapp.com",
  projectId:         "hackathon2winx1",
  storageBucket:     "hackathon2winx1.firebasestorage.app",
  messagingSenderId: "181628519260",
  appId:             "1:181628519260:web:5c39ce55a25303a7887799"
};

// Global variables shared across all JS files
let auth          = null;
let db            = null;
let currentUser   = null;
let firebaseReady = false;
let currentApiKey = '';

// ============================================================
// INITIALISE FIREBASE — call this once on page load
// ============================================================
function initFirebase() {
  try {
    // Only initialise once (prevents "already initialized" error
    // when navigating between pages in the same session)
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    auth = firebase.auth();
    db   = firebase.firestore();
    firebaseReady = true;

    // Update the sidebar status indicator (only exists on dashboard)
    const dbStatusEl = document.getElementById('sidebar-db-status');
    if (dbStatusEl) dbStatusEl.textContent = 'Firestore: Connected ✓';

    console.log('✅ Firebase connected to project:', FIREBASE_CONFIG.projectId);
    return true;

  } catch (error) {
    console.error('❌ Firebase failed to connect:', error);
    const dbStatusEl = document.getElementById('sidebar-db-status');
    if (dbStatusEl) dbStatusEl.textContent = 'Firestore: Error - ' + error.message;
    firebaseReady = false;
    return false;
  }
}

// ============================================================
// DATABASE HELPERS
// All data lives at: users/{uid}/{collection}/{docId}
// ============================================================

async function dbSet(path, data) {
  if (!firebaseReady || !db || !currentUser) return false;
  try {
    await db.doc(`users/${currentUser.uid}/${path}`).set(data, { merge: true });
    return true;
  } catch (e) { console.error('dbSet error:', e); return false; }
}

async function dbGet(path) {
  if (!firebaseReady || !db || !currentUser) return null;
  try {
    const snap = await db.doc(`users/${currentUser.uid}/${path}`).get();
    return snap.exists ? snap.data() : null;
  } catch (e) { console.error('dbGet error:', e); return null; }
}

async function dbAdd(collectionName, data) {
  if (!firebaseReady || !db || !currentUser) return null;
  try {
    const ref = await db
      .collection(`users/${currentUser.uid}/${collectionName}`)
      .add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    return ref.id;
  } catch (e) { console.error('dbAdd error:', e); return null; }
}

async function dbGetAll(collectionName) {
  if (!firebaseReady || !db || !currentUser) return [];
  try {
    const snap = await db
      .collection(`users/${currentUser.uid}/${collectionName}`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.error('dbGetAll error:', e); return []; }
}

async function dbUpdate(collectionName, docId, data) {
  if (!firebaseReady || !db || !currentUser) return false;
  try {
    await db.doc(`users/${currentUser.uid}/${collectionName}/${docId}`).update(data);
    return true;
  } catch (e) { console.error('dbUpdate error:', e); return false; }
}

async function dbDelete(collectionName, docId) {
  if (!firebaseReady || !db || !currentUser) return false;
  try {
    await db.doc(`users/${currentUser.uid}/${collectionName}/${docId}`).delete();
    return true;
  } catch (e) { console.error('dbDelete error:', e); return false; }
}

// ============================================================
// LOAD ALL DATA FOR THE LOGGED-IN USER
// ============================================================
async function loadAllUserData() {
  showLoadingOverlay('Loading your data from Firestore...');
  try {
    await Promise.all([
      loadProfile(),
      loadTransactions(),
      loadSubscriptions(),
      loadInventory(),
    ]);
  } finally {
    hideLoadingOverlay();
  }
}

async function loadProfile() {
  const profile = await dbGet('profile/data');
  if (profile) {
    if (profile.name) {
      const nameEl = document.getElementById('sidebar-user-name');
      const avatarEl = document.getElementById('sidebar-avatar-initials');
      const profileNameEl = document.getElementById('profile-name');
      if (nameEl) nameEl.textContent = profile.name;
      if (avatarEl) avatarEl.textContent = profile.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
      if (profileNameEl) profileNameEl.value = profile.name;
    }
    if (profile.phone) { const el = document.getElementById('profile-phone'); if(el) el.value = profile.phone; }
    if (profile.apiKey) {
      currentApiKey = profile.apiKey;
      const el = document.getElementById('api-key-input');
      if (el) el.value = profile.apiKey;
    }
  }
  if (currentUser) {
    const emailEl = document.getElementById('profile-email');
    if (emailEl) emailEl.value = currentUser.email || '';
  }
}

async function loadTransactions() {
  const txs = await dbGetAll('transactions');
  const tbody = document.getElementById('tx-table-body');
  if (!tbody) return;

  if (txs.length === 0) {
    // NEW USER - Show empty state (no dummy data)
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px">📝 No transactions yet. Add your first transaction to get started!</td></tr>';
  } else {
    renderTransactions(txs);
  }
}

function renderTransactions(txs) {
  const tbody = document.getElementById('tx-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  txs.slice(0,10).forEach(tx => {
    const cls = tx.amount && tx.amount.startsWith('+') ? 'tx-pos' : 'tx-neg';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tx.date||'N/A'}</td>
      <td>${tx.description||''}</td>
      <td class="${cls}">${tx.amount||''}</td>
      <td><span class="tx-type ${tx.type||'unset'}" id="tx-type-${tx.id}">${cap(tx.type||'Unset')}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="openSplitModal('${tx.id}','${tx.description}')">✂️ Split</button></td>`;
    tbody.appendChild(tr);
  });
}

async function loadSubscriptions() {
  const subs = await dbGetAll('subscriptions');
  const list = document.getElementById('sub-list');
  if (!list) return;

  if (subs.length === 0) {
    // NEW USER - Show empty state (no dummy data)
    list.innerHTML = '<div style="text-align:center;color:var(--text-light);padding:24px">📦 No subscriptions tracked yet.</div>';
  } else {
    renderSubscriptions(subs);
  }
  const flagged = (await dbGetAll('subscriptions')).filter(s=>s.status==='unused').length;
  const el = document.getElementById('sub-count');
  if (el) el.textContent = `${flagged} flagged`;
}

function renderSubscriptions(subs) {
  const list = document.getElementById('sub-list');
  if (!list) return;
  list.innerHTML = '';
  subs.forEach(sub => {
    const div = document.createElement('div');
    div.className = 'subscription-card';
    div.id = `sub-card-${sub.id}`;
    div.innerHTML = `
      <div class="sub-info">
        <div class="sub-icon" style="background:${sub.color||'#F3E8FF'}">${sub.icon||'📦'}</div>
        <div>
          <div class="sub-name">${sub.name}</div>
          <div class="sub-price">RM ${sub.price}/month</div>
          <div class="sub-badge ${sub.status==='active'?'active-sub':''}">
            ${sub.status==='active'?'Active':'Unused '+sub.daysUnused+' days'}
          </div>
        </div>
      </div>
      ${sub.status==='active'
        ?`<button class="btn btn-outline btn-sm">Keep</button>`
        :`<button class="btn btn-danger btn-sm" onclick="cancelSubscriptionDB('${sub.id}','${sub.name}',${sub.price},this)">Cancel</button>`
      }`;
    list.appendChild(div);
  });
}

async function loadInventory() {
  const items = await dbGetAll('inventory');
  const tbody = document.getElementById('inv-table-body');
  if (!tbody) return;

  if (items.length === 0) {
    // NEW USER - Show empty state (no dummy data)
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:24px">📦 No inventory items yet. Add your first item!</td></tr>';
  } else {
    renderInventory(items);
  }
}

function renderInventory(items) {
  const tbody = document.getElementById('inv-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}${item.low?' <span class="stock-low">⚠ Low</span>':''}</td>
      <td>${item.qty}</td>
      <td>RM ${item.cost}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="updateStockDB('${item.id}','${item.name}',this)">Update</button></td>`;
    tbody.appendChild(tr);
  });
}

// These are called from dashboard.js
async function cancelSubscriptionDB(subId, name, price, btn) {
  if (!confirm(`Cancel ${name} (RM ${price}/month)?`)) return;
  await dbDelete('subscriptions', subId);
  const card = document.getElementById(`sub-card-${subId}`);
  if (card) { card.style.opacity='0'; card.style.transition='opacity 0.3s'; setTimeout(()=>card.remove(),300); }
  showToastMsg(`✅ ${name} cancelled! Saving RM ${price}/month`);
}

async function updateStockDB(id, name, btn) {
  const newQty = prompt(`Update quantity for ${name}:`);
  if (newQty) {
    const tr = btn.closest('tr');
    tr.cells[1].textContent = newQty;
    await dbUpdate('inventory', id, { qty: newQty });
    showToastMsg(`${name} updated ✓`);
  }
}

async function saveTxType(txId, type) {
  await dbUpdate('transactions', txId, { type });
}

// ============================================================
// SMALL UTILITIES
// ============================================================
function cap(str) { return str ? str.charAt(0).toUpperCase()+str.slice(1) : ''; }

function showToastMsg(msg) {
  // simple alert fallback if no toast element exists
  const t = document.getElementById('global-toast');
  if (t) {
    t.textContent = msg;
    t.className = 'toast show success';
    setTimeout(()=>t.classList.remove('show'), 3500);
  } else {
    console.log('TOAST:', msg);
  }
}

function showLoadingOverlay(msg) {
  const el = document.getElementById('loading-overlay');
  const txt = document.getElementById('loading-text');
  if (el) { if(txt) txt.textContent = msg||'Loading...'; el.classList.add('show'); }
}

function hideLoadingOverlay() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.remove('show');
}
