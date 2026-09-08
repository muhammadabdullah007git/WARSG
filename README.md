# WARSG (Web-based Automatic Response System Generator)

WARSG is a professional-grade Google Apps Script generator designed to automate the lifecycle of seminar registration and payment verification. Inspired by [PARS](https://github.com/Jawad-Nahin/PARS). It bridges the gap between Google Forms, SMS-based mobile payments (specifically bKash, Nagad, Rocket, Upay), and automated email communication, allowing for a fully hands-off registration system.

## System Architecture

The WARSG workflow follows a structured automation path:
1. **Data Collection**: A Google Form collects participant details and their transaction ID (TrxID).
2. **Verification Source**: An "SMS Backup & Restore" XML file is uploaded to a designated Google Drive location.
3. **Synchronization**: The generated script runs on a time-based trigger to parse the XML file and update the `SMS_Dump` sheet.
4. **Matching Engine**: The script utilizes fuzzy matching and sanitized TrxID extraction to link form responses with verified SMS transactions.
5. **Confirmation**: Upon a successful match, a "Payment Confirmed" email is automatically dispatched with the verified amount, event details, and group access links.
6. **Audit & Logging**: All events, match counts, and runtime errors are automatically recorded in an `Execution_Logs` sheet for complete transparency.

## Technical Specifications

### Core Engine
- **Fuzzy Matching**: Implements a two-stage matching algorithm. It first checks exact header aliases across all keys, then safely falls back to partial string matching with built-in safeguards to prevent cross-contamination (e.g., distinguishing between "Student ID" and "Transaction ID").
- **Multi-Parser Regex**: Utilizes customizable regular expressions to extract TrxID and Amount across multiple Mobile Financial Services (MFS) including bKash, Nagad, Rocket, and Upay.
- **Drive Link & ID Normalization**: Automatically extracts raw Google Drive File IDs from full shareable URLs.
- **Time-Based Triggers**: Implements the Google Apps Script Trigger Service to handle periodic synchronization, dynamically optimizing between `everyMinutes()` (1, 5, 10, 15, 30) and `everyHours()` to comply with Google quota limits.
- **Safe Trigger Lifecycle**: Manages triggers idempotently, only resetting WARSG-owned triggers to avoid interfering with other spreadsheet automations.

### Frontend Application
- **Environment**: Built with React 19, TypeScript, and Vite for type-safe and high-performance development.
- **UI Architecture**: Single-page application with a Zed-inspired high-fidelity interface, utilizing PrismJS for real-time syntax highlighting in both Dark and Light themes.
- **Sandboxing**: Employs an isolated `iframe` with a responsive email client preview canvas (Desktop 720px and Mobile 375px viewports) to render HTML mail templates accurately without style leakage.
- **Live SMS Tester**: Integrated interactive regex playground to test SMS texts against configured parsers in real-time.
- **HTML Formatter**: Built-in template beautifier for clean HTML tags, inline styles, and indentation.

## Configuration Guide

### 1. General Settings
- **Event Name**: The title of the seminar or event used in email subjects and template placeholders (`{eventName}`).
- **Sender Alias Name**: The display name that appears in the "From" field of outgoing emails.
- **Welcome & Confirmed Subjects**: Fully customizable email subject lines supporting variable placeholders.
- **WhatsApp Link**: Seminar or support group invite link injected via `{whatsappLink}`.

### 2. Spreadsheet & Sync Settings
- **SMS XML File ID**: The unique ID of the XML file stored in Google Drive (shareable links are automatically sanitized).
- **SMS Sender Filter**: Optional filter (e.g. `bkash`, `nagad`) to ignore non-transactional personal texts in the XML dump.
- **Sync Interval**: Frequency in minutes for background matching runs (1, 5, 10, 15, 30, 60+).
- **Batch Size**: Maximum matches to process in a single execution to stay well within Google's 6-minute execution limit.
- **Custom Sheet Names**: Configure target sheets for Form Responses, SMS Dump, Matched Data, and Execution Logs.

### 3. Field Mapping
Variables mapped to Google Form Spreadsheet column headers:
- `name`: Participant name (aliases: `Name, Full Name, Participant Name`).
- `email`: Mandatory recipient email address (aliases: `Email, Email Address`).
- `trxId`: Core payment reference entered by participant (aliases: `Trx ID, Transaction ID, TrxID`).
- Custom fields: Add any number of custom form questions (e.g., `studentId`, `department`, `tshirtSize`).

### 4. Template Placeholders
Templates support dynamic string substitution:
- `{name}`: Participant name.
- `{email}`: Participant email.
- `{trxId}`: Cleaned transaction ID.
- `{amount}`: Verified payment amount extracted directly from SMS.
- `{smsSender}`: Verified payment gateway / parser name (e.g., bKash, Nagad).
- `{eventName}`: Configured event title.
- `{senderName}`: Configured sender alias.
- `{whatsappLink}`: Group invitation URL.
- `{customVar}`: Any variable defined in Field Mapping.

## Deployment and Installation

1. **Google Spreadsheet Setup**:
   - Create a Google Form and link it to a Google Spreadsheet.
   - Open the spreadsheet and click `Extensions > Apps Script`.

2. **Script Deployment**:
   - In WARSG, configure your event details, parsers, and templates.
   - Click **Copy Code** or **Download Code**.
   - Paste the code into `Code.gs` in the Apps Script editor.

3. **Initialization**:
   - In the Apps Script function dropdown, select `setupTriggers` and click **Run**.
   - Authorize permissions (Gmail, Google Drive, Google Sheets).
   - Select `testWelcomeEmail` and `testConfirmedEmail` to verify email delivery.
   - Your automated seminar system is now live!

## Security and Privacy
- **Data Locality**: WARSG is an entirely client-side application. Configurations and templates are stored locally in your browser's `localStorage` and never transmitted to external servers.
- **Google Workspace OAuth2**: The generated script executes exclusively within your Google Workspace environment. No third-party credentials or API keys are required.

## Development Setup

```bash
# Clone repository
git clone https://github.com/muhammadabdullah007git/WARSG.git

# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build for production
npm run build
```

## License
Distributed under the MIT License. See `LICENSE` for more information.
