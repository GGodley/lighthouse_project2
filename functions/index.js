const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();
const auth = getAuth();

// Gmail API setup
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

/**
 * Process user login and exchange authorization code for tokens
 */
exports.processUserLogin = onCall(async (request) => {
    try {
        const { authorizationCode, uid } = request.data;

        if (!authorizationCode || !uid) {
            throw new HttpsError('invalid-argument', 'Missing authorizationCode or uid');
        }

        // Verify the user is authenticated
        if (!request.auth || request.auth.uid !== uid) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        console.log(`Processing login for user: ${uid}`);

        // Get Google OAuth credentials from environment
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://project-lighthouse2-b2bed.firebaseapp.com/__/auth/handler';

        if (!clientId || !clientSecret) {
            throw new HttpsError('internal', 'Google OAuth credentials not configured');
        }

        // Create OAuth2 client
        const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

        // Exchange authorization code for tokens
        const { tokens } = await oauth2Client.getToken(authorizationCode);
        console.log('Tokens received:', { access_token: tokens.access_token ? 'present' : 'missing', refresh_token: tokens.refresh_token ? 'present' : 'missing' });

        // Store tokens securely in Firestore
        const tokensRef = db.collection('users').doc(uid).collection('private').doc('googleTokens');
        await tokensRef.set({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            scope: tokens.scope,
            token_type: tokens.token_type,
            expiry_date: tokens.expiry_date,
            created_at: new Date(),
            updated_at: new Date()
        });

        console.log('Tokens stored successfully');

        // Set credentials and fetch emails
        oauth2Client.setCredentials(tokens);

        // Create Gmail API client
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Fetch recent message IDs
        const messagesResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 10
        });

        const messages = messagesResponse.data.messages || [];
        console.log(`Found ${messages.length} messages`);

        // Fetch detailed information for each message
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

                return {
                    id: message.id,
                    sender: from,
                    subject: subject,
                    date: date,
                    snippet: snippet,
                    threadId: messageResponse.data.threadId
                };
            } catch (error) {
                console.error(`Error fetching message ${message.id}:`, error);
                return {
                    id: message.id,
                    sender: 'Error loading sender',
                    subject: 'Error loading subject',
                    date: new Date().toISOString(),
                    snippet: 'Error loading preview',
                    threadId: null
                };
            }
        });

        const emails = await Promise.all(emailPromises);
        console.log(`Successfully processed ${emails.length} emails`);

        // Store emails in Firestore
        const emailsRef = db.collection('users').doc(uid).collection('emails').doc('latest');
        await emailsRef.set({
            emails: emails,
            fetched_at: new Date(),
            count: emails.length
        });

        console.log('Emails stored successfully');

        return {
            success: true,
            message: 'User login processed successfully',
            emailCount: emails.length
        };

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
exports.getUserEmails = onCall(async (request) => {
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
exports.refreshUserTokens = onCall(async (request) => {
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
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
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
