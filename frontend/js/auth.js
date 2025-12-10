// ==================== CONFIGURATION ====================
const API_URL = 'http://localhost:5000/api';
let otpTimer = null;
let timeLeft = 0;

// ==================== TAB SWITCHING ====================
function switchTab(tabName) {
    // Remove active class from all tabs and forms
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

    // Add active class to selected tab and form
    if (tabName === 'gmail') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('gmail-login-form').classList.add('active');
    } else if (tabName === 'phone') {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('phone-login-form').classList.add('active');
    }
}

// ==================== PASSWORD VISIBILITY ====================
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password i');

    if (input.type === 'password') {
        input.type = 'text';
        button.classList.remove('fa-eye');
        button.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        button.classList.remove('fa-eye-slash');
        button.classList.add('fa-eye');
    }
}

// ==================== LOGIN HANDLER ====================
async function handleLogin(type) {
    const btnId = type === 'gmail' ? 'gmail-login-btn' : 'phone-login-btn';
    const btn = document.getElementById(btnId);

    let email, phone, password;

    if (type === 'gmail') {
        email = document.getElementById('gmail-email').value.trim();
        password = document.getElementById('gmail-password').value;

        if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showNotification('Please enter a valid email', 'error');
            return;
        }
    } else {
        phone = document.getElementById('phone-number').value.trim();
        password = document.getElementById('phone-password').value;

        if (!phone || !password) {
            showNotification('Please enter phone and password', 'error');
            return;
        }

        if (phone.length !== 10) {
            showNotification('Phone number must be 10 digits', 'error');
            return;
        }
    }

    setButtonLoading(btn, true);

    try {
        const body = { password };
        if (type === 'gmail') {
            body.email = email;
        } else {
            body.phone = phone;
        }

        const response = await fetch(`${API_URL}/auth/login/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (data.success) {
            // Store token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showNotification('Login successful!', 'success');

            // Redirect to main app
            setTimeout(() => {
                window.location.href = 'rider-dashboard.html';
            }, 500);
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Server error. Please try again.', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ==================== SIGNUP HANDLER ====================
async function handleSignup() {
    const name = document.getElementById('signup-name').value.trim();
    const phone = document.getElementById('signup-phone').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Validation
    if (!name || !phone || !email || !password || !confirmPassword) {
        showNotification('All fields are required', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showNotification('Please enter a valid email', 'error');
        return;
    }

    if (phone.length !== 10) {
        showNotification('Phone number must be 10 digits', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    const btn = document.getElementById('signup-btn');
    setButtonLoading(btn, true);

    try {
        const response = await fetch(`${API_URL}/auth/signup/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, email, phone, password, confirmPassword })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');

            // Store email for OTP verification
            document.getElementById('otp-email-display').textContent = email;

            // Show OTP modal
            showOTPModal();

            // Start timer
            startOTPTimer(5 * 60); // 5 minutes

            // Log OTP in development mode
            if (data.otp) {
                console.log('OTP:', data.otp);
            }
        } else {
            showNotification(data.message || 'Signup failed', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Server error. Please try again.', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ==================== OTP VERIFICATION ====================
async function handleVerifyOTP() {
    const otp = document.getElementById('otp-input').value.trim();
    const email = document.getElementById('otp-email-display').textContent;

    if (!otp || otp.length !== 6) {
        showNotification('Please enter a valid 6-digit OTP', 'error');
        return;
    }

    const btn = document.getElementById('verify-otp-btn');
    setButtonLoading(btn, true);

    try {
        const response = await fetch(`${API_URL}/auth/signup/verify-complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Account created successfully!', 'success');

            // Clear timer
            if (otpTimer) {
                clearInterval(otpTimer);
            }

            // Close modal
            hideOTPModal();

            // Redirect to login
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } else {
            showNotification(data.message || 'OTP verification failed', 'error');
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        showNotification('Server error. Please try again.', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ==================== RESEND OTP ====================
async function handleResendOTP() {
    const email = document.getElementById('otp-email-display').textContent;
    const btn = document.getElementById('resend-btn');

    setButtonLoading(btn, true);

    try {
        const response = await fetch(`${API_URL}/auth/signup/resend-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');

            // Restart timer
            startOTPTimer(5 * 60); // 5 minutes

            // Log OTP in development mode
            if (data.otp) {
                console.log('New OTP:', data.otp);
            }
        } else {
            showNotification(data.message || 'Failed to resend OTP', 'error');
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showNotification('Server error. Please try again.', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// ==================== OTP TIMER ====================
function startOTPTimer(duration) {
    timeLeft = duration;
    const timerText = document.getElementById('timer-text');
    const resendBtn = document.getElementById('resend-btn');

    // Disable resend button
    resendBtn.disabled = true;

    // Clear existing timer
    if (otpTimer) {
        clearInterval(otpTimer);
    }

    // Update initial display
    updateTimerDisplay();

    otpTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            resendBtn.disabled = false;
            timerText.innerHTML = '<i class="fas fa-clock"></i> OTP expired';
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timerText = document.getElementById('timer-text');
    timerText.innerHTML = `<i class="fas fa-clock"></i> Expires in ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

// ==================== MODAL FUNCTIONS ====================
function showOTPModal() {
    const modal = document.getElementById('otp-modal');
    modal.classList.add('active');
    document.getElementById('otp-input').value = '';
    document.getElementById('otp-input').focus();
}

function hideOTPModal() {
    const modal = document.getElementById('otp-modal');
    modal.classList.remove('active');
    if (otpTimer) {
        clearInterval(otpTimer);
    }
}

// ==================== UTILITY FUNCTIONS ====================
function setButtonLoading(btn, isLoading) {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.querySelector('span').textContent;
        btn.querySelector('span').textContent = 'Please wait...';
    } else {
        btn.disabled = false;
        if (btn.dataset.originalText) {
            btn.querySelector('span').textContent = btn.dataset.originalText;
            delete btn.dataset.originalText;
        }
    }
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ==================== ENTER KEY HANDLERS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Add enter key handler for login forms
    const gmailEmail = document.getElementById('gmail-email');
    const gmailPassword = document.getElementById('gmail-password');
    const phoneNumber = document.getElementById('phone-number');
    const phonePassword = document.getElementById('phone-password');

    if (gmailEmail) {
        [gmailEmail, gmailPassword].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin('gmail');
            });
        });
    }

    if (phoneNumber) {
        [phoneNumber, phonePassword].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin('phone');
            });
        });
    }

    // Add enter key handler for OTP input
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
        otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleVerifyOTP();
        });
    }
});
