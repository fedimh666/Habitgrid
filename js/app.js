// ============================================================
//  HabitGrid — app.js
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  GoogleAuthProvider, signInWithPopup,
  RecaptchaVerifier, signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── 🔥 FIREBASE CONFIG ─────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBpOlLCZlyx7rmwNhKi7BLJn0xYEHZYK1Y",
  authDomain:        "grid-a7dda.firebaseapp.com",
  projectId:         "grid-a7dda",
  storageBucket:     "grid-a7dda.firebasestorage.app",
  messagingSenderId: "215742782193",
  appId:             "1:215742782193:web:a17eaf8d456f37dda9e750",
  measurementId:     "G-H35F556DHZ"
};
// ────────────────────────────────────────────────────────────

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ─── STATE ──────────────────────────────────────────────────
let currentUser  = null;
let userData     = { habits: [], completions: {} };
let trackerMonth = new Date().getMonth();
let trackerYear  = new Date().getFullYear();
let chartInstance = null;
let confirmationResult = null;

// ─── HELPERS ────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const today    = () => new Date().toISOString().slice(0, 10);
const dateKey  = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const uid      = () => Math.random().toString(36).slice(2, 9);
const setErr   = (id, msg) => { const el = $(id); if (el) el.textContent = msg; };

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 17) return "Good afternoon ☀️";
  return "Good evening 🌙";
}

// ─── SHOW/HIDE AUTH PANELS ──────────────────────────────────
window.showSignup = () => {
  $('login-form').classList.add('hidden');
  $('phone-form').classList.add('hidden');
  $('signup-form').classList.remove('hidden');
};
window.showLogin = () => {
  $('signup-form').classList.add('hidden');
  $('phone-form').classList.add('hidden');
  $('login-form').classList.remove('hidden');
};
window.showPhone = () => {
  $('login-form').classList.add('hidden');
  $('signup-form').classList.add('hidden');
  $('phone-form').classList.remove('hidden');
  setupRecaptcha();
};

// ─── EMAIL / PASSWORD ────────────────────────────────────────
window.loginUser = async () => {
  const email = $('login-email').value.trim();
  const pass  = $('login-password').value;
  setErr('login-error', '');
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) { setErr('login-error', friendlyError(e.code)); }
};

window.signupUser = async () => {
  const name  = $('signup-name').value.trim();
  const email = $('signup-email').value.trim();
  const pass  = $('signup-password').value;
  setErr('signup-error', '');
  if (!name) { setErr('signup-error', 'Please enter your name.'); return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), { name, habits: [], completions: {} });
  } catch (e) { setErr('signup-error', friendlyError(e.code)); }
};

// ─── GOOGLE AUTH ─────────────────────────────────────────────
window.loginWithGoogle = async () => {
  setErr('login-error', '');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
  } catch (e) { setErr('login-error', friendlyError(e.code)); }
};

// ─── PHONE AUTH ──────────────────────────────────────────────
function setupRecaptcha() {
  if (window.recaptchaVerifier) return;
  window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'normal',
    callback: () => { $('send-otp-btn').disabled = false; }
  });
  window.recaptchaVerifier.render();
}

window.sendOTP = async () => {
  const phone = $('phone-number').value.trim();
  setErr('phone-error', '');
  if (!phone) { setErr('phone-error', 'Enter a phone number.'); return; }
  try {
    confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    $('otp-step1').classList.add('hidden');
    $('otp-step2').classList.remove('hidden');
  } catch (e) {
    setErr('phone-error', friendlyError(e.code));
    // reset recaptcha on error
    if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    setupRecaptcha();
  }
};

window.verifyOTP = async () => {
  const code = $('otp-code').value.trim();
  setErr('phone-error', '');
  if (!code) { setErr('phone-error', 'Enter the OTP code.'); return; }
  try {
    const result = await confirmationResult.confirm(code);
    await ensureUserDoc(result.user);
  } catch (e) { setErr('phone-error', friendlyError(e.code)); }
};

// ─── ENSURE USER DOC ────────────────────────────────────────
async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  // onSnapshot will handle it, but set if new
  await setDoc(ref, {
    name: user.displayName || user.phoneNumber || user.email?.split('@')[0] || 'User',
    habits: [],
    completions: {}
  }, { merge: true });
}

// ─── LOGOUT ──────────────────────────────────────────────────
window.logoutUser = async () => { await signOut(auth); };

function friendlyError(code) {
  const map = {
    'auth/invalid-email':        'Invalid email address.',
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/email-already-in-use': 'Email already registered.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/too-many-requests':    'Too many attempts. Please wait.',
    'auth/invalid-phone-number': 'Invalid phone number. Use format: +1234567890',
    'auth/invalid-verification-code': 'Wrong OTP code. Please try again.',
    'auth/quota-exceeded':       'SMS quota exceeded. Try email login.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ─── AUTH STATE ──────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    $('auth-screen').classList.remove('active');
    $('app-screen').classList.add('active');
    loadUserData();
    setupUI();
  } else {
    currentUser = null;
    userData = { habits: [], completions: {} };
    $('app-screen').classList.remove('active');
    $('auth-screen').classList.add('active');
  }
});

// ─── FIRESTORE ───────────────────────────────────────────────
function loadUserData() {
  const ref = doc(db, 'users', currentUser.uid);
  onSnapshot(ref, snap => {
    if (snap.exists()) {
      const d = snap.data();
      userData.habits      = d.habits      || [];
      userData.completions = d.completions || {};
      renderAll();
    }
  });
}

async function saveData() {
  const ref = doc(db, 'users', currentUser.uid);
  await updateDoc(ref, { habits: userData.habits, completions: userData.completions });
}

// ─── UI SETUP ────────────────────────────────────────────────
function setupUI() {
  const name = currentUser.displayName || currentUser.phoneNumber || currentUser.email?.split('@')[0] || 'User';
  $('user-name-display').textContent = name;
  $('user-avatar').textContent = name.charAt(0).toUpperCase();
  $('today-greeting').textContent = greet() + ', ' + name.split(' ')[0] + '!';
}

function renderAll() {
  renderToday();
  renderTracker();
  renderManageHabits();
}

// ─── TODAY ───────────────────────────────────────────────────
function renderToday() {
  const t = today();
  const done   = userData.completions[t] || [];
  const habits = userData.habits;

  $('today-date-display').textContent = new Date().toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  const pct = habits.length ? Math.round(done.length / habits.length * 100) : 0;
  $('today-percent').textContent = pct + '%';
  $('today-progress-bar').style.width = pct + '%';

  const list = $('today-habits-list');
  list.innerHTML = '';

  if (habits.length === 0) { $('today-empty').classList.remove('hidden'); return; }
  $('today-empty').classList.add('hidden');

  habits.forEach(h => {
    const isDone  = done.includes(h.id);
    const streak  = calcStreak(h.id);
    const row     = document.createElement('div');
    row.className = 'habit-row' + (isDone ? ' done' : '');
    row.innerHTML = `
      <div class="habit-check"></div>
      <span class="habit-name">${h.name}</span>
      <span class="habit-streak">🔥 ${streak} day${streak !== 1 ? 's' : ''}</span>`;
    row.addEventListener('click', () => toggleToday(h.id));
    list.appendChild(row);
  });
}

async function toggleToday(habitId) {
  const t = today();
  if (!userData.completions[t]) userData.completions[t] = [];
  const arr = userData.completions[t];
  const idx = arr.indexOf(habitId);
  if (idx === -1) arr.push(habitId); else arr.splice(idx, 1);
  await saveData();
}

// ─── STREAKS ─────────────────────────────────────────────────
function calcStreak(habitId) {
  let streak = 0;
  const d = new Date();
  const todayDone = (userData.completions[today()] || []).includes(habitId);
  if (!todayDone) d.setDate(d.getDate() - 1);
  while (true) {
    const key = d.toISOString().slice(0, 10);
    if ((userData.completions[key] || []).includes(habitId)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function calcLongestStreak(habitId) {
  const keys = Object.keys(userData.completions).sort();
  let longest = 0, current = 0, prev = null;
  keys.forEach(k => {
    if ((userData.completions[k] || []).includes(habitId)) {
      if (prev) { const diff = (new Date(k) - new Date(prev)) / 86400000; current = diff === 1 ? current + 1 : 1; }
      else current = 1;
      if (current > longest) longest = current;
      prev = k;
    } else { prev = null; current = 0; }
  });
  return longest;
}

// ─── TRACKER ─────────────────────────────────────────────────
window.changeMonth = dir => {
  trackerMonth += dir;
  if (trackerMonth < 0)  { trackerMonth = 11; trackerYear--; }
  if (trackerMonth > 11) { trackerMonth = 0;  trackerYear++; }
  renderTracker();
};

function renderTracker() {
  const y = trackerYear, m = trackerMonth;
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayStr    = today();

  $('tracker-month-label').textContent = new Date(y, m, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' });

  let headRow = '<tr><th class="habit-col">Habit</th><th>Goal</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = dateKey(y, m, d) === todayStr;
    headRow += `<th style="${isToday ? 'color:var(--accent)' : ''}">${d}</th>`;
  }
  headRow += '<th>%</th></tr>';
  $('tracker-head').innerHTML = headRow;

  $('tracker-body').innerHTML = '';
  userData.habits.forEach(h => {
    let completed = 0;
    let row = `<tr><td class="habit-col">${h.name}</td><td class="goal-cell">${h.goal || 25}</td>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const key     = dateKey(y, m, d);
      const isDone  = (userData.completions[key] || []).includes(h.id);
      const isToday = key === todayStr;
      const isFuture = key > todayStr;
      if (isDone) completed++;
      const cls = ['tracker-cell', isDone ? 'filled':'', isToday ? 'today-col':'', isFuture ? 'future':''].filter(Boolean).join(' ');
      row += `<td><div class="${cls}" onclick="${isFuture ? '' : `toggleCell('${h.id}','${key}')`}">${isDone ? '✓' : ''}</div></td>`;
    }
    const pct = Math.round(completed / daysInMonth * 100);
    row += `<td class="progress-cell">${pct}%</td></tr>`;
    $('tracker-body').innerHTML += row;
  });
}

window.toggleCell = async (habitId, key) => {
  if (!userData.completions[key]) userData.completions[key] = [];
  const arr = userData.completions[key];
  const idx = arr.indexOf(habitId);
  if (idx === -1) arr.push(habitId); else arr.splice(idx, 1);
  await saveData();
};

// ─── STATS ───────────────────────────────────────────────────
function renderStats() {
  const habits = userData.habits;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysPassed  = Math.min(now.getDate(), daysInMonth);

  let totalDone = 0;
  for (let d = 1; d <= daysPassed; d++) {
    const k = dateKey(y, m, d);
    totalDone += (userData.completions[k] || []).filter(id => habits.find(h => h.id === id)).length;
  }
  const totalPossible = habits.length * daysPassed;
  const globalPct = totalPossible ? Math.round(totalDone / totalPossible * 100) : 0;
  $('stat-global').textContent = globalPct + '%';

  let bestStreak = 0;
  habits.forEach(h => { const l = calcLongestStreak(h.id); if (l > bestStreak) bestStreak = l; });
  $('stat-best-streak').textContent = bestStreak + ' 🔥';

  const allKeys = Object.keys(userData.completions);
  const trackedDays = allKeys.filter(k => (userData.completions[k] || []).length > 0).length;
  $('stat-days').textContent = trackedDays;

  let total = 0;
  allKeys.forEach(k => { total += (userData.completions[k] || []).length; });
  $('stat-total').textContent = total;

  const rankings = habits.map(h => {
    let done = 0;
    for (let d = 1; d <= daysPassed; d++) {
      const k = dateKey(y, m, d);
      if ((userData.completions[k] || []).includes(h.id)) done++;
    }
    const pct = daysPassed ? Math.round(done / daysPassed * 100) : 0;
    return { ...h, pct, streak: calcStreak(h.id), longest: calcLongestStreak(h.id) };
  }).sort((a, b) => b.pct - a.pct);

  $('habit-rankings').innerHTML = rankings.map((h, i) => `
    <div class="ranking-row">
      <span class="rank-num">#${i+1}</span>
      <span class="rank-name">${h.name}</span>
      <div class="rank-bar-wrap"><div class="rank-bar" style="width:${h.pct}%"></div></div>
      <span class="rank-pct">${h.pct}%</span>
      <span class="rank-streak">🔥${h.streak} / best ${h.longest}</span>
    </div>`).join('');

  renderWeeklyChart();
}

function renderWeeklyChart() {
  const canvas = $('weekly-chart');
  if (!canvas) return;
  if (!window.Chart) {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
    s.onload = () => drawChart(canvas);
    document.head.appendChild(s);
  } else drawChart(canvas);
}

function drawChart(canvas) {
  const labels = [], data = [];
  const habits = userData.habits;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k   = d.toISOString().slice(0, 10);
    const done = (userData.completions[k] || []).filter(id => habits.find(h => h.id === id)).length;
    const pct  = habits.length ? Math.round(done / habits.length * 100) : 0;
    labels.push(d.toLocaleDateString('en-US', { month:'short', day:'numeric' }));
    data.push(pct);
  }
  if (chartInstance) chartInstance.destroy();
  chartInstance = new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Daily Completion %', data,
        backgroundColor: data.map(v => v >= 70 ? 'rgba(240,165,0,0.85)' : v >= 40 ? 'rgba(240,165,0,0.45)' : 'rgba(240,165,0,0.15)'),
        borderRadius: 6, borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7a8099' } },
        y: { max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7a8099', callback: v => v + '%' } }
      }
    }
  });
}

// ─── MANAGE HABITS ───────────────────────────────────────────
const DEFAULT_HABITS = [
  'Wake up at 06:00 ⏰','Workout 🏋️','Read 20 Pages 📖','No Alcohol 🍷',
  'Cold Shower 🚿','Journal My Day 📓','Budget Tracking 💰',
  'Social Media Detox 🌿','Eat Healthy 🥗','Meditate 🧘',
  'Walk 10k Steps 👟','Drink 2L Water 💧'
];

function renderManageHabits() {
  const list = $('habits-manage-list');
  list.innerHTML = '';
  userData.habits.forEach(h => {
    const row = document.createElement('div');
    row.className = 'manage-row';
    row.innerHTML = `
      <span class="drag-handle">⠿</span>
      <span class="manage-row-name">${h.name}</span>
      <span class="manage-row-goal">Goal: ${h.goal} days</span>
      <button class="btn btn-sm btn-danger" onclick="deleteHabit('${h.id}')">✕ Remove</button>`;
    list.appendChild(row);
  });
  const chips = $('quick-chips');
  chips.innerHTML = '';
  DEFAULT_HABITS.forEach(name => {
    if (userData.habits.find(h => h.name === name)) return;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = name;
    chip.onclick = () => quickAddHabit(name);
    chips.appendChild(chip);
  });
}

window.addHabit = async () => {
  const name = $('new-habit-name').value.trim();
  const goal = parseInt($('new-habit-goal').value) || 25;
  if (!name) return;
  if (userData.habits.length >= 20) { alert('Max 20 habits.'); return; }
  userData.habits.push({ id: uid(), name, goal });
  $('new-habit-name').value = '';
  await saveData();
};

window.deleteHabit = async id => {
  if (!confirm('Remove this habit?')) return;
  userData.habits = userData.habits.filter(h => h.id !== id);
  await saveData();
};

async function quickAddHabit(name) {
  userData.habits.push({ id: uid(), name, goal: 25 });
  await saveData();
}

// ─── TABS ────────────────────────────────────────────────────
window.showTab = tab => {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`tab-${tab}`).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'stats')   renderStats();
  if (tab === 'tracker') renderTracker();
};
