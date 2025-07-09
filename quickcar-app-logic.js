// --- GLOBAL STATE ---
let lastServiceId, lastCustomerName, lastServiceType, lastServiceAmount;
let customerSelectedRating = 0;
let currentUserRole, currentUserName;
let userProfile = {};
let serviceCenterPayments = [], serviceCenterFeedbacks = [];

// --- DOM ELEMENTS ---
const serviceRequestsList = document.getElementById('serviceRequestsList');
const noRequestsMessage = document.getElementById('noRequestsMessage');
const customMessageBox = document.getElementById('customMessageBox');
const chatMessagesDiv = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

let messageTimeout;

// --- DISPLAY MESSAGE ---
function displayMessage(message, type = 'info', duration = 3000) {
    clearTimeout(messageTimeout);
    customMessageBox.innerHTML = message;
    customMessageBox.className = 'custom-message-box show';
    if (type) customMessageBox.classList.add(type);
    messageTimeout = setTimeout(() => {
        customMessageBox.classList.remove('show', type);
    }, duration);
}

// --- LOAD / SAVE PROFILE ---
function loadProfileData() {
    const profile = JSON.parse(localStorage.getItem('userProfile'));
    if (profile) {
        userProfile = profile;
        document.getElementById('profileName').value = profile.name || '';
        document.getElementById('profileEmail').value = profile.email || '';
        document.getElementById('profileMobile').value = profile.mobile || '';
        document.getElementById('profileAddress').value = profile.address || '';
        document.getElementById('profileCarMake').value = profile.carMake || '';
        document.getElementById('profileCarModel').value = profile.carModel || '';
        document.getElementById('profileCarYear').value = profile.carYear || '';
        document.getElementById('profileLicensePlate').value = profile.licensePlate || '';
    }
}

function saveProfileData() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
}

// --- UI NAVIGATION ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(screenId).style.display = 'block';
}

function showContentSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';
}

// --- CHAT SETUP ---
if (chatSendBtn) chatSendBtn.addEventListener('click', () => window.sendMessage());
if (chatInput) chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') window.sendMessage();
});

window.sendMessage = function () {
    const messageText = chatInput.value.trim();
    if (messageText === '') return;

    const sender = currentUserName;
    const role = currentUserRole;
    const messageData = {
        sender, message: messageText, timestamp: Date.now(), role
    };

    if (auth.currentUser && database) {
        const chatRef = ref(database, 'chat');
        push(chatRef, messageData);
        chatInput.value = '';
    } else {
        displayMessage("You must be logged in to send chat messages.", "warning");
    }
};

function setupFirebaseChatListener() {
    if (!database) return;
    const chatRef = ref(database, "chat");
    chatMessagesDiv.innerHTML = `<div class="message received"><p>Service Center: Hello! How can we help you today?</p></div>`;
    onChildAdded(chatRef, (snapshot) => {
        const messageData = snapshot.val();
        const messageElement = document.createElement("div");
        messageElement.classList.add("message");
        messageElement.classList.add(messageData.sender === currentUserName && messageData.role === currentUserRole ? "sent" : "received");
        messageElement.innerHTML = `<p><strong>${messageData.sender}:</strong> ${messageData.message}</p>`;
        chatMessagesDiv.appendChild(messageElement);
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
    });
}

// --- SERVICE DASHBOARD HANDLERS ---
function renderServiceRequests() {
    serviceRequestsList.innerHTML = '';
    if (noRequestsMessage) noRequestsMessage.style.display = 'block';

    if (!database) return;
    const requestsRef = ref(database, 'serviceRequests');
    onChildAdded(requestsRef, (snapshot) => {
        const requestData = snapshot.val();
        const requestKey = snapshot.key;

        const li = document.createElement('li');
        li.id = `request-${requestKey}`;
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
        if (noRequestsMessage) noRequestsMessage.style.display = 'none';
    });
}

window.acceptRequest = async function(requestKey, serviceId) {
    try {
        const requestRef = ref(database, `serviceRequests/${requestKey}/status`);
        await set(requestRef, 'Accepted');
        displayMessage(`Request ${serviceId} accepted!`, "success");
        document.getElementById(`status-${requestKey}`).textContent = 'Accepted';
        document.querySelector(`#request-${requestKey} .request-actions`).innerHTML = '';
    } catch (error) {
        console.error("Error accepting request:", error);
        displayMessage("Failed to accept request.", "error");
    }
};

window.rejectRequest = async function(requestKey, serviceId) {
    try {
        const requestRef = ref(database, `serviceRequests/${requestKey}/status`);
        await set(requestRef, 'Rejected');
        displayMessage(`Request ${serviceId} rejected!`, "info");
        document.getElementById(`status-${requestKey}`).textContent = 'Rejected';
        document.querySelector(`#request-${requestKey} .request-actions`).innerHTML = '';
    } catch (error) {
        console.error("Error rejecting request:", error);
        displayMessage("Failed to reject request.", "error");
    }
};

window.viewCustomerContact = function(name, contact, address) {
    const message = `<strong>Customer Name:</strong> ${name}<br><strong>Contact No:</strong> ${contact}<br><strong>Address:</strong> ${address}`;
    displayMessage(message, "info", 5000);
};

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    currentUserRole = localStorage.getItem('currentUserRole');
    currentUserName = localStorage.getItem('currentUserName');

    if (!auth.currentUser && !currentUserRole) {
        showScreen('language-selection-screen');
    } else {
        showScreen('app-container');
        if (currentUserRole === 'serviceCenter') {
            showContentSection('service-center-dashboard');
            renderServiceRequests();
            renderFeedbacks?.();
            renderPaymentHistory?.();
        } else {
            showContentSection('home-section');
        }
        setupFirebaseChatListener();
    }

    document.getElementById('serviceType')?.dispatchEvent(new Event('change'));
    if (currentUserRole === 'customer') loadProfileData();
});

// quickcar-app-logic.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-app.js";
import { getDatabase, ref, push, set, onChildAdded } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.20.0/firebase-auth.js";

// ✅ Your Firebase config (update this with your actual values)
const firebaseConfig = {
  apiKey: "AIzaSyDgGaOi-lNe9vNg72fNag1C6hioB2qqnMU",
  authDomain: "service-prepareing.firebaseapp.com",
  projectId: "service-prepareing",
  storageBucket: "service-prepareing.appspot.com",
  messagingSenderId: "295345065007",
  appId: "1:295345065007:web:0eb9463c2f0b73ff4b4ada",
  measurementId: "G-W68Y5N8TLD",
  databaseURL: "https://service-prepareing-default-rtdb.firebaseio.com" // add this if not present
};

// ✅ Initialize Firebase services
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// ✅ Make them available globally if needed
window.database = database;
window.auth = auth;
