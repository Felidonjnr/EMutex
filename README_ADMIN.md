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

## Deployment Checklist
- [ ] Firebase Auth Email/Password enabled.
- [ ] Admin user created in Firebase.
- [ ] `VITE_ADMIN_EMAILS` environment variable set.
- [ ] Firestore rules deployed.
