import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
let app;
try {
  // Use config from JSON file
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  console.log('Firebase initialized with project:', firebaseConfig.projectId);
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

// Initialize services
// Prefer internal config ID if available
const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

console.log('Using Firestore Database ID:', dbId);

export const db = app ? getFirestore(app, (dbId === '(default)' || !dbId) ? undefined : dbId) : null as any;
export const auth = app ? getAuth(app) : null as any;
export const storage = app ? getStorage(app) : null as any;

async function testConnection() {
  if (!db) return;
  try {
    // Try to read a path that is allowed in rules (e.g., settings/site)
    const testDoc = doc(db, 'settings', 'site');
    await getDocFromServer(testDoc);
    console.log('Firebase connection test successful');
  } catch (error: any) {
    console.error('Firebase connection test failed:', error.code, error.message);
    if (error.code === 'permission-denied') {
      console.warn("Connection test got permission denied. This is expected if 'settings/site' is not yet created, but server was reached.");
    } else if (error.message.includes('the client is offline') || error.message.includes('failed-precondition')) {
      console.warn("Firestore reports offline. This could be a configuration issue or the database instance is still being provisioned.");
    }
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
