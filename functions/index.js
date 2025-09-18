const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const auth = getAuth();

// Secrets (configure via: firebase functions:secrets:set ...)
const GOOGLE_CLIENT_ID = defineSecret('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = defineSecret('GOOGLE_CLIENT_SECRET');

// Gmail API setup
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

/**
 * Process user login and exchange authorization code for tokens
 */
async function handleProcessUserLoginInternal({ uid, authorizationCode, accessToken }) {
    // Get Google OAuth credentials from bound secrets
    const clientId = GOOGLE_CLIENT_ID.value();
    const clientSecret = GOOGLE_CLIENT_SECRET.value();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://project-lighthouse2-b2bed.firebaseapp.com/__/auth/handler';

    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    let tokens = {};
    if (authorizationCode) {
        const exchange = await oauth2Client.getToken(authorizationCode);
        tokens = exchange.tokens || {};
    } else if (accessToken) {
        tokens.access_token = accessToken;
    } else {
        throw new HttpsError('invalid-argument', 'authorizationCode or accessToken is required');
    }

    // Store tokens (may be access-only if no refresh_token present)
    const tokensRef = db.collection('users').doc(uid).collection('private').doc('googleTokens');
    await tokensRef.set({
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || null,
        scope: tokens.scope || null,
        token_type: tokens.token_type || null,
        expiry_date: tokens.expiry_date || null,
        created_at: new Date(),
        updated_at: new Date()
    }, { merge: true });

    // Use credentials for Gmail calls
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const messagesResponse = await gmail.users.messages.list({ userId: 'me', maxResults: 10 });
    const messages = messagesResponse.data.messages || [];

    const emailPromises = messages.map(async (message) => {
        try {
            const messageResponse = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date']
            });
            const headers = messageResponse.data.payload.headers;
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();
            const snippet = messageResponse.data.snippet || 'No preview available';
            return { id: message.id, sender: from, subject, date, snippet, threadId: messageResponse.data.threadId };
        } catch (error) {
            return { id: message.id, sender: 'Error loading sender', subject: 'Error loading subject', date: new Date().toISOString(), snippet: 'Error loading preview', threadId: null };
        }
    });
    const emails = await Promise.all(emailPromises);
    const emailsRef = db.collection('users').doc(uid).collection('emails').doc('latest');
    await emailsRef.set({ emails, fetched_at: new Date(), count: emails.length });

    return { success: true, message: 'User login processed successfully', emailCount: emails.length };
}

exports.processUserLogin = onCall({ region: 'us-central1', secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] }, async (request) => {
    try {
        const { authorizationCode, accessToken, uid } = request.data;

        if (!authorizationCode || !uid) {
            throw new HttpsError('invalid-argument', 'Missing authorizationCode or uid');
        }

        // Verify the user is authenticated
        if (!request.auth || request.auth.uid !== uid) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        console.log(`Processing login for user: ${uid}`);

        if (!GOOGLE_CLIENT_ID.value() || !GOOGLE_CLIENT_SECRET.value()) {
            throw new HttpsError('internal', 'Google OAuth credentials not configured');
        }
        return await handleProcessUserLoginInternal({ uid, authorizationCode, accessToken });

    } catch (error) {
        console.error('Error in processUserLogin:', error);
        
        if (error instanceof HttpsError) {
            throw error;
        }
        
        throw new HttpsError('internal', `Failed to process user login: ${error.message}`);
    }
});


/**
 * Get user emails from Firestore
 */
exports.getUserEmails = onCall({ region: 'us-central1' }, async (request) => {
    try {
        // Verify the user is authenticated
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        console.log(`Getting emails for user: ${uid}`);

        // Get emails from Firestore
        const emailsRef = db.collection('users').doc(uid).collection('emails').doc('latest');
        const emailsDoc = await emailsRef.get();

        if (!emailsDoc.exists) {
            console.log('No emails found for user');
            return {
                success: true,
                emails: [],
                message: 'No emails found. Please sign in again to fetch emails.'
            };
        }

        const emailsData = emailsDoc.data();
        const emails = emailsData.emails || [];

        // Return only the 5 most recent emails
        const recentEmails = emails.slice(0, 5);

        console.log(`Returning ${recentEmails.length} recent emails`);

        return {
            success: true,
            emails: recentEmails,
            totalCount: emails.length,
            fetchedAt: emailsData.fetched_at
        };

    } catch (error) {
        console.error('Error in getUserEmails:', error);
        
        if (error instanceof HttpsError) {
            throw error;
        }
        
        throw new HttpsError('internal', `Failed to get user emails: ${error.message}`);
    }
});


/**
 * Refresh user tokens (optional helper function)
 */
exports.refreshUserTokens = onCall({ region: 'us-central1', secrets: [GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET] }, async (request) => {
    try {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const uid = request.auth.uid;
        console.log(`Refreshing tokens for user: ${uid}`);

        // Get stored tokens
        const tokensRef = db.collection('users').doc(uid).collection('private').doc('googleTokens');
        const tokensDoc = await tokensRef.get();

        if (!tokensDoc.exists) {
            throw new HttpsError('not-found', 'No tokens found for user');
        }

        const tokensData = tokensDoc.data();
        const refreshToken = tokensData.refresh_token;

        if (!refreshToken) {
            throw new HttpsError('invalid-argument', 'No refresh token available');
        }

        // Create OAuth2 client
        const clientId = GOOGLE_CLIENT_ID.value();
        const clientSecret = GOOGLE_CLIENT_SECRET.value();
        const oauth2Client = new OAuth2Client(clientId, clientSecret);

        // Refresh the access token
        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('Tokens refreshed successfully');

        // Update stored tokens
        await tokensRef.update({
            access_token: credentials.access_token,
            expiry_date: credentials.expiry_date,
            updated_at: new Date()
        });

        return {
            success: true,
            message: 'Tokens refreshed successfully'
        };

    } catch (error) {
        console.error('Error in refreshUserTokens:', error);
        
        if (error instanceof HttpsError) {
            throw error;
        }
        
        throw new HttpsError('internal', `Failed to refresh tokens: ${error.message}`);
    }
});
