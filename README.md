# Arabellix Time

**Time Writing and Reporting Using Google Calendar**

Arabellix Time is an open-source project designed to simplify time writing and reporting through seamless integration with Google Calendar. This project leverages Google Workspace Add-ons, Apps Script, and `clasp` for development and deployment.

---

## Features

- Effortless time logging and reporting using Google Calendar events.
- Centralized data management for efficient reporting.
- Extensible and customizable for various organizational needs.
- Developed with modern tools like `clasp` and Google Apps Script.

---

## Prerequisites

To get started, ensure you have the following:

1. A Google Workspace account with access to Google Calendar.
2. Node.js installed on your system.
3. `clasp` (Command Line Apps Script) installed globally:
   ```bash
   npm install -g @google/clasp
   ```
4. Access to Google Cloud Platform (GCP) to configure OAuth and APIs.

---

## Getting Started

### 1. Set Up Your Environment

1. Install `clasp` by running:
   ```bash
   npm install -g @google/clasp
   ```

2. Authenticate with `clasp`:
   - Open a terminal and run:
     ```bash
     clasp login
     ```
   - Copy the URL displayed in the terminal and open it in your browser.
   - Authenticate with your Google account (an error message will appear after successful authentication).
   - Return to the terminal, copy the URL from the error message, and authenticate via curl:
     ```bash
     curl [paste the URL here]
     ```
   - You are now authenticated with `clasp`.

### 2. Create a Google Apps Script Project

1. Create a new Apps Script project using `clasp`:
   ```bash
   clasp create --title "Arabellix Time" --type standalone
   ```

2. Link the Apps Script project to a Google Cloud Platform (GCP) project:
   - Open the [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new GCP project.
   - Navigate to **APIs & Services > OAuth consent screen**, configure the consent screen, and set up your application.
   - Link the Apps Script project to the GCP project:
     ```bash
     clasp open
     ```
     - In the Apps Script editor, open **Resources > Cloud Platform Project > Change Project** and enter your GCP project ID.

3. Enable the necessary APIs:
   - **Google Workspace Marketplace SDK**
   - **Google Calendar API**

### 3. Deploy the Add-on

1. Deploy your add-on:
   - In the Apps Script editor, navigate to **Extensions > Apps Script Deployment**.
   - Select **New Deployment**, configure the deployment settings, and deploy your add-on.

2. Enable the add-on for testing:
   - Follow the guide from Google on [Testing Workspace Add-ons](https://developers.google.com/workspace/add-ons/how-tos/testing-workspace-addons).

---

## Development Workflow

1. Pull the latest code from the repository:
   ```bash
   clasp pull
   ```

2. Make changes locally and push updates:
   ```bash
   clasp push
   ```

3. Test your changes directly in Google Workspace.

---

## Contribution Guidelines

We welcome contributions! To contribute:

1. Fork the repository and create a new branch for your changes.
2. Make your changes and test thoroughly.
3. Submit a pull request with a detailed explanation of your changes.

---

## License

Arabellix Time is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more details.

---

## Support

For issues or feature requests, please open an issue in the [GitHub repository](https://github.com/your-repo/arabelix-time).

