# Firebase Admin Setup Instructions

To use the backend API, you need to provide a Firebase Service Account key.

1. Go to your Firebase Console.
2. Navigate to **Project Settings** > **Service Accounts**.
3. Click **Generate New Private Key**.
4. Save the downloaded JSON file as `serviceAccountKey.json` inside the `backend/` directory.

> [!WARNING]
> Keep this file secure and NEVER commit it to a public repository. I have added it to `.gitignore` for you.
