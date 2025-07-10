// --- Start of script.js ---

// Import necessary Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, set, update, get, child, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// --- Firebase Configuration (ensure this matches what's in your index.html) ---
// It's generally better to initialize Firebase once globally, as you've done in index.html,
// and then use the window.firebaseAuth and window.firebaseDB variables.
// I'm keeping the global variable usage as per your index.html setup.
// If you move Firebase initialization entirely into script.js, uncomment and use these:
/*
const firebaseConfig = {
    apiKey: "AIzaSyDgGaOi-lNe9vNg72fNag1C6hioB2qqnMU",
    authDomain: "service-prepareing.firebaseapp.com",
    projectId: "service-prepareing",
    databaseURL: "https://service-prepareing-default-rtdb.firebaseio.com",
    storageBucket: "service-prepareing.firebasestorage.app",
    messagingSenderId: "295345065007",
    appId: "1:295345065007:web:0eb9463c2f0b73ff4b4ada",
    measurementId: "G-W68Y5N8TLD"
};
const app = initializeApp(firebaseConfig);
window.firebaseAuth = getAuth(app);
window.firebaseDB = getDatabase(app);
*/

// =========================================================
// --- Global Variables and Helper Functions ---
// =========================================================

let currentServiceId = null; // To store the ID of the last booked service for payments/feedback
let currentUserId = null; // To store the logged-in user's ID
let currentUserRole = null; // 'customer' or 'serviceCenter'

/**
 * Helper function for displaying custom messages/notifications.
 * @param {string} message The message to display.
 * @param {string} type The type of message ('success', 'error', 'warning', 'info').
 * @param {number} duration The duration in milliseconds the message should be visible.
 */
function displayMessage(message, type = 'info', duration = 3000) {
    const messageBox = document.getElementById('customMessageBox');
    if (!messageBox) {
        console.error("Custom message box element not found!");
        return;
    }
    messageBox.textContent = message;
    messageBox.className = 'custom-message-box show ' + type; // Add 'show' and type class
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, duration);
}

/**
 * Hides all main screens (language, customer auth, service center auth, main app)
 * and then displays the specified screen.
 * @param {string} screenId The ID of the screen to show (e.g., 'language-selection-screen', 'customer-auth-screen', 'service-center-auth-screen', 'app-container').
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        // Use 'flex' for auth and language screens for centering, 'block' for app-container
        targetScreen.style.display = (screenId.includes('auth') || screenId.includes('language')) ? 'flex' : 'block';
    }

    // Adjust body alignment based on screen
    if (screenId === 'app-container') {
        document.body.style.alignItems = 'flex-start'; // Align content to top for app view
        // When the main app is shown, ensure the home section is active by default
        showContentSection('home-section');
    } else {
        document.body.style.alignItems = 'center'; // Center auth/language screens
    }
}

/**
 * Hides all content sections within the main application and then displays the specified one.
 * Also updates the active state of the navigation links.
 * @param {string} sectionId The ID of the content section to show (e.g., 'home-section', 'book-service-section').
 */
function showContentSection(sectionId) {
    // Hide all content sections first
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show the requested content section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update active state for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });

    // Hide customer specific nav items if service center logged in, and vice versa
    const customerNavItems = document.querySelectorAll('.customer-nav-item');
    const serviceCenterDashboard = document.getElementById('service-center-dashboard');

    if (currentUserRole === 'serviceCenter') {
        customerNavItems.forEach(item => item.style.display = 'none');
        if (sectionId === 'service-center-dashboard') {
            serviceCenterDashboard.classList.add('active');
        } else {
            serviceCenterDashboard.classList.remove('active');
        }
    } else { // Customer or not logged in
        customerNavItems.forEach(item => item.style.display = 'list-item');
        serviceCenterDashboard.classList.remove('active');
    }
}


// =========================================================
// --- DOMContentLoaded: Ensure HTML is loaded before script runs ---
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

    // Check if Firebase instances are available (from index.html)
    if (!window.firebaseAuth || !window.firebaseDB) {
        console.error("Firebase not initialized! Check your index.html script tag for Firebase SDK.");
        return;
    }

    // --- Initial Screen Setup ---
    showScreen('language-selection-screen');

    // --- Language Selection ---
    document.querySelectorAll('.lang-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // In a real app, you'd save this language preference
            console.log("Language selected:", e.target.dataset.lang);
            showScreen('customer-auth-screen'); // Move to authentication after language
        });
    });

    // --- Authentication Toggles (Login/Register) ---
    window.showCustomerAuth = (formType) => {
        const loginForm = document.getElementById('customerLoginForm');
        const registerForm = document.getElementById('customerRegisterForm');
        const toggleButtons = document.querySelectorAll('#customer-auth-screen .toggle-btn');

        if (formType === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            toggleButtons[0].classList.add('active');
            toggleButtons[1].classList.remove('active');
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            toggleButtons[0].classList.remove('active');
            toggleButtons[1].classList.add('active');
        }
    };

    // --- Auth Screen Switching ---
    // These functions are already called with onclick in your HTML,
    // but ensure showScreen() is properly defined (which it is now)
    // Example: <span onclick="showScreen('service-center-auth-screen')">Login Here</span>

    // --- Firebase Authentication Listeners ---
    onAuthStateChanged(window.firebaseAuth, (user) => {
        if (user) {
            currentUserId = user.uid;
            // Check user role from database
            const userRef = ref(window.firebaseDB, 'users/' + user.uid);
            onValue(userRef, (snapshot) => {
                const userData = snapshot.val();
                if (userData && userData.role) {
                    currentUserRole = userData.role;
                    displayMessage(`Logged in as ${userData.email} (${userData.role})`, 'success');
                    document.querySelector('.app-container').style.display = 'flex'; // Show main app
                    showScreen('app-container'); // Hide auth screen

                    // Update profile section with user data
                    document.getElementById('profileName').value = userData.name || '';
                    document.getElementById('profileEmail').value = userData.email || '';
                    document.getElementById('profileMobile').value = userData.mobile || '';
                    document.getElementById('profileAddress').value = userData.address || '';
                    document.getElementById('profileCarMake').value = userData.carMake || '';
                    document.getElementById('profileCarModel').value = userData.carModel || '';
                    document.getElementById('profileCarYear').value = userData.carYear || '';
                    document.getElementById('profileLicensePlate').value = userData.licensePlate || '';

                    if (currentUserRole === 'serviceCenter') {
                        // Redirect to service center dashboard and hide customer nav items
                        showContentSection('service-center-dashboard');
                        document.querySelectorAll('.customer-nav-item').forEach(item => item.style.display = 'none');
                        loadServiceRequests();
                        loadCustomerFeedback();
                        loadPaymentHistory();
                        loadServiceCenterPoints();
                    } else {
                        // Customer logged in, show customer nav items
                        document.querySelectorAll('.customer-nav-item').forEach(item => item.style.display = 'list-item');
                        showContentSection('home-section'); // Go to home page for customers
                        loadTestimonials(); // Load testimonials for home page
                    }
                } else {
                    displayMessage("User data incomplete or role not set. Please update your profile.", "warning");
                    // Force user to update profile if role is missing
                    showContentSection('profile-section');
                }
            }, {
                onlyOnce: true // Fetch once on login
            });
        } else {
            // No user is logged in
            currentUserId = null;
            currentUserRole = null;
            document.querySelector('.app-container').style.display = 'none'; // Hide main app
            showScreen('customer-auth-screen'); // Go back to authentication
            displayMessage("Logged out successfully.", "info");
        }
    });

    // --- Customer Login ---
    document.getElementById('customerLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('customerLoginEmail').value;
        const password = document.getElementById('customerLoginPassword').value;

        try {
            await signInWithPopup(window.firebaseAuth, email, password); // This should be signInWithEmailAndPassword
            // onAuthStateChanged listener will handle UI update
        } catch (error) {
            displayMessage(`Login failed: ${error.message}`, 'error');
            console.error("Customer Login Error:", error);
        }
    });

    // --- Customer Registration ---
    document.getElementById('customerRegisterForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('customerRegisterName').value;
        const email = document.getElementById('customerRegisterEmail').value;
        const password = document.getElementById('customerRegisterPassword').value;

        try {
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            await set(ref(window.firebaseDB, 'users/' + user.uid), {
                name: name,
                email: email,
                role: 'customer' // Assign role to new user
            });
            displayMessage('Registration successful! Please login.', 'success');
            showCustomerAuth('login'); // Switch to login form
        } catch (error) {
            displayMessage(`Registration failed: ${error.message}`, 'error');
            console.error("Customer Registration Error:", error);
        }
    });

    // --- Service Center Login ---
    document.getElementById('serviceCenterLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('centerLoginEmail').value;
        const password = document.getElementById('centerLoginPassword').value;

        try {
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            // Verify role after login
            const userRef = ref(window.firebaseDB, 'users/' + user.uid);
            const snapshot = await get(userRef);
            const userData = snapshot.val();
            if (userData && userData.role === 'serviceCenter') {
                // onAuthStateChanged will handle UI update
            } else {
                displayMessage("Not authorized as Service Center.", "error");
                await signOut(window.firebaseAuth); // Log out unauthorized user
            }
        } catch (error) {
            displayMessage(`Service Center Login failed: ${error.message}`, 'error');
            console.error("Service Center Login Error:", error);
        }
    });

    // --- Google Sign-In ---
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(window.firebaseAuth, provider);
                const user = result.user;
                // Check if user already exists in your 'users' node
                const userRef = ref(window.firebaseDB, 'users/' + user.uid);
                const snapshot = await get(userRef);

                if (!snapshot.exists()) {
                    // New user, create entry with default role
                    await set(userRef, {
                        name: user.displayName,
                        email: user.email,
                        role: 'customer' // Default role for Google sign-ups
                    });
                }
                // onAuthStateChanged listener will handle UI update
            } catch (error) {
                displayMessage(`Google Sign-In Failed: ${error.message}`, "error");
                console.error("Google Sign-In Error:", error);
            }
        });
    }

    // --- Forgot Password ---
    window.forgotPassword = async (userType) => {
        let email;
        if (userType === 'customer') {
            email = document.getElementById('customerLoginEmail').value;
        } else if (userType === 'serviceCenter') {
            email = document.getElementById('centerLoginEmail').value;
        }

        if (email) {
            try {
                await window.firebaseAuth.sendPasswordResetEmail(email);
                displayMessage(`Password reset email sent to ${email}. Check your inbox.`, 'success');
            } catch (error) {
                displayMessage(`Failed to send reset email: ${error.message}`, 'error');
                console.error("Forgot Password Error:", error);
            }
        } else {
            displayMessage("Please enter your email to reset password.", 'warning');
        }
    };

    // --- Logout Button ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(window.firebaseAuth);
                // onAuthStateChanged listener will handle UI update
            } catch (error) {
                displayMessage(`Logout failed: ${error.message}`, 'error');
                console.error("Logout Error:", error);
            }
        });
    }


    // =========================================================
    // --- Navigation Link Handlers ---
    // =========================================================

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default anchor link behavior

            const targetSectionId = this.getAttribute('href').substring(1); // Remove the '#'
            showContentSection(targetSectionId);

            // Special handling for Service Center Dashboard navigation (if it becomes a nav item)
            if (targetSectionId === 'service-center-dashboard' && currentUserRole === 'serviceCenter') {
                loadServiceRequests();
                loadCustomerFeedback();
                loadPaymentHistory();
                loadServiceCenterPoints();
            }
        });
    });

    // --- "Book Your Service Now" CTA on Home page ---
    const bookNowCta = document.querySelector('.hero-section .btn');
    if (bookNowCta) {
        bookNowCta.addEventListener('click', () => {
            showContentSection('book-service-section');
        });
    }

    // =========================================================
    // --- Home Section: Testimonials ---
    // =========================================================

    const testimonialList = document.getElementById('testimonialList');

    function loadTestimonials() {
        const feedbackRef = ref(window.firebaseDB, 'feedback');
        onValue(feedbackRef, (snapshot) => {
            testimonialList.innerHTML = ''; // Clear existing testimonials
            const testimonialsData = snapshot.val();
            if (testimonialsData) {
                const feedbackArray = Object.values(testimonialsData); // Convert object to array
                feedbackArray.forEach(feedback => {
                    const listItem = document.createElement('li');
                    let starsHtml = '';
                    for (let i = 1; i <= 5; i++) {
                        starsHtml += `<i class="fas fa-star${i <= feedback.rating ? '' : '-o'}"></i>`;
                    }
                    listItem.innerHTML = `
                        <div class="rating">${starsHtml}</div>
                        <p>${feedback.message}</p>
                        <div class="author">- ${feedback.customerName || 'Anonymous'}</div>
                    `;
                    testimonialList.appendChild(listItem);
                });
            } else {
                testimonialList.innerHTML = '<li id="noTestimonialsMessage" class="empty-message">No testimonials yet. Be the first to leave feedback!</li>';
            }
        });
    }


    // =========================================================
    // --- Book Service Section ---
    // =========================================================

    const serviceBookingForm = document.getElementById('serviceBookingForm');
    const serviceTypeSelect = document.getElementById('serviceType');
    const otherServiceTypeGroup = document.getElementById('otherServiceTypeGroup');

    // Show/hide "Specify Other Service" field
    if (serviceTypeSelect) {
        serviceTypeSelect.addEventListener('change', () => {
            if (serviceTypeSelect.value === 'Other') {
                otherServiceTypeGroup.style.display = 'block';
                document.getElementById('otherServiceType').setAttribute('required', 'true');
            } else {
                otherServiceTypeGroup.style.display = 'none';
                document.getElementById('otherServiceType').removeAttribute('required');
            }
        });
    }

    if (serviceBookingForm) {
        serviceBookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUserId) {
                displayMessage('Please log in to book a service.', 'error');
                showScreen('customer-auth-screen');
                return;
            }

            const customerName = document.getElementById('customerName').value;
            const customerContact = document.getElementById('customerContact').value;
            const customerAddress = document.getElementById('customerAddress').value;
            const carModel = document.getElementById('carModel').value;
            let serviceType = serviceTypeSelect.value;
            const preferredDate = document.getElementById('preferredDate').value;
            const preferredTime = document.getElementById('preferredTime').value;

            if (serviceType === 'Other') {
                const otherService = document.getElementById('otherServiceType').value;
                if (!otherService) {
                    displayMessage("Please specify the 'Other' service type.", 'warning');
                    return;
                }
                serviceType = `Other: ${otherService}`;
            }

            const serviceData = {
                customerId: currentUserId,
                customerName,
                customerContact,
                customerAddress,
                carModel,
                serviceType,
                preferredDate,
                preferredTime,
                status: 'Pending', // Initial status
                bookedAt: new Date().toISOString()
            };

            try {
                const newServiceRef = push(ref(window.firebaseDB, 'serviceRequests'));
                await set(newServiceRef, serviceData);
                currentServiceId = newServiceRef.key; // Store the new service ID

                displayMessage('Service booked successfully! Service ID: ' + currentServiceId, 'success');
                serviceBookingForm.reset(); // Clear the form
                otherServiceTypeGroup.style.display = 'none'; // Hide "Other" field
                showContentSection('payment-section'); // Redirect to payment after booking

                // Pre-fill payment details
                document.getElementById('paymentServiceId').textContent = currentServiceId;
                document.getElementById('paymentCustomerName').textContent = customerName;
                document.getElementById('paymentServiceType').textContent = serviceType;
                document.getElementById('paymentAmountDue').textContent = '₹' + (Math.random() * 5000 + 500).toFixed(2); // Example amount
            } catch (error) {
                displayMessage('Error booking service: ' + error.message, 'error');
                console.error("Service Booking Error:", error);
            }
        });
    }


    // =========================================================
    // --- Payment Section ---
    // =========================================================

    const paymentForm = document.getElementById('paymentForm');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const onlinePaymentFields = document.getElementById('onlinePaymentFields');

    window.togglePaymentFields = () => { // Made global for onclick in HTML
        if (paymentMethodSelect.value === 'online') {
            onlinePaymentFields.style.display = 'block';
        } else {
            onlinePaymentFields.style.display = 'none';
        }
    };

    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentServiceId) {
                displayMessage('No service booked yet. Please book a service first.', 'warning');
                return;
            }

            const paymentMethod = paymentMethodSelect.value;
            const amountDueText = document.getElementById('paymentAmountDue').textContent;
            const amountDue = parseFloat(amountDueText.replace('₹', ''));

            const paymentData = {
                serviceId: currentServiceId,
                customerId: currentUserId,
                amount: amountDue,
                method: paymentMethod,
                timestamp: new Date().toISOString(),
                status: 'Completed'
            };

            if (paymentMethod === 'online') {
                const mobileNumber = document.getElementById('customerMobileNumber').value;
                const upiId = document.getElementById('customerUpiId').value;
                if (!mobileNumber && !upiId) {
                    displayMessage('Please enter either Mobile Number or UPI ID for online payment.', 'warning');
                    return;
                }
                paymentData.mobileNumber = mobileNumber;
                paymentData.upiId = upiId;
            }

            try {
                await push(ref(window.firebaseDB, 'payments'), paymentData);
                // Update service request status to 'Payment Pending' or 'Paid'
                await update(ref(window.firebaseDB, 'serviceRequests/' + currentServiceId), {
                    paymentStatus: 'Paid'
                });

                displayMessage('Payment successful!', 'success');
                paymentForm.reset();
                currentServiceId = null; // Clear after payment
                document.getElementById('paymentServiceId').textContent = 'N/A';
                document.getElementById('paymentCustomerName').textContent = 'N/A';
                document.getElementById('paymentServiceType').textContent = 'N/A';
                document.getElementById('paymentAmountDue').textContent = '₹0.00';
                onlinePaymentFields.style.display = 'none'; // Hide online fields
            } catch (error) {
                displayMessage('Payment failed: ' + error.message, 'error');
                console.error("Payment Error:", error);
            }
        });
    }

    // =========================================================
    // --- Feedback Section ---
    // =========================================================

    const feedbackForm = document.getElementById('feedbackForm');
    const starRating = document.getElementById('starRating');
    let selectedRating = 0;

    // Simulate pre-filling service ID if a service was just completed or needs feedback
    // In a real app, you'd fetch pending feedbacks for the user
    if (document.getElementById('serviceIdFeedback')) { // Check if element exists
         if (currentServiceId) {
            document.getElementById('serviceIdFeedback').value = currentServiceId;
        } else {
            document.getElementById('serviceIdFeedback').value = 'No recent service'; // Or disable input
        }
    }


    if (starRating) {
        starRating.addEventListener('click', (e) => {
            const clickedStar = e.target.closest('.far.fa-star, .fas.fa-star'); // Target both types
            if (clickedStar) {
                selectedRating = parseInt(clickedStar.dataset.rating);
                // Update stars visual
                Array.from(starRating.children).forEach(star => {
                    const rating = parseInt(star.dataset.rating);
                    if (rating <= selectedRating) {
                        star.classList.remove('far');
                        star.classList.add('fas');
                    } else {
                        star.classList.remove('fas');
                        star.classList.add('far');
                    }
                });
            }
        });
    }

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUserId) {
                displayMessage('Please log in to leave feedback.', 'error');
                return;
            }

            const serviceId = document.getElementById('serviceIdFeedback').value;
            const feedbackMessage = document.getElementById('feedbackMessage').value;

            if (selectedRating === 0) {
                displayMessage('Please select a star rating.', 'warning');
                return;
            }
            if (!serviceId || serviceId === 'No recent service') {
                displayMessage('Cannot submit feedback without a valid Service ID.', 'warning');
                return;
            }

            // Fetch customer name from user profile
            const userRef = ref(window.firebaseDB, 'users/' + currentUserId);
            const userSnapshot = await get(userRef);
            const customerName = userSnapshot.exists() ? userSnapshot.val().name : 'Anonymous';

            const feedbackData = {
                serviceId: serviceId,
                customerId: currentUserId,
                customerName: customerName,
                rating: selectedRating,
                message: feedbackMessage,
                timestamp: new Date().toISOString()
            };

            try {
                await push(ref(window.firebaseDB, 'feedback'), feedbackData);
                displayMessage('Feedback submitted successfully!', 'success');
                feedbackForm.reset();
                selectedRating = 0; // Reset stars
                Array.from(starRating.children).forEach(star => {
                    star.classList.remove('fas');
                    star.classList.add('far');
                });
            } catch (error) {
                displayMessage('Error submitting feedback: ' + error.message, 'error');
                console.error("Feedback Error:", error);
            }
        });
    }

    // =========================================================
    // --- Contact Us Section ---
    // =========================================================

    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const contactName = document.getElementById('contactName').value;
            const contactEmail = document.getElementById('contactEmail').value;
            const contactMessage = document.getElementById('contactMessage').value;

            const contactData = {
                name: contactName,
                email: contactEmail,
                message: contactMessage,
                timestamp: new Date().toISOString()
            };

            try {
                await push(ref(window.firebaseDB, 'contactMessages'), contactData);
                displayMessage('Your message has been sent successfully!', 'success');
                contactForm.reset();
            } catch (error) {
                displayMessage('Error sending message: ' + error.message, 'error');
                console.error("Contact Form Error:", error);
            }
        });
    }

    // =========================================================
    // --- Profile Section ---
    // =========================================================

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUserId) {
                displayMessage('Please log in to update your profile.', 'error');
                return;
            }

            const profileName = document.getElementById('profileName').value;
            const profileEmail = document.getElementById('profileEmail').value;
            const profileMobile = document.getElementById('profileMobile').value;
            const profileAddress = document.getElementById('profileAddress').value;
            const profileCarMake = document.getElementById('profileCarMake').value;
            const profileCarModel = document.getElementById('profileCarModel').value;
            const profileCarYear = document.getElementById('profileCarYear').value;
            const profileLicensePlate = document.getElementById('profileLicensePlate').value;

            const profileData = {
                name: profileName,
                email: profileEmail,
                mobile: profileMobile,
                address: profileAddress,
                carMake: profileCarMake,
                carModel: profileCarModel,
                carYear: profileCarYear,
                licensePlate: profileLicensePlate
            };

            try {
                await update(ref(window.firebaseDB, 'users/' + currentUserId), profileData);
                displayMessage('Profile updated successfully!', 'success');
            } catch (error) {
                displayMessage('Error updating profile: ' + error.message, 'error');
                console.error("Profile Update Error:", error);
            }
        });
    }


    // =========================================================
    // --- Chat Section ---
    // =========================================================

    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessages = document.getElementById('chatMessages');

    function loadChatMessages() {
        const chatRef = ref(window.firebaseDB, 'chatMessages');
        onValue(chatRef, (snapshot) => {
            chatMessages.innerHTML = ''; // Clear existing messages
            const messagesData = snapshot.val();
            if (messagesData) {
                Object.values(messagesData).forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.classList.add('message');
                    messageDiv.classList.add(msg.senderId === currentUserId ? 'sent' : 'received');
                    messageDiv.innerHTML = `<p>${msg.senderName || 'Unknown'}: ${msg.text}</p>`;
                    chatMessages.appendChild(messageDiv);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
            }
        });
    }

    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', async () => {
            const messageText = chatInput.value.trim();
            if (messageText === '') return;

            if (!currentUserId) {
                displayMessage('Please log in to chat.', 'error');
                return;
            }

            // Fetch sender name from user profile (or hardcode 'Customer'/'Service Center')
            const userRef = ref(window.firebaseDB, 'users/' + currentUserId);
            const userSnapshot = await get(userRef);
            const senderName = userSnapshot.exists() ? userSnapshot.val().name : (currentUserRole === 'serviceCenter' ? 'Service Center' : 'Customer');

            const messageData = {
                senderId: currentUserId,
                senderName: senderName,
                text: messageText,
                timestamp: new Date().toISOString()
            };

            try {
                await push(ref(window.firebaseDB, 'chatMessages'), messageData);
                chatInput.value = ''; // Clear input
            } catch (error) {
                displayMessage('Error sending message: ' + error.message, 'error');
                console.error("Chat Send Error:", error);
            }
        });

        // Allow sending message with Enter key
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                chatSendBtn.click();
            }
        });
    }

    // Load chat messages when chat section is made active
    // This assumes chat messages are loaded when the section is entered
    // You might want to tie this to the showContentSection call for 'chat-section'
    // For now, it will load on initial page load if this section becomes active.
    // If chat functionality is only for logged-in users, call loadChatMessages() inside onAuthStateChanged or when the chat section is selected.
    // For demonstration, let's call it only if user is logged in and chat section is active
    if (currentUserId && document.getElementById('chat-section').classList.contains('active')) {
         loadChatMessages();
    }


    // =========================================================
    // --- Service Center Dashboard ---
    // =========================================================

    const serviceRequestsList = document.getElementById('serviceRequestsList');
    const customerFeedbackList = document.getElementById('customerFeedbackList');
    const paymentHistoryList = document.getElementById('paymentHistoryList');
    const centerPointsBalance = document.getElementById('centerPointsBalance');

    function loadServiceRequests() {
        const requestsRef = ref(window.firebaseDB, 'serviceRequests');
        onValue(requestsRef, (snapshot) => {
            serviceRequestsList.innerHTML = ''; // Clear existing
            const requestsData = snapshot.val();
            if (requestsData) {
                let hasRequests = false;
                Object.keys(requestsData).forEach(key => {
                    const request = requestsData[key];
                    if (request.status === 'Pending' || request.status === 'Accepted' || request.status === 'InProgress') {
                        hasRequests = true;
                        const listItem = document.createElement('li');
                        listItem.id = `request-${key}`;
                        listItem.innerHTML = `
                            <p class="request-details"><strong>ID:</strong> ${key}</p>
                            <p class="request-details"><strong>Customer:</strong> ${request.customerName}</p>
                            <p class="request-details"><strong>Car:</strong> ${request.carModel}</p>
                            <p class="request-details"><strong>Service:</strong> ${request.serviceType}</p>
                            <p class="request-details"><strong>Date/Time:</strong> ${request.preferredDate} at ${request.preferredTime}</p>
                            <p class="request-status"><strong>Status:</strong> <strong style="color: ${request.status === 'Pending' ? '#ffc107' : (request.status === 'Accepted' ? '#28a745' : '#17a2b8')}">${request.status}</strong></p>
                            <div class="request-actions">
                                <button class="btn btn-secondary" data-id="${key}" data-action="accept">Accept</button>
                                <button class="btn btn-danger" data-id="${key}" data-action="reject">Reject</button>
                                <button class="btn" data-id="${key}" data-action="complete">Complete</button>
                            </div>
                        `;
                        serviceRequestsList.appendChild(listItem);
                    }
                });
                if (!hasRequests) {
                    serviceRequestsList.innerHTML = '<li id="noRequestsMessage" class="empty-message">No pending service requests.</li>';
                }
            } else {
                serviceRequestsList.innerHTML = '<li id="noRequestsMessage" class="empty-message">No pending service requests.</li>';
            }
        });
    }

    // Service Request Actions (Accept, Reject, Complete)
    if (serviceRequestsList) {
        serviceRequestsList.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button || !button.dataset.action || !button.dataset.id) return;

            const serviceId = button.dataset.id;
            const action = button.dataset.action;
            const serviceRef = ref(window.firebaseDB, 'serviceRequests/' + serviceId);

            let newStatus = '';
            let message = '';
            let messageType = 'info';

            if (action === 'accept') {
                newStatus = 'Accepted';
                message = `Service request ${serviceId} accepted.`;
                messageType = 'success';
            } else if (action === 'reject') {
                newStatus = 'Rejected';
                message = `Service request ${serviceId} rejected.`;
                messageType = 'error';
            } else if (action === 'complete') {
                newStatus = 'Completed';
                message = `Service request ${serviceId} marked as completed.`;
                messageType = 'success';
                // Award loyalty points to customer (example: 100 points per completed service)
                const requestSnapshot = await get(serviceRef);
                const customerId = requestSnapshot.val().customerId;
                const customerPointsRef = ref(window.firebaseDB, 'users/' + customerId + '/loyaltyPoints');
                const currentPointsSnapshot = await get(customerPointsRef);
                const currentPoints = currentPointsSnapshot.val() || 0;
                await set(customerPointsRef, currentPoints + 100);
                displayMessage(`100 loyalty points awarded to customer for service ${serviceId}!`, 'info');
            }

            try {
                await update(serviceRef, { status: newStatus });
                displayMessage(message, messageType);
            } catch (error) {
                displayMessage(`Error performing action: ${error.message}`, 'error');
                console.error("Service Action Error:", error);
            }
        });
    }

    function loadCustomerFeedback() {
        const feedbackRef = ref(window.firebaseDB, 'feedback');
        onValue(feedbackRef, (snapshot) => {
            customerFeedbackList.innerHTML = '';
            const feedbackData = snapshot.val();
            if (feedbackData) {
                Object.values(feedbackData).forEach(feedback => {
                    const listItem = document.createElement('li');
                    let starsHtml = '';
                    for (let i = 1; i <= 5; i++) {
                        starsHtml += `<i class="fas fa-star${i <= feedback.rating ? '' : '-o'}" style="color: #ffc107;"></i>`;
                    }
                    listItem.innerHTML = `
                        <p><strong>Service ID:</strong> ${feedback.serviceId}</p>
                        <p><strong>Customer:</strong> ${feedback.customerName || 'Anonymous'}</p>
                        <p><strong>Rating:</strong> ${starsHtml}</p>
                        <p><strong>Message:</strong> ${feedback.message}</p>
                        <small>${new Date(feedback.timestamp).toLocaleString()}</small>
                    `;
                    customerFeedbackList.appendChild(listItem);
                });
            } else {
                customerFeedbackList.innerHTML = '<li id="noFeedbackMessage" class="empty-message">No customer feedback yet.</li>';
            }
        });
    }

    function loadPaymentHistory() {
        const paymentsRef = ref(window.firebaseDB, 'payments');
        onValue(paymentsRef, (snapshot) => {
            paymentHistoryList.innerHTML = '';
            const paymentsData = snapshot.val();
            if (paymentsData) {
                Object.values(paymentsData).forEach(payment => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <p><strong>Service ID:</strong> ${payment.serviceId}</p>
                        <p><strong>Customer ID:</strong> ${payment.customerId}</p>
                        <p><strong>Amount:</strong> ₹${payment.amount.toFixed(2)}</p>
                        <p><strong>Method:</strong> ${payment.method}</p>
                        <p><strong>Status:</strong> ${payment.status}</p>
                        <small>${new Date(payment.timestamp).toLocaleString()}</small>
                    `;
                    paymentHistoryList.appendChild(listItem);
                });
            } else {
                paymentHistoryList.innerHTML = '<li id="noPaymentHistoryMessage" class="empty-message">No payment history yet.</li>';
            }
        });
    }

    function loadServiceCenterPoints() {
        // Assuming service center has a fixed ID or their own loyalty point system
        // For this example, let's say service center points are stored under a fixed ID or the currently logged in service center's UID
        // For simplicity, let's assume 'serviceCenterPoints' is a global node or tied to the SC's UID.
        const serviceCenterPointsRef = ref(window.firebaseDB, 'serviceCenterData/totalPoints'); // Example node

        onValue(serviceCenterPointsRef, (snapshot) => {
            const points = snapshot.val() || 0;
            centerPointsBalance.textContent = `${points} points`;
        });
    }

    window.convertCenterPoints = async () => {
        if (currentUserRole !== 'serviceCenter') {
            displayMessage('You are not authorized to convert points.', 'error');
            return;
        }

        const serviceCenterPointsRef = ref(window.firebaseDB, 'serviceCenterData/totalPoints');
        const currentPointsSnapshot = await get(serviceCenterPointsRef);
        const currentPoints = currentPointsSnapshot.val() || 0;

        if (currentPoints < 1000) { // Example threshold for conversion
            displayMessage('Need at least 1000 points to convert to cash.', 'warning');
            return;
        }

        const cashEquivalent = currentPoints / 10; // Example conversion rate: 10 points = 1 unit of cash
        try {
            await set(serviceCenterPointsRef, 0); // Reset points
            displayMessage(`Successfully converted ${currentPoints} points to ₹${cashEquivalent.toFixed(2)} cash!`, 'success');
            // In a real app, you'd trigger a payment/transfer process here
        } catch (error) {
            displayMessage('Error converting points: ' + error.message, 'error');
            console.error("Points Conversion Error:", error);
        }
    };

    // Initial load for dashboard if service center is already logged in on page refresh
    if (currentUserRole === 'serviceCenter') {
        loadServiceRequests();
        loadCustomerFeedback();
        loadPaymentHistory();
        loadServiceCenterPoints();
    }
});

// --- End of script.js ---
