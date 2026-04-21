# WARSG (Web-based Automatic Response System Generator)

WARSG is a professional-grade Google Apps Script generator designed to automate the lifecycle of seminar registration and payment verification. Inspired by [PARS](https://github.com/Jawad-Nahin/PARS) (originally developed by [Jawad Nahin](https://github.com/Jawad-Nahin) and [Muhammad Abdullah](https://github.com/muhammadabdullah007git)), it bridges the gap between Google Forms, SMS-based mobile payments (specifically bKash), and automated email communication, allowing for a fully hands-off registration system.

## System Architecture

The WARSG workflow follows a structured automation path:
1. **Data Collection**: A Google Form collects participant details and their transaction ID (TrxID).
2. **Verification Source**: An "SMS Backup & Restore" XML file is uploaded to a specific Google Drive folder.
3. **Synchronization**: The generated script runs on a time-based trigger to parse the XML file and update a local "SMS Dump" sheet.
4. **Matching Engine**: The script utilizes fuzzy matching to link form responses with verified SMS transactions based on the TrxID.
5. **Confirmation**: Upon a successful match, a "Payment Confirmed" email is sent using the user-defined HTML template.

## Technical Specifications

### Core Engine
- **Fuzzy Matching**: Implements a two-stage matching algorithm. It first attempts exact header matching, then falls back to partial string matching with built-in safeguards to prevent cross-contamination (e.g., distinguishing between "Student ID" and "Transaction ID").
- **Regex Parsing**: Utilizes customizable regular expressions to extract TrxID and Amount from various SMS formats. Default patterns are optimized for bKash.
- **Time-Based Triggers**: Implements the Google Apps Script Trigger Service to handle periodic synchronization. The generator automatically adjusts between `everyMinutes()` and `everyHours()` to comply with Google's API limitations.

### Frontend Application
- **Environment**: Built with React 18 and TypeScript for type-safe development.
- **UI Architecture**: A single-page application with a zed-inspired high-fidelity interface, utilizing PrismJS for real-time syntax highlighting of the generated script.
- **Sandboxing**: Employs an isolated `iframe` with a CSS reset to provide a true-to-life preview of HTML mail templates without style leakage from the main application.

## Detailed Configuration Guide

### 1. General Settings
- **Event Name**: The title of the seminar or event used in subjects and template placeholders.
- **Sender Name**: The alias that will appear in the "From" field of outgoing emails.
- **Sync Interval**: The frequency (in minutes) that the matching engine should run. Note: Google supports specific intervals (1, 5, 10, 15, 30, or 60+).
- **SMS File ID**: The unique ID of the XML file stored in Google Drive. This can be extracted from the file's shareable link.

### 2. Field Mapping
Variables must be mapped to the exact (or similar) headers in your Google Form Spreadsheet:
- `name`: Primary participant name.
- `email`: Mandatory field for communication.
- `trxId`: The field where participants enter their payment transaction ID.
- `payment_medium`: Used for conditional template logic (e.g., "BKash" or "Hand Cash").

### 3. Template Implementation
The system supports two distinct templates:
- **Welcome Template**: Sent immediately upon form submission (Status: Pending).
- **Confirmed Template**: Sent after the matching engine verifies the payment (Status: Verified).

Templates support CSS Attribute Selectors for conditional rendering based on the first letter of the `payment_medium` variable.

## Deployment and Installation

1. **Google Spreadsheet Setup**:
   - Create a Google Form and link it to a spreadsheet.
   - Open the spreadsheet and go to `Extensions > Apps Script`.

2. **Script Deployment**:
   - Copy the generated `Code.gs` from the WARSG interface into the Apps Script editor.
   - Create two new HTML files in the GAS editor named `submission_success.html` and `payment_success.html`.
   - Paste your configured HTML templates into these respective files.

3. **Initialization**:
   - Locate the `setupTriggers` function in the editor and click "Run".
   - Authorize the necessary permissions (Gmail, Drive, Spreadsheets).
   - The system is now live and will synchronize based on your defined interval.

## Security and Privacy
- **Data Locality**: WARSG is a client-side generator. Your project configurations, API IDs, and templates are stored locally in your browser's `localStorage` and are never sent to external servers.
- **Authentication**: The generated script runs entirely within your Google Workspace environment using OAuth2. It does not require or store any third-party credentials.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/muhammadabdullah007git/WARSG.git

# Install dependencies
npm install

# Run the development server
npm run dev

# Build the project
npm run build
```

## License
Distributed under the MIT License. See `LICENSE` for more information.

---
Maintained by Muhammad Abdullah.
