// ==================== CONFIGURATION ====================
const API_URL = 'http://localhost:5000/api';
let socket;
let token = localStorage.getItem('token');
let user = null;
let currentTrip = null;
let selectedVehicleType = null;
let pickupLocation = null;
let dropLocation = null;
let searchType = null; // 'pickup' or 'drop'
let savedAddresses = [];
let tripHistory = [];
let selectedPaymentMethod = null;
let currentPaymentTripId = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Restore trip from localStorage
    const savedTrip = localStorage.getItem('rapidRide_currentTrip');
    if (savedTrip) {
        try {
            currentTrip = JSON.parse(savedTrip);
            if (currentTrip && currentTrip.vehicleType) {
                selectedVehicleType = currentTrip.vehicleType;
            }
        } catch (e) {
            console.error('Error parsing saved trip:', e);
            localStorage.removeItem('rapidRide_currentTrip');
        }
    }

    // Hide splash screen after 2 seconds
    setTimeout(() => {
        document.getElementById('splash-screen').style.display = 'none';

        if (token) {
            verifyToken();
        } else {
            showAuthScreen();
        }
    }, 2000);
});

// ==================== AUTH FUNCTIONS ====================
// ==================== AUTH VARIABLE ====================
let authState = {
    mode: 'login', // 'login' or 'signup'
    email: '',
    phone: '',
    timer: null,
    timeLeft: 600, // 10 minutes
    canResend: false
};

function setButtonLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        btn.dataset.originalText = btn.innerText;
        btn.innerText = 'Please wait...';
    } else if (btn.dataset.originalText) {
        btn.innerText = btn.dataset.originalText;
        delete btn.dataset.originalText;
    }
}

// ==================== AUTH FUNCTIONS ====================
function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'block';

    // Reset forms
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('otp-form').style.display = 'none';

    // Reset tabs
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.auth-tab:first-child').classList.add('active');
}

function switchAuthTab(tab) {
    authState.mode = tab;

    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    }

    document.getElementById('otp-form').style.display = 'none';
}

async function handleLoginInitiate() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }

    setButtonLoading('login-btn', true);
    try {
        const res = await fetch(`${API_URL}/auth/login/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            authState.email = email;
            authState.mode = 'login';
            showOtpScreen(email);
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Server error', 'error');
    } finally {
        setButtonLoading('login-btn', false);
    }
}

async function handleSignupInitiate() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const phone = document.getElementById('signup-phone').value;
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !phone || !password) {
        showNotification('All fields are required', 'error');
        return;
    }

    setButtonLoading('signup-btn', true);
    try {
        const res = await fetch(`${API_URL}/auth/signup/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();

        if (data.success) {
            authState.email = email;
            authState.mode = 'signup';
            showOtpScreen(email);
            showNotification(data.message, 'success');
        } else {
            showNotification(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Server error', 'error');
    } finally {
        setButtonLoading('signup-btn', false);
    }
}

function showOtpScreen(email) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('otp-form').style.display = 'block';
    document.getElementById('otp-email-display').textContent = email;

    startOtpTimer();
}

function startOtpTimer() {
    authState.timeLeft = 600; // 10 mins
    authState.canResend = false;
    document.getElementById('resend-btn').disabled = true;

    if (authState.timer) clearInterval(authState.timer);

    updateTimerDisplay();

    authState.timer = setInterval(() => {
        authState.timeLeft--;
        updateTimerDisplay();

        // Enable resend after 1 minute (60s)
        if (authState.timeLeft <= 540 && !authState.canResend) {
            authState.canResend = true;
            document.getElementById('resend-btn').disabled = false;
        }

        if (authState.timeLeft <= 0) {
            clearInterval(authState.timer);
            showNotification('OTP Expired', 'error');
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(authState.timeLeft / 60);
    const seconds = authState.timeLeft % 60;
    document.getElementById('timer-text').textContent = `Expires in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

async function handleVerifyOTP() {
    const otp = document.getElementById('otp-input').value;
    if (!otp || otp.length !== 6) {
        showNotification('Enter valid 6-digit OTP', 'error');
        return;
    }

    const endpoint = authState.mode === 'login'
        ? `${API_URL}/auth/login/complete`
        : `${API_URL}/auth/signup/complete`;

    setButtonLoading('verify-btn', true);
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: authState.email, otp })
        });
        const data = await res.json();

        if (data.success) {
            if (authState.timer) clearInterval(authState.timer);
            handleLoginSuccess(data);
        } else {
            showNotification(data.message, 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Verification failed', 'error');
    } finally {
        setButtonLoading('verify-btn', false);
    }
}

async function handleResendOTP() {
    if (!authState.canResend) return;

    setButtonLoading('resend-btn', true);
    try {
        const res = await fetch(`${API_URL}/auth/otp/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: authState.email,
                verificationType: authState.mode === 'login' ? 'login' : 'signup'
            })
        });
        const data = await res.json();
        if (!data.success) {
            showNotification(data.message || 'Could not resend OTP', 'error');
            setButtonLoading('resend-btn', false);
            return;
        }
    } catch (err) {
        console.error(err);
        showNotification('Could not resend OTP', 'error');
        setButtonLoading('resend-btn', false);
        return;
    }

    startOtpTimer();
    showNotification('New OTP sent', 'success');
    setButtonLoading('resend-btn', false);
}

function resetAuthForms() {
    document.getElementById('otp-form').style.display = 'none';
    if (authState.mode === 'login') {
        document.getElementById('login-form').style.display = 'block';
    } else {
        document.getElementById('signup-form').style.display = 'block';
    }
}

// ... existing code ...
