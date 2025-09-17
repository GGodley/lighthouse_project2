// Example Firestore operations for Project Lighthouse
// This file demonstrates how to interact with Firestore database

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebase-config.js';

// Example: Save user profile data
export async function saveUserProfile(userId, userData) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('User profile saved successfully');
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

// Example: Get user profile
export async function getUserProfile(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      console.log('No user profile found');
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

// Example: Save authorization token for user
export async function saveUserToken(userId, tokenData) {
  try {
    const tokenRef = doc(db, 'userTokens', userId);
    await setDoc(tokenRef, {
      ...tokenData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('User token saved successfully');
  } catch (error) {
    console.error('Error saving user token:', error);
    throw error;
  }
}

// Example: Get user authorization token
export async function getUserToken(userId) {
  try {
    const tokenRef = doc(db, 'userTokens', userId);
    const tokenSnap = await getDoc(tokenRef);
    
    if (tokenSnap.exists()) {
      return tokenSnap.data();
    } else {
      console.log('No user token found');
      return null;
    }
  } catch (error) {
    console.error('Error getting user token:', error);
    throw error;
  }
}

// Example: Update user profile
export async function updateUserProfile(userId, updateData) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    console.log('User profile updated successfully');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Example: Get all users (admin function)
export async function getAllUsers() {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

// Example: Delete user data
export async function deleteUserData(userId) {
  try {
    // Delete user profile
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    
    // Delete user tokens
    const tokenRef = doc(db, 'userTokens', userId);
    await deleteDoc(tokenRef);
    
    console.log('User data deleted successfully');
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
}

// Example: Search users by email
export async function searchUsersByEmail(email) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error searching users by email:', error);
    throw error;
  }
}
