// Import Firebase services
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase-config.js';

// DOM elements
const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signinFormElement = document.getElementById('signin-form-element');
const signupFormElement = document.getElementById('signup-form-element');
const showSignupLink = document.getElementById('show-signup');
const showSigninLink = document.getElementById('show-signin');
const signoutBtn = document.getElementById('signout-btn');
const userEmailSpan = document.getElementById('user-email');
const googleSigninBtn = document.getElementById('google-signin-btn');
const googleSignupBtn = document.getElementById('google-signup-btn');

// Form elements
const signinEmail = document.getElementById('signin-email');
const signinPassword = document.getElementById('signin-password');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupConfirmPassword = document.getElementById('signup-confirm-password');

// Utility functions
function showError(message, container = null) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  
  if (container) {
    container.insertBefore(errorDiv, container.firstChild);
  } else {
    // Show in auth container
    const authContainer = document.querySelector('.auth-container');
    authContainer.insertBefore(errorDiv, authContainer.firstChild);
  }
  
  // Remove error after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 5000);
}

function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  
  const authContainer = document.querySelector('.auth-container');
  authContainer.insertBefore(successDiv, authContainer.firstChild);
  
  // Remove success message after 3 seconds
  setTimeout(() => {
    if (successDiv.parentNode) {
      successDiv.parentNode.removeChild(successDiv);
    }
  }, 3000);
}

function clearMessages() {
  const messages = document.querySelectorAll('.error-message, .success-message');
  messages.forEach(msg => msg.remove());
}

// Authentication functions
async function signIn(email, password) {
  try {
    clearMessages();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in:', userCredential.user);
    showSuccess('Successfully signed in!');
  } catch (error) {
    console.error('Sign in error:', error);
    let errorMessage = 'An error occurred during sign in.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No user found with this email address.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      default:
        errorMessage = error.message;
    }
    
    showError(errorMessage);
  }
}

async function signUp(email, password) {
  try {
    clearMessages();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created:', userCredential.user);
    showSuccess('Account created successfully!');
  } catch (error) {
    console.error('Sign up error:', error);
    let errorMessage = 'An error occurred during sign up.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'An account with this email already exists.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password should be at least 6 characters.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password accounts are not enabled.';
        break;
      default:
        errorMessage = error.message;
    }
    
    showError(errorMessage);
  }
}

async function signInWithGoogle() {
  try {
    clearMessages();
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google sign in successful:', result.user);
    showSuccess('Successfully signed in with Google!');
  } catch (error) {
    console.error('Google sign in error:', error);
    let errorMessage = 'An error occurred during Google sign in.';
    
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        errorMessage = 'Sign in was cancelled.';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Popup was blocked by browser. Please allow popups.';
        break;
      case 'auth/cancelled-popup-request':
        errorMessage = 'Sign in was cancelled.';
        break;
      default:
        errorMessage = error.message;
    }
    
    showError(errorMessage);
  }
}

async function signOutUser() {
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign out error:', error);
    showError('Error signing out. Please try again.');
  }
}

// Form validation
function validateSignupForm() {
  const password = signupPassword.value;
  const confirmPassword = signupConfirmPassword.value;
  
  if (password !== confirmPassword) {
    showError('Passwords do not match.');
    return false;
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters long.');
    return false;
  }
  
  return true;
}

// Event listeners
signinFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signinEmail.value.trim();
  const password = signinPassword.value;
  
  if (!email || !password) {
    showError('Please fill in all fields.');
    return;
  }
  
  await signIn(email, password);
});

signupFormElement.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = signupEmail.value.trim();
  const password = signupPassword.value;
  const confirmPassword = signupConfirmPassword.value;
  
  if (!email || !password || !confirmPassword) {
    showError('Please fill in all fields.');
    return;
  }
  
  if (!validateSignupForm()) {
    return;
  }
  
  await signUp(email, password);
});

showSignupLink.addEventListener('click', (e) => {
  e.preventDefault();
  clearMessages();
  signinForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

showSigninLink.addEventListener('click', (e) => {
  e.preventDefault();
  clearMessages();
  signupForm.classList.add('hidden');
  signinForm.classList.remove('hidden');
});

signoutBtn.addEventListener('click', signOutUser);

googleSigninBtn.addEventListener('click', signInWithGoogle);
googleSignupBtn.addEventListener('click', signInWithGoogle);

// Authentication state observer
onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user);
  
  // Hide loading screen
  loadingScreen.classList.add('hidden');
  
  if (user) {
    // User is signed in
    userEmailSpan.textContent = user.email;
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
  } else {
    // User is signed out
    authScreen.classList.remove('hidden');
    mainApp.classList.add('hidden');
    
    // Clear forms
    signinFormElement.reset();
    signupFormElement.reset();
    clearMessages();
    
    // Show sign in form by default
    signinForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  }
});

// Initialize app
console.log('Project Lighthouse initialized');
