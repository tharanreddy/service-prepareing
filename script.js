// Firebase Imports
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    push,
    onValue,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Ensure Firebase instances are exposed globally from index.html
const auth = window.firebaseAuth;
const db = window.firebaseDB;

// Global state variables
let currentActiveSectionId = 'language-selection-screen'; // Initial active screen
let currentUserRole = null; // 'customer', 'serviceCenter', or null
let currentLanguage = 'en'; // Default language

// Language Translations (Add more languages and phrases as needed)
const translations = {
    en: {
        choose_language: "Choose Your Language",
        login: "Login",
        register: "Register",
        customer_login: "Customer Login",
        customer_register: "Customer Register",
        email: "Email",
        password: "Password",
        full_name: "Full Name",
        forgot_password: "Forgot Password?",
        or: "OR",
        sign_in_with_google: "Sign in with Google",
        are_you_a_service_center: "Are you a Service Center?",
        service_center_login: "Service Center Login",
        are_you_a_customer: "Are you a Customer?",
        customer_login_here: "Login here",
        logout: "Logout",
        nav_home: "Home",
        nav_book_service: "Book Service",
        nav_payments: "Payments",
        nav_feedback: "Feedback",
        nav_contact: "Contact Us",
        nav_profile: "Profile",
        nav_chat: "Chat",
        hero_heading: "Experience Hassle-Free Car Servicing!",
        hero_subheading: "From pickup to delivery, we make car maintenance easy and transparent. Quick, reliable, and just a tap away.",
        book_now_cta: "Book Your Service Now",
        feedback_thank_you: "Thank you for your feedback!",
        profile_updated: "Profile updated successfully!",
        service_request_success: "Service request submitted successfully!",
        payment_success: "Payment processed successfully!",
        contact_message_sent: "Your message has been sent successfully!",
        // Add more phrases as your UI expands
    },
    hi: {
        choose_language: "अपनी भाषा चुनें",
        login: "लॉग इन करें",
        register: "पंजीकरण करें",
        customer_login: "ग्राहक लॉगिन",
        customer_register: "ग्राहक पंजीकरण",
        email: "ईमेल",
        password: "पासवर्ड",
        full_name: "पूरा नाम",
        forgot_password: "पासवर्ड भूल गए?",
        or: "या",
        sign_in_with_google: "गूगल से साइन इन करें",
        are_you_a_service_center: "क्या आप एक सेवा केंद्र हैं?",
        service_center_login: "सेवा केंद्र लॉगिन",
        are_you_a_customer: "क्या आप ग्राहक हैं?",
        customer_login_here: "यहां लॉग इन करें",
        logout: "लॉग आउट",
        nav_home: "होम",
        nav_book_service: "सेवा बुक करें",
        nav_payments: "भुगतान",
        nav_feedback: "प्रतिक्रिया",
        nav_contact: "हमसे संपर्क करें",
        nav_profile: "प्रोफ़ाइल",
        nav_chat: "चैट",
        hero_heading: "परेशानी मुक्त कार सर्विसिंग का अनुभव करें!",
        hero_subheading: "पिकअप से लेकर डिलीवरी तक, हम कार रखरखाव को आसान और पारदर्शी बनाते हैं। त्वरित, विश्वसनीय, और बस एक टैप दूर।",
        book_now_cta: "अपनी सेवा अभी बुक करें",
        feedback_thank_you: "आपकी प्रतिक्रिया के लिए धन्यवाद!",
        profile_updated: "प्रोफ़ाइल सफलतापूर्वक अपडेट की गई!",
        service_request_success: "सेवा अनुरोध सफलतापूर्वक सबमिट किया गया!",
        payment_success: "भुगतान सफलतापूर्वक संसाधित हुआ!",
        contact_message_sent: "आपका संदेश सफलतापूर्वक भेजा गया है!",
    },
    // Add other languages (mr, te, kn) here
};

// --- UI Management Functions ---

/**
 * Displays a custom message box at the top of the screen.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - Type of message for styling.
 */
function displayMessage(message, type) {
    const msgBox = document.getElementById('customMessageBox');
    msgBox.textContent = message;
    msgBox.className = `custom-message-box show ${type}`; // Add type class
    msgBox.style.display = 'block'; // Ensure it's visible

    setTimeout(() => {
        msgBox.classList.remove('show');
        // Hide after transition, giving time for fade out
        setTimeout(() => {
            msgBox.style.display = 'none';
            msgBox.className = 'custom-message-box'; // Reset class
        }, 300); // Should match CSS transition duration
    }, 3000); // Message visible for 3 seconds
}

/**
 * Shows a specific screen and hides all others.
 * @param {string} screenId - The ID of the screen to show (e.g., 'language-selection-screen', 'customer-auth-screen', 'app-container').
 */
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById(screenId).style.display = 'flex'; // Use flex for auth/lang screens
    currentActiveSectionId = screenId; // Update global tracking

    // Special handling for app-container
    if (screenId === 'app-container') {
        document.getElementById('app-container').style.display = 'flex'; // It's a flex container
        // When entering app-container, default to home section
        showContentSection('home-section');
    } else {
        document.getElementById('app-container').style.display = 'none';
    }
    console.log(`Switched to screen: ${screenId}`);
}

/**
 * Shows a specific content section within the main application container.
 * Hides all other content sections.
 * Also updates active class in navbar.
 * @param {string} sectionId - The ID of the content section to show (e.g., 'home-section', 'book-service-section').
 */
function showContentSection(sectionId) {
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
        section.style.display = 'none';
    });

    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.style.display = 'block';
        currentActiveSectionId = sectionId; // Update global tracking
        console.log(`Switched to content section: ${sectionId}`);

        // Update active class in navbar
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Trigger data load/render for specific sections
        if (sectionId === 'service-center-dashboard') {
            renderServiceRequests();
            renderCustomerFeedbackDashboard();
            renderPaymentHistory();
        } else if (sectionId === 'profile-section') {
            loadUserProfile();
        } else if (sectionId === 'chat-section') {
            const user = auth.currentUser;
            if (user) {
                renderChatMessages(user.uid);
            } else {
                displayMessage("Please log in to use chat.", "info");
            }
        }
        // ... add more conditions for other sections that need data loaded
    }
}

/**
 * Toggles between login and register forms on the customer authentication screen.
 * @param {'login'|'register'} formType - The form to show.
 */
function showCustomerAuth(formType) {
    document.getElementById('customerLoginForm').style.display = 'none';
    document.getElementById('customerRegisterForm').style.display = 'none';

    document.querySelector('.auth-toggle .toggle-btn.active')?.classList.remove('active');

    if (formType === 'login') {
        document.getElementById('customerLoginForm').style.display = 'block';
        document.querySelector('.auth-toggle button:nth-child(1)').classList.add('active');
    } else {
        document.getElementById('customerRegisterForm').style.display = 'block';
        document.querySelector('.auth-toggle button:nth-child(2)').classList.add('active');
    }
}

/**
 * Applies translations based on the selected language.
 */
function applyTranslations() {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });
}

// --- Authentication Functions ---

/**
 * Handles user login with email and password.
 */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('customerLoginEmail').value;
    const password = document.getElementById('customerLoginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        displayMessage("Logged in successfully!", "success");
        // onAuthStateChanged will handle showing app-container
    } catch (error) {
        console.error("Login Error:", error.code, error.message);
        displayMessage(`Login failed: ${error.message}`, "error");
    }
});

/**
 * Handles new user registration with email and password.
 */
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('customerRegisterName').value;
    const email = document.getElementById('customerRegisterEmail').value;
    const password = document.getElementById('customerRegisterPassword').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user's name and role to Realtime Database
        await set(ref(db, `users/${user.uid}/profile`), {
            name: name,
            email: email, // Store email in profile as well
            role: 'customer' // Default role for new registrations
        });
        await set(ref(db, `users/${user.uid}/role`), 'customer'); // Separate role for easy lookup

        displayMessage("Registration successful! Welcome!", "success");
        // onAuthStateChanged will handle showing app-container
    } catch (error) {
        console.error("Registration Error:", error.code, error.message);
        displayMessage(`Registration failed: ${error.message}`, "error");
    }
});

/**
 * Handles Service Center login.
 */
document.getElementById('serviceCenterLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('centerLoginEmail').value;
    const password = document.getElementById('centerLoginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verify if this user has the 'serviceCenter' role
        onValue(ref(db, `users/${user.uid}/role`), (snapshot) => {
            const role = snapshot.val();
            if (role === 'serviceCenter') {
                displayMessage("Service Center logged in successfully!", "success");
                // onAuthStateChanged will handle showing app-container
            } else {
                signOut(auth); // Log them out if not a service center
                displayMessage("Access denied. Not a Service Center account.", "error");
            }
        }, {
            onlyOnce: true
        });

    } catch (error) {
        console.error("Service Center Login Error:", error.code, error.message);
        displayMessage(`Login failed: ${error.message}`, "error");
    }
});


/**
 * Initiates password reset for a given user type.
 * @param {'customer'|'serviceCenter'} userType
 */
window.forgotPassword = async (userType) => {
    let emailInputId = userType === 'customer' ? 'customerLoginEmail' : 'centerLoginEmail';
    const email = document.getElementById(emailInputId).value;

    if (!email) {
        displayMessage("Please enter your email address to reset password.", "info");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        displayMessage(`Password reset email sent to ${email}. Check your inbox.`, "success");
    } catch (error) {
        console.error("Password Reset Error:", error.code, error.message);
        displayMessage(`Failed to send password reset email: ${error.message}`, "error");
    }
};

/**
 * Handles Google Sign-In.
 */
document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user already exists in your 'users' node
        const userRef = ref(db, `users/${user.uid}/role`);
        onValue(userRef, async (snapshot) => {
            if (!snapshot.exists()) {
                // New user via Google, set default role as customer
                await set(ref(db, `users/${user.uid}/profile`), {
                    name: user.displayName || 'Google User',
                    email: user.email,
                    role: 'customer'
                });
                await set(userRef, 'customer'); // Set role
                displayMessage("Signed in with Google. Welcome!", "success");
            } else {
                displayMessage("Signed in with Google successfully!", "success");
            }
        }, {
            onlyOnce: true
        });

    } catch (error) {
        console.error("Google Sign-In Error:", error.code, error.message);
        displayMessage(`Google Sign-In failed: ${error.message}`, "error");
    }
});

/**
 * Handles user logout.
 */
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
        displayMessage("Logged out successfully!", "info");
        // onAuthStateChanged will handle showing the language selection screen
    } catch (error) {
        console.error("Logout Error:", error.message);
        displayMessage("Failed to log out.", "error");
    }
});

/**
 * Updates navbar visibility based on user role.
 * @param {string|null} role - 'customer', 'serviceCenter', or null.
 */
function updateNavBasedOnRole(role) {
    const customerNavItems = document.querySelectorAll('.customer-nav-item');
    const serviceCenterNavItems = document.querySelectorAll('.service-center-nav-item');
    const logoutBtn = document.getElementById('logoutBtn');

    if (role === 'customer') {
        customerNavItems.forEach(item => item.style.display = 'list-item');
        serviceCenterNavItems.forEach(item => item.style.display = 'none');
        logoutBtn.style.display = 'block';
    } else if (role === 'serviceCenter') {
        customerNavItems.forEach(item => item.style.display = 'none');
        serviceCenterNavItems.forEach(item => item.style.display = 'list-item');
        logoutBtn.style.display = 'block';
    } else {
        // No role or logged out
        customerNavItems.forEach(item => item.style.display = 'none');
        serviceCenterNavItems.forEach(item => item.style.display = 'none';
        logoutBtn.style.display = 'none';
    }
}

// --- Firebase Data Interaction (CRUD) Examples ---

// --- Service Booking Form (Customer) ---
document.getElementById('serviceBookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerName = document.getElementById('customerName').value;
    const customerContact = document.getElementById('customerContact').value;
    const customerAddress = document.getElementById('customerAddress').value;
    const carModel = document.getElementById('carModel').value;
    const serviceType = document.getElementById('serviceType').value;
    const otherServiceType = document.getElementById('otherServiceType').value;
    const preferredDate = document.getElementById('preferredDate').value;
    const preferredTime = document.getElementById('preferredTime').value;

    const user = auth.currentUser;

    if (!user) {
        displayMessage("Please log in to book a service.", "error");
        return;
    }

    const finalServiceType = (serviceType === 'Other' ? otherServiceType : serviceType);
    if (serviceType === 'Other' && !otherServiceType) {
        displayMessage("Please specify the 'Other' service type.", "info");
        return;
    }

    const serviceRequestData = {
        userId: user.uid,
        customerName: customerName,
        customerContact: customerContact,
        customerAddress: customerAddress,
        carModel: carModel,
        serviceType: finalServiceType,
        preferredDate: preferredDate,
        preferredTime: preferredTime,
        status: 'Pending', // Initial status
        timestamp: Date.now()
    };

    try {
        const newRequestRef = push(ref(db, 'serviceRequests'));
        await set(newRequestRef, serviceRequestData);
        displayMessage(translations[currentLanguage].service_request_success, "success");
        document.getElementById('serviceBookingForm').reset();
        document.getElementById('otherServiceTypeGroup').style.display = 'none';
    } catch (error) {
        console.error("Error submitting service request:", error);
        displayMessage("Failed to submit service request: " + error.message, "error");
    }
});

// Logic for "Other" service type visibility
document.getElementById('serviceType').addEventListener('change', (event) => {
    const otherServiceTypeGroup = document.getElementById('otherServiceTypeGroup');
    if (event.target.value === 'Other') {
        otherServiceTypeGroup.style.display = 'block';
        document.getElementById('otherServiceType').setAttribute('required', 'true');
    } else {
        otherServiceTypeGroup.style.display = 'none';
        document.getElementById('otherServiceType').removeAttribute('required');
    }
});


// --- Profile Management (Customer) ---
function loadUserProfile() {
    const user = auth.currentUser;
    if (user) {
        const userProfileRef = ref(db, `users/${user.uid}/profile`);

        onValue(userProfileRef, (snapshot) => {
            if (snapshot.exists()) {
                const profileData = snapshot.val();
                document.getElementById('profileName').value = profileData.name || '';
                document.getElementById('profileEmail').value = user.email || '';
                document.getElementById('profileMobile').value = profileData.mobile || '';
                document.getElementById('profileAddress').value = profileData.address || '';
                document.getElementById('profileCarMake').value = profileData.carMake || '';
                document.getElementById('profileCarModel').value = profileData.carModel || '';
                document.getElementById('profileCarYear').value = profileData.carYear || '';
                document.getElementById('profileLicensePlate').value = profileData.licensePlate || '';
            } else {
                document.getElementById('profileEmail').value = user.email || '';
            }
        }, {
            onlyOnce: true
        }); // Load once on section open
    } else {
        displayMessage("Please log in to view your profile.", "info");
    }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
        const profileData = {
            name: document.getElementById('profileName').value,
            mobile: document.getElementById('profileMobile').value,
            address: document.getElementById('profileAddress').value,
            carMake: document.getElementById('profileCarMake').value,
            carModel: document.getElementById('profileCarModel').value,
            carYear: parseInt(document.getElementById('profileCarYear').value) || null,
            licensePlate: document.getElementById('profileLicensePlate').value,
            email: user.email
        };
        try {
            await set(ref(db, `users/${user.uid}/profile`), profileData);
            displayMessage(translations[currentLanguage].profile_updated, "success");
        } catch (error) {
            console.error("Error updating profile:", error);
            displayMessage(`Failed to update profile: ${error.message}`, "error");
        }
    } else {
        displayMessage("You must be logged in to update your profile.", "error");
    }
});


// --- Service Center Dashboard Data Display ---
function renderServiceRequests() {
    const serviceRequestsList = document.getElementById('serviceRequestsList');
    const noRequestsMessage = document.getElementById('noRequestsMessage');

    const requestsRef = ref(db, 'serviceRequests');

    onValue(requestsRef, (snapshot) => {
        serviceRequestsList.innerHTML = ''; // Clear current list
        let hasRequests = false;

        if (snapshot.exists()) {
            // Sort requests by timestamp, newest first
            const sortedRequests = [];
            snapshot.forEach((childSnapshot) => {
                sortedRequests.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            sortedRequests.sort((a, b) => b.timestamp - a.timestamp); // Newest first

            sortedRequests.forEach((request) => {
                hasRequests = true;
                const listItem = document.createElement('li');
                listItem.className = `request-item status-${request.status.toLowerCase()}`;
                listItem.innerHTML = `
                    <p class="request-details"><strong>ID:</strong> #${request.id}</p>
                    <p class="request-details"><strong>Customer:</strong> ${request.customerName || 'N/A'}</p>
                    <p class="request-details"><strong>Contact:</strong> ${request.customerContact || 'N/A'}</p>
                    <p class="request-details"><strong>Address:</strong> ${request.customerAddress || 'N/A'}</p>
                    <p class="request-details"><strong>Car:</strong> ${request.carModel || 'N/A'}</p>
                    <p class="request-details"><strong>Service:</strong> ${request.serviceType || 'N/A'}</p>
                    <p class="request-details"><strong>Date:</strong> ${request.preferredDate || 'N/A'} @ ${request.preferredTime || 'N/A'}</p>
                    <p class="request-status"><strong>Status:</strong> <span class="status-text status-${request.status.toLowerCase()}">${request.status || 'Pending'}</span></p>
                    <div class="request-actions">
                        ${request.status === 'Pending' ? `
                            <button class="btn btn-small" onclick="updateServiceStatus('${request.id}', 'Accepted')">Accept</button>
                            <button class="btn btn-small btn-danger" onclick="updateServiceStatus('${request.id}', 'Rejected')">Reject</button>
                        ` : ''}
                        ${request.status === 'Accepted' ? `
                            <button class="btn btn-small btn-secondary" onclick="markServiceCompleted('${request.id}')">Mark as Completed</button>
                        ` : ''}
                    </div>
                `;
                serviceRequestsList.appendChild(listItem);
            });
        }

        if (!hasRequests) {
            serviceRequestsList.appendChild(noRequestsMessage);
            noRequestsMessage.style.display = 'block';
        } else {
            noRequestsMessage.style.display = 'none';
        }
    }, (error) => {
        console.error("Error fetching service requests:", error);
        displayMessage("Error loading service requests.", "error");
    });
}

// Global functions for service request actions
window.updateServiceStatus = async (requestId, newStatus) => {
    try {
        await update(ref(db, `serviceRequests/${requestId}`), { status: newStatus });
        displayMessage(`Request #${requestId} status updated to ${newStatus}.`, "success");
    } catch (error) {
        console.error("Error updating service status:", error);
        displayMessage(`Failed to update request status: ${error.message}`, "error");
    }
};

window.markServiceCompleted = async (requestId) => {
    try {
        await update(ref(db, `serviceRequests/${requestId}`), { status: 'Completed' });
        displayMessage(`Service #${requestId} marked as completed.`, "success");
    } catch (error) {
        console.error("Error marking service completed:", error);
        displayMessage(`Failed to mark service completed: ${error.message}`, "error");
    }
};


function renderCustomerFeedbackDashboard() {
    const feedbackList = document.getElementById('customerFeedbackListDashboard');
    const noFeedbackMessage = document.getElementById('noFeedbackMessageDashboard');

    const feedbackRef = ref(db, 'feedback'); // Assuming feedback is stored here

    onValue(feedbackRef, (snapshot) => {
        feedbackList.innerHTML = '';
        let hasFeedback = false;

        if (snapshot.exists()) {
            const sortedFeedback = [];
            snapshot.forEach((childSnapshot) => {
                sortedFeedback.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            sortedFeedback.sort((a, b) => b.timestamp - a.timestamp); // Newest first

            sortedFeedback.forEach((feedbackItem) => {
                hasFeedback = true;
                const listItem = document.createElement('li');
                const stars = '★'.repeat(feedbackItem.rating || 0) + '☆'.repeat(5 - (feedbackItem.rating || 0));
                listItem.innerHTML = `
                    <p class="feedback-item-text"><strong>Service ID:</strong> ${feedbackItem.serviceId || 'N/A'}</p>
                    <p class="feedback-item-text rating-display">${stars}</p>
                    <p class="feedback-item-text comment">"${feedbackItem.message || 'No comment provided.'}"</p>
                    <p class="feedback-item-text meta-info">By ${feedbackItem.userName || 'Anonymous'} on ${new Date(feedbackItem.timestamp).toLocaleDateString()}</p>
                `;
                feedbackList.appendChild(listItem);
            });
        }

        if (!hasFeedback) {
            feedbackList.appendChild(noFeedbackMessage);
            noFeedbackMessage.style.display = 'block';
        } else {
            noFeedbackMessage.style.display = 'none';
        }
    });
}

function renderPaymentHistory() {
    const paymentHistoryList = document.getElementById('paymentHistoryList');
    const noPaymentHistoryMessage = document.getElementById('noPaymentHistoryMessage');

    const paymentsRef = ref(db, 'payments'); // Assuming payments are stored here

    onValue(paymentsRef, (snapshot) => {
        paymentHistoryList.innerHTML = '';
        let hasPayments = false;

        if (snapshot.exists()) {
            const sortedPayments = [];
            snapshot.forEach((childSnapshot) => {
                sortedPayments.push({ id: childSnapshot.key, ...childSnapshot.val() });
            });
            sortedPayments.sort((a, b) => b.timestamp - a.timestamp); // Newest first

            sortedPayments.forEach((payment) => {
                hasPayments = true;
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <p class="payment-details"><strong>Service ID:</strong> ${payment.serviceId || 'N/A'}</p>
                    <p class="payment-details"><strong>Amount:</strong> ₹${payment.amount || '0.00'}</p>
                    <p class="payment-details"><strong>Method:</strong> ${payment.method || 'N/A'}</p>
                    <p class="payment-details"><strong>Date:</strong> ${new Date(payment.timestamp).toLocaleString()}</p>
                    <p class="payment-details"><strong>Status:</strong> ${payment.status || 'Completed'}</p>
                `;
                paymentHistoryList.appendChild(listItem);
            });
        }

        if (!hasPayments) {
            paymentHistoryList.appendChild(noPaymentHistoryMessage);
            noPaymentHistoryMessage.style.display = 'block';
        } else {
            noPaymentHistoryMessage.style.display = 'none';
        }
    });
}

// --- Customer Chat Functionality ---
function renderChatMessages(userId) {
    const chatMessagesContainer = document.getElementById('chatMessages');
    const chatRef = ref(db, `chats/${userId}`); // Chat specific to the current user

    // Clear initial static messages when dynamic content loads
    chatMessagesContainer.innerHTML = '';

    onValue(chatRef, (snapshot) => {
        chatMessagesContainer.innerHTML = ''; // Clear existing messages to prevent duplicates on update
        if (snapshot.exists()) {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                messages.push(childSnapshot.val());
            });

            // Sort messages by timestamp
            messages.sort((a, b) => a.timestamp - b.timestamp);

            messages.forEach((messageData) => {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message');
                // Assume 'customer' sends, 'serviceCenter' receives in this chat
                messageDiv.classList.add(messageData.sender === 'customer' ? 'sent' : 'received');

                const messageTime = new Date(messageData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                messageDiv.innerHTML = `
                    <p><strong>${messageData.sender === 'customer' ? 'You' : 'Service Center'}:</strong> ${messageData.text}</p>
                    <span class="timestamp">${messageTime}</span>
                `;
                chatMessagesContainer.appendChild(messageDiv);
            });
            // Scroll to the bottom of the chat after messages are loaded/updated
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        } else {
            chatMessagesContainer.innerHTML = '<div class="message received"><p><strong>Service Center:</strong> Welcome to chat! How can we assist you?</p><span class="timestamp">' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span></div>';
        }
    }, (error) => {
        console.error("Error fetching chat messages:", error);
        displayMessage("Error loading chat.", "error");
    });
}

document.getElementById('chatSendBtn').addEventListener('click', async () => {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    const user = auth.currentUser;

    if (!user) {
        displayMessage("Please log in to send messages.", "error");
        return;
    }

    if (messageText) {
        // Determine sender based on the globally tracked role
        const sender = (currentUserRole === 'customer') ? 'customer' : 'serviceCenter'; // Or more robustly check from user's DB profile

        try {
            const newMessageRef = push(ref(db, `chats/${user.uid}`)); // Chat specific to this user's UID
            await set(newMessageRef, {
                text: messageText,
                sender: sender,
                timestamp: Date.now()
            });
            chatInput.value = ''; // Clear input
        } catch (error) {
            console.error("Error sending message:", error);
            displayMessage("Failed to send message.", "error");
        }
    }
});


// --- Payments Section Functionality (Example - needs integration with service booking/completion) ---
// This part is more conceptual. In a real app, payment details would be pulled
// from a specific service request that is due for payment.
document.getElementById('paymentMethod').addEventListener('change', (event) => {
    const onlinePaymentFields = document.getElementById('onlinePaymentFields');
    if (event.target.value === 'online') {
        onlinePaymentFields.style.display = 'block';
        document.getElementById('customerMobileNumber').setAttribute('required', 'true');
    } else {
        onlinePaymentFields.style.display = 'none';
        document.getElementById('customerMobileNumber').removeAttribute('required');
    }
});

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        displayMessage("Please log in to make a payment.", "error");
        return;
    }

    // In a real scenario, you'd get the actual serviceId and amount
    // from a pending service request tied to the current user.
    const mockServiceId = "SVC" + Math.floor(Math.random() * 100000);
    const mockAmount = "1500.00"; // Example amount

    const paymentData = {
        userId: user.uid,
        serviceId: mockServiceId, // Placeholder
        amount: mockAmount,       // Placeholder
        method: document.getElementById('paymentMethod').value,
        status: 'Completed',      // Assume completed on form submission
        timestamp: Date.now()
    };

    if (paymentData.method === 'online') {
        paymentData.mobileNumber = document.getElementById('customerMobileNumber').value;
        paymentData.upiId = document.getElementById('customerUpiId').value;
        if (!paymentData.mobileNumber) {
            displayMessage("Mobile number is required for online payment.", "info");
            return;
        }
    }

    try {
        await push(ref(db, 'payments'), paymentData);
        displayMessage(translations[currentLanguage].payment_success, "success");
        document.getElementById('paymentForm').reset();
        document.getElementById('onlinePaymentFields').style.display = 'none';
        // Clear payment summary (if it was dynamically populated)
        document.getElementById('paymentServiceId').textContent = 'N/A';
        document.getElementById('paymentCustomerName').textContent = 'N/A';
        document.getElementById('paymentServiceType').textContent = 'N/A';
        document.getElementById('paymentAmountDue').textContent = '₹0.00';
    } catch (error) {
        console.error("Error processing payment:", error);
        displayMessage(`Failed to process payment: ${error.message}`, "error");
    }
});


// --- Feedback Section Functionality ---
let selectedRating = 0; // To store the selected star rating

document.getElementById('starRating').addEventListener('click', (event) => {
    if (event.target.tagName === 'I') {
        const rating = parseInt(event.target.dataset.rating);
        selectedRating = rating;
        const stars = document.querySelectorAll('#starRating i');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('far');
                star.classList.add('fas'); // Filled star
            } else {
                star.classList.remove('fas');
                star.classList.add('far'); // Empty star
            }
        });
    }
});

document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        displayMessage("Please log in to submit feedback.", "error");
        return;
    }

    const serviceId = document.getElementById('serviceIdFeedback').value || "AutoGeneratedSVC" + Math.floor(Math.random() * 10000); // Placeholder
    const feedbackMessage = document.getElementById('feedbackMessage').value;

    if (selectedRating === 0) {
        displayMessage("Please select a star rating.", "info");
        return;
    }
    if (!feedbackMessage.trim()) {
        displayMessage("Please provide your comments.", "info");
        return;
    }

    const feedbackData = {
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonymous',
        serviceId: serviceId,
        rating: selectedRating,
        message: feedbackMessage,
        timestamp: Date.now()
    };

    try {
        await push(ref(db, 'feedback'), feedbackData);
        displayMessage(translations[currentLanguage].feedback_thank_you, "success");
        document.getElementById('feedbackForm').reset();
        selectedRating = 0; // Reset stars
        document.querySelectorAll('#starRating i').forEach(star => {
            star.classList.remove('fas');
            star.classList.add('far');
        });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        displayMessage(`Failed to submit feedback: ${error.message}`, "error");
    }
});

// Function to render customer feedback on the customer's own feedback section
function renderCustomerFeedbackList() {
    const customerFeedbackList = document.getElementById('customerFeedbackList');
    const noFeedbackMessage = document.getElementById('noFeedbackMessage');
    const user = auth.currentUser;

    if (!user) {
        customerFeedbackList.innerHTML = `<li class="empty-message">${translations[currentLanguage].no_feedback_yet || 'No feedback submitted yet.'}</li>`;
        return;
    }

    const feedbackRef = ref(db, 'feedback');

    onValue(feedbackRef, (snapshot) => {
        customerFeedbackList.innerHTML = '';
        let hasUserFeedback = false;

        if (snapshot.exists()) {
            const userFeedbacks = [];
            snapshot.forEach((childSnapshot) => {
                const feedbackItem = childSnapshot.val();
                if (feedbackItem.userId === user.uid) { // Filter by current user
                    userFeedbacks.push({ id: childSnapshot.key, ...feedbackItem });
                }
            });

            if (userFeedbacks.length > 0) {
                userFeedbacks.sort((a, b) => b.timestamp - a.timestamp); // Newest first
                hasUserFeedback = true;

                userFeedbacks.forEach((feedbackItem) => {
                    const listItem = document.createElement('li');
                    const stars = '★'.repeat(feedbackItem.rating || 0) + '☆'.repeat(5 - (feedbackItem.rating || 0));
                    listItem.innerHTML = `
                        <p class="rating-display">${stars}</p>
                        <p class="comment">"${feedbackItem.message || 'No comment provided.'}"</p>
                        <p class="meta-info">Service ID: ${feedbackItem.serviceId || 'N/A'} on ${new Date(feedbackItem.timestamp).toLocaleDateString()}</p>
                    `;
                    customerFeedbackList.appendChild(listItem);
                });
            }
        }

        if (!hasUserFeedback) {
            customerFeedbackList.appendChild(noFeedbackMessage);
            noFeedbackMessage.style.display = 'block';
        } else {
            noFeedbackMessage.style.display = 'none';
        }
    });
}


// --- Contact Us Section Functionality ---
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const contactData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value,
        timestamp: Date.now()
    };

    try {
        await push(ref(db, 'contactMessages'), contactData);
        displayMessage(translations[currentLanguage].contact_message_sent, "success");
        document.getElementById('contactForm').reset();
    } catch (error) {
        console.error("Error sending contact message:", error);
        displayMessage(`Failed to send message: ${error.message}`, "error");
    }
});


// --- Initial Setup and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Language selection buttons
    document.querySelectorAll('.lang-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            currentLanguage = event.target.dataset.lang;
            applyTranslations(); // Apply initial translations
            showScreen('customer-auth-screen'); // Move to auth screen after language selection
        });
    });

    // Initialize display based on authentication state
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, fetch role
            const userRoleRef = ref(db, `users/${user.uid}/role`);
            onValue(userRoleRef, (snapshot) => {
                currentUserRole = snapshot.val();
                console.log(`User ${user.uid} is logged in with role: ${currentUserRole}`);
                showScreen('app-container');
                updateNavBasedOnRole(currentUserRole);

                // Specific initial loads based on role/default section
                if (currentUserRole === 'customer') {
                    // Automatically pre-fill some fields in service booking/profile if available
                    onValue(ref(db, `users/${user.uid}/profile`), (profileSnapshot) => {
                        if (profileSnapshot.exists()) {
                            const profile = profileSnapshot.val();
                            document.getElementById('customerName').value = profile.name || '';
                            document.getElementById('customerContact').value = profile.mobile || '';
                            document.getElementById('customerAddress').value = profile.address || '';
                            document.getElementById('carModel').value = profile.carModel || '';
                            // Pre-fill feedback service ID if there's a recent service? (more complex)
                            // For now, leave serviceIdFeedback empty for manual input or a later auto-fill mechanism
                        }
                    }, { onlyOnce: true });
                    // Also load customer-specific feedback if on feedback section
                    if (currentActiveSectionId === 'feedback-section') {
                        renderCustomerFeedbackList();
                    }
                } else if (currentUserRole === 'serviceCenter') {
                    showContentSection('service-center-dashboard'); // Redirect service center to dashboard
                }
            }, { onlyOnce: true }); // Fetch role once on sign-in
        } else {
            // User is signed out
            currentUserRole = null;
            showScreen('language-selection-screen'); // Go back to language/auth screen
            updateNavBasedOnRole(null); // Hide all nav items
            // Clear any user-specific data from UI if applicable
        }
    });

    // Initial translation application (before user selects, it will use default 'en')
    applyTranslations();
});
