# WARSG (Web-based Apps Script Registration & Sync Generator)

A high-fidelity, universal Google Apps Script generator designed to automate seminar registration and payment verification workflows. Inspired by the aesthetics of modern editors, WARSG allows users to generate complex automation scripts without writing a single line of code.

## 🚀 Key Features

- **Dynamic Script Generation**: Automatically generates `Code.gs` based on your UI configuration.
- **Universal Field Mapping**: Map any Google Form header to script variables using fuzzy matching logic.
- **SMS Verification Logic**: Built-in support for parsing SMS Backup XML files from Google Drive (optimized for bKash).
- **Conditional Email Templates**: Support for logic-based HTML emails (e.g., showing different details for BKash vs. Hand Cash).
- **Fully Configurable**:
  - **Custom Sync Interval**: Set hourly sync triggers in minute increments.
  - **Batch Processing**: Control the number of transactions processed per sync.
  - **Sender & Event Control**: Define custom sender names and event titles.
- **Sandboxed Preview**: Live HTML email preview using an isolated `iframe` to ensure styling accuracy.
- **Project Management**: Create, rename, clone, and export/import project configurations as JSON files.

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Vanilla CSS (Zed-inspired high-fidelity UI)
- **Editor Integration**: PrismJS for real-time syntax highlighting.
- **Icons**: Lucide React

## 📖 How to Use

### 1. Configure the Generator
- Enter your **Event Name** and **Sender Name**.
- Provide the **Google Drive File ID** for your SMS XML backup.
- Set the **Sync Interval** (e.g., 30 or 60 minutes).
- Map your **Form Headers** to the required variables in the "Field Mapping" section.

### 2. Customize Templates
- Edit the **Welcome** and **Confirmed** email templates using HTML.
- Use `{variable}` tags (e.g., `{name}`, `{trxId}`) to inject dynamic data.
- Utilize the **Library** section to quickly insert common components or tags.

### 3. Deploy to Google Apps Script
- Copy the generated code from the **Code.gs** tab.
- In your Google Spreadsheet, go to `Extensions > Apps Script`.
- Paste the code into the editor.
- Create two HTML files in the GAS editor named `submission_success.html` and `payment_success.html`.
- Paste your configured HTML templates into these files.
- Run the `setupTriggers()` function once to initialize the automated triggers.

## 💻 Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📄 License
MIT License - feel free to use and modify for your own registration systems.

---
Built with ❤️ for the community.
