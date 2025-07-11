// script.js
// Firebase v9.23.0 Modular SDK imports
// These functions are imported directly from Firebase CDN.
// The 'auth' and 'database' instances are obtained from the global window object,
// where they are exposed by the <script type="module"> in index.html.

import {
    getAuth, // Although not directly used to get instance here, good to import for clarity
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider, // Re-added for Google Sign-In
    signInWithPopup,    // Re-added for Google Sign-In
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
    getDatabase, // Although not directly used to get instance here, good to import for clarity
    ref,
    push,
    onChildAdded,
    set // Used for updating service request status
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Get Firebase instances from the global window object (initialized in index.html)
// These variables will hold the initialized Firebase Auth and Database service objects.
const auth = window.firebaseAuth;
const database = window.firebaseDB;
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
// In a real application, you would use Firebase Authentication and Firestore/Realtime Database.
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

// Service Center Specific Elements & Data (for local demo rendering if Firebase isn't used)
const customerFeedbackList = document.getElementById("customerFeedbackList");
const noFeedbackMessage = document.getElementById("noFeedbackMessage");
const paymentHistoryList = document.getElementById("paymentHistoryList");
const noPaymentHistoryMessage = document.getElementById("noPaymentHistoryMessage");
const serviceRequestsList = document.getElementById("serviceRequestsList");
const noRequestsMessage = document.getElementById("noRequestsMessage");

const serviceCenterFeedbacks = []; // For demo display
const serviceCenterPayments = []; // For demo display


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
        "nav_chat": "Chat"
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
        "nav_chat": "चैट"
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
        "nav_chat": "चॅट"
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
        "nav_chat": "చాట్"
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
        "nav_chat": "ಚಾಟ್"
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

    // Adjust nav items visibility based on role
    document.querySelectorAll('.customer-nav-item').forEach(item => {
        if (currentUserRole === 'customer') {
            item.style.display = 'list-item';
        } else {
            item.style.display = 'none';
        }
    });
    // Service center dashboard itself might not have these nav items,
    // but ensure customer ones are hidden if service center is active.
    if (currentUserRole === 'serviceCenter' && sectionId === 'service-center-dashboard') {
        document.querySelectorAll('.customer-nav-item').forEach(item => {
            item.style.display = 'none';
        });
    }


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

function renderFeedbacks() {
    customerFeedbackList.innerHTML = '';
    if (serviceCenterFeedbacks.length === 0) {
        noFeedbackMessage.style.display = 'block';
    } else {
        noFeedbackMessage.style.display = 'none';
        serviceCenterFeedbacks.forEach(feedback => {
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

function renderPaymentHistory() {
    paymentHistoryList.innerHTML = '';
    if (serviceCenterPayments.length === 0) {
        noPaymentHistoryMessage.style.display = 'block';
    } else {
        noPaymentHistoryMessage.style.display = 'none';
        serviceCenterPayments.forEach(payment => {
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
        // For new registrations, we default to 'customer' unless explicitly changed
        let storedRole = localStorage.getItem('currentUserRole');
        let storedName = localStorage.getItem('currentUserName');

        if (storedRole) {
            currentUserRole = storedRole;
        } else {
            // Default to customer if not explicitly set after initial login
            currentUserRole = 'customer';
            localStorage.setItem('currentUserRole', currentUserRole);
        }

        if (storedName) {
            currentUserName = storedName;
        } else {
            // Use display name or email part as fallback
            currentUserName = user.displayName || user.email.split('@')[0];
            localStorage.setItem('currentUserName', currentUserName);
        }

        // Update profile data on first login/registration if empty
        if (!userProfile.name && currentUserRole === 'customer') {
            userProfile.name = currentUserName;
            userProfile.email = user.email;
            saveProfileData();
        }

        showScreen('app-container');
        if (currentUserRole === 'serviceCenter') {
            showContentSection('service-center-dashboard');
            renderServiceRequests();
            renderFeedbacks();
            renderPaymentHistory();
        } else {
            showContentSection('home-section');
        }
        setupFirebaseChatListener(); // Setup chat listener on successful login
    } else {
        console.log("User is logged out.");
        showScreen('language-selection-screen'); // Go back to language selection or auth
        currentUserRole = null;
        currentUserName = "Guest";
        localStorage.removeItem('currentUserRole');
        localStorage.removeItem('currentUserName');
    }
});


// Customer Login
const customerLoginForm = document.getElementById("customerLoginForm");
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

// Customer Register
const customerRegisterForm = document.getElementById("customerRegisterForm");
customerRegisterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('customerRegisterName').value;
    const email = document.getElementById('customerRegisterEmail').value;
    const password = document.getElementById('customerRegisterPassword').value;

    console.log(`Attempting customer registration for email: ${email}`);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await userCredential.user.updateProfile({ displayName: name });
        console.log("Firebase Email/Password registration successful:", userCredential.user);

        // Optionally, log them in directly after registration
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

// Service Center Login
document.getElementById('serviceCenterLoginForm').addEventListener('submit', async (e) => {
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

    const email = document.getElementById(emailInputId).value;
    if (!email) {
        displayMessage("Please enter your email address to reset password.", "warning");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        displayMessage(`Password reset email sent to ${email}. Please check your inbox.`, "success");
    } catch (error) {
        console.error("Password reset failed:", error);
        displayMessage(`Password reset failed: ${error.message}`, "error");
    }
};

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
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


// --- Main App Logic (Remaining from previous version) ---

// Book Service Form Submission
document.getElementById('serviceBookingForm').addEventListener('submit', async (e) => {
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
        serviceType = document.getElementById('otherServiceType').value || 'Other (unspecified)';
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
        // Optionally store for payments/feedback immediate access
        lastServiceId = serviceId;
        lastCustomerName = customerName;
        lastServiceType = serviceType;
        lastServiceAmount = 1500 + Math.floor(Math.random() * 2000); // Demo amount

        // Update payment and feedback sections with latest service ID
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


// Toggle "Other Service Type" field
document.getElementById('serviceType').addEventListener('change', (e) => {
    if (e.target.value === 'Other') {
        document.getElementById('otherServiceTypeGroup').style.display = 'block';
        document.getElementById('otherServiceType').setAttribute('required', 'required');
    } else {
        document.getElementById('otherServiceTypeGroup').style.display = 'none';
        document.getElementById('otherServiceType').removeAttribute('required');
    }
});

// Payments Section
function togglePaymentFields() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const onlinePaymentFields = document.getElementById('onlinePaymentFields');
    if (paymentMethod === 'online') {
        onlinePaymentFields.style.display = 'block';
    } else {
        onlinePaymentFields.style.display = 'none';
    }
}

document.getElementById('paymentMethod').addEventListener('change', togglePaymentFields); // Add listener for payment method change

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (!lastServiceId) {
        displayMessage("Please book a service first to make a payment.", "warning");
        return;
    }

    let paymentDetails = {
        serviceId: lastServiceId,
        customerName: lastCustomerName,
        serviceType: lastServiceType,
        amount: lastServiceAmount,
        method: paymentMethod,
        date: new Date().toLocaleDateString(),
        status: 'Completed'
    };

    if (paymentMethod === 'online') {
        const mobile = document.getElementById('customerMobileNumber').value;
        const upi = document.getElementById('customerUpiId').value;
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

        // Add to local history for service center dashboard (if logged in as center)
        // For a full app, serviceCenterFeedbacks/Payments should be loaded from Firebase directly.
        // This is a simplified demo representation.
        if (currentUserRole === 'serviceCenter') {
             serviceCenterPayments.push(paymentDetails);
             renderPaymentHistory();
        }

    } catch (error) {
        console.error("Error processing payment:", error);
        displayMessage("Payment failed. Please try again.", "error");
    }
});


// Feedback Section
document.getElementById('starRating').addEventListener('click', (e) => {
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

document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const serviceId = document.getElementById('serviceIdFeedback').value;
    const feedbackMessage = document.getElementById('feedbackMessage').value;

    if (!serviceId) {
        displayMessage("Please ensure a Service ID is pre-filled from a booking.", "warning");
        return;
    }
    if (customerSelectedRating === 0) {
        displayMessage("Please select a star rating.", "warning");
        return;
    }
    if (!feedbackMessage.trim()) {
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

        if (currentUserRole === 'serviceCenter') {
            serviceCenterFeedbacks.push(newFeedback);
            renderFeedbacks();
        }

    } catch (error) {
        console.error("Error submitting feedback:", error);
        displayMessage("Failed to submit feedback. Please try again.", "error");
    }
});


// Contact Us Section
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const contactName = document.getElementById('contactName').value;
    const contactEmail = document.getElementById('contactEmail').value;
    const contactMessage = document.getElementById('contactMessage').value;

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

// Profile Section
document.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();

    userProfile.name = document.getElementById('profileName').value;
    userProfile.email = document.getElementById('profileEmail').value;
    userProfile.mobile = document.getElementById('profileMobile').value;
    userProfile.address = document.getElementById('profileAddress').value;
    userProfile.carMake = document.getElementById('profileCarMake').value;
    userProfile.carModel = document.getElementById('profileCarModel').value;
    userProfile.carYear = document.getElementById('profileCarYear').value ? parseInt(document.getElementById('profileCarYear').value) : null;
    userProfile.licensePlate = document.getElementById('profileLicensePlate').value;

    saveProfileData();
    displayMessage("Profile updated successfully!", "success");
});

// --- Chat Functionality ---
const chatMessagesDiv = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn'); // Assuming a send button exists

// Ensure send button listener is active
if (chatSendBtn) {
    chatSendBtn.addEventListener('click', window.sendMessage); // Use window.sendMessage as it's global
}
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            window.sendMessage(); // Call the global sendMessage
        }
    });
}


window.sendMessage = function () { // Exported to be callable from HTML
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    // Use currentUserName from state
    const sender = currentUserName;
    const role = currentUserRole; // Also send the role with the message

    const messageData = {
        sender: sender,
        message: messageText,
        timestamp: Date.now(), // Using Date.now() as requested in your snippet
        role: role
    };

    if (auth.currentUser && database) { // Check both auth and database instances
        try {
            const chatRef = ref(database, 'chat');
            push(chatRef, messageData);
            chatInput.value = '';
        } catch (error) {
            console.error("Error sending chat message:", error);
            displayMessage("Failed to send message. Please try again.", "error");
        }
    } else {
        displayMessage("You must be logged in to send chat messages.", "warning");
        console.warn("Not signed in or Firebase DB not available. Message not sent to Firebase.");
    }
};

function setupFirebaseChatListener() {
    if (database) {
        const chatRef = ref(database, "chat");
        chatMessagesDiv.innerHTML = `<div class="message received"><p>Service Center: Hello! How can we help you today?</p></div>`; // Clear and add initial message

        onChildAdded(chatRef, (snapshot) => {
            const messageData = snapshot.val();
            const messageElement = document.createElement("div");
            messageElement.classList.add("message");

            // Determine if the message is sent by the current user or received from another party
            if (messageData.sender === currentUserName && messageData.role === currentUserRole) {
                messageElement.classList.add("sent");
            } else {
                messageElement.classList.add("received");
            }

            // Ensure sender name is shown for all messages
            messageElement.innerHTML = `<p><strong>${messageData.sender}:</strong> ${messageData.message}</p>`;
            chatMessagesDiv.appendChild(messageElement);
            chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
        });
    } else {
        console.warn("Firebase Database not available for chat. Chat will run in demo mode (local only if implemented).");
    }
}


// --- Service Center Dashboard ---

function renderServiceRequests() {
    serviceRequestsList.innerHTML = ''; // Clear existing requests
    if (noRequestsMessage) noRequestsMessage.style.display = 'block'; // Show initially, hide if data comes

    if (database) {
        const requestsRef = ref(database, 'serviceRequests');
        onChildAdded(requestsRef, (snapshot) => {
            const requestData = snapshot.val();
            const requestKey = snapshot.key; // Get the unique key for the request

            const li = document.createElement('li');
            li.id = `request-${requestKey}`; // Assign an ID to update later
            li.innerHTML = `
                <p class="request-details"><strong>ID:</strong> ${requestData.serviceId}</p>
                <p class="request-details"><strong>Customer:</strong> ${requestData.customerName}</p>
                <p class="request-details"><strong>Car:</strong> ${requestData.carModel}</p>
                <p class="request-details"><strong>Service:</strong> ${requestData.serviceType}</p>
                <p class="request-details"><strong>Date/Time:</strong> ${requestData.preferredDate} at ${requestData.preferredTime}</p>
                <p class="request-status"><strong>Status:</strong> <span id="status-${requestKey}">${requestData.status}</span></p>
                <div class="request-actions">
                    ${requestData.status === 'Pending' ? `
                        <button class="btn btn-success" onclick="acceptRequest('${requestKey}', '${requestData.serviceId}')">Accept</button>
                        <button class="btn btn-danger" onclick="rejectRequest('${requestKey}', '${requestData.serviceId}')">Reject</button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="viewCustomerContact('${requestData.customerName}', '${requestData.customerContact}', '${requestData.customerAddress}')">Contact</button>
                </div>
            `;
            serviceRequestsList.appendChild(li);
            updateNoRequestsMessage(); // Check after adding
        });
    } else {
        // Demo data for service requests (as fallback)
        const demoRequests = [
            {
                serviceId: '#SVC12345', customerName: 'Alice Smith', carModel: 'Honda City',
                serviceType: 'Basic Service', preferredDate: '2025-07-15', preferredTime: '10:00',
                status: 'Pending', customerContact: '9876512345', customerAddress: '123, Demo Lane'
            },
            {
                serviceId: '#SVC67890', customerName: 'Bob Johnson', carModel: 'Hyundai Creta',
                serviceType: 'Wheel Alignment', preferredDate: '2025-07-16', preferredTime: '14:30',
                status: 'Accepted', customerContact: '9876554321', customerAddress: '456, Sample Street'
            }
        ];

        serviceRequestsList.innerHTML = ''; // Clear to add demo data
        demoRequests.forEach((request, index) => {
            const li = document.createElement('li');
            li.id = `request-demo-${index}`;
            li.innerHTML = `
                <p class="request-details"><strong>ID:</strong> ${request.serviceId}</p>
                <p class="request-details"><strong>Customer:</strong> ${request.customerName}</p>
                <p class="request-details"><strong>Car:</strong> ${request.carModel}</p>
                <p class="request-details"><strong>Service:</strong> ${request.serviceType}</p>
                <p class="request-details"><strong>Date/Time:</strong> ${request.preferredDate} at ${request.preferredTime}</p>
                <p class="request-status"><strong>Status:</strong> <span id="status-demo-${index}">${request.status}</span></p>
                <div class="request-actions">
                    ${request.status === 'Pending' ? `
                        <button class="btn btn-success" onclick="acceptRequest('demo-${index}', '${request.serviceId}')">Accept</button>
                        <button class="btn btn-danger" onclick="rejectRequest('demo-${index}', '${request.serviceId}')">Reject</button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="viewCustomerContact('${request.customerName}', '${request.customerContact}', '${request.customerAddress}')">Contact</button>
                </div>
            `;
            serviceRequestsList.appendChild(li);
        });
        updateNoRequestsMessage();
        console.warn("Firebase Database not available for service requests. Showing demo data.");
    }
}

window.acceptRequest = async function(requestKey, serviceId) {
    if (database) {
        try {
            const requestRef = ref(database, `serviceRequests/${requestKey}/status`);
            await set(requestRef, 'Accepted'); // Using set to update only the status field
            displayMessage(`Request ${serviceId} accepted!`, "success");
            document.getElementById(`status-${requestKey}`).textContent = 'Accepted';
            // Remove action buttons
            const actionsDiv = document.querySelector(`#request-${requestKey} .request-actions`);
            if (actionsDiv) actionsDiv.innerHTML = '';
        } catch (error) {
            console.error("Error accepting request:", error);
            displayMessage("Failed to accept request.", "error");
        }
    } else {
        displayMessage(`Request ${serviceId} accepted (Demo Mode)!`, "success");
        document.getElementById(`status-${requestKey}`).textContent = 'Accepted';
        const actionsDiv = document.querySelector(`#request-${requestKey} .request-actions`);
        if (actionsDiv) actionsDiv.innerHTML = '';
    }
};

window.rejectRequest = async function(requestKey, serviceId) {
    if (database) {
        try {
            const requestRef = ref(database, `serviceRequests/${requestKey}/status`);
            await set(requestRef, 'Rejected'); // Using set to update only the status field
            displayMessage(`Request ${serviceId} rejected!`, "info");
            document.getElementById(`status-${requestKey}`).textContent = 'Rejected';
            const actionsDiv = document.querySelector(`#request-${requestKey} .request-actions`);
            if (actionsDiv) actionsDiv.innerHTML = '';
        } catch (error) {
            console.error("Error rejecting request:", error);
            displayMessage("Failed to reject request.", "error");
        }
    } else {
        displayMessage(`Request ${serviceId} rejected (Demo Mode)!`, "info");
        document.getElementById(`status-${requestKey}`).textContent = 'Rejected';
        const actionsDiv = document.querySelector(`#request-${requestKey} .request-actions`);
        if (actionsDiv) actionsDiv.innerHTML = '';
    }
};

window.viewCustomerContact = function(name, contact, address) {
    const message = `
        <strong>Customer Name:</strong> ${name}<br>
        <strong>Contact No:</strong> ${contact}<br>
        <strong>Address:</strong> ${address}
    `;
    displayMessage(message, "info", 5000); // Show for 5 seconds
};

window.convertCenterPoints = function() {
    // This is a placeholder. Real points system would involve backend logic.
    displayMessage("Loyalty points conversion is under development. Coming soon!", "info");
};

// --- Custom Message Box ---
const customMessageBox = document.getElementById('customMessageBox');
let messageTimeout;

function displayMessage(message, type = 'info', duration = 3000) {
    clearTimeout(messageTimeout); // Clear any existing timeout

    customMessageBox.innerHTML = message; // Use innerHTML to allow for bold tags etc.
    customMessageBox.className = 'custom-message-box show'; // Reset classes and add 'show'
    if (type) {
        customMessageBox.classList.add(type);
    }

    messageTimeout = setTimeout(() => {
        customMessageBox.classList.remove('show');
        customMessageBox.classList.remove(type); // Clean up type class
    }, duration);
}


// --- DOMContentLoaded for initial setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial display based on current user role or language selection
    currentUserRole = localStorage.getItem('currentUserRole');
    currentUserName = localStorage.getItem('currentUserName');

    // onAuthStateChanged listener handles the initial screen logic once Firebase has a user state.
    // If Firebase isn't available/connected, this fallback will manage initial screen:
    // This block runs if the page loads and Firebase Auth hasn't yet determined a user state.
    // It's a fallback for initial display before onAuthStateChanged fires.
    if (!auth.currentUser && !currentUserRole) { // If no current Firebase user and no role in localStorage
        showScreen('language-selection-screen');
    } else if (currentUserRole) { // If a role is in localStorage (e.g., reloaded page)
        showScreen('app-container');
        if (currentUserRole === 'serviceCenter') {
            showContentSection('service-center-dashboard');
            renderServiceRequests(); // Render requests if Firebase not yet loaded by listener
            renderFeedbacks();
            renderPaymentHistory();
        } else {
            showContentSection('home-section');
        }
        setupFirebaseChatListener(); // Set up chat for persistent sessions
    }


    // Initialize the "Other Service Type" toggle
    document.getElementById('serviceType').dispatchEvent(new Event('change'));

    // Initialize profile data display on load for customer role
    if (currentUserRole === 'customer') {
        loadProfileData();
    }

    // Ensure the auth forms show the login by default
    showCustomerAuth('login');
});
