/**
 * Google Apps Script for Automated Seminar Registration & Payment Verification
 *
 * FEATURES:
 * 1. Sends "Registration Received" email immediately on form submit.
 * 2. Parses SMS Backup XML from Google Drive (bKash format).
 * 3. Matches Form Responses with SMS TrxIDs.
 * 4. Sends "Payment Confirmed" email for matched transactions.
 * 5. Prevents duplicate confirmation emails using a 'Matched_Data' sheet.
 */

// --- CONFIGURATION ---
var EVENT_NAME = "General member registration";
var SUBJECT_WELCOME = "Registration Received: " + EVENT_NAME;
var SUBJECT_CONFIRMED = "Payment Confirmed: " + EVENT_NAME;
var SENDER_NAME = "IEEE BAIUST Student Branch";

// Google Drive File ID for the sms.xml file
var SMS_XML_FILE_ID = "1sbJ8XfiDrDT-T_YwwOZHBfJ5PE3dl6NF";

// SHEET NAMES
var SHEET_FORM_RESPONSES = "Form Responses 1"; // Default Google Form sheet name
var SHEET_SMS_DUMP = "SMS_Dump";
var SHEET_MATCHED = "Matched_Data";

// WhatsApp Group Link
var WHATSAPP_LINK = "https://chat.whatsapp.com/H5Nuzk7UsM68vNv4e2pq1W?mode=gi_t";

// --- HELPERS ---

/**
 * Finds a value in a response object using fuzzy key matching.
 * Prioritizes exact matches and handles short keys like "ID" safely.
 */
function getFuzzyVal(responses, possibleKeys) {
  var rKeys = Object.keys(responses);
  var pKeys = possibleKeys.map(function(k) { return k.toLowerCase().trim(); });

  // 1. Priority: Exact Matches
  for (var i = 0; i < pKeys.length; i++) {
    for (var j = 0; j < rKeys.length; j++) {
      if (rKeys[j].toLowerCase().trim() === pKeys[i]) {
        var val = responses[rKeys[j]];
        return Array.isArray(val) ? val[0] : val;
      }
    }
  }

  // 2. Fallback: Partial Matches
  for (var i = 0; i < pKeys.length; i++) {
    var searchKey = pKeys[i];
    for (var j = 0; j < rKeys.length; j++) {
      var rKeyLower = rKeys[j].toLowerCase().trim();
      if (rKeyLower.indexOf(searchKey) > -1) {
        // Safeguard: Don't let "id" match "trx id" if we are looking for Student ID
        if (searchKey === "id" && rKeyLower.indexOf("trx") > -1 && rKeyLower.indexOf("student") === -1) {
          continue;
        }
        var val = responses[rKeys[j]];
        return Array.isArray(val) ? val[0] : val;
      }
    }
  }
  return "";
}

/**
 * Maps headers to their column index (case-insensitive).
 */
function mapHeaders(headers) {
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    map[headers[i].toLowerCase().trim()] = i;
  }
  return map;
}

/**
 * Gets column index from map using possible names.
 * Prioritizes exact matches and handles short keys like "ID" safely.
 */
function getColIndex(map, possibleNames) {
  var pNames = possibleNames.map(function(n) { return n.toLowerCase().trim(); });
  var mapKeys = Object.keys(map);

  // 1. Priority: Exact Matches
  for (var i = 0; i < pNames.length; i++) {
    if (map.hasOwnProperty(pNames[i])) return map[pNames[i]];
  }

  // 2. Fallback: Partial Matches
  for (var i = 0; i < pNames.length; i++) {
    var searchName = pNames[i];
    for (var j = 0; j < mapKeys.length; j++) {
      var key = mapKeys[j];
      if (key.indexOf(searchName) > -1) {
        // Safeguard: Don't let "id" match "trx id" if we are looking for Student ID
        if (searchName === "id" && key.indexOf("trx") > -1 && key.indexOf("student") === -1) {
          continue;
        }
        return map[key];
      }
    }
  }
  return -1;
}

// --- HTML TEMPLATES ---

function getHtmlTemplate(type, data) {
  var templateName = type === 'welcome' ? 'submission_success' : 'payment_success';
  var html;
  
  try {
    html = HtmlService.createHtmlOutputFromFile(templateName).getContent();
  } catch (e) {
    Logger.log("Template file not found: " + templateName + ". Falling back to basic formatting.");
    html = "<h3>" + (type === 'welcome' ? "Registration Received" : "Payment Confirmed") + "</h3>" +
           "<p>Dear " + (data.name || "Participant") + ",</p>" +
           "<p>Your registration for " + EVENT_NAME + " is " + (type === 'welcome' ? "received" : "confirmed") + ".</p>";
  }

  // Replace placeholders {variable} with data
  var allData = Object.assign({
    whatsappLink: WHATSAPP_LINK,
    eventName: EVENT_NAME,
    senderName: SENDER_NAME
  }, data);

  for (var key in allData) {
    var regex = new RegExp('{' + key + '}', 'g');
    html = html.replace(regex, allData[key] || "N/A");
  }

  return html;
}

// --- TRIGGER 1: WELCOME EMAIL (Immediate) ---

function handleFormSubmit(e) {
  if (!e) {
    Logger.log("handleFormSubmit called without event object. To test, use testEmail() instead.");
    return;
  }

  try {
    var responses = e.namedValues || {};
    var email = getFuzzyVal(responses, ["Email", "Email Address"]);

    if (!email) {
      Logger.log("No email found in submission: " + JSON.stringify(responses));
      return;
    }

    var emailData = {
      name: getFuzzyVal(responses, ["Name", "Full Name"]),
      email: email,
      status: getFuzzyVal(responses, ["Student Status", "Status", "Current/Alumni"]),
      trxId: getFuzzyVal(responses, ["Trx ID", "Transaction", "TrxID"]),
      department: getFuzzyVal(responses, ["Department", "Dept"]),
      batch: getFuzzyVal(responses, ["Batch"]),
      studentId: getFuzzyVal(responses, ["Student ID", "ID"]),
      levelTerm: getFuzzyVal(responses, ["Level", "Term"]),
      whatsapp: getFuzzyVal(responses, ["WhatsApp", "Number", "Phone"])
    };

    var htmlBody = getHtmlTemplate('welcome', emailData);

    GmailApp.sendEmail(email, SUBJECT_WELCOME, "", {
      htmlBody: htmlBody,
      name: SENDER_NAME
    });

    Logger.log("Welcome email sent to: " + email);

  } catch (error) {
    Logger.log("Error in handleFormSubmit: " + error.toString());
  }
}

function testEmail() {
  var testData = {
    name: "Test User",
    email: Session.getActiveUser().getEmail(),
    trxId: "TEST123456",
    department: "Computer Science",
    studentId: "2026-0001"
  };
  
  try {
    var htmlBody = getHtmlTemplate('welcome', testData);
    GmailApp.sendEmail(testData.email, "[TEST] " + SUBJECT_WELCOME, "", {
      htmlBody: htmlBody,
      name: SENDER_NAME
    });
    Logger.log("Test email sent to your inbox: " + testData.email);
  } catch (e) {
    Logger.log("Test email FAILED: " + e.toString());
  }
}


// --- TRIGGER 2: CONFIRMATION EMAIL (Hourly Sync) ---

function runFullSync() {
  processSmsXml();
  matchAndSendEmails();
}

function processSmsXml() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dumpSheet = getOrCreateSheet(ss, SHEET_SMS_DUMP);

  if (dumpSheet.getLastRow() === 0) {
    dumpSheet.appendRow(["Trx ID", "Amount", "Sender", "Reference", "Date", "Full SMS Body", "Imported At"]);
    dumpSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f3f3f3");
  }

  var existingTrx = [];
  if (dumpSheet.getLastRow() > 1) {
    var data = dumpSheet.getRange(2, 1, dumpSheet.getLastRow() - 1, 1).getValues();
    existingTrx = data.map(function(r) { return String(r[0]).trim().toUpperCase(); });
  }

  try {
    var file = DriveApp.getFileById(SMS_XML_FILE_ID);
    if (!file) {
      Logger.log("Could not find SMS XML file with ID: " + SMS_XML_FILE_ID);
      return;
    }
    
    var xmlContent = file.getBlob().getDataAsString();
    var document = XmlService.parse(xmlContent);
    var root = document.getRootElement();
    var smsList = root.getChildren("sms");

    var newRows = [];
    // Robust Regexes
    var regexTrx = /TrxID\s*:?\s*([A-Z0-9]+)/i;
    var regexAmt = /(?:received|Tk|Amount)\s*:?\s*([\d,.]+)/i;
    var regexSender = /(?:from|to)\s+([A-Z0-9_]+|\d+)/i;
    var regexRef = /Ref\s*:?\s*([^.]+)/i;
    var regexDate = /at\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/;

    for (var i = 0; i < smsList.length; i++) {
      var sms = smsList[i];
      var body = sms.getAttribute("body").getValue();
      var address = sms.getAttribute("address").getValue();

      // Filter for bKash messages
      if (address.toLowerCase().indexOf("bkash") === -1) continue;

      var matchTrx = body.match(regexTrx);

      if (matchTrx) {
        var trxId = matchTrx[1].trim().toUpperCase();
        if (existingTrx.indexOf(trxId) > -1) continue;

        var matchAmt = body.match(regexAmt);
        var matchSender = body.match(regexSender);
        var matchRef = body.match(regexRef);
        var matchDate = body.match(regexDate);

        var amount = matchAmt ? matchAmt[1] : "N/A";
        var sender = matchSender ? matchSender[1] : "N/A";
        var reference = matchRef ? matchRef[1].trim() : "N/A";
        var dateStr = matchDate ? matchDate[1] : (sms.getAttribute("readable_date") ? sms.getAttribute("readable_date").getValue() : new Date().toLocaleString());

        newRows.push([trxId, amount, sender, reference, dateStr, body, new Date()]);
        existingTrx.push(trxId);
      }
    }

    if (newRows.length > 0) {
      dumpSheet.getRange(dumpSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      Logger.log("Imported " + newRows.length + " new SMS transactions.");
    } else {
      Logger.log("No new transactions found in XML.");
    }

  } catch (e) {
    Logger.log("Error processing XML: " + e.toString());
  }
}

function matchAndSendEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formSheet = ss.getSheetByName(SHEET_FORM_RESPONSES);
  var dumpSheet = ss.getSheetByName(SHEET_SMS_DUMP);
  var matchSheet = getOrCreateSheet(ss, SHEET_MATCHED);

  if (!formSheet) {
    Logger.log("Form responses sheet not found: " + SHEET_FORM_RESPONSES);
    return;
  }
  if (!dumpSheet) {
    Logger.log("SMS Dump sheet not found: " + SHEET_SMS_DUMP);
    return;
  }

  if (matchSheet.getLastRow() === 0) {
    matchSheet.appendRow(["Trx ID", "Name", "Email", "Department", "Student Status", "Amount (SMS)", "Sender (SMS)", "Matched At", "Email Status"]);
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
  var colMap = mapHeaders(headers);
  
  var idxTrx = getColIndex(colMap, ["Trx ID", "Transaction", "TrxID"]);
  var idxEmail = getColIndex(colMap, ["Email", "Email Address"]);
  var idxName = getColIndex(colMap, ["Name", "Full Name"]);
  var idxStatus = getColIndex(colMap, ["Student Status", "Status", "Current/Alumni"]);
  var idxDept = getColIndex(colMap, ["Department", "Dept"]);
  var idxBatch = getColIndex(colMap, ["Batch"]);
  var idxID = getColIndex(colMap, ["Student ID", "ID"]);
  var idxLevel = getColIndex(colMap, ["Level", "Term"]);

  if (idxTrx === -1 || idxEmail === -1) {
    Logger.log("Critical columns (Trx ID or Email) not found in form responses.");
    return;
  }

  var newMatches = [];

  for (var i = 1; i < formData.length; i++) {
    var row = formData[i];
    var formTrx = String(row[idxTrx]).trim().toUpperCase();
    var email = row[idxEmail];

    if (!formTrx || !email) continue;
    if (processedTrx.indexOf(formTrx) > -1) continue;

    if (smsMap.hasOwnProperty(formTrx)) {
      var smsInfo = smsMap[formTrx];

      var emailData = {
        name: idxName > -1 ? row[idxName] : "",
        status: idxStatus > -1 ? row[idxStatus] : "",
        trxId: formTrx,
        department: idxDept > -1 ? row[idxDept] : "",
        studentId: idxID > -1 ? row[idxID] : "",
        batch: idxBatch > -1 ? row[idxBatch] : "",
        levelTerm: idxLevel > -1 ? row[idxLevel] : ""
      };

      var emailStatus = "Failed";
      try {
        var htmlBody = getHtmlTemplate('confirmed', emailData);
        GmailApp.sendEmail(email, SUBJECT_CONFIRMED, "", {
          htmlBody: htmlBody,
          name: SENDER_NAME
        });
        emailStatus = "Sent";
      } catch (err) {
        emailStatus = "Error: " + err.toString();
        Logger.log("Error sending confirmation to " + email + ": " + err.toString());
      }

      newMatches.push([
        formTrx, 
        emailData.name, 
        email, 
        emailData.department, 
        emailData.status,
        smsInfo.amount, 
        smsInfo.sender, 
        new Date(), 
        emailStatus
      ]);
      processedTrx.push(formTrx);
    }
  }

  if (newMatches.length > 0) {
    matchSheet.getRange(matchSheet.getLastRow() + 1, 1, newMatches.length, newMatches[0].length).setValues(newMatches);
    Logger.log("Processed " + newMatches.length + " new matches.");
  }
}

// --- SETUP ---

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var triggersToCreate = ['handleFormSubmit', 'runFullSync'];
  
  for (var i = 0; i < triggers.length; i++) {
    if (triggersToCreate.indexOf(triggers[i].getHandlerFunction()) > -1) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  var sheet = SpreadsheetApp.getActive();

  // 1. On Form Submit (Instant Welcome Email)
  ScriptApp.newTrigger('handleFormSubmit')
  .forSpreadsheet(sheet)
  .onFormSubmit()
  .create();

  // 2. Hourly Sync (Process SMS & Send Confirmation)
  ScriptApp.newTrigger('runFullSync')
  .timeBased()
  .everyHours(1)
  .create();

  Logger.log("Triggers setup complete: handleFormSubmit (Instant) + runFullSync (Hourly)");
}
