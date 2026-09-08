/**
 * =========================================================================
 * Google Apps Script for Automated Seminar Registration & Payment Verification
 * Generated / Managed via WARSG
 * =========================================================================
 *
 * FEATURES:
 * 1. Immediate "Registration Received" email dispatched on form submit.
 * 2. Scheduled background synchronization parsing SMS Backup XML from Drive.
 * 3. Support for variables ($varName syntax) and dynamic conditional statements.
 * 4. Variable Mapping supporting both Form Fields and Static Values.
 * 5. Multi-parser regex matching for mobile banking (bKash, Nagad, Rocket, Upay).
 * 6. "Payment Confirmed" email dispatch with verified amount and seat confirmation.
 * 7. Duplicate prevention via Matched_Data ledger and Execution_Logs audit trail.
 */

// --- CONFIGURATION ---
var EVENT_NAME = "General Member Registration 2026";
var SENDER_NAME = "IEEE BAIUST Student Branch";
var SUBJECT_RECEIVED = "Registration Received: $eventName";
var SUBJECT_CONFIRMED = "Payment Confirmed: $eventName";

// Google Drive File ID for the sms.xml file
var SMS_XML_FILE_ID = "1sbJ8XfiDrDT-T_YwwOZHBfJ5PE3dl6NF";
var SMS_SENDER = "bkash"; // Optional: filter by sender name (e.g. bkash, nagad)
var BATCH_SIZE = 50;
var SYNC_INTERVAL = 15;

// Sheet Names
var SHEET_FORM_RESPONSES = "Form Responses 1";
var SHEET_SMS_DUMP = "SMS_Dump";
var SHEET_MATCHED = "Matched_Data";
var SHEET_LOGS = "Execution_Logs";

// WhatsApp Group or Event Contact Link
var WHATSAPP_LINK = "https://chat.whatsapp.com/H5Nuzk7UsM68vNv4e2pq1W?mode=gi_t";

// SMS Parsers
var SMS_PARSERS = [
  { name: "bKash", regexTrx: "TrxID\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:received|Tk|Amount)\\s*:?\\s*([\\d,.]+)" },
  { name: "Nagad", regexTrx: "TxnID\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:Amount|Tk)\\s*:?\\s*([\\d,.]+)" }
];

// Configured Variable Mappings (Field vs Value)
var VARIABLE_MAPPINGS = [
  { var: "name", type: "field", value: "Name, Full Name, Participant Name", keys: ["Name", "Full Name", "Participant Name"] },
  { var: "email", type: "field", value: "Email, Email Address", keys: ["Email", "Email Address"] },
  { var: "trxId", type: "field", value: "Trx ID, Transaction, TrxID", keys: ["Trx ID", "Transaction", "TrxID"] },
  { var: "paymentMethod", type: "field", value: "Payment Method, Payment Medium", keys: ["Payment Method", "Payment Medium"] },
  { var: "ticketType", type: "value", value: "Standard Attendee", keys: [] }
];

// --- INITIALIZATION & LOGGING ---

function checkAndInitialize() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var logSheet = getOrCreateSheet(ss, SHEET_LOGS);
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow(["Timestamp", "Type", "Message"]);
    logSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f4f6");
  }

  var dumpSheet = getOrCreateSheet(ss, SHEET_SMS_DUMP);
  if (dumpSheet.getLastRow() === 0) {
    dumpSheet.appendRow(["Trx ID", "Amount", "Sender", "Reference", "Date", "Full SMS Body", "Imported At"]);
    dumpSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f3f4f6");
  }

  var matchSheet = getOrCreateSheet(ss, SHEET_MATCHED);
  if (matchSheet.getLastRow() === 0) {
    var matchHeaders = ["Trx ID", "Email", "Name", "Amount (SMS)", "Sender (SMS)", "Matched At", "Email Status"];
    matchSheet.appendRow(matchHeaders);
    matchSheet.getRange(1, 1, 1, matchHeaders.length).setFontWeight("bold").setBackground("#f3f4f6");
  }
}

function logEntry(message, type) {
  type = type || "INFO";
  Logger.log("[" + type + "] " + message);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(SHEET_LOGS);
    if (!logSheet) logSheet = getOrCreateSheet(ss, SHEET_LOGS);
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(["Timestamp", "Type", "Message"]);
      logSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f4f6");
    }
    logSheet.appendRow([new Date(), type, String(message)]);
  } catch (err) {
    Logger.log("Failed to append log: " + err.toString());
  }
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

// --- CONDITIONAL RULES EVALUATION ---

function evaluateConditionalRules(data) {
  var d = Object.assign({}, data);
  try {
    var targetRaw, targetNum, targetStr;
    // No conditional rules defined
  } catch (err) {
    Logger.log("Error evaluating conditional rules: " + err.toString());
  }
  return d;
}

// --- FUZZY MATCHING HELPERS ---

function getFuzzyVal(responses, keys) {
  if (!responses || !keys || keys.length === 0) return "";
  var rKeys = Object.keys(responses);

  // 1. Exact match pass
  for (var i = 0; i < keys.length; i++) {
    var searchKey = keys[i].toLowerCase().trim();
    for (var j = 0; j < rKeys.length; j++) {
      if (rKeys[j].toLowerCase().trim() === searchKey) {
        var val = responses[rKeys[j]];
        var res = Array.isArray(val) ? val[0] : val;
        if (res !== undefined && res !== null && String(res).trim() !== "") {
          return String(res).trim();
        }
      }
    }
  }

  // 2. Substring fallback pass with safeguards
  for (var i = 0; i < keys.length; i++) {
    var searchKey = keys[i].toLowerCase().trim();
    if (!searchKey) continue;
    for (var j = 0; j < rKeys.length; j++) {
      var rkLower = rKeys[j].toLowerCase().trim();
      if (rkLower.indexOf(searchKey) > -1) {
        if (searchKey === "id" && rkLower.indexOf("trx") > -1 && rkLower.indexOf("student") === -1) {
          continue;
        }
        var val = responses[rKeys[j]];
        var res = Array.isArray(val) ? val[0] : val;
        if (res !== undefined && res !== null && String(res).trim() !== "") {
          return String(res).trim();
        }
      }
    }
  }
  return "";
}

function getColIndex(headers, keys) {
  if (!headers || !keys || keys.length === 0) return -1;
  var hList = headers.map(function(h) { return String(h).toLowerCase().trim(); });

  // 1. Exact match pass
  for (var i = 0; i < keys.length; i++) {
    var searchKey = keys[i].toLowerCase().trim();
    for (var j = 0; j < hList.length; j++) {
      if (hList[j] === searchKey) return j;
    }
  }

  // 2. Substring fallback pass
  for (var i = 0; i < keys.length; i++) {
    var searchKey = keys[i].toLowerCase().trim();
    if (!searchKey) continue;
    for (var j = 0; j < hList.length; j++) {
      if (hList[j].indexOf(searchKey) > -1) {
        if (searchKey === "id" && hList[j].indexOf("trx") > -1 && hList[j].indexOf("student") === -1) {
          continue;
        }
        return j;
      }
    }
  }
  return -1;
}

function cleanTrxId(raw) {
  if (!raw) return "";
  var str = String(raw).trim().toUpperCase();
  var match = str.match(/[A-Z0-9]{8,14}/);
  return match ? match[0] : str.replace(/[^A-Z0-9]/g, "");
}

// --- TEMPLATE RENDERING ---

function resolveVariables(text, data) {
  if (!text) return "";
  var allData = Object.assign({
    whatsappLink: WHATSAPP_LINK,
    eventName: EVENT_NAME,
    senderName: SENDER_NAME
  }, data);

  // Sort keys by descending length
  var keys = Object.keys(allData).sort(function(a, b) { return b.length - a.length; });

  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var val = allData[k];
    var safeVal = (val !== undefined && val !== null && String(val).trim() !== "") ? String(val) : "N/A";
    var escapedKey = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Replace $variableName (with boundary check)
    text = text.replace(new RegExp('\\$' + escapedKey + '(?![a-zA-Z0-9_])', 'g'), function() { return safeVal; });
    // Replace {variableName} for compatibility
    text = text.replace(new RegExp('\\{' + escapedKey + '\\}', 'g'), function() { return safeVal; });
  }
  return text;
}

function getHtmlTemplate(type, data) {
  var templateName = type === 'received' ? 'submission_success' : 'payment_success';
  var html = "";
  
  try {
    html = HtmlService.createHtmlOutputFromFile(templateName).getContent();
  } catch (e) {
    if (type === 'received') {
      html = '<div style="max-width:600px; margin:0 auto; font-family:sans-serif; padding:20px; border:1px solid #e2e8f0; border-radius:8px;">' +
             '<h2 style="color:#2563eb;">$eventName</h2>' +
             '<p>Dear <strong>$name</strong>,</p>' +
             '<p>Thank you for submitting your registration. We have recorded your transaction ID (<strong style="font-family:monospace;">$trxId</strong>). You will receive another email once your payment is verified.</p>' +
             '<p style="font-size:12px; color:#64748b; margin-top:20px;">Sent by $senderName</p></div>';
    } else {
      html = '<div style="max-width:600px; margin:0 auto; font-family:sans-serif; padding:20px; border:1px solid #e2e8f0; border-radius:8px;">' +
             '<h2 style="color:#16a34a;">Payment Confirmed!</h2>' +
             '<p>Dear <strong>$name</strong>,</p>' +
             '<p>Your payment for <strong>$eventName</strong> of Tk <strong>$amount</strong> (TrxID: <strong style="font-family:monospace;">$trxId</strong>) has been verified!</p>' +
             '<div style="text-align:center; margin:24px 0;"><a href="$whatsappLink" style="background-color:#25d366; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:bold;">Join Official WhatsApp Group</a></div>' +
             '<p style="font-size:12px; color:#64748b; margin-top:20px;">Sent by $senderName</p></div>';
    }
  }

  return resolveVariables(html, data);
}

// --- TRIGGER 1: RECEIVED EMAIL (On Form Submit) ---

function handleFormSubmit(e) {
  if (!e) {
    Logger.log("handleFormSubmit called without event object. To test, use testReceivedEmail().");
    return;
  }

  try {
    var responses = e.namedValues || {};
    var emailData = {};

    VARIABLE_MAPPINGS.forEach(function(m) {
      if (m.type === 'value') {
        emailData[m.var] = m.value;
      } else {
        emailData[m.var] = getFuzzyVal(responses, m.keys);
      }
    });

    emailData = evaluateConditionalRules(emailData);

    var recipientEmail = emailData.email;
    if (!recipientEmail) {
      for (var k in emailData) {
        if (k.toLowerCase().indexOf("email") > -1 || k.toLowerCase().indexOf("mail") > -1) {
          recipientEmail = emailData[k];
          break;
        }
      }
    }

    if (!recipientEmail) {
      logEntry("Submission received with no matching email address.", "WARN");
      return;
    }

    var htmlBody = getHtmlTemplate('received', emailData);
    var subject = resolveVariables(SUBJECT_RECEIVED, emailData);

    GmailApp.sendEmail(recipientEmail, subject, "", {
      htmlBody: htmlBody,
      name: SENDER_NAME
    });

    logEntry("Received email sent to: " + emailData.email, "SUCCESS");
  } catch (error) {
    logEntry("Error in handleFormSubmit: " + error.toString(), "ERROR");
  }
}

// --- TRIGGER 2: SMS PARSER & MATCHING ENGINE (Periodic) ---

function runFullSync() {
  try {
    checkAndInitialize();
    processSmsXml();
    matchAndSendEmails();
  } catch (err) {
    logEntry("Error in runFullSync: " + err.toString(), "FATAL");
  }
}

function processSmsXml() {
  if (!SMS_XML_FILE_ID || SMS_XML_FILE_ID.trim() === "") {
    logEntry("SMS XML File ID is not set.", "WARN");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dumpSheet = getOrCreateSheet(ss, SHEET_SMS_DUMP);

  var existingTrx = [];
  if (dumpSheet.getLastRow() > 1) {
    var data = dumpSheet.getRange(2, 1, dumpSheet.getLastRow() - 1, 1).getValues();
    existingTrx = data.map(function(r) { return String(r[0]).trim().toUpperCase(); });
  }

  try {
    var file = DriveApp.getFileById(SMS_XML_FILE_ID.trim());
    var xmlContent = file.getBlob().getDataAsString();
    var document = XmlService.parse(xmlContent);
    var root = document.getRootElement();
    var smsList = root.getChildren("sms");

    var newRows = [];

    for (var i = 0; i < smsList.length; i++) {
      var sms = smsList[i];
      var bodyAttr = sms.getAttribute("body");
      if (!bodyAttr) continue;
      var body = bodyAttr.getValue();

      var addressAttr = sms.getAttribute("address");
      var address = addressAttr ? addressAttr.getValue() : "";

      if (SMS_SENDER && SMS_SENDER.trim() !== "") {
        if (address.toLowerCase().indexOf(SMS_SENDER.toLowerCase().trim()) === -1) {
          continue;
        }
      }

      var dateAttr = sms.getAttribute("readable_date");
      var dateStr = dateAttr ? dateAttr.getValue() : new Date().toLocaleString();

      for (var j = 0; j < SMS_PARSERS.length; j++) {
        var parser = SMS_PARSERS[j];
        if (!parser.regexTrx) continue;

        var matchTrx = body.match(new RegExp(parser.regexTrx, 'i'));
        if (matchTrx && matchTrx[1]) {
          var trxId = matchTrx[1].trim().toUpperCase();
          if (existingTrx.indexOf(trxId) === -1) {
            var matchAmt = parser.regexAmt ? body.match(new RegExp(parser.regexAmt, 'i')) : null;
            var amount = (matchAmt && matchAmt[1]) ? matchAmt[1] : "N/A";

            newRows.push([trxId, amount, parser.name, "N/A", dateStr, body, new Date()]);
            existingTrx.push(trxId);
          }
          break;
        }
      }
    }

    if (newRows.length > 0) {
      dumpSheet.getRange(dumpSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      logEntry("Imported " + newRows.length + " new SMS transactions.", "SUCCESS");
    }
  } catch (e) {
    logEntry("Error processing SMS XML: " + e.toString(), "ERROR");
  }
}

function matchAndSendEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formSheet = ss.getSheetByName(SHEET_FORM_RESPONSES);
  var dumpSheet = ss.getSheetByName(SHEET_SMS_DUMP);
  var matchSheet = getOrCreateSheet(ss, SHEET_MATCHED);

  if (!formSheet || !dumpSheet) {
    logEntry("Form responses sheet or SMS dump sheet missing.", "ERROR");
    return;
  }

  var processedTrx = [];
  if (matchSheet.getLastRow() > 1) {
    var mData = matchSheet.getRange(2, 1, matchSheet.getLastRow() - 1, 1).getValues();
    processedTrx = mData.map(function(r) { return String(r[0]).trim().toUpperCase(); });
  }

  var smsMap = {};
  if (dumpSheet.getLastRow() > 1) {
    var sData = dumpSheet.getRange(2, 1, dumpSheet.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < sData.length; i++) {
      var sTrx = String(sData[i][0]).trim().toUpperCase();
      if (sTrx) smsMap[sTrx] = { amount: sData[i][1], sender: sData[i][2] };
    }
  }

  var formData = formSheet.getDataRange().getValues();
  if (formData.length <= 1) return;

  var headers = formData[0];

  var trxMapping = VARIABLE_MAPPINGS.find(function(m) { 
    return m.var.toLowerCase() === "trxid" || m.var.toLowerCase().indexOf("trx") > -1 || m.var.toLowerCase().indexOf("transaction") > -1; 
  });
  var emailMapping = VARIABLE_MAPPINGS.find(function(m) { 
    return m.var.toLowerCase() === "email" || m.var.toLowerCase().indexOf("email") > -1 || m.var.toLowerCase().indexOf("mail") > -1; 
  });

  var idxTrx = getColIndex(headers, (trxMapping && trxMapping.keys && trxMapping.keys.length > 0) ? trxMapping.keys : ["trx id", "transaction", "trxid"]);
  var idxEmail = getColIndex(headers, (emailMapping && emailMapping.keys && emailMapping.keys.length > 0) ? emailMapping.keys : ["email", "email address", "mail"]);

  if (idxTrx === -1 || idxEmail === -1) {
    logEntry("Trx ID or Email column not found in form sheet.", "FATAL");
    return;
  }

  var newMatches = [];
  var batchCount = 0;

  for (var i = 1; i < formData.length; i++) {
    if (BATCH_SIZE > 0 && batchCount >= BATCH_SIZE) break;

    var row = formData[i];
    var formTrx = cleanTrxId(row[idxTrx]);
    var email = String(row[idxEmail] || "").trim();

    if (!formTrx || !email) continue;
    if (processedTrx.indexOf(formTrx) > -1) continue;

    if (smsMap.hasOwnProperty(formTrx)) {
      var smsInfo = smsMap[formTrx];
      var emailData = {
        trxId: formTrx,
        email: email,
        amount: smsInfo.amount,
        smsSender: smsInfo.sender
      };

      VARIABLE_MAPPINGS.forEach(function(m) {
        if (m.type === 'value') {
          emailData[m.var] = m.value;
        } else {
          var colIdx = getColIndex(headers, m.keys);
          if (colIdx > -1) emailData[m.var] = row[colIdx];
        }
      });

      emailData = evaluateConditionalRules(emailData);

      var emailStatus = "Failed";
      try {
        var htmlBody = getHtmlTemplate('confirmed', emailData);
        var subject = resolveVariables(SUBJECT_CONFIRMED, emailData);

        GmailApp.sendEmail(email, subject, "", {
          htmlBody: htmlBody,
          name: SENDER_NAME
        });
        emailStatus = "Sent";
        logEntry("Sent confirmation email to " + email + " for Trx " + formTrx, "SUCCESS");
      } catch (err) {
        emailStatus = "Error: " + err.toString();
        logEntry("Failed to send confirmation to " + email + ": " + err.toString(), "ERROR");
      }

      newMatches.push([
        formTrx,
        email,
        emailData.name || "Participant",
        smsInfo.amount,
        smsInfo.sender,
        new Date(),
        emailStatus
      ]);

      processedTrx.push(formTrx);
      batchCount++;
    }
  }

  if (newMatches.length > 0) {
    matchSheet.getRange(matchSheet.getLastRow() + 1, 1, newMatches.length, newMatches[0].length).setValues(newMatches);
    logEntry("Batch completed: " + newMatches.length + " new confirmations recorded.", "INFO");
  }
}

// --- SETUP & TESTING ---

function setupTriggers() {
  checkAndInitialize();
  var triggers = ScriptApp.getProjectTriggers();
  var managedHandlers = ['handleFormSubmit', 'runFullSync'];
  
  triggers.forEach(function(t) {
    if (managedHandlers.indexOf(t.getHandlerFunction()) > -1) {
      ScriptApp.deleteTrigger(t);
    }
  });

  var sheet = SpreadsheetApp.getActive();

  ScriptApp.newTrigger('handleFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('runFullSync')
    .timeBased()
    .everyHours(1)
    .create();

  logEntry("Triggers setup complete: handleFormSubmit (Instant) + runFullSync (Periodic)", "SUCCESS");
}

function testReceivedEmail() {
  var email = Session.getActiveUser().getEmail();
  var testData = {
    name: "Test Participant",
    email: email,
    trxId: "TEST99TRX88",
    amount: "500",
    paymentMethod: "bkash"
  };
  testData = evaluateConditionalRules(testData);
  
  try {
    var htmlBody = getHtmlTemplate('received', testData);
    var subject = resolveVariables(SUBJECT_RECEIVED, testData);
    GmailApp.sendEmail(testData.email, "[TEST] " + subject, "", {
      htmlBody: htmlBody,
      name: SENDER_NAME
    });
    logEntry("Test Received email sent to " + testData.email, "INFO");
  } catch (e) {
    logEntry("Test Received email failed: " + e.toString(), "ERROR");
  }
}

function testWelcomeEmail() {
  testReceivedEmail();
}

function testConfirmedEmail() {
  var email = Session.getActiveUser().getEmail();
  var testData = {
    name: "Test Participant",
    email: email,
    trxId: "TEST99TRX88",
    amount: "500",
    paymentMethod: "bkash",
    smsSender: "bKash"
  };
  testData = evaluateConditionalRules(testData);
  
  try {
    var htmlBody = getHtmlTemplate('confirmed', testData);
    var subject = resolveVariables(SUBJECT_CONFIRMED, testData);
    GmailApp.sendEmail(testData.email, "[TEST] " + subject, "", {
      htmlBody: htmlBody,
      name: SENDER_NAME
    });
    logEntry("Test Confirmed email sent to " + testData.email, "INFO");
  } catch (e) {
    logEntry("Test Confirmed email failed: " + e.toString(), "ERROR");
  }
}
