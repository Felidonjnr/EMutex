import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration from environment variables
// You can find these in your Firebase Console: Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if we have at least an API key to attempt initialization
const hasConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined' && firebaseConfig.apiKey !== '';

// Initialize Firebase
let app;
try {
  if (hasConfig) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    console.log('🚀 Firebase initialized successfully with project:', firebaseConfig.projectId);
  } else {
    console.warn('⚠️ Firebase Configuration Missing!');
    console.info('Please add your Firebase keys to the AI Studio Settings (gear icon) with the VITE_ prefix:');
    console.info('- VITE_FIREBASE_API_KEY\n- VITE_FIREBASE_PROJECT_ID\n- etc.');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

// Initialize services
// Database ID for Firestore (specifically for AI Studio/Enterprise setups)
let dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)';

// Safety check: If the user accidentally provided a Realtime DB or other URL as the database ID
if (dbId && dbId.toString().startsWith('http')) {
  console.warn('VITE_FIREBASE_DATABASE_ID appears to be a URL. Falling back to (default).');
  console.warn('NOTE: A Firestore Database ID is a simple name (e.g. "(default)" or "my-db"), not a URL starting with https://.');
  dbId = '(default)';
}

console.log('Firebase Target Project ID:', firebaseConfig.projectId);
console.log('Firebase Target Database ID:', dbId);

export const db = app ? getFirestore(app, (dbId === '(default)' || !dbId) ? undefined : dbId) : null as any;
export const auth = app ? getAuth(app) : null as any;
export const storage = app ? getStorage(app) : null as any;

async function testConnection() {
  if (!db) return;
  try {
    // Try to reach the backend by performing a simple getDoc
    // We use settings/site as a likely path which is allowed for public read
    const testDoc = doc(db, 'settings', 'site');
    await getDocFromServer(testDoc);
    console.log('✅ Firestore connection reachability test successful');
  } catch (error: any) {
    console.group('❌ Firestore Connection Error Details');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.info('Checklist:');
    console.info('1. Project ID: Is "' + firebaseConfig.projectId + '" correct? Check Project Settings in Firebase Console.');
    console.info('2. Firestore Enabled: Go to Build > Firestore Database in the Firebase Console and ensure it is created.');
    console.info('3. Database ID: Is "' + dbId + '" correct? Most projects use "(default)", but AI Studio Enterprise projects often use a custom ID.');
    console.info('4. Environment Variables: Ensure all VITE_FIREBASE_* variables are set in the AI Studio Settings menu.');
    console.groupEnd();
  }
}

// Call test connection to verify state
if (app) {
  testConnection();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
