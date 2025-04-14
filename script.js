// ===== FIREBASE INITIALIZATION =====
const auth = firebase.auth();
const db = firebase.firestore();

// ===== DOM ELEMENTS =====
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const switchAuth = document.getElementById('switch-auth');
const closeAuth = document.querySelector('.close-auth');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const calendarHeader = document.querySelector('.calendar-header h3');
const prevMonthBtn = document.querySelector('.calendar-controls span:first-child');
const nextMonthBtn = document.querySelector('.calendar-controls span:last-child');
const authButtons = document.querySelector('.auth-buttons');

// ===== APP STATE =====
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let isLoginMode = true;

// ===== USER DATA =====
let userData = {
  cycleLength: 28,
  periodLength: 5,
  lastPeriodStart: null,
  symptoms: {},
  ovulationDay: 14
};

// ===== HEALTH TIPS DATABASE =====
const healthTips = {
  period: [
    "Use a heating pad for cramps",
    "Stay hydrated with warm water",
    "Try light yoga stretches",
    "Iron-rich foods can help with fatigue"
  ],
  ovulation: [
    "Best time for conception if trying to get pregnant",
    "You may notice clearer cervical mucus",
    "Libido might be higher during this phase",
    "Some women experience mittelschmerz (ovulation pain)"
  ],
  pms: [
    "Reduce salt intake to minimize bloating",
    "Magnesium supplements may help with mood swings",
    "Limit caffeine if experiencing breast tenderness",
    "Dark chocolate can satisfy cravings healthily"
  ]
};

// ===== AUTHENTICATION FUNCTIONS =====
function setupAuthListeners() {
  // Toggle between login/signup
  switchAuth.addEventListener('click', toggleAuthMode);

  // Handle form submission
  authForm.addEventListener('submit', handleAuthSubmit);

  // Close modal
  closeAuth.addEventListener('click', closeAuthModal);

  // Open auth modal from nav buttons
  document.querySelectorAll('[href="#login"], [href="#signup"]').forEach(btn => {
    btn.addEventListener('click', handleAuthButtonClick);
  });
}

function toggleAuthMode() {
  isLoginMode = !isLoginMode;
  updateAuthUI();
}

function updateAuthUI() {
  authTitle.textContent = isLoginMode ? 'Login' : 'Sign Up';
  authSubmit.textContent = isLoginMode ? 'Login' : 'Sign Up';
  switchAuth.textContent = isLoginMode ? 'Sign up' : 'Login';
  document.querySelector('.auth-switch').innerHTML = isLoginMode 
    ? 'Don\'t have an account? <span id="switch-auth">Sign up</span>'
    : 'Already have an account? <span id="switch-auth">Login</span>';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = authEmail.value;
  const password = authPassword.value;

  try {
    if (isLoginMode) {
      await auth.signInWithEmailAndPassword(email, password);
    } else {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      await initializeUserData(userCredential.user.uid);
    }
    closeAuthModal();
  } catch (error) {
    showAuthError(error);
  }
}

function handleAuthButtonClick(e) {
  e.preventDefault();
  if (this.getAttribute('href') === '#signup') {
    isLoginMode = false;
  }
  updateAuthUI();
  openAuthModal();
}

function openAuthModal() {
  authModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  authModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  authForm.reset();
}

function showAuthError(error) {
  alert(error.message);
  console.error("Auth error:", error);
}

// ===== USER DATA FUNCTIONS =====
async function initializeUserData(userId) {
  try {
    await db.collection('users').doc(userId).set({
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStart: null,
      symptoms: {},
      ovulationDay: 14
    });
  } catch (error) {
    console.error("Error initializing user data:", error);
  }
}

async function loadUserData(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      Object.assign(userData, doc.data());
      renderCalendar(currentMonth, currentYear);
      showHealthTips();
    }
  } catch (error) {
    console.error("Error loading user data:", error);
  }
}

async function saveUserData(userId) {
  try {
    await db.collection('users').doc(userId).set(userData);
  } catch (error) {
    console.error("Error saving user data:", error);
  }
}

// ===== CALENDAR FUNCTIONS =====
function renderCalendar(month, year) {
  calendarHeader.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;
  const daysContainer = document.querySelector('.days');
  daysContainer.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevMonthDays = firstDay.getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Previous month days
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    daysContainer.appendChild(createDayElement(prevMonthLastDay - i, 'prev-month'));
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    const dayType = getDayType(date);
    daysContainer.appendChild(createDayElement(i, dayType, date));
  }

  // Next month days
  const nextMonthDays = 6 - lastDay.getDay();
  for (let i = 1; i <= nextMonthDays; i++) {
    daysContainer.appendChild(createDayElement(i, 'next-month'));
  }
}

function createDayElement(dayNum, className, date) {
  const dayElement = document.createElement('div');
  dayElement.className = `day ${className}`;
  dayElement.textContent = dayNum;

  if (date && !className.includes('month')) {
    dayElement.addEventListener('click', () => togglePeriodDay(date));
    dayElement.title = getDayTooltip(date);
  }

  return dayElement;
}

function getDayType(date) {
  if (!userData.lastPeriodStart) return '';
  
  const periodStart = new Date(userData.lastPeriodStart);
  const cycleDay = Math.floor((date - periodStart) / (1000 * 60 * 60 * 24)) % userData.cycleLength;
  
  if (cycleDay < userData.periodLength) return 'period';
  if (cycleDay === userData.ovulationDay) return 'ovulation';
  if (cycleDay >= userData.ovulationDay - 3 && cycleDay <= userData.ovulationDay + 3) return 'fertile';
  return '';
}

function togglePeriodDay(date) {
  const dateStr = date.toISOString().split('T')[0];
  
  if (!userData.lastPeriodStart || confirm("Set this as your last period start date?")) {
    userData.lastPeriodStart = dateStr;
    saveUserData(auth.currentUser.uid);
    renderCalendar(currentMonth, currentYear);
    showHealthTips();
  }
}

// ===== HEALTH TIPS =====
function showHealthTips() {
  const today = new Date();
  const dayType = getDayType(today);
  
  if (dayType === 'period') {
    showRandomTip('period');
  } else if (dayType === 'ovulation') {
    showRandomTip('ovulation');
  } else if (isPMSDay(today)) {
    showRandomTip('pms');
  }
}

function isPMSDay(date) {
  if (!userData.lastPeriodStart) return false;
  
  const periodStart = new Date(userData.lastPeriodStart);
  const nextPeriod = new Date(periodStart);
  nextPeriod.setDate(periodStart.getDate() + userData.cycleLength);
  
  const daysBeforePeriod = Math.floor((nextPeriod - date) / (1000 * 60 * 60 * 24));
  return daysBeforePeriod > 0 && daysBeforePeriod <= 14;
}

function showRandomTip(tipType) {
  const tips = healthTips[tipType];
  const randomTip = tips[Math.floor(Math.random() * tips.length)];
  
  const tipsContainer = document.querySelector('.health-tips');
  tipsContainer.innerHTML = `
    <div class="tip-card ${tipType}">
      <h3>${tipType.toUpperCase()} Tip</h3>
      <p>${randomTip}</p>
    </div>
  `;
}

// ===== NAVIGATION =====
function setupNavigation() {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
  });

  nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
  });
}

// ===== AUTH STATE MANAGEMENT =====
function handleAuthStateChange(user) {
  if (user) {
    // User is signed in
    authButtons.innerHTML = `
      <div class="user-profile">
        <span class="user-email">${user.email}</span>
        <button class="logout-btn">Logout</button>
      </div>
    `;
    
    document.querySelector('.logout-btn').addEventListener('click', () => {
      auth.signOut();
    });
    
    loadUserData(user.uid);
  } else {
    // User is signed out
    authButtons.innerHTML = `
      <a href="#login" class="btn btn-outline">Login</a>
      <a href="#signup" class="btn btn-primary">Sign Up</a>
    `;
    
    setupAuthListeners();
  }
}

// ===== INITIALIZATION =====
function init() {
  setupAuthListeners();
  setupNavigation();
  renderCalendar(currentMonth, currentYear);
  auth.onAuthStateChanged(handleAuthStateChange);
}

// Start the app
init();
