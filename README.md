# GAS Script Generator

A modern web application inspired by `zed.dev` for generating Google Apps Script (GAS) code to automate seminar registration and payment verification via SMS backups.

## Features
- **Real-time Generation**: See your script update as you change configurations.
- **SMS Verification**: Built-in logic for parsing SMS XML backups (bKash format).
- **Automated Emails**: Sends "Registration Received" and "Payment Confirmed" emails.
- **Fuzzy Matching**: Intelligent column and response matching for Google Forms.
- **Customizable**: Editable event details, sheet names, regex patterns, and email templates.

## How to use
1. Fill in the configuration in the sidebar.
2. Adjust the SMS regex if your SMS format differs.
3. Customize the email templates using HTML.
4. Copy the generated code or download `Code.gs`.
5. Paste the code into your Google Apps Script editor.
6. Run `setupTriggers()` in the GAS editor to initialize.

## Tech Stack
- React + TypeScript
- Vite
- Lucide React (Icons)
- Zed.dev inspired CSS

## Development
```bash
npm install
npm run dev
```
