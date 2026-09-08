# Changelog

All notable changes, problem resolutions, and architectural improvements to WARSG (Web-based Automatic Response System Generator) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] - 2026-09-08

### Added
- **Floating Corner HTML Email Preview Window**:
  - Relocated Email Preview from a top-level tab to a dedicated floating picture-in-picture window docked in the bottom-right corner of the editor canvas.
  - Streamlined main navigation tabs strictly to `Code.gs`, `Received Template`, and `Confirmed Template`.
  - Added a persistent bottom-right corner action bar containing:
    - **`Show Preview` / `Hide Preview`**: Interactive toggle button that dynamically updates label and state.
    - **`Format HTML`**: One-click HTML template beautifier with tag-aware indentation.
  - Embedded an isolated `iframe` with live HTML rendering that updates in real time as the template code is typed.
  - Template Switcher (`Received` vs `Confirmed`) and Viewport Switcher (`Desktop` vs `Mobile` phone frame) embedded directly in the preview header.
  - Full simulation of conditional rules and dynamic variable substitution against realistic registrant mock data.
- **Preview Maximize / Restore Toggle (Picture-in-Picture to Full Canvas)**:
  - Added a dedicated maximize toggle button (`Maximize2` / `Minimize2` icons) in the preview header.
  - Double-clicking the preview header seamlessly toggles between compact 480px floating view and maximized full-editor canvas coverage.
  - Allows inspecting responsive desktop layouts without losing editor context.
- **Global Keyboard Accessibility & Productivity Shortcuts**:
  - **`Escape` Key**: Unified dismiss behavior that closes project modals, settings modal, restores maximized preview to compact size, or closes the floating preview.
  - **`Ctrl+S` / `Cmd+S`**: Intercepts native browser "Save webpage as..." dialog, immediately flushes debounced project data and editor preferences to `localStorage`, and displays a green toast confirmation (`"Project saved successfully"`).
  - **`Alt+P`**: Global keyboard shortcut to toggle HTML Email Preview on/off.
  - **`Shift+Alt+F`**: Standard code formatter shortcut to format HTML templates with clean 2-space indentation.
- **Omnipresent Variable Autocomplete & Targeting**:
  - Enhanced the conditional rule `in $...` selector to expose all system variables (`$name`, `$email`, `$amount`, `$trxId`, `$smsSender`, `$eventName`, `$senderName`, `$whatsappLink`) alongside custom mapped variables.
  - Added HTML5 `<datalist>` auto-suggestions for variable names and `$variable` placeholders across conditional inputs and variable assignments.

### Changed & Improved
- **Conditional Logic Engine & Branch Lifecycle**:
  - Default project configuration now initializes cleanly with zero conditional rules (`conditionalRules: []`).
  - Creating a conditional rule generates a clean root `IF` branch with `+ Else If` and `+ Else` action buttons.
  - Protected root `IF` branch from accidental deletion.
  - Added smart branch positioning: clicking `+ Else If` automatically inserts the new branch immediately before any existing `Else` fallback branch.
  - The `+ Else` button automatically hides when an `Else` fallback branch exists and reappears when removed.
  - Removed static hint and coding overview boxes from conditional rule cards to maximize vertical space and eliminate visual noise.
- **Dynamic Variable Typing**:
  - Values wrapped in quotes (`"..."` or `'...'`) compile and evaluate as explicit strings.
  - Unquoted numeric values (`500`, `25.5`, `-10`) compile and evaluate as native numbers.
  - Native booleans (`true`, `false`) are automatically parsed and coerced.
  - Eliminated JavaScript string concatenation bugs (e.g. numeric assignments now use `Number(d['amount'])` preventing `'500' + 10` becoming `'50010'`).
- **Rich Condition Operators**:
  - Added relational operator selector: `contains`, `==`, `!=`, `>`, `<`, `>=`, `<=`, and `expr` (custom expression).
  - Added multi-condition logical operator support (`&&`, `||`, `!`) within condition match inputs (e.g. `> 100 && <= 500`, `"bkash" || "nagad"`).
  - Added arithmetic operators (`+`, `-`, `*`, `/`, `%`) in variable assignments (e.g. `$amount * 0.1`, `$amount + 50`).
- **Apps Script `Code.js` Synchronization**:
  - Aligned default `evaluateConditionalRules(data)` in `Code.js` with local variable declarations (`targetRaw`, `targetNum`, `targetStr`) to maintain parity with the generated script.

---

## [2.3.0] - 2026-09-08

### Added
- **In-App Reset Confirmation Modal**:
  - Replaced native browser `window.confirm()` with a custom in-app Reset Confirmation Modal (`modalMode: 'reset'`).
  - Solved the issue where browser `confirm()` popups were silenced, suppressed, or easily dismissed by modern browsers without visual confirmation.
  - Clearly informs the user about which configurations will be restored to defaults (variables, conditional rules, SMS parsers, sheet names, and email templates).
- **Settings Reset to Defaults**:
  - Added a dedicated **Reset Settings** button inside the Settings modal.
  - One-click restores default UI theme (Zed Dark), font family (JetBrains Mono), font size (13px), and word wrapping (off) with immediate toast notification.
- **In-App Delete Project Confirmation Modal**:
  - Replaced browser `confirm()` on project deletion with an in-app confirmation modal (`modalMode: 'delete'`), permanently eliminating all disruptive native browser alerts from the app.
- **Vite Bundle Splitting Optimization**:
  - Configured Rollup `manualChunks` in `vite.config.ts` separating `vendor` (React/ReactDOM), `prism` (PrismJS syntax highlighter), and `icons` (Lucide React) into dedicated chunks to maximize browser caching and speed up initial page loading.

### Performance Improvements
- **Hardware-Accelerated Code Editor Scrolling (Zero-JS GPU Compositor)**:
  - *Root Cause of Scroll Lag*: The editor previously placed an `overflow: auto` textarea over an `overflow: hidden` syntax-highlighted div, synchronizing scroll offsets via an expensive `onScroll` JavaScript handler (`h.scrollTop = t.scrollTop`). Because `overflow: hidden` elements lack GPU composited scroll layers, every mouse wheel micro-tick forced synchronous layout recalculations and CPU repainting of ~5,000 Prism tokens, resulting in severe frame drops and stuttering.
  - *Fix*: Re-architected the editor with a single GPU-composited `.editor-scroll-container` and a CSS Grid overlay (`.editor-grid`). Both the syntax-highlighted layer and the transparent editing textarea are stacked within the exact same grid cell (`grid-area: 1 / 1 / 2 / 2`), allowing the browser compositor to scroll both elements simultaneously with **zero JavaScript execution**, **zero reflows**, and **120 FPS / 240 FPS fluid native responsiveness**.
  - *Developer Experience Enhancement*: Added native Tab key indentation support (`handleKeyDown`), allowing users to press Tab to insert 2 spaces without losing editor focus.
- **Debounced LocalStorage Synchronization (300ms)**:
  - Eliminated synchronous `localStorage.setItem` serializations occurring on every single keystroke.
  - Projects and settings are now queued and saved smoothly 300ms after user pauses typing, completely eliminating typing input latency.
  - Added a `beforeunload` lifecycle listener to immediately flush pending updates if the user refreshes or closes the browser tab, guaranteeing zero data loss.
- **Hardware-Smooth Sidebar Resizing with `requestAnimationFrame`**:
  - Bound mousemove listener to `requestAnimationFrame` and marked it with `{ passive: true }`, ensuring smooth 60fps/120Hz/240Hz dragging without main thread bottlenecking.
  - Debounced saving the sidebar width to `localStorage` (400ms), eliminating continuous disk writes during resizing.
- **Selective Prism Syntax Highlighting**:
  - Skipped heavy PrismJS code tokenization when viewing email preview tabs (`preview-received` and `preview-confirmed`), saving 10-20ms of syntax processing per keystroke.
- **Memoized Preview HTML Generation (`previewHtml`)**:
  - Memoized the `previewHtml` calculation using React `useMemo`, preventing expensive regular expression string substitutions and DOM iframe re-renders during unrelated UI state changes (such as sidebar resizing, sheet setting tweaks, or code editing).
- **Eliminated `flashCode` Re-Render Storm**:
  - Removed continuous `flashCode` trigger from the auto-generation sync effect. Normal keystrokes now update code quietly without scheduling timers and firing extra re-renders. Visual code pulsing is preserved for intentional user actions (such as clicking the Re-sync button).
- **Debounced Status Bar Saving State**:
  - Replaced unmanaged `setTimeout` chains in `updateConfig` with a clean `saveTimeoutRef`, preventing overlapping timer contention and state churning during rapid keystroke input.

---

## [2.2.0] - 2026-09-08

### Added
- **Variable Mapping with Type Selection**:
  - Renamed "Field Mapping" to **Variable Mapping**.
  - Added a per-variable dropdown with two modes:
    - **`Field`**: Extracts data dynamically from the Google Form spreadsheet column based on specified header aliases (e.g. `Name, Full Name`).
    - **`Value`**: Directly assigns a static constant or default string (e.g. `500 BDT`, `General Ticket`, `Auditorium A`).
- **`$variableName` Universal Syntax**:
  - Implemented `$name` syntax across all boxes: email subject lines, email templates, conditional statements, and HTML component snippets.
  - Interactive variable tags in the Template Library now render as `$name`, `$email`, `$trxId`, `$amount`, `$smsSender`, `$eventName`, `$senderName`, `$whatsappLink`, plus all user-defined and conditional variables.
  - Full backward compatibility maintained for existing `{varName}` template placeholders.
- **Conditional Statements Engine**:
  - Added dedicated **Conditional Statements** section with a visual interactive branch builder and real-time syntax preview.
  - Implements the syntax:
    ```
    in '$targetField' {
      if ("search string or number") { $variable = "assigned value" }
      else if ("search string 2") { $variable = "assigned value 2" }
      else { $variable = "fallback value" }
    }
    ```
  - Performs case-insensitive substring search (`.indexOf(...) > -1`) against field data, allowing partial matches even if the form input contains extra surrounding text.
  - Emits `evaluateConditionalRules(emailData)` in the generated Google Apps Script, evaluating rules on both form submit and payment matching.
- **Live Conditional Simulation in Email Preview**:
  - Email preview now simulates conditional rule evaluation against sample data in real time, letting organizers see conditional text and pricing appear dynamically in the preview.
- **Renamed "Welcome" Tab to "Received"**:
  - Renamed `Welcome Template` tab to **Received Template** (`received-edit`).
  - Updated Email Preview sub-toggle to **Received** vs **Confirmed**.
  - Updated configuration fields to `receivedSubject` and `receivedTemplate`.
  - Added `testReceivedEmail()` to the generated Google Apps Script (with `testWelcomeEmail()` backwards-compatible alias).
- **Smooth Resizable Sidebar**:
  - Replaced fixed sidebar width with an interactive drag-to-resize handle between the sidebar and the editor panel.
  - Supports intuitive click-and-drag resizing with safety clamps (260px minimum, 700px maximum).
  - Remembers user's custom width in `localStorage` (`warsg_sidebar_width`).
  - Added double-click to reset back to default width (340px) with toast feedback.

### Changed
- **Fully Unlocked Variables**: Removed all read-only, disabled, and lock restrictions from Variable Mapping. Users can freely rename, edit values, change between `Field` and `Value` types, or delete any variable (including `$email` and `$trxId`), while the script generator uses intelligent dynamic fallbacks to find recipient email and payment reference columns.
- Refactored `resolveVariables` to prioritize `$varName` using word boundary checks (`\$(?!...)`) to prevent partial identifier collision bugs.
- Upgraded project persistence in `localStorage` with automated migration from legacy `fields` to `variables`.

---

## [2.1.0] - 2026-09-08

### Discovered Problems & Root Causes

1. **Unused `smsSender` Configuration in Generated Apps Script**:
   - *Problem*: While the frontend allowed setting an SMS Sender (e.g. `bkash`), the generated `autoGeneratedCode` never referenced `SMS_SENDER` nor filtered incoming SMS by address.
   - *Impact*: In real-world XML dumps containing personal SMS, non-bKash texts could trigger false-positive regex matches or waste execution time.
   - *Resolution*: Added `SMS_SENDER` to script constants and added an address filtering guard `if (SMS_SENDER && address.toLowerCase().indexOf(SMS_SENDER.toLowerCase()) === -1) continue;`.

2. **Null Pointer Exception Risk on XML Attribute Access**:
   - *Problem*: `smsList[i].getAttribute("body").getValue()` threw unhandled exceptions if an XML element lacked the `body` attribute, aborting the entire sync batch.
   - *Resolution*: Implemented safe attribute checking on `bodyAttr` and `addressAttr`.

3. **Flawed Column Matching Logic (`getCol` / `getFuzzyVal`)**:
   - *Problem*: In `getCol`, when iterating over search keys, if the first key did not match exactly, it immediately fell back to substring matching across all headers before testing if the second key had an exact match. This caused false-positive matches (e.g., column `"ID"` matching `"Trx ID"` instead of an exact match on `"Student ID"`).
   - *Resolution*: Refactored to a strict two-pass algorithm: Pass 1 tests exact match across all aliases; Pass 2 performs partial substring matching with negative safeguards.

4. **Hardcoded Transaction Column Lookup Ignoring Field Mapping**:
   - *Problem*: `var idxTrx = getCol(["trx", "transaction"]);` was hardcoded, completely ignoring whatever aliases the user defined for `trxId` in Field Mapping.
   - *Resolution*: Dynamically pulls the user-configured aliases from `FIELD_MAPPINGS` for `trxId`.

5. **Missing Verified Amount in Confirmation Emails**:
   - *Problem*: `smsMap[fTrx].amount` was captured from SMS, but never injected into `emailData`. Confirmation emails had no way to display the verified amount paid.
   - *Resolution*: Added `amount` and `smsSender` to `emailData` and added `{amount}` and `{smsSender}` placeholder support.

6. **Unsafe Regex Replacement with Dollar Signs in Templates**:
   - *Problem*: `body = body.replace(new RegExp('{' + k + '}', 'g'), allData[k] || "N/A");` in JavaScript treats `$` in replacement strings (e.g. `$50` or `$&`) as backreferences, corrupting values.
   - *Resolution*: Switched to function-based replacers: `text.replace(..., function() { return safeVal; });`.

7. **Dangerous Bulk Trigger Deletion in `setupTriggers`**:
   - *Problem*: `triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });` deleted every trigger in the user's entire Google Apps Script project, disrupting unrelated automations.
   - *Resolution*: Restricts deletion strictly to WARSG-owned triggers (`handleFormSubmit` and `runFullSync`).

8. **Missing Execution Logging**:
   - *Problem*: `var SHEET_LOGS = "Execution_Logs";` was declared, but never written to.
   - *Resolution*: Implemented `logEntry(message, type)` that records timestamps, status levels (`INFO`, `WARN`, `ERROR`, `SUCCESS`), and messages directly to `Execution_Logs`.

9. **Unconfigured Sheet Names in UI**:
   - *Problem*: Sheet names (`sheetFormResponses`, `sheetSmsDump`, `sheetMatched`, `sheetLogs`) existed in data but had no controls in the sidebar.
   - *Resolution*: Added a dedicated **Spreadsheet & Sync** accordion section in the sidebar.

10. **Invisible Email Preview in Dark Mode**:
    - *Problem*: In dark theme, the preview iframe rendered transparently with black text on `#09090b` background.
    - *Resolution*: Added a simulated email client canvas (crisp white background, realistic container width, typography, and card shadows) on both desktop and mobile viewports.

11. **Fragile HTML Formatter (`formatHTML`)**:
    - *Problem*: Splitting by `/>\s*</` corrupted text nodes and created invalid HTML artifacts.
    - *Resolution*: Implemented token-based HTML formatter supporting inline blocks, comments, self-closing tags, and proper indentation.

12. **Settings Font Not Applied**:
    - *Problem*: `settings.font` was saved in localStorage but never applied in CSS.
    - *Resolution*: Bound CSS variable `--code-font` to `settings.font` and added a font family selector in Settings.

---

### Added
- **MFS Parser Presets**: One-click presets for **bKash**, **Nagad**, **Rocket**, and **Upay**.
- **Interactive SMS Regex Playground**: Live tester in the sidebar showing parsed TrxID, parsed Amount, and the specific matching parser name.
- **Dedicated Spreadsheet & Sync Section**: Full control over Google Drive File ID, SMS sender filtering, sync interval, batch sizes, and custom sheet names.
- **Custom Email Subjects**: Added `welcomeSubject` and `confirmedSubject` configuration with variable substitution support.
- **Toast Notifications**: Non-blocking toast feedback for actions (copying code, downloading code, formatting HTML, importing/exporting configs, resetting settings).
- **Dual Template Testing Helpers**: Generated script includes both `testWelcomeEmail()` and `testConfirmedEmail()` functions.
- **TrxID Input Sanitizer (`cleanTrxId`)**: Automatically strips extra labels or punctuation when participants type `"TrxID: 9J28..."` or add accidental spaces.
- **Responsive Email Canvas**: Desktop (720px) and Mobile (375px) sandboxed views with standard email container styles.
- **Prism Light Theme Tokens**: Full syntax highlighting color support for light theme mode.
- **Google Fonts & Web Typography**: Integrated Inter and JetBrains Mono fonts, plus an SVG favicon in `index.html`.

### Changed
- **Default Email Templates**: Upgraded to production-ready, beautifully styled, responsive inline-CSS email cards with clear status badges, summary grids, and WhatsApp call-to-action buttons.
- **`Code.js` in Root**: Synchronized the root reference script with the new robust generator logic.
- **`README.md`**: Updated documentation to reflect React 19, new features, and deployment instructions.
- **Type Safety**: Fully typed `syncInterval`, `welcomeSubject`, `confirmedSubject`, and `sheetLogs` in `Config` interface, eliminating `(config as any)` casts.

### Fixed
- Fixed duplicate `"Status"` column header in `Matched_Data` sheet.
- Fixed disabled state and tooltip for "Delete Project" when only one project exists.
- Fixed object mutation bug in project cloning by ensuring deep clones of nested arrays.
- Fixed horizontal scroll clipping in code editor when Word Wrap is disabled.
- Fixed highlighter layer overflow to prevent duplicate scrollbars alongside the textarea.
