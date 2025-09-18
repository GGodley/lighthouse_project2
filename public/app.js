// Wait for Firebase to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Firebase modules to load
    setTimeout(initializeApp, 1000);
});

function initializeApp() {
    // DOM Elements
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const readInboxBtn = document.getElementById('readInboxBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emailList = document.getElementById('emailList');
    const signInSection = document.getElementById('signInSection');
    const signOutSection = document.getElementById('signOutSection');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    const successText = document.getElementById('successText');

    // Firebase services
    const auth = window.auth;
    const functions = window.functions;
    const GoogleAuthProvider = window.GoogleAuthProvider;
    const signInWithPopup = window.signInWithPopup;
    const signOut = window.signOut;
    const onAuthStateChanged = window.onAuthStateChanged;
    const httpsCallable = window.httpsCallable;
    let didProcessLogin = false;

    // Checklist helpers
    function markStep(stepId) {
        const li = document.getElementById(stepId);
        if (!li) return;
        const check = li.querySelector('[data-check]');
        if (check) check.classList.remove('hidden');
    }

    // Utility functions
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
    }

    function showSuccess(message) {
        successText.textContent = message;
        successMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }

    function hideMessages() {
        errorMessage.classList.add('hidden');
        successMessage.classList.add('hidden');
    }

    function showLoading() {
        loadingSpinner.classList.remove('hidden');
        signInBtn.disabled = true;
        signInBtn.textContent = 'Signing in...';
    }

    function hideLoading() {
        loadingSpinner.classList.add('hidden');
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign in with Google';
    }

    function showSignedInState() {
        signInSection.classList.add('hidden');
        signOutSection.classList.remove('hidden');
    }

    function showSignedOutState() {
        signInSection.classList.remove('hidden');
        signOutSection.classList.add('hidden');
        emailList.innerHTML = '';
        hideMessages();
    }

    // This function should be called when the user clicks the sign-in button
    async function signInAndProcess() {
        try {
            hideMessages();
            showLoading();

            // Step 1: Sign in to Firebase first. This gets the user authenticated in our app.
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log('Step 1: Firebase sign-in successful for user:', user.uid);
            markStep('step-auth');

            // Step 2: Now, use the GSI library to get the server-side authorization code.
            const client = google.accounts.oauth2.initCodeClient({
                client_id: '468882037432-b4bhc6niptt3f2899oq18t7lodvj9sqf.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/gmail.readonly',
                callback: async (response) => {
                    try {
                        const code = response?.code;
                        if (!code) throw new Error('Failed to get authorization code from Google.');
                        console.log('Step 2: GSI authorization code received.');
                        markStep('step-gsi');

                        // Step 3: Call your backend function with the code.
                        const processUserLogin = httpsCallable(functions, 'processUserLogin');
                        console.log('Step 3: Calling backend to process tokens...');
                        await processUserLogin({ authorizationCode: code, uid: user.uid });
                        didProcessLogin = true;
                        console.log('Step 4: Backend processing complete.');
                        markStep('step-backend');

                        // Step 5: Fetch and display emails.
                        await fetchAndDisplayEmails();
                        markStep('step-firestore');
                        markStep('step-display');
                    } catch (err) {
                        console.error('Error in GSI callback:', err);
                        showError('Failed to complete Google sign-in.');
                    } finally {
                        hideLoading();
                    }
                },
            });

            // Trigger the GSI code request. Because the user just signed in,
            // this will usually happen silently without a second popup.
            client.requestCode();
        } catch (error) {
            console.error('The sign-in process failed:', error);
            hideLoading();
            showError('The sign-in process failed. Please try again.');
        }
    }

    // Fetch and display emails
    async function fetchAndDisplayEmails() {
        try {
            const getUserEmails = httpsCallable(functions, 'getUserEmails');
            const result = await getUserEmails();
            const emails = (result?.data?.emails) || [];

            console.log('Emails received:', emails);

            hideLoading();
            displayEmails(emails);
            showSuccess(`Successfully loaded ${emails.length} emails!`);

        } catch (error) {
            console.error('Error fetching emails:', error);
            hideLoading();
            showError('Failed to fetch emails. Please try again.');
        }
    }

    // Display emails in the UI
    function displayEmails(emails) {
        if (!emails || emails.length === 0) {
            emailList.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500 text-lg">No emails found.</p>
                </div>
            `;
            return;
        }

        const emailsHTML = emails.map(email => `
            <div class="email-card bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-800 mb-1">
                            ${escapeHtml(email.subject || 'No Subject')}
                        </h3>
                        <p class="text-sm text-gray-600 mb-2">
                            <span class="font-medium">From:</span> ${escapeHtml(email.sender || 'Unknown Sender')}
                        </p>
                    </div>
                    <div class="text-xs text-gray-400 ml-4">
                        ${formatDate(email.date)}
                    </div>
                </div>
                <div class="text-gray-700 text-sm leading-relaxed">
                    ${escapeHtml(email.snippet || 'No preview available')}
                </div>
            </div>
        `).join('');

        emailList.innerHTML = emailsHTML;
    }

    // Utility function to escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Utility function to format date
    function formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch (error) {
            return dateString;
        }
    }

    // Sign out function
    async function signOutUser() {
        try {
            await signOut(auth);
            console.log('User signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            showError('Error signing out. Please try again.');
        }
    }

    // Event listeners
    signInBtn.addEventListener('click', signInAndProcess);
    if (readInboxBtn) {
        readInboxBtn.addEventListener('click', signInAndProcess);
    }
    signOutBtn.addEventListener('click', signOutUser);

    // Authentication state listener
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user);
        
        if (user) {
            // User is signed in
            showSignedInState();
            if (readInboxBtn) readInboxBtn.disabled = false;
            markStep('step-auth');
            hideMessages();
            
            // Only auto-fetch if we've already processed login for Gmail tokens
            if (didProcessLogin) {
                try {
                    showLoading();
                    await fetchAndDisplayEmails();
                } catch (error) {
                    console.error('Error fetching emails on auth state change:', error);
                    hideLoading();
                    showError('Failed to load emails. Please sign in again.');
                }
            }
        } else {
            // User is signed out
            showSignedOutState();
            if (readInboxBtn) readInboxBtn.disabled = true;
        }
    });

    console.log('App initialized successfully');
}
