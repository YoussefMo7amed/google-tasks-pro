# Privacy Policy for G Tasks Desktop (Google Tasks Pro)

*Last updated: October 21, 2026*

**G Tasks Desktop** ("the Application", "Software", "we", "us", or "our") is an independent, open-source desktop client designed for Google Tasks.

This Privacy Policy explains how information is handled when you use the Application. We take your privacy with the utmost seriousness. The Application is architected on a **local-only, zero-knowledge** foundation.

---

## 1. Compliance with Google API Services User Data Policy
G Tasks Desktop's use and transfer to any other app of information received from Google APIs will adhere to the **[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)**, including the **Limited Use** requirements:

* **Limited Use Disclosure:** We do not use Google user data for serving advertisements, training generalized artificial intelligence/machine learning models, selling to data brokers, or any purpose other than providing and improving user-facing task management features in accordance with your explicit actions.
* **Direct Communication Only:** All API requests regarding your Google Tasks data (creating, reading, updating, or deleting tasks and lists) are sent directly from your personal device to Google's official API servers (`https://tasks.googleapis.com`) using TLS encryption (HTTPS).

---

## 2. Zero Personal Data Collection & No External Servers
* **No Developer Servers:** We do **NOT** operate, host, or maintain any backend servers, databases, or intermediary relays.
* **No Telemetry or Tracking:** We do **NOT** collect, track, log, or transmit any analytics, crash reports, unique device identifiers, user IDs, or behavioral analytics.
* **No Data Sharing or Sale:** We never sell, rent, monetize, share, or disclose any of your tasks, notes, account credentials, or tokens to any third party.

---

## 3. How Google Account Information & Tokens Are Handled
* **OAuth 2.0 Authorization:** The Application utilizes industry-standard OAuth 2.0 protocol. You sign in directly through Google's official authentication page.
* **Requested Scopes:**
  * `https://www.googleapis.com/auth/tasks`: Solely used to fetch and update your tasks, task lists, due dates, and completion status.
* **Local-Only Storage:** OAuth authentication tokens (access tokens and refresh tokens) are saved exclusively on your local computer's secure storage (`localStorage` and application storage managed by your OS). Tokens never leave your local device.
* **Revocation:** You have full control and can revoke access to this Application at any time through your [Google Account Security Settings](https://myaccount.google.com/permissions).

---

## 4. Local-First Caching & Custom Features
* **Local Offline Storage:** Features such as local task snapshots (for instant offline startup), custom task tags, recurring task rules, and Eisenhower Matrix quadrant assignments are stored strictly locally on your machine.
* **Optional AI Copilot:** If you choose to configure third-party AI models (e.g., Google Gemini, OpenAI, or local engines like Ollama/LM Studio), requests are initiated directly from your device using your personal API key or to your local machine (`localhost`). No data passes through any intermediary server.

---

## 5. Security of Your Information
Because G Tasks Desktop runs natively on your machine, your data is as secure as your personal operating system and computer:
* Communication with Google is secured using end-to-end encrypted HTTPS.
* No proxy, server, or intermediary entity can access or intercept your credentials.

---

## 6. Children's Privacy
The Application does not knowingly collect or solicit any personal information from children under the age of 13. Because no information is collected or transmitted to any server, the Application is safe for general use.

---

## 7. Changes to This Privacy Policy
We may update this Privacy Policy periodically to reflect enhancements or legal requirements. Any modifications will be posted to this repository with an updated revision date.

---

## 8. Contact Information
If you have questions, concerns, or requests regarding this Privacy Policy, please open an issue on the official GitHub repository:
- **Repository:** [https://github.com/YoussefMo7amed/google-tasks-pro](https://github.com/YoussefMo7amed/google-tasks-pro)
- **Developer Contact:** youssef.mo7amed@protonmail.com
