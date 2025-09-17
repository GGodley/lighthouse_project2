# Gmail Integration Setup Guide

This guide will help you set up the Gmail integration for your Firebase web application.

## 🚀 Quick Start

### 1. Enable Gmail API in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `project-lighthouse2-b2bed`
3. Navigate to **APIs & Services** → **Library**
4. Search for "Gmail API" and click on it
5. Click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in the required fields:
   - **App name**: Project Lighthouse
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - Click **Add or Remove Scopes**
   - Search for and add: `https://www.googleapis.com/auth/gmail.readonly`
5. Add test users (your email) if in testing mode
6. Save and continue through all steps

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Set the name: "Project Lighthouse Web Client"
5. Add **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   https://project-lighthouse2-b2bed.web.app
   https://project-lighthouse2-b2bed.firebaseapp.com
   ```
6. Add **Authorized redirect URIs**:
   ```
   https://project-lighthouse2-b2bed.firebaseapp.com/__/auth/handler
   ```
7. Click **Create**
8. **Copy the Client ID and Client Secret** - you'll need these for Cloud Functions

### 4. Configure Firebase Cloud Functions Secrets

1. Install Firebase CLI if not already installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Set the secrets for your Cloud Functions:
   ```bash
   firebase functions:secrets:set GOOGLE_CLIENT_ID
   # Enter your Google Client ID when prompted
   
   firebase functions:secrets:set GOOGLE_CLIENT_SECRET
   # Enter your Google Client Secret when prompted
   ```

### 5. Deploy Cloud Functions

1. Navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Deploy the functions:
   ```bash
   firebase deploy --only functions
   ```

### 6. Deploy the Web App

1. From the project root:
   ```bash
   firebase deploy --only hosting
   ```

## 🔧 Development Setup

### Local Development

1. Start the local development server:
   ```bash
   npm run dev
   ```

2. The app will be available at `http://localhost:3000`

### Testing the Integration

1. Open your app in the browser
2. Click "Sign in with Google"
3. Grant permission for Gmail access
4. Your 5 most recent emails should appear

## 📁 Project Structure

```
project-lighthouse/
├── public/
│   ├── index.html          # Main HTML with Tailwind CSS
│   └── app.js             # Client-side JavaScript
├── functions/
│   ├── index.js           # Cloud Functions for Gmail API
│   └── package.json       # Functions dependencies
├── firebase.json          # Firebase configuration
└── .firebaserc           # Firebase project settings
```

## 🔐 Security Features

- **OAuth 2.0 Flow**: Secure Google authentication
- **Gmail Read-Only Scope**: Only reads emails, cannot send or modify
- **Firestore Security Rules**: User data is protected
- **Token Storage**: OAuth tokens stored securely in Firestore
- **User Authentication**: All functions require user authentication

## 🛠️ Troubleshooting

### Common Issues

1. **"Popup blocked" error**:
   - Allow popups in your browser
   - Try using an incognito window

2. **"Invalid client" error**:
   - Check that your Client ID and Secret are correct
   - Verify the authorized origins and redirect URIs

3. **"Scope not authorized" error**:
   - Make sure Gmail API is enabled
   - Verify the OAuth consent screen has the Gmail scope

4. **"No emails found"**:
   - Check that the user has emails in their Gmail
   - Verify the Cloud Functions are deployed correctly

### Debug Mode

Enable debug logging by opening browser console and checking for error messages.

## 📊 API Limits

- **Gmail API**: 1 billion quota units per day
- **Firebase Functions**: 125,000 invocations per month (free tier)
- **Firestore**: 50,000 reads per day (free tier)

## 🔄 Data Flow

1. User clicks "Sign in with Google"
2. Google OAuth popup appears
3. User grants Gmail permission
4. Authorization code sent to `processUserLogin` function
5. Function exchanges code for access/refresh tokens
6. Function fetches recent emails from Gmail API
7. Emails stored in Firestore
8. `getUserEmails` function returns 5 most recent emails
9. Emails displayed in the UI

## 🚀 Next Steps

- Add email search functionality
- Implement email categories/folders
- Add email content preview
- Implement email archiving
- Add real-time email updates

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check Firebase Functions logs: `firebase functions:log`
3. Verify all configuration steps were completed
4. Ensure all secrets are properly set
