// script.js
// Firebase v9.23.0 Modular SDK imports
// All Firebase SDK functions are imported directly here.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile // To set display name after registration
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    push,
    onValue, // For fetching all service requests, payments, feedbacks
    set // Used for updating service request status
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// --- Firebase Configuration (IMPORTANT: REPLACE WITH YOUR ACTUAL CONFIG) ---
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgGaOi-lNe9vNg72fNag1C6hioB2qqnMU",
  authDomain: "service-prepareing.firebaseapp.com",
  projectId: "service-prepareing",
  storageBucket: "service-prepareing.appspot.com", // ✅ Fixed here
  messagingSenderId: "295345065007",
  appId: "1:295345065007:web:0eb9463c2f0b73ff4b4ada",
  measurementId: "G-W68Y5N8TLD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider(); // Initialize Google Auth Provider

// --- Global Variables ---
let currentBookingDetails = {};
let lastServiceId = null;
let lastCustomerName = null;
let lastServiceAmount = null;
let lastServiceType = null;
let customerSelectedRating = 0; // To store customer's star rating
let currentUserRole = null; // 'customer' or 'serviceCenter'
let currentUserName = "Guest"; // Default for chat sender, will be updated on login

// --- Demo User Storage (NOT FOR PRODUCTION) ---
// This simulates user storage using localStorage for demo purposes.
// In a real application, you would primarily rely on Firebase Authentication state.
let demoUsers = JSON.parse(localStorage.getItem('demoUsers')) || {
    customer: { email: "customer@example.com", password: "password", name: "Demo Customer" },
    serviceCenter: { email: "center@example.com", password: "password", name: "Service Center" }
};

function saveDemoUsers() {
    localStorage.setItem('demoUsers', JSON.stringify(demoUsers));
}

// Profile Page Functions
// Load user profile from localStorage or set defaults
let userProfile = JSON.parse(localStorage.getItem('userProfile')) || {
    name: "",
    email: "",
    mobile: "",
    address: "",
    carMake: "",
    carModel: "",
    carYear: null,
    licensePlate: ""
};

function saveProfileData() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    console.log("Profile data saved:", userProfile);
}

function loadProfileData() {
    // Ensure profile data is loaded before displaying
    userProfile = JSON.parse(localStorage.getItem('userProfile')) || userProfile;

    document.getElementById('profileName').value = userProfile.name || '';
    document.getElementById('profileEmail').value = userProfile.email || '';
    document.getElementById('profileMobile').value = userProfile.mobile || '';
    document.getElementById('profileAddress').value = userProfile.address || '';
    document.getElementById('profileCarMake').value = userProfile.carMake || '';
    document.getElementById('profileCarModel').value = userProfile.carModel || '';
    document.getElementById('profileCarYear').value = userProfile.carYear || '';
    document.getElementById('profileLicensePlate').value = userProfile.licensePlate || '';
}

// Service Center Specific Elements & Data for local demo rendering
// These lists will be populated by Firebase data directly in a real app
const customerFeedbackList = document.getElementById("customerFeedbackList");
const noFeedbackMessage = document.getElementById("noFeedbackMessage");
const paymentHistoryList = document.getElementById("paymentHistoryList");
const noPaymentHistoryMessage = document.getElementById("noPaymentHistoryMessage");
const serviceRequestsList = document.getElementById("serviceRequestsList");
const noRequestsMessage = document.getElementById("noRequestsMessage");

// Translation content for demo
const translations = {
    "en": {
        "hero_heading": "Experience Hassle-Free Car Servicing!",
        "hero_subheading": "From pickup to delivery, we make car maintenance easy and transparent. Quick, reliable, and just a tap away.",
        "book_now_cta": "Book Your Service Now",
        "nav_home": "Home",
        "nav_book_service": "Book Service",
        "nav_payments": "Payments",
        "nav_feedback": "Feedback",
        "nav_contact": "Contact Us",
        "nav_profile": "Profile",
        "nav_chat": "Chat",
        "nav_dashboard": "Dashboard" // Added for service center
    },
    "hi": {
        "hero_heading": "परेशानी मुक्त कार सर्विसिंग का अनुभव करें!",
        "hero_subheading": "पिकअप से लेकर डिलीवरी तक, हम कार रखरखाव को आसान और पारदर्शी बनाते हैं। त्वरित, विश्वसनीय, और बस एक टैप दूर।",
        "book_now_cta": "अपनी सेवा अभी बुक करें",
        "nav_home": "होम",
        "nav_book_service": "सेवा बुक करें",
        "nav_payments": "भुगतान",
        "nav_feedback": "प्रतिक्रिया",
        "nav_contact": "हमसे संपर्क करें",
        "nav_profile": "प्रोफ़ाइल",
        "nav_chat": "चैट",
        "nav_dashboard": "डैशबोर्ड"
    },
    "mr": {
        "hero_heading": "झटपट कार सर्विसिंगचा अनुभव घ्या!",
        "hero_subheading": "पिकअपपासून डिलिव्हरीपर्यंत, आम्ही कारची देखभाल सोपी आणि पारदर्शक बनवतो. जलद, विश्वसनीय आणि फक्त एका टॅपवर.",
        "book_now_cta": "आता तुमची सेवा बुक करा",
        "nav_home": "मुख्यपृष्ठ",
        "nav_book_service": "सेवा बुक करा",
        "nav_payments": "पेमेंट्स",
        "nav_feedback": "फीडबॅक",
        "nav_contact": "आम्हाला संपर्क करा",
        "nav_profile": "प्रोफाईल",
        "nav_chat": "चॅट",
        "nav_dashboard": "डॅशबोर्ड"
    },
    "te": {
        "hero_heading": "తలనొప్పి లేని కార్ సర్వీసింగ్ అనుభవాన్ని పొందండి!",
        "hero_subheading": "పిక్అప్ నుండి డెలివరీ వరకు, మేము కార్ నిర్వహణను సులభతరం మరియు పారదర్శకంగా చేస్తాము. త్వరితంగా, నమ్మదగినది, మరియు కేవలం ఒక ట్యాప్ దూరంలో.",
        "book_now_cta": "మీ సేవను ఇప్పుడు బుక్ చేయండి",
        "nav_home": "హోమ్",
        "nav_book_service": "సేవను బుక్ చేయండి",
        "nav_payments": "చెల్లింపులు",
        "nav_feedback": "అభిప్రాయం",
        "nav_contact": "మమ్మల్ని సంప్రదించండి",
        "nav_profile": "ప్రొఫైల్",
        "nav_chat": "చాట్",
        "nav_dashboard": "డాష్‌బోర్డ్"
    },
    "kn": {
        "hero_heading": "ತೊಂದರೆ-ಮುಕ್ತ ಕಾರ್ ಸೇವೆ ಅನುಭವಿಸಿ!",
        "hero_subheading": "ಪಿಕ್ಅಪ್‌ನಿಂದ ವಿತರಣೆಯವರೆಗೆ, ನಾವು ಕಾರ್ ನಿರ್ವಹಣೆಯನ್ನು ಸುಲಭ ಮತ್ತು ಪಾರದರ್ಶಕಗೊಳಿಸುತ್ತೇವೆ. ವೇಗವಾಗಿ, ವಿಶ್ವಾಸಾರ್ಹ, ಮತ್ತು ಕೇವಲ ಒಂದು ಟ್ಯಾಪ್ ದೂರದಲ್ಲಿ.",
        "book_now_cta": "ನಿಮ್ಮ ಸೇವೆಯನ್ನು ಈಗಲೇ ಬುಕ್ ಮಾಡಿ",
        "nav_home": "ಮುಖಪುಟ",
        "nav_book_service": "ಸೇವೆ ಬುಕ್ ಮಾಡಿ",
        "nav_payments": "ಪಾವತಿಗಳು",
        "nav_feedback": "ಪ್ರತಿಕ್ರಿಯೆ",
        "nav_contact": "ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ",
        "nav_profile": "ಪ್ರೊಫೈಲ್",
        "nav_chat": "ಚಾಟ್",
        "nav_dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್"
    }
};

// --- Utility Functions ---
function showScreen(screenId) {
    console.log(`Attempting to show screen: ${screenId}`);
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.style.display = 'flex';
        console.log(`Screen '${screenId}' display set to 'flex'. Current display: ${targetScreen.style.display}`);
    } else {
        console.error(`Error: Screen with ID '${screenId}' not found.`);
    }

    const appContainer = document.querySelector('.app-container');
    if (['language-selection-screen', 'customer-auth-screen', 'service-center-auth-screen'].includes(screenId)) {
        if (appContainer) {
            appContainer.style.display = 'none';
            console.log("App container hidden.");
        }
    } else {
        if (appContainer) {
            appContainer.style.display = 'flex';
            console.log("App container shown (display: flex).");
        }
    }
}

function showContentSection(sectionId) {
    console.log(`Attempting to show content section: ${sectionId}`);
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        console.log(`Content section '${sectionId}' display set to 'block' and 'active'. Current display: ${targetSection.style.display}`);
    } else {
        console.error(`Error: Content section with ID '${sectionId}' not found.`);
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const navLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
    if (navLink) {
        navLink.classList.add('active');
        console.log(`Nav link for '${sectionId}' set to active.`);
    }

    // Load profile data if navigating to profile section
    if (sectionId === 'profile-section' && currentUserRole === 'customer') {
        loadProfileData();
    }
}

function generateServiceId() {
    return '#SVC' + Math.floor(10000 + Math.random() * 90000);
}

function updateNoRequestsMessage() {
    if (serviceRequestsList.children.length === 0 || (serviceRequestsList.children.length === 1 && serviceRequestsList.children[0].classList.contains("empty-message"))) {
        noRequestsMessage.style.display = 'block';
    } else {
        noRequestsMessage.style.display = 'none';
    }
}

function renderFeedbacks(feedbacksData) {
    customerFeedbackList.innerHTML = ''; // Clear existing
    if (!feedbacksData || Object.keys(feedbacksData).length === 0) {
        noFeedbackMessage.style.display = 'block';
    } else {
        noFeedbackMessage.style.display = 'none';
        Object.values(feedbacksData).forEach(feedback => {
            const li = document.createElement('li');
            let stars = '';
            for (let i = 0; i < 5; i++) {
                stars += `<i class="fa${i < feedback.rating ? 's' : 'r'} fa-star"></i>`;
            }
            li.innerHTML = `
                <p><strong>Service ID:</strong> ${feedback.serviceId}</p>
                <p class="rating">${stars}</p>
                <p>${feedback.message}</p>
                <p class="author">- Anonymous Customer</p>
            `;
            customerFeedbackList.appendChild(li);
        });
    }
}

function renderPaymentHistory(paymentsData) {
    paymentHistoryList.innerHTML = ''; // Clear existing
    if (!paymentsData || Object.keys(paymentsData).length === 0) {
        noPaymentHistoryMessage.style.display = 'block';
    } else {
        noPaymentHistoryMessage.style.display = 'none';
        Object.values(paymentsData).forEach(payment => {
            const li = document.createElement('li');
            li.innerHTML = `
                <p><strong>Service ID:</strong> ${payment.serviceId}</p>
                <p><strong>Amount:</strong> ₹${payment.amount.toFixed(2)}</p>
                <p><strong>Status:</strong> ${payment.status}</p>
                <p><strong>Date:</strong> ${payment.date}</p>
            `;
            paymentHistoryList.appendChild(li);
        });
    }
}

function applyTranslation(lang) {
    const elementsToTranslate = document.querySelectorAll('[data-translate]');
    elementsToTranslate.forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
}

function showCustomerAuth(formType) {
    document.getElementById('customerLoginForm').style.display = 'none';
    document.getElementById('customerRegisterForm').style.display = 'none';
    document.querySelector('.auth-toggle .toggle-btn.active')?.classList.remove('active'); // Use optional chaining for safety

    if (formType === 'login') {
        document.getElementById('customerLoginForm').style.display = 'block';
        document.querySelector('.auth-toggle button:nth-child(1)').classList.add('active');
    } else {
        document.getElementById('customerRegisterForm').style.display = 'block';
        document.querySelector('.auth-toggle button:nth-child(2)').classList.add('active');
    }
}

// Custom Message Box Function
function displayMessage(message, type = 'info', duration = 3000) {
    const messageBox = document.getElementById('customMessageBox');
    if (!messageBox) {
        console.error("Custom message box element with ID 'customMessageBox' not found! Message: ", message);
        return;
    }

    messageBox.textContent = message;
    messageBox.className = 'custom-message-box show'; // Reset classes and add 'show'
    if (type) {
        messageBox.classList.add(type);
    }

    setTimeout(() => {
        messageBox.classList.remove('show');
        // Remove type classes after animation for next message
        setTimeout(() => {
            messageBox.className = 'custom-message-box';
        }, 500); // Wait for fade-out transition
    }, duration);
}

// --- Navbar Visibility & Role Management ---
function updateNavbarVisibility() {
    const navLinks = document.querySelectorAll('.nav-links li');
    const logoutBtn = document.getElementById('logoutBtn');
    const logo = document.querySelector('.navbar .logo');
    const navbar = document.querySelector('.navbar');

    // Hide all navigation links initially
    navLinks.forEach(item => item.style.display = 'none');
    if (logoutBtn) {
        logoutBtn.style.display = 'none';
    }
    if (navbar) {
        navbar.style.display = 'flex'; // Ensure navbar itself is always visible
    }

    if (currentUserRole === 'customer') {
        document.querySelectorAll('.customer-nav-item').forEach(item => item.style.display = 'list-item');
        if (document.getElementById('serviceCenterDashboardNavLink')) {
            document.getElementById('serviceCenterDashboardNavLink').style.display = 'none';
        }
        if (logo) {
            logo.textContent = "QuickCar Customer"; // Update logo text for customer
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    } else if (currentUserRole === 'serviceCenter') {
        if (document.getElementById('serviceCenterDashboardNavLink')) {
            document.getElementById('serviceCenterDashboardNavLink').style.display = 'list-item';
        }
        document.querySelectorAll('.customer-nav-item').forEach(item => item.style.display = 'none'); // Hide customer items
        if (logo) {
            logo.textContent = "QuickCar Service Center"; // Update logo text for service center
        }
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    } else {
        // No user logged in, hide entire navbar and show language selection/auth
        if (navbar) {
            navbar.style.display = 'none';
        }
    }
}

// --- Event Listeners and Handlers ---

// Language Selection
document.querySelectorAll('.lang-btn').forEach(button => {
    button.addEventListener('click', () => {
        const lang = button.getAttribute('data-lang');
        applyTranslation(lang);
        showScreen('customer-auth-screen'); // Move to auth screen after lang selection
    });
});

// --- Firebase Authentication Listeners ---

// Firebase Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
        // Determine user role and name based on login
        let storedRole = localStorage.getItem('currentUserRole');
        let storedName = localStorage.getItem('currentUserName');

        if (storedRole) {
            currentUserRole = storedRole;
        } else {
            // Default to customer if not explicitly set after initial login
            // This might happen for new Google sign-ins, etc.
            currentUserRole = 'customer';
            localStorage.setItem('currentUserRole', currentUserRole);
        }

        if (storedName) {
            currentUserName = storedName;
        } else {
            currentUserName = user.displayName || user.email.split('@')[0];
            localStorage.setItem('currentUserName', currentUserName);
        }

        // Update profile data on first login/registration if empty for customer
        if (!userProfile.name && currentUserRole === 'customer') {
            userProfile.name = currentUserName;
            userProfile.email = user.email;
            saveProfileData();
        }

        showScreen('app-container');
        if (currentUserRole === 'serviceCenter') {
            showContentSection('service-center-dashboard');
            listenForServiceRequests(); // Start real-time listeners for service center
            listenForFeedbacks();
            listenForPayments();
        } else {
            showContentSection('home-section');
        }
        setupFirebaseChatListener(); // Setup chat listener on successful login
        updateNavbarVisibility(); // Update navbar based on role
    } else {
        console.log("User is logged out.");
        showScreen('language-selection-screen'); // Go back to language selection or auth
        currentUserRole = null;
        currentUserName = "Guest";
        localStorage.removeItem('currentUserRole');
        localStorage.removeItem('currentUserName');
        updateNavbarVisibility(); // Update navbar to hide elements for logged-out state
    }
});


// Customer Login
const customerLoginForm = document.getElementById("customerLoginForm");
if (customerLoginForm) {
    customerLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('customerLoginEmail').value;
        const password = document.getElementById('customerLoginPassword').value;

        console.log(`Attempting customer login with email: ${email}`);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Firebase Email/Password login successful:", userCredential.user);
            currentUserRole = 'customer'; // Explicitly set role for this login type
            currentUserName = userCredential.user.displayName || userCredential.user.email.split('@')[0];
            localStorage.setItem('currentUserRole', currentUserRole);
            localStorage.setItem('currentUserName', currentUserName);

            displayMessage("Customer login successful!", "success");
            // onAuthStateChanged will handle screen navigation
        } catch (error) {
            console.error("Firebase Email/Password login failed:", error);
            displayMessage(`Login failed: ${error.message}`, "error");
        }
    });
} else {
    console.warn("Customer Login Form with ID 'customerLoginForm' not found.");
}


// Customer Register
const customerRegisterForm = document.getElementById("customerRegisterForm");
if (customerRegisterForm) {
    customerRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('customerRegisterName').value;
        const email = document.getElementById('customerRegisterEmail').value;
        const password = document.getElementById('customerRegisterPassword').value;

        console.log(`Attempting customer registration for email: ${email}`);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name }); // Set display name immediately
            console.log("Firebase Email/Password registration successful:", userCredential.user);

            currentUserRole = 'customer';
            currentUserName = name;
            localStorage.setItem('currentUserRole', currentUserRole);
            localStorage.setItem('currentUserName', currentUserName);

            displayMessage(`Registration successful! Logging you in...`, "success");
            // onAuthStateChanged will handle screen navigation
        } catch (error) {
            console.error("Firebase Email/Password registration failed:", error);
            displayMessage(`Registration failed: ${error.message}`, "error");
        }
    });
} else {
    console.warn("Customer Register Form with ID 'customerRegisterForm' not found.");
}


// Service Center Login
const serviceCenterLoginForm = document.getElementById('serviceCenterLoginForm');
if (serviceCenterLoginForm) {
    serviceCenterLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('centerLoginEmail').value;
        const password = document.getElementById('centerLoginPassword').value;

        console.log(`Attempting service center login with email: ${email}`);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Firebase Email/Password service center login successful:", userCredential.user);
            currentUserRole = 'serviceCenter'; // Explicitly set role for service center
            currentUserName = "Service Center"; // Fixed name for service center
            localStorage.setItem('currentUserRole', currentUserRole);
            localStorage.setItem('currentUserName', currentUserName);

            displayMessage("Service Center login successful!", "success");
            // onAuthStateChanged will handle screen navigation
        } catch (error) {
            console.error("Firebase Email/Password service center login failed:", error);
            displayMessage(`Login failed: ${error.message}`, "error");
        }
    });
} else {
    console.warn("Service Center Login Form with ID 'serviceCenterLoginForm' not found.");
}


// Google Sign-In
const googleBtn = document.getElementById("googleSignInBtn");
if (googleBtn) { // Ensure button exists before adding listener
    googleBtn.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            console.log("Google sign-in success", user);
            currentUserRole = 'customer'; // Google sign-in typically for customers
            currentUserName = user.displayName || user.email.split('@')[0];
            localStorage.setItem('currentUserRole', currentUserRole);
            localStorage.setItem('currentUserName', currentUserName);

            displayMessage("Google Sign-In successful!", "success");
            // onAuthStateChanged will handle screen navigation
        } catch (err) {
            console.error("Google sign-in failed", err);
            displayMessage(`Google Sign-In failed: ${err.message}`, "error");
        }
    });
} else {
    console.warn("Google Sign-In button with ID 'googleSignInBtn' not found. Google Sign-In will not be active.");
}


// Forgot Password
window.forgotPassword = async function(userType) {
    let emailInputId;
    if (userType === 'customer') {
        emailInputId = 'customerLoginEmail';
    } else if (userType === 'serviceCenter') {
        emailInputId = 'centerLoginEmail';
    } else {
        console.error("Invalid user type for forgotPassword.");
        return;
    }

    const emailInput = document.getElementById(emailInputId);
    if (!emailInput || !emailInput.value) {
        displayMessage("Please enter your email address to reset password.", "warning");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, emailInput.value);
        displayMessage(`Password reset email sent to ${emailInput.value}. Please check your inbox.`, "success");
    } catch (error) {
        console.error("Password reset failed:", error);
        displayMessage(`Password reset failed: ${error.message}`, "error");
    }
};

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        console.log("Logout button clicked.");
        try {
            await signOut(auth);
            console.log("Firebase signOut successful.");
            displayMessage("Logged out successfully!", "info");
            // onAuthStateChanged will handle clearing localStorage and screen navigation
        } catch (error) {
            console.error("Firebase signOut failed:", error);
            displayMessage(`Logout failed: ${error.message}`, "error");
        }
    });
} else {
    console.warn("Logout button with ID 'logoutBtn' not found.");
}


// --- Main App Logic ---

// Book Service Form Submission
const serviceBookingForm = document.getElementById('serviceBookingForm');
if (serviceBookingForm) {
    serviceBookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const serviceId = generateServiceId();
        const customerName = document.getElementById('customerName').value;
        const customerContact = document.getElementById('customerContact').value;
        const customerAddress = document.getElementById('customerAddress').value;
        const carModel = document.getElementById('carModel').value;
        let serviceType = document.getElementById('serviceType').value;
        const preferredDate = document.getElementById('preferredDate').value;
        const preferredTime = document.getElementById('preferredTime').value;

        if (serviceType === 'Other') {
            serviceType = document.getElementById('otherServiceType').value.trim() || 'Other (unspecified)';
        }

        if (!customerName || !customerContact || !customerAddress || !carModel || !serviceType || !preferredDate || !preferredTime) {
            displayMessage("Please fill in all required booking fields.", "warning");
            return;
        }

        const newServiceRequest = {
            serviceId: serviceId,
            customerName: customerName,
            customerContact: customerContact,
            customerAddress: customerAddress,
            carModel: carModel,
            serviceType: serviceType,
            preferredDate: preferredDate,
            preferredTime: preferredTime,
            status: 'Pending', // Initial status
            timestamp: new Date().toISOString()
        };

        console.log("New service request:", newServiceRequest);

        try {
            const serviceRequestsRef = ref(database, 'serviceRequests');
            await push(serviceRequestsRef, newServiceRequest);
            displayMessage("Service booked successfully! We will contact you soon.", "success");
            e.target.reset(); // Clear form
            document.getElementById('otherServiceTypeGroup').style.display = 'none'; // Hide "Other" field
            document.getElementById('otherServiceType').removeAttribute('required');

            // Update payment and feedback sections with latest service ID
            lastServiceId = serviceId;
            lastCustomerName = customerName;
            lastServiceType = serviceType;
            lastServiceAmount = 1500 + Math.floor(Math.random() * 2000); // Demo amount

            document.getElementById('paymentServiceId').textContent = lastServiceId;
            document.getElementById('paymentCustomerName').textContent = lastCustomerName;
            document.getElementById('paymentServiceType').textContent = lastServiceType;
            document.getElementById('paymentAmountDue').textContent = `₹${lastServiceAmount.toFixed(2)}`;
            document.getElementById('serviceIdFeedback').value = lastServiceId;

        } catch (error) {
            console.error("Error pushing service request to Firebase:", error);
            displayMessage("Failed to book service. Please try again.", "error");
        }
    });
} else {
    console.warn("Service Booking Form with ID 'serviceBookingForm' not found.");
}


// Toggle "Other Service Type" field
const serviceTypeSelect = document.getElementById('serviceType');
if (serviceTypeSelect) {
    serviceTypeSelect.addEventListener('change', (e) => {
        const otherServiceTypeGroup = document.getElementById('otherServiceTypeGroup');
        const otherServiceTypeInput = document.getElementById('otherServiceType');

        if (e.target.value === 'Other') {
            if (otherServiceTypeGroup) otherServiceTypeGroup.style.display = 'block';
            if (otherServiceTypeInput) otherServiceTypeInput.setAttribute('required', 'required');
        } else {
            if (otherServiceTypeGroup) otherServiceTypeGroup.style.display = 'none';
            if (otherServiceTypeInput) {
                otherServiceTypeInput.removeAttribute('required');
                otherServiceTypeInput.value = ''; // Clear value when hidden
            }
        }
    });
} else {
    console.warn("Service Type Select with ID 'serviceType' not found.");
}


// Payments Section
window.togglePaymentFields = function() { // Make global for inline onclick
    const paymentMethod = document.getElementById('paymentMethod')?.value;
    const onlinePaymentFields = document.getElementById('onlinePaymentFields');
    if (onlinePaymentFields) {
        if (paymentMethod === 'online') {
            onlinePaymentFields.style.display = 'block';
        } else {
            onlinePaymentFields.style.display = 'none';
        }
    }
}

const paymentMethodSelect = document.getElementById('paymentMethod');
if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener('change', togglePaymentFields);
} else {
    console.warn("Payment Method Select with ID 'paymentMethod' not found.");
}

const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const paymentMethod = document.getElementById('paymentMethod').value;

        if (!lastServiceId) {
            displayMessage("Please book a service first to make a payment.", "warning");
            return;
        }
        if (!lastServiceAmount) {
            displayMessage("No amount specified for payment. Please complete a service booking first.", "warning");
            return;
        }

        let paymentDetails = {
            serviceId: lastServiceId,
            customerName: lastCustomerName || "Anonymous",
            serviceType: lastServiceType || "Unspecified Service",
            amount: lastServiceAmount,
            method: paymentMethod,
            date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY format
            status: 'Completed'
        };

        if (paymentMethod === 'online') {
            const mobile = document.getElementById('customerMobileNumber').value.trim();
            const upi = document.getElementById('customerUpiId').value.trim();
            if (!mobile && !upi) {
                displayMessage("Please enter either Mobile Number or UPI ID for online payment.", "warning");
                return;
            }
            paymentDetails.mobile = mobile;
            paymentDetails.upi = upi;
        }

        try {
            const paymentsRef = ref(database, 'payments');
            await push(paymentsRef, paymentDetails);
            displayMessage("Payment successful! Thank you.", "success");
            document.getElementById('paymentForm').reset();
            document.getElementById('onlinePaymentFields').style.display = 'none';
            // Clear payment summary after successful payment
            document.getElementById('paymentServiceId').textContent = 'N/A';
            document.getElementById('paymentCustomerName').textContent = 'N/A';
            document.getElementById('paymentServiceType').textContent = 'N/A';
            document.getElementById('paymentAmountDue').textContent = '₹0.00';
            lastServiceId = null; // Clear this so new service needs to be booked
            lastServiceAmount = null;

        } catch (error) {
            console.error("Error processing payment:", error);
            displayMessage("Payment failed. Please try again.", "error");
        }
    });
} else {
    console.warn("Payment Form with ID 'paymentForm' not found.");
}


// Feedback Section
const starRatingContainer = document.getElementById('starRating');
if (starRatingContainer) {
    starRatingContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('fa-star')) {
            const rating = parseInt(e.target.dataset.rating);
            customerSelectedRating = rating;
            document.querySelectorAll('#starRating .fa-star').forEach((star, index) => {
                if (index < rating) {
                    star.classList.add('fas');
                    star.classList.remove('far');
                } else {
                    star.classList.add('far');
                    star.classList.remove('fas');
                }
            });
        }
    });
} else {
    console.warn("Star Rating Container with ID 'starRating' not found.");
}

const feedbackForm = document.getElementById('feedbackForm');
if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const serviceId = document.getElementById('serviceIdFeedback').value.trim();
        const feedbackMessage = document.getElementById('feedbackMessage').value.trim();

        if (!serviceId) {
            displayMessage("Please ensure a Service ID is pre-filled from a booking.", "warning");
            return;
        }
        if (customerSelectedRating === 0) {
            displayMessage("Please select a star rating.", "warning");
            return;
        }
        if (!feedbackMessage) {
            displayMessage("Please enter your feedback message.", "warning");
            return;
        }

        const newFeedback = {
            serviceId: serviceId,
            rating: customerSelectedRating,
            message: feedbackMessage,
            timestamp: new Date().toISOString()
        };

        try {
            const feedbacksRef = ref(database, 'feedbacks');
            await push(feedbacksRef, newFeedback);
            displayMessage("Feedback submitted successfully! Thank you for your input.", "success");
            e.target.reset();
            customerSelectedRating = 0; // Reset stars
            document.querySelectorAll('#starRating .fa-star').forEach(star => {
                star.classList.remove('fas');
                star.classList.add('far');
            });
            document.getElementById('serviceIdFeedback').value = ''; // Clear ID after submission

        } catch (error) {
            console.error("Error submitting feedback:", error);
            displayMessage("Failed to submit feedback. Please try again.", "error");
        }
    });
} else {
    console.warn("Feedback Form with ID 'feedbackForm' not found.");
}


// Contact Us Section
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const contactName = document.getElementById('contactName').value.trim();
        const contactEmail = document.getElementById('contactEmail').value.trim();
        const contactMessage = document.getElementById('contactMessage').value.trim();

        if (!contactName || !contactEmail || !contactMessage) {
            displayMessage("Please fill in all contact form fields.", "warning");
            return;
        }

        const newContactMessage = {
            name: contactName,
            email: contactEmail,
            message: contactMessage,
            timestamp: new Date().toISOString()
        };

        try {
            const contactsRef = ref(database, 'contactMessages');
            await push(contactsRef, newContactMessage);
            displayMessage("Your message has been sent successfully! We will get back to you soon.", "success");
            e.target.reset();
        } catch (error) {
            console.error("Error sending contact message:", error);
            displayMessage("Failed to send message. Please try again.", "error");
        }
    });
} else {
    console.warn("Contact Form with ID 'contactForm' not found.");
}


// Profile Section
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        userProfile.name = document.getElementById('profileName').value.trim();
        userProfile.email = document.getElementById('profileEmail').value.trim();
        userProfile.mobile = document.getElementById('profileMobile').value.trim();
        userProfile.address = document.getElementById('profileAddress').value.trim();
        userProfile.carMake = document.getElementById('profileCarMake').value.trim();
        userProfile.carModel = document.getElementById('profileCarModel').value.trim();
        userProfile.carYear = document.getElementById('profileCarYear').value ? parseInt(document.getElementById('profileCarYear').value) : null;
        userProfile.licensePlate = document.getElementById('profileLicensePlate').value.trim();

        saveProfileData();
        displayMessage("Profile updated successfully!", "success");
    });
} else {
    console.warn("Profile Form with ID 'profileForm' not found.");
}

// --- Chat Functionality ---
const chatMessagesDiv = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

function appendMessage(message) {
    if (!chatMessagesDiv) {
        console.warn("Chat messages container not found.");
        return;
    }
    const msgDiv = document.createElement('div');
    // Determine if the message was sent by the current user
    const isCurrentUser = auth.currentUser && message.senderId === auth.currentUser.uid;
    msgDiv.classList.add('message', isCurrentUser ? 'sent' : 'received');
    msgDiv.innerHTML = `<strong>${message.senderName || 'Unknown'}:</strong> ${message.text}`;
    chatMessagesDiv.appendChild(msgDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Auto-scroll to bottom
}

function setupFirebaseChatListener() {
    if (!database) {
        console.error("Firebase Database not initialized for chat listener.");
        return;
    }
    const chatRef = ref(database, 'chatMessages');
    // Listen for new messages
    onValue(chatRef, (snapshot) => {
        chatMessagesDiv.innerHTML = ''; // Clear previous messages to re-render
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            appendMessage(message);
        });
    }, (error) => {
        console.error("Error listening to chat messages:", error);
    });
}


if (chatSendBtn) {
    chatSendBtn.addEventListener('click', async () => {
        const messageText = chatInput.value.trim();
        if (messageText && auth.currentUser) {
            const newMessage = {
                senderId: auth.currentUser.uid,
                senderName: currentUserName, // Use global currentUserName
                text: messageText,
                timestamp: new Date().toISOString()
            };
            try {
                const chatMessagesRef = ref(database, 'chatMessages');
                await push(chatMessagesRef, newMessage);
                chatInput.value = ''; // Clear input
            } catch (error) {
                console.error("Error sending message:", error);
                displayMessage("Failed to send message.", "error");
            }
        } else if (!auth.currentUser) {
            displayMessage("Please log in to send messages.", "warning");
        } else if (!messageText) {
            displayMessage("Please type a message to send.", "warning");
        }
    });

    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent new line in textarea
                chatSendBtn.click(); // Simulate click on Enter key
            }
        });
    }
} else {
    console.warn("Chat Send Button with ID 'chatSendBtn' not found. Chat functionality may be limited.");
}


// --- Service Center Dashboard Live Updates (Firebase Realtime Database) ---

function appendServiceRequestToDashboard(key, request) {
    if (!serviceRequestsList) {
        console.warn("Service Requests List (ID: serviceRequestsList) not found.");
        return;
    }
    let li = document.getElementById(`request-${key}`);
    if (!li) {
        li = document.createElement('li');
        li.id = `request-${key}`;
        serviceRequestsList.prepend(li); // Add new requests at the top
    }

    let statusClass = '';
    if (request.status === 'Accepted') {
        statusClass = 'success';
    } else if (request.status === 'Rejected') {
        statusClass = 'danger';
    } else {
        statusClass = 'info'; // For pending/other
    }

    li.innerHTML = `
        <p class="request-details"><strong>ID:</strong> ${request.serviceId}</p>
        <p class="request-details"><strong>Customer:</strong> ${request.customerName}</p>
        <p class="request-details"><strong>Contact:</strong> ${request.customerContact}</p>
        <p class="request-details"><strong>Address:</strong> ${request.customerAddress}</p>
        <p class="request-details"><strong>Car:</strong> ${request.carModel}</p>
        <p class="request-details"><strong>Service:</strong> ${request.serviceType}</p>
        <p class="request-details"><strong>Date/Time:</strong> ${request.preferredDate} at ${request.preferredTime}</p>
        <p class="request-status"><strong>Status:</strong> <span class="badge badge-${statusClass}">${request.status}</span></p>
        <div class="request-actions">
            ${request.status === 'Pending' ? `
                <button class="btn btn-success" onclick="updateServiceRequestStatus('${key}', 'Accepted')">Accept</button>
                <button class="btn btn-danger" onclick="updateServiceRequestStatus('${key}', 'Rejected')">Reject</button>
            ` : ''}
        </div>
    `;
    updateNoRequestsMessage();
}

window.updateServiceRequestStatus = async function(requestId, newStatus) {
    if (!database) {
        console.error("Firebase Database not initialized for updating service request.");
        return;
    }
    const requestRef = ref(database, `serviceRequests/${requestId}`);
    try {
        await set(requestRef, { status: newStatus }); // Overwrite only the 'status' field
        displayMessage(`Request ${requestId} status updated to ${newStatus}`, "success");
    } catch (error) {
        console.error(`Error updating request ${requestId} status:`, error);
        displayMessage(`Failed to update status for ${requestId}.`, "error");
    }
};

function listenForServiceRequests() {
    if (!database) {
        console.error("Firebase Database not initialized for service requests listener.");
        return;
    }
    const serviceRequestsRef = ref(database, 'serviceRequests');
    onValue(serviceRequestsRef, (snapshot) => {
        if (serviceRequestsList) serviceRequestsList.innerHTML = ''; // Clear for full re-render
        if (snapshot.exists()) {
            const requests = snapshot.val();
            // Convert object to array and sort by timestamp (newest first)
            const sortedRequests = Object.keys(requests).map(key => ({ key, ...requests[key] })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            sortedRequests.forEach(request => {
                appendServiceRequestToDashboard(request.key, request);
            });
        }
        updateNoRequestsMessage();
    }, (error) => {
        console.error("Error listening to service requests:", error);
    });
}

function listenForFeedbacks() {
    if (!database) {
        console.error("Firebase Database not initialized for feedbacks listener.");
        return;
    }
    const feedbacksRef = ref(database, 'feedbacks');
    onValue(feedbacksRef, (snapshot) => {
        if (snapshot.exists()) {
            renderFeedbacks(snapshot.val());
        } else {
            renderFeedbacks(null); // No feedbacks
        }
    }, (error) => {
        console.error("Error listening to feedbacks:", error);
    });
}

function listenForPayments() {
    if (!database) {
        console.error("Firebase Database not initialized for payments listener.");
        return;
    }
    const paymentsRef = ref(database, 'payments');
    onValue(paymentsRef, (snapshot) => {
        if (snapshot.exists()) {
            renderPaymentHistory(snapshot.val());
        } else {
            renderPaymentHistory(null); // No payments
        }
    }, (error) => {
        console.error("Error listening to payments:", error);
    });
}


// Points System
let customerPoints = parseInt(localStorage.getItem('customerPoints')) || 1000; // Start with some points
const pointsDisplay = document.getElementById('customerPointsDisplay');
const convertPointsBtn = document.getElementById('convertPointsBtn');

function updatePointsDisplay() {
    if (pointsDisplay) {
        pointsDisplay.textContent = customerPoints;
    }
}

if (convertPointsBtn) {
    convertPointsBtn.addEventListener('click', () => {
        const pointsToConvert = 500; // Example: Convert 500 points at a time
        const conversionRate = 0.5; // Example: 500 points = ₹250 cash

        if (customerPoints >= pointsToConvert) {
            customerPoints -= pointsToConvert;
            const cashReceived = pointsToConvert * conversionRate;
            localStorage.setItem('customerPoints', customerPoints);
            updatePointsDisplay();
            displayMessage(`Successfully converted ${pointsToConvert} points to ₹${cashReceived.toFixed(2)} cash! Remaining points: ${customerPoints}`, "success");
        } else {
            displayMessage(`Not enough points to convert. You need ${pointsToConvert} points.`, "warning");
        }
    });
} else {
    console.warn("Convert Points button with ID 'convertPointsBtn' not found.");
}

// --- Initial setup on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing app...");

    // Make these functions globally accessible for inline HTML event handlers
    window.showScreen = showScreen;
    window.showCustomerAuth = showCustomerAuth;
    window.showContentSection = showContentSection;
    window.togglePaymentFields = togglePaymentFields; // For payment method dropdown
    window.displayMessage = displayMessage; // For showing custom messages

    // Display the correct initial screen
    // onAuthStateChanged will handle the app-container display after auth check
    showScreen('language-selection-screen');

    // Initial setup for certain elements
    togglePaymentFields(); // Ensure payment fields are correctly hidden initially
    updatePointsDisplay(); // Initialize points display

    // Initial navbar visibility check (will be refined by onAuthStateChanged)
    updateNavbarVisibility();

    console.log("App initialized.");
});
