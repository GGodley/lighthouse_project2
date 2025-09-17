// Wait for Firebase to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Firebase modules to load
    setTimeout(initializeApp, 1000);
});

function initializeApp() {
    // DOM Elements
    const signInBtn = document.getElementById('signInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
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

    // Sign in with Google function
    async function signInWithGoogle() {
        try {
            hideMessages();
            showLoading();

            // Create Google Auth Provider with Gmail scope
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

            // Sign in with popup
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log('User signed in:', user);

            // Get the OAuth credential
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (!credential) {
                throw new Error('No credential returned from Google');
            }

            // Extract the authorization code
            const authorizationCode = credential.serverAuthCode;
            if (!authorizationCode) {
                throw new Error('No authorization code received');
            }

            console.log('Authorization code received:', authorizationCode);

            // Call the processUserLogin Cloud Function
            const processUserLogin = httpsCallable(functions, 'processUserLogin');
            const loginResult = await processUserLogin({
                authorizationCode: authorizationCode,
                uid: user.uid
            });

            console.log('User login processed:', loginResult.data);

            showSuccess('Successfully signed in! Fetching your emails...');

            // Call getUserEmails to fetch and display emails
            await fetchAndDisplayEmails();

        } catch (error) {
            console.error('Sign in error:', error);
            hideLoading();
            
            let errorMsg = 'An error occurred during sign in.';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMsg = 'Sign in was cancelled.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMsg = 'Popup was blocked by browser. Please allow popups.';
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            showError(errorMsg);
        }
    }

    // Fetch and display emails
    async function fetchAndDisplayEmails() {
        try {
            const getUserEmails = httpsCallable(functions, 'getUserEmails');
            const result = await getUserEmails();
            const emails = result.data;

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
    signInBtn.addEventListener('click', signInWithGoogle);
    signOutBtn.addEventListener('click', signOutUser);

    // Authentication state listener
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user);
        
        if (user) {
            // User is signed in
            showSignedInState();
            hideMessages();
            
            // Try to fetch emails if user is already signed in
            try {
                showLoading();
                await fetchAndDisplayEmails();
            } catch (error) {
                console.error('Error fetching emails on auth state change:', error);
                hideLoading();
                showError('Failed to load emails. Please sign in again.');
            }
        } else {
            // User is signed out
            showSignedOutState();
        }
    });

    console.log('App initialized successfully');
}
