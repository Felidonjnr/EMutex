# EMutex Nig Website - Admin Setup

This website uses Firebase Authentication to protect the admin portal.

## Admin Access Setup

To use the admin portal at `/em-admin`, follow these steps:

### 1. Enable Email/Password Auth in Firebase
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. In the left sidebar, click **Authentication**.
4. Go to the **Sign-in method** tab.
5. Click **Email/Password** and toggle it to **Enabled**.
6. Click **Save**.

### 2. Create Admin Users
1. Still in the **Authentication** section, go to the **Users** tab.
2. Click **Add User**.
3. Enter an email and password for the admin.
4. Click **Add User**.

### 3. Add to Allowlist
1. Open your project settings in Google AI Studio or your environment variables.
2. Add the email you created to the `VITE_ADMIN_EMAILS` environment variable.
3. If there are multiple admins, separate their emails with commas (e.g., `admin1@example.com,admin2@example.com`).

## Technical Security Note

- The website currently uses a frontend allowlist for route protection.
- To ensure full security, Firestore and Storage rules should be updated to strictly allow write access only to authenticated users whose emails are in the system or have custom claims.
- For production, consider using [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims) to set an `admin: true` flag on user tokens.

## Security Setup

### 1. Environment Variables
- **Do not commit `.env` files** to your repository.
- Use `.env.example` as a template for required variables.
- locally, use `.env.local` for development and ensure it is listed in `.gitignore`.
- If an API key is accidentally exposed (e.g., GitHub alert), **rotate and restrict the key immediately** in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

### 2. Firebase Security
- **Restrict your Firebase API Key**: Go to Google Cloud Console > APIs & Services > Credentials. Find your key and restrict it by "Website restrictions" (adding your domain) and "API restrictions" (limiting to Firebase/Firestore/Auth APIs).
- **Authorized Domains**: In the Firebase Console, go to Authentication > Settings > Authorized domains and ensure only your production and development domains are listed.
- **Security Rules**: Ensure Firestore and Storage rules are deployed to protect your data.

## Vercel Deployment Instructions

When deploying to Vercel, you must configure the following Environment Variables in **Project Settings > Environment Variables**:

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. project-id.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. project-id.appspot.com |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Your Firebase App ID |
| `VITE_FIREBASE_DATABASE_ID` | The Firestore database ID (usually `(default)`) |
| `VITE_ADMIN_EMAILS` | Comma-separated list of admin emails |
| `VITE_WHATSAPP_NUMBER` | Your WhatsApp number in international format (e.g. 234...) |

### Important
After adding these variables, you must **redeploy** your project for the changes to take effect.

## Deployment Checklist
- [ ] Firebase Auth Email/Password enabled.
- [ ] Admin user created in Firebase.
- [ ] Environment variables configured in Vercel/Deployment platform.
- [ ] Firestore rules deployed.
- [ ] API Key restricted in Google Cloud Console.
