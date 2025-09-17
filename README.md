# Project Lighthouse

A modern Firebase-powered web application with Gmail integration, authentication, and Firestore database.

## Features

- 🔐 Firebase Authentication (Email/Password + Google Sign-in)
- 📧 Gmail Integration (Read recent emails)
- 🗄️ Firestore Database integration
- ☁️ Firebase Cloud Functions (2nd Gen)
- 🎨 Modern, responsive UI with Tailwind CSS
- 📱 Mobile-friendly interface
- ⚡ Fast and lightweight

## Prerequisites

- Node.js (v14 or higher)
- A Firebase project

## Setup Instructions

### 1. Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
4. Enable Firestore Database:
   - Go to Firestore Database
   - Create database in production mode (or test mode for development)
5. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Click on the web app icon (`</>`) to add a web app
   - Copy the Firebase configuration object

### 2. Configure the App

1. Open `firebase-config.js`
2. Replace the placeholder configuration with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id" // Optional
};
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

#### Development Mode (with live reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The app will open in your browser at `http://localhost:3000`

## Project Structure

```
project-lighthouse/
├── public/
│   ├── index.html          # Main HTML with Tailwind CSS
│   └── app.js             # Client-side JavaScript with Gmail integration
├── functions/
│   ├── index.js           # Cloud Functions for Gmail API
│   └── package.json       # Functions dependencies
├── firebase.json          # Firebase configuration
├── .firebaserc           # Firebase project settings
├── GMAIL_SETUP.md        # Detailed Gmail setup guide
└── README.md             # This file
```

## Usage

### Basic Authentication
1. **Sign Up**: Create a new account with email and password
2. **Sign In**: Use your credentials to access the app
3. **Google Sign-in**: Click "Sign in with Google" for OAuth authentication
4. **Dashboard**: Once authenticated, you'll see the main app interface
5. **Sign Out**: Click the sign out button to log out

### Gmail Integration
1. **Enable Gmail API**: Follow the setup guide in `GMAIL_SETUP.md`
2. **Sign in with Google**: Grant Gmail read permissions
3. **View Emails**: Your 5 most recent emails will be displayed
4. **Real-time Updates**: Emails are fetched and cached in Firestore

## Firebase Services Used

- **Authentication**: User sign up, sign in, and sign out
- **Firestore**: Database for storing user data (ready for use)

## Customization

### Adding New Features

1. **Database Operations**: Use the exported `db` from `firebase-config.js` to interact with Firestore
2. **Additional Auth Methods**: Add Google, Facebook, or other providers in Firebase Console
3. **UI Components**: Modify `styles.css` and `index.html` to customize the interface

### Example Firestore Usage

```javascript
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase-config.js';

// Add a document
const docRef = await addDoc(collection(db, "users"), {
  name: "John Doe",
  email: "john@example.com"
});

// Get documents
const querySnapshot = await getDocs(collection(db, "users"));
querySnapshot.forEach((doc) => {
  console.log(doc.id, " => ", doc.data());
});
```

## Security Rules

Make sure to configure proper Firestore security rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Firebase config not working**: Make sure you've replaced the placeholder values with your actual Firebase configuration
2. **Authentication not working**: Ensure Email/Password is enabled in Firebase Console
3. **CORS errors**: Make sure you're running the app through a local server (not opening the HTML file directly)

### Getting Help

- Check the browser console for error messages
- Verify your Firebase configuration
- Ensure all Firebase services are properly enabled

## License

MIT License - feel free to use this project as a starting point for your own applications.
