# 🔐 Google Cloud OAuth Setup Guide

This guide explains how to create and configure your own **Google Cloud OAuth 2.0 Client ID** to use with **Google Tasks Pro**, or for setting up private company workspaces.

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Step 1: Create a Google Cloud Project](#step-1-create-a-google-cloud-project)
3. [Step 2: Enable the Google Tasks API](#step-2-enable-the-google-tasks-api)
4. [Step 3: Configure the OAuth Consent Screen](#step-3-configure-the-oauth-consent-screen)
5. [Step 4: Create Desktop OAuth Client Credentials](#step-4-create-desktop-oauth-client-credentials)
6. [Step 5: Publish the App or Add Test Users](#step-5-publish-the-app-or-add-test-users)
7. [Step 6: Use Your Credentials in Google Tasks Pro](#step-6-use-your-credentials-in-google-tasks-pro)

---

## 💡 Overview

Google Tasks Pro uses official OAuth 2.0 to sync your tasks securely between your device and Google's servers. Your credentials and tokens are stored locally on your machine and are **never** shared with any third party.

---

## Step 1: Create a Google Cloud Project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.
3. In the top navigation bar, click the **Project Dropdown** and select **New Project**.
4. Enter a name (e.g., `Google Tasks Pro`) and click **Create**.
5. Once created, make sure the project is selected in the top bar.

---

## Step 2: Enable the Google Tasks API

1. In the search bar at the top, type **Google Tasks API** and press Enter.
2. Click on **Google Tasks API** from the Marketplace results.
3. Click the blue **ENABLE** button.

---

## Step 3: Configure the OAuth Consent Screen

1. In the left navigation menu, go to **APIs & Services** ➡️ **OAuth consent screen** (or **Google Auth Platform**).
2. Choose **External** for User Type (allows any personal Google account to sign in) and click **Create**.
3. Fill in the required fields:
   * **App name:** `Google Tasks Pro`
   * **User support email:** Select your email address.
   * **Developer contact email:** Enter your email address.
4. Click **SAVE AND CONTINUE**.
5. Under **Scopes**, click **ADD OR REMOVE SCOPES**:
   * Search for `tasks` and check:
     * `https://www.googleapis.com/auth/tasks`
   * Click **UPDATE**, then click **SAVE AND CONTINUE**.

---

## Step 4: Create Desktop OAuth Client Credentials

1. In the left menu, click **Clients** (or **Credentials**).
2. Click **+ CREATE CLIENT** (or **Create Credentials ➡️ OAuth client ID**).
3. For **Application type**, choose **Desktop app**.
4. Enter a name (e.g., `Desktop Client`).
5. Click **CREATE**.
6. A dialog will appear displaying:
   * **Your Client ID** (e.g. `xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com`)
   * **Your Client Secret** (e.g. `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`)
7. Copy both values.

---

## Step 5: Publish the App or Add Test Users

### Option A: Make it available for EVERYONE (Recommended)
1. In the left menu, go to **Audience** (or **OAuth consent screen**).
2. Under **Publishing status**, click **PUBLISH APP**.
3. Confirm the prompt to switch the status to **In Production**.
4. *Note:* Because the Tasks scope is sensitive, users will see a one-time safety prompt ("Google hasn't verified this app"). Users simply click **Advanced ➡️ Go to Google Tasks Pro (unsafe)** to sign in.

### Option B: Keep in Testing Mode (Private)
1. If you leave the status as **Testing**, only accounts explicitly listed under **Test users** can log in (up to 100 users).
2. Click **+ ADD USERS**, type the Gmail addresses, and save.

---

## Step 6: Use Your Credentials in Google Tasks Pro

### For Developers (Local Build):
Add your keys to the `.env` file in the project root:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### In the Desktop Application:
1. Open **Settings** (<kbd>Cmd</kbd> + <kbd>,</kbd> or gear icon).
2. Navigate to **General ➡️ Custom Google OAuth Credentials**.
3. Paste your **Client ID** and **Client Secret**.
4. Click **Save Changes**.
5. Sign in to your Google Account!
