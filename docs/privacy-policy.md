# Privacy Policy for Google Tasks Desktop (Pro)

*Last updated: October 2026*

**Google Tasks Desktop** ("the App", "we", "our") is an open-source, desktop client built with Tauri and React to interact with your Google Tasks account.

We believe your privacy is fundamental. This policy explains how information is handled when you use the App.

---

## 1. Zero Data Collection
* **We do NOT operate any servers, analytics trackers, or databases.**
* None of your personal data, tasks, notes, lists, or authentication tokens are ever sent to us, stored on any third-party backend, or monetized in any way.
* All data flows directly and exclusively between your local device and the official **Google Tasks API** (`https://tasks.googleapis.com`).

---

## 2. Google OAuth & Account Permissions
* The App connects to your Google account using standard OAuth 2.0 authorization.
* The App requests access strictly to:
  * `https://www.googleapis.com/auth/tasks`: Required to read, create, update, and manage your tasks and task lists.
* **Storage of Tokens:** Your OAuth access and refresh tokens are stored securely in your local operating system storage (`localStorage` / local configuration directory). They never leave your device.
* You can revoke the App's access at any time through your [Google Account Permissions](https://myaccount.google.com/permissions).

---

## 3. Local-First Data Storage
* Any cached task snapshots, custom tags, recurring task rules, or Eisenhower Matrix assignments are saved strictly on your local machine using client-side storage (`localStorage` and Tauri local app data).
* If you clear your local application cache or uninstall the app, local cache files are removed.

---

## 4. Third-Party Services
* **Google APIs:** The App interacts with Google APIs. Your use of Google Tasks remains subject to the [Google Privacy Policy](https://policies.google.com/privacy).
* **Optional AI Copilot:** If you choose to configure an optional AI provider (e.g., Google Gemini, OpenAI, Ollama, LM Studio), prompts are transmitted directly using your personal API key to that provider or to your local machine (in the case of Ollama/LM Studio).

---

## 5. Security
Because the App runs as a desktop application locally on your machine:
* Communication with Google's servers occurs via encrypted HTTPS (TLS 1.2+).
* No intermediate proxy or relay is used.

---

## 6. Open Source
Google Tasks Desktop is fully open-source. You can inspect the source code, verify all network requests, and audit data handling directly in the project repository.

---

## 7. Contact
If you have any questions or feedback regarding this Privacy Policy, please open an issue on the GitHub repository.
