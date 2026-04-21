import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Copy, Code, Settings, X, Plus, Trash2, List, ChevronDown, ChevronRight, Eye, Edit3, Smartphone, Monitor, Zap, Save, Lock, Unlock, Layout, MousePointer2, CopyPlus, Type, CheckCircle2, Wand2, Upload, Download } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';

// --- TYPES ---

interface Field {
  id: string;
  variable: string;
  headers: string;
}

interface SmsParser {
  id: string;
  name: string;
  regexTrx: string;
  regexAmt: string;
}

interface Config {
  id: string;
  projectName: string;
  eventName: string;
  senderName: string;
  smsXmlFileId: string;
  smsSender: string;
  batchSize: number;
  sheetFormResponses: string;
  sheetSmsDump: string;
  sheetMatched: string;
  whatsappLink: string;
  smsParsers: SmsParser[];
  welcomeTemplate: string;
  confirmedTemplate: string;
  fields: Field[];
}

interface AppSettings {
  theme: 'dark' | 'light';
  font: string;
  wordWrap: boolean;
  zoom: number;
}

// --- CONSTANTS ---

const DEFAULT_ID = 'default-project';

const defaultConfig: Config = {
  id: DEFAULT_ID,
  projectName: "New Project",
  eventName: "",
  senderName: "",
  smsXmlFileId: "",
  smsSender: "bkash",
  batchSize: 50,
  sheetFormResponses: "Form Responses 1",
  sheetSmsDump: "SMS_Dump",
  sheetMatched: "Matched_Data",
  whatsappLink: "",
  smsParsers: [
    { id: '1', name: 'bKash', regexTrx: "TrxID\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:received|Tk|Amount)\\s*:?\\s*([\\d,.]+)" }
  ],
  fields: [
    { id: '1', variable: 'name', headers: 'Name, Full Name' },
    { id: '2', variable: 'email', headers: 'Email, Email Address' },
    { id: '3', variable: 'trxId', headers: 'Trx ID, Transaction' }
  ],
  welcomeTemplate: `<div class="inner-card">\n  <h3>Submitted Information</h3>\n  <div class="info-row"><strong>Full Name:</strong> {name}</div>\n  <div class="info-row"><strong>WhatsApp:</strong> {whatsappLink}</div>\n  <div class="info-row"><strong>Trx ID:</strong> {trxId}</div>\n</div>`,
  confirmedTemplate: `<div style="text-align: center; margin: 25px 0;">\n  <a href="{whatsappLink}" class="btn">Join WhatsApp Group</a>\n  <p style="font-size: 12px; color: #666; margin-top: 8px;">Click to join the official seminar group for updates.</p>\n</div>`
};

const HTML_COMPONENTS = [
  { label: 'Button', icon: <MousePointer2 size={12}/>, snippet: '<a href="{whatsappLink}" class="btn">Click Here</a>' },
  { label: 'Footer', icon: <Layout size={12}/>, snippet: '<div style="margin-top:20px; border-top:1px solid #eee; padding-top:10px; font-size:12px; color:#666;">Sent via {senderName}</div>' },
  { label: 'Grid Row', icon: <List size={12}/>, snippet: '<div class="info-row"><strong>Label:</strong> {var}</div>' }
];

const formatHTML = (html: string) => {
  let formatted = '';
  let indent = 0;
  html.split(/>\s*</).forEach(element => {
    if (element.match(/^\/\w/)) indent--;
    formatted += '  '.repeat(indent > 0 ? indent : 0) + '<' + element + '>\n';
    if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("input") && !element.startsWith("img") && !element.startsWith("br") && !element.startsWith("hr")) indent++;
  });
  return formatted.trim();
};
const App: React.FC = () => {
  const [projects, setProjects] = useState<Config[]>(() => {
    const saved = localStorage.getItem('warsg_projects_v3') || localStorage.getItem('web_pars_projects_v3');
    const parsed = saved ? JSON.parse(saved) : [defaultConfig];
    return parsed.map((p: any) => ({
      ...defaultConfig,
      ...p,
      smsParsers: p.smsParsers || [
        { id: '1', name: 'bKash', regexTrx: p.regexTrx || defaultConfig.smsParsers[0].regexTrx, regexAmt: p.regexAmt || defaultConfig.smsParsers[0].regexAmt }
      ]
    }));
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return localStorage.getItem('warsg_active_id_v3') || localStorage.getItem('web_pars_active_id_v3') || DEFAULT_ID;
  });

  const [isSaving, setIsSaving] = useState(false);

  const config = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  const updateConfig = (newConfig: Config) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? newConfig : p));
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 800);
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('warsg_settings_v3') || localStorage.getItem('web_pars_settings_v3');
    return saved ? JSON.parse(saved) : {
      theme: 'dark', font: '"JetBrains Mono", monospace', wordWrap: false, zoom: 13
    };
  });

  const [activeTab, setActiveTab] = useState<'code' | 'welcome-edit' | 'confirmed-edit' | 'preview-welcome' | 'preview-confirmed'>('code');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showSettings, setShowSettings] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    general: false, regex: true, mapping: false, library: true
  });

  const [manualCode, setManualCode] = useState<string>('');
  const [isSyncLocked, setIsSyncLocked] = useState(false);
  const [flashCode, setFlashCode] = useState(false);
  const [testSms, setTestSms] = useState('');
  const [regexResult, setRegexResult] = useState<{ trx?: string, amt?: string }>({});

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const highlightedCode = useMemo(() => {
    const code = activeTab === 'code' ? manualCode : (activeTab.includes('edit') ? (activeTab.includes('welcome') ? config.welcomeTemplate : config.confirmedTemplate) : '');
    const lang = activeTab === 'code' ? 'javascript' : 'markup';
    return Prism.highlight(code || '', Prism.languages[lang], lang);
  }, [manualCode, config.welcomeTemplate, config.confirmedTemplate, activeTab]);

  useEffect(() => {
    localStorage.setItem('warsg_projects_v3', JSON.stringify(projects));
    localStorage.setItem('warsg_active_id_v3', activeProjectId);
  }, [projects, activeProjectId]);

  useEffect(() => {
    localStorage.setItem('warsg_settings_v3', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!testSms) { setRegexResult({}); return; }
    try {
      let foundTrx = 'No match';
      let foundAmt = 'No match';
      for (const parser of (config.smsParsers || [])) {
        const rTrx = new RegExp(parser.regexTrx, 'i');
        const rAmt = new RegExp(parser.regexAmt, 'i');
        const matchTrx = testSms.match(rTrx);
        const matchAmt = testSms.match(rAmt);
        if (matchTrx) foundTrx = matchTrx[1];
        if (matchAmt) foundAmt = matchAmt[1];
        if (matchTrx || matchAmt) break;
      }
      setRegexResult({ trx: foundTrx, amt: foundAmt });
    } catch { setRegexResult({ trx: 'Invalid', amt: 'Invalid' }); }
  }, [testSms, config.smsParsers]);

  const autoGeneratedCode = useMemo(() => {
    const fieldMappingJS = config.fields.map(f => `    { var: "${f.variable}", keys: [${f.headers.split(',').map(k => `"${k.trim()}"`).join(', ')}] }`).join(',\n');
    const smsParsersJS = JSON.stringify((config.smsParsers || []).map(p => ({ name: p.name, regexTrx: p.regexTrx, regexAmt: p.regexAmt })), null, 2);
    
    return `/**
 * WARSG generated Apps Script
 * Generated: ${new Date().toLocaleDateString()}
 */

var EVENT_NAME = "${config.eventName}";
var SENDER_NAME = "${config.senderName}";
var SMS_XML_FILE_ID = "${config.smsXmlFileId}";
var BATCH_SIZE = ${config.batchSize};
var SHEET_FORM_RESPONSES = "${config.sheetFormResponses}";
var SHEET_SMS_DUMP = "${config.sheetSmsDump}";
var SHEET_MATCHED = "${config.sheetMatched}";
var SHEET_LOGS = "Execution_Logs";
var WHATSAPP_LINK = "${config.whatsappLink}";

var SMS_PARSERS = ${smsParsersJS};

function checkAndInitialize() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [SHEET_LOGS, SHEET_SMS_DUMP, SHEET_MATCHED].forEach(function(n) { if(!ss.getSheetByName(n)) ss.insertSheet(n); });
}

function runFullSync() {
  processSmsXml();
  matchAndSendEmails();
}

function processSmsXml() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dumpSheet = getOrCreateSheet(ss, SHEET_SMS_DUMP);
  if (dumpSheet.getLastRow() === 0) {
    dumpSheet.appendRow(["Trx ID", "Amount", "Sender", "Reference", "Date", "Full SMS Body", "Imported At"]);
  }

  var existingTrx = [];
  if (dumpSheet.getLastRow() > 1) {
    existingTrx = dumpSheet.getRange(2, 1, dumpSheet.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]).trim().toUpperCase(); });
  }

  try {
    var file = DriveApp.getFileById(SMS_XML_FILE_ID);
    var xmlContent = file.getBlob().getDataAsString();
    var document = XmlService.parse(xmlContent);
    var root = document.getRootElement();
    var smsList = root.getChildren("sms");
    var newRows = [];

    for (var i = 0; i < smsList.length; i++) {
      var body = smsList[i].getAttribute("body").getValue();
      var dateStr = smsList[i].getAttribute("readable_date") ? smsList[i].getAttribute("readable_date").getValue() : new Date().toLocaleString();
      
      for (var j = 0; j < SMS_PARSERS.length; j++) {
        var p = SMS_PARSERS[j];
        var matchTrx = body.match(new RegExp(p.regexTrx, 'i'));
        if (matchTrx) {
          var trxId = matchTrx[1].trim().toUpperCase();
          if (existingTrx.indexOf(trxId) === -1) {
            var matchAmt = body.match(new RegExp(p.regexAmt, 'i'));
            newRows.push([trxId, matchAmt ? matchAmt[1] : "N/A", p.name, "N/A", dateStr, body, new Date()]);
            existingTrx.push(trxId);
          }
          break;
        }
      }
    }

    if (newRows.length > 0) dumpSheet.getRange(dumpSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  } catch (e) { Logger.log("Error: " + e.toString()); }
}

function handleFormSubmit(e) {
  if (!e) return;
  var responses = e.namedValues || {};
  var emailData = {};
  var fields = [
${fieldMappingJS}
  ];
  fields.forEach(function(f) { emailData[f.var] = getFuzzyVal(responses, f.keys); });
  if (!emailData.email) {
    Logger.log("No email found in submission.");
    return;
  }
  GmailApp.sendEmail(emailData.email, "Registration Received: " + EVENT_NAME, "", { 
    htmlBody: getHtmlTemplate('welcome', emailData), 
    name: SENDER_NAME 
  });
}

function getFuzzyVal(r, keys) {
  for (var i=0; i<keys.length; i++) { 
    var key = keys[i].trim();
    if(r[key]) return r[key][0]; 
    // Case insensitive fallback
    for (var rk in r) { if(rk.toLowerCase().trim() === key.toLowerCase()) return r[rk][0]; }
  }
  return "";
}

function matchAndSendEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formSheet = ss.getSheetByName(SHEET_FORM_RESPONSES);
  var dumpSheet = ss.getSheetByName(SHEET_SMS_DUMP);
  var matchSheet = getOrCreateSheet(ss, SHEET_MATCHED);
  if (!formSheet || !dumpSheet) return;

  if (matchSheet.getLastRow() === 0) matchSheet.appendRow(["Trx ID", "Name", "Email", "Dept", "Status", "Amount", "Sender", "Matched At", "Status"]);
  
  var processedTrx = [];
  if (matchSheet.getLastRow() > 1) processedTrx = matchSheet.getRange(2, 1, matchSheet.getLastRow() - 1, 1).getValues().map(function(r) { return String(r[0]).trim().toUpperCase(); });

  var smsMap = {};
  if (dumpSheet.getLastRow() > 1) {
    var sData = dumpSheet.getRange(2, 1, dumpSheet.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < sData.length; i++) smsMap[String(sData[i][0]).trim().toUpperCase()] = { amount: sData[i][1], sender: sData[i][2] };
  }

  var formData = formSheet.getDataRange().getValues();
  var headers = formData[0].map(function(h) { return h.toLowerCase().trim(); });
  var colMap = {}; headers.forEach(function(h, i) { colMap[h] = i; });

  var getCol = function(keys) {
    for (var i=0; i<keys.length; i++) {
      var k = keys[i].toLowerCase().trim();
      if (colMap.hasOwnProperty(k)) return colMap[k];
      for (var h in colMap) { if (h.indexOf(k) > -1) return colMap[h]; }
    }
    return -1;
  };

  var fields = [
${fieldMappingJS}
  ];

  var idxTrx = getCol(["trx", "transaction"]);
  var emailField = fields.find(function(f) { return f.var === "email"; });
  var idxEmail = emailField ? getCol(emailField.keys) : getCol(["email"]);

  if (idxTrx === -1 || idxEmail === -1) {
    Logger.log("Critical columns (Trx ID or Email) not found.");
    return;
  }

  var newMatches = [];

  for (var i = 1; i < formData.length; i++) {
    var row = formData[i];
    var fTrx = String(row[idxTrx]).trim().toUpperCase();
    if (fTrx && processedTrx.indexOf(fTrx) === -1 && smsMap[fTrx]) {
      var emailData = { trxId: fTrx };
      fields.forEach(function(f) { 
        var idx = getCol(f.headers || f.keys); 
        if(idx > -1) emailData[f.var] = row[idx]; 
      });
      emailData.email = row[idxEmail];
      
      try {
        GmailApp.sendEmail(emailData.email, "Payment Confirmed: " + EVENT_NAME, "", { 
          htmlBody: getHtmlTemplate('confirmed', emailData), 
          name: SENDER_NAME 
        });
        newMatches.push([fTrx, emailData.name || "N/A", emailData.email, emailData.department || "", emailData.status || "", smsMap[fTrx].amount, smsMap[fTrx].sender, new Date(), "Sent"]);
        processedTrx.push(fTrx);
      } catch(e) {
        Logger.log("Error sending to " + emailData.email + ": " + e.toString());
      } 
    }
  }
  if (newMatches.length > 0) matchSheet.getRange(matchSheet.getLastRow() + 1, 1, newMatches.length, newMatches[0].length).setValues(newMatches);
}

function getOrCreateSheet(ss, name) {
  var s = ss.getSheetByName(name);
  return s || ss.insertSheet(name);
}

function getHtmlTemplate(type, data) {
  var body = type === 'welcome' ? ${JSON.stringify(config.welcomeTemplate)} : ${JSON.stringify(config.confirmedTemplate)};
  var allData = Object.assign({whatsappLink: WHATSAPP_LINK, eventName: EVENT_NAME, senderName: SENDER_NAME}, data);
  for (var k in allData) { body = body.replace(new RegExp('{' + k + '}', 'g'), allData[k] || "N/A"); }
  return body;
}

function setupTriggers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });

  ScriptApp.newTrigger('handleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  
  var interval = ${(config as any).syncInterval || 60};
  if (interval >= 60) {
    ScriptApp.newTrigger('runFullSync').timeBased().everyHours(Math.floor(interval/60)).create();
  } else {
    // Valid values for everyMinutes: 1, 5, 10, 15, 30
    var validMinutes = [1, 5, 10, 15, 30];
    var closest = validMinutes.reduce(function(prev, curr) {
      return (Math.abs(curr - interval) < Math.abs(prev - interval) ? curr : prev);
    });
    ScriptApp.newTrigger('runFullSync').timeBased().everyMinutes(closest).create();
  }
  
  Logger.log("Triggers set up successfully.");
}

function testEmail() {
  var email = Session.getActiveUser().getEmail();
  var data = { name: "Test User", trxId: "TEST123456", email: email };
  GmailApp.sendEmail(email, "[TEST] Welcome", "", { htmlBody: getHtmlTemplate('welcome', data), name: SENDER_NAME });
  Logger.log("Test email sent to " + email);
  }
  `;
    }, [config]);
  useEffect(() => { if (!isSyncLocked) { setManualCode(autoGeneratedCode); setFlashCode(true); setTimeout(() => setFlashCode(false), 800); } }, [autoGeneratedCode, isSyncLocked]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    let val = value;
    if (name === 'smsXmlFileId') val = value.match(/[-\w]{25,}/)?.[0] || value;
    if (name === 'batchSize') val = parseInt(value) || 0;
    updateConfig({ ...config, [name]: val });
    if (name.includes('Template')) setIsSyncLocked(false);
  };

  const handleManualCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualCode(e.target.value);
    setIsSyncLocked(true);
  };

  const handleScroll = (e: any) => {
    const t = e.target;
    const h = t.previousSibling;
    if (h) { h.scrollTop = t.scrollTop; h.scrollLeft = t.scrollLeft; }
  };

  const toggleSection = (id: string) => setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'rename' | 'clone'>('none');
  const [modalInputValue, setModalValue] = useState('');

  const openModal = (mode: 'create' | 'rename' | 'clone') => {
    setModalMode(mode);
    setModalValue(mode === 'create' ? '' : config.projectName);
  };

  const handleModalAction = () => {
    if (!modalInputValue.trim()) return;
    
    if (modalMode === 'create') {
      const newId = Date.now().toString();
      const newProject = { ...defaultConfig, id: newId, projectName: modalInputValue };
      setProjects([...projects, newProject]);
      setActiveProjectId(newId);
    } else if (modalMode === 'rename') {
      setProjects(projects.map(p => p.id === activeProjectId ? { ...p, projectName: modalInputValue } : p));
    } else if (modalMode === 'clone') {
      const newId = Date.now().toString();
      const newProject = { ...config, id: newId, projectName: modalInputValue };
      setProjects([...projects, newProject]);
      setActiveProjectId(newId);
    }
    
    setModalMode('none');
  };

  const insertTag = (tag: string) => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const name = editorRef.current.name as any;
    const text = (config as any)[name];
    if (!text) return;
    const newText = text.substring(0, start) + "{" + tag + "}" + text.substring(editorRef.current.selectionEnd);
    updateConfig({ ...config, [name]: newText });
  };

  const insertComponent = (snippet: string) => {
    if (!editorRef.current) return;
    const start = editorRef.current.selectionStart;
    const name = editorRef.current.name as any;
    const text = (config as any)[name];
    if (!text) return;
    const newText = text.substring(0, start) + snippet + text.substring(editorRef.current.selectionEnd);
    updateConfig({ ...config, [name]: newText });
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "warsg_" + config.projectName.replace(/\s/g, '_') + ".json";
    a.click();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        const newId = Date.now().toString();
        const newProject = { ...defaultConfig, ...imported, id: newId };
        setProjects(prev => [...prev, newProject]);
        setActiveProjectId(newId);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const downloadCode = () => {
    const blob = new Blob([manualCode], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "Code.gs";
    a.click();
  };

  const renderPreview = (type: 'welcome' | 'confirmed') => {
    let body = type === 'welcome' ? config.welcomeTemplate : config.confirmedTemplate;
    const mock: any = { whatsappLink: config.whatsappLink || "#", eventName: config.eventName || "Demo Event", senderName: config.senderName || "Admin" };
    config.fields.forEach(f => mock[f.variable] = "<span style='color:var(--accent-color); font-weight:bold;'>[" + f.variable + "]</span>");
    Object.entries(mock).forEach(([varName, varValue]) => {
      body = body.replace(new RegExp('{' + varName + '}', 'g'), String(varValue));
    });
    
    // Wrap in a basic HTML structure with a reset to prevent "white borders" or spacing issues
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: transparent; }
          </style>
        </head>
        <body>${body}</body>
      </html>
    `;
  };


  const handleSettingsChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setSettings({ ...settings, [name]: type === 'checkbox' ? checked : (name === 'zoom' ? parseInt(value) : value) });
  };

  const resetToDefault = () => {
    if (confirm("Reset current project? Core logic (SMS Regex) will be restored, while basic info and extra fields will be removed.")) {
      updateConfig({
        ...defaultConfig,
        id: config.id,
        projectName: config.projectName,
        // Keep only mandatory email field
        fields: [{ id: 'email-id', variable: 'email', headers: 'Email' }],
        // Restore core logics from default
        smsParsers: defaultConfig.smsParsers,
      });
      setIsSyncLocked(false);
    }
  };

  return (
    <div className={"app-container " + (settings.theme === 'light' ? 'theme-light' : '')}>
      <nav className="navbar">
        <div className="navbar-title">WARSG</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={resetToDefault} title="Reset to Defaults"><Zap size={14} /> Reset</button>
          <button className="btn btn-secondary" onClick={() => setShowSettings(true)}><Settings size={14} /></button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={importConfig} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} title="Import Project"><Upload size={14} /></button>
          <button className="btn btn-secondary" onClick={exportConfig} title="Export Current Project"><Save size={14} /></button>
          <button className="btn btn-secondary" onClick={downloadCode} title="Download Code"><Download size={14} /></button>
          <button className="btn" onClick={() => { navigator.clipboard.writeText(manualCode); alert("Copied!"); }}><Copy size={14} /> Copy Code</button>
        </div>
      </nav>

      <main className="main-content">
        <aside className="sidebar">
          <div className="project-manager">
            <label>Active Project</label>
            <select value={activeProjectId} onChange={e => setActiveProjectId(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
            </select>
            <div className="project-actions">
              <button className="btn btn-secondary" title="New Project" onClick={() => openModal('create')}><Plus size={14}/></button>
              <button className="btn btn-secondary" title="Clone Project" onClick={() => openModal('clone')}><CopyPlus size={14}/></button>
              <button className="btn btn-secondary" title="Rename Project" onClick={() => openModal('rename')}><Type size={14}/></button>
              <button className="btn btn-secondary" title="Delete Project" onClick={() => { 
                if(projects.length > 1 && confirm("Delete project?")) { 
                  const newProjects = projects.filter(p => p.id !== activeProjectId);
                  setProjects(newProjects);
                  setActiveProjectId(newProjects[0].id);
                } 
              }}><Trash2 size={14}/></button>
            </div>
          </div>

          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('general')}><div className="section-title">{collapsedSections.general ? <ChevronRight size={12} /> : <ChevronDown size={12} />} General</div></div>
            {!collapsedSections.general && <div className="accordion-content">
              <div className="form-group"><label>Event Name</label><input name="eventName" value={config.eventName} onChange={handleInputChange} /></div>
              <div className="form-group"><label>Sender Name</label><input name="senderName" value={config.senderName} onChange={handleInputChange} /></div>
              <div className="form-group"><label>SMS Sender</label><input name="smsSender" value={config.smsSender} onChange={handleInputChange} /></div>
              <div className="form-group"><label>Batch Size</label><input type="number" name="batchSize" value={config.batchSize} onChange={handleInputChange} /></div>
              <div className="form-group"><label>Sync Interval (mins)</label><input type="number" name="syncInterval" value={(config as any).syncInterval || 60} onChange={handleInputChange} /></div>
              <div className="form-group"><label>SMS File ID</label><input name="smsXmlFileId" value={config.smsXmlFileId} onChange={handleInputChange} /></div>
              <div className="form-group"><label>WA Link</label><input name="whatsappLink" value={config.whatsappLink} onChange={handleInputChange} /></div>
            </div>}
          </div>

          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('regex')}><div className="section-title">{collapsedSections.regex ? <ChevronRight size={12} /> : <ChevronDown size={12} />} SMS Parsing</div></div>
            {!collapsedSections.regex && <div className="accordion-content">
              <button className="btn btn-secondary" style={{width:'100%', justifyContent:'center', marginBottom: '8px'}} onClick={() => updateConfig({...config, smsParsers: [...(config.smsParsers || []), {id: Date.now().toString(), name: 'New Parser', regexTrx: '', regexAmt: ''}]})}><Plus size={14}/> Add Parser</button>
              
              {(config.smsParsers || []).map(p => (
                <div key={p.id} className="parser-row" style={{border:'1px solid var(--border-color)', padding:'10px', borderRadius:'var(--radius-md)', marginBottom:'8px', display:'flex', flexDirection:'column', gap:'8px', backgroundColor:'var(--bg-tertiary)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <input style={{fontWeight:'bold', fontSize:'11px', height:'24px', width:'70%'}} value={p.name} onChange={e => updateConfig({...config, smsParsers: config.smsParsers.map(x=>x.id===p.id?{...x, name: e.target.value}:x)})} />
                    <button className="btn-delete" onClick={() => updateConfig({...config, smsParsers: config.smsParsers.filter(x=>x.id!==p.id)})}><Trash2 size={12}/></button>
                  </div>
                  <div className="form-group"><label style={{fontSize:'10px'}}>Trx Regex</label><input style={{fontSize:'11px', height:'28px', fontFamily:'monospace'}} value={p.regexTrx} onChange={e => updateConfig({...config, smsParsers: config.smsParsers.map(x=>x.id===p.id?{...x, regexTrx: e.target.value}:x)})} /></div>
                  <div className="form-group"><label style={{fontSize:'10px'}}>Amt Regex</label><input style={{fontSize:'11px', height:'28px', fontFamily:'monospace'}} value={p.regexAmt} onChange={e => updateConfig({...config, smsParsers: config.smsParsers.map(x=>x.id===p.id?{...x, regexAmt: e.target.value}:x)})} /></div>
                </div>
              ))}

              <div className="regex-tester">
                <label style={{ color: 'var(--accent-color)', fontWeight: 'bold', display:'flex', alignItems:'center', gap:'4px' }}><Zap size={10} /> Test Regex</label>
                <textarea placeholder="Paste SMS..." style={{ height: '40px', fontSize: '11px', marginTop: '6px' }} value={testSms} onChange={e => setTestSms(e.target.value)} />
                {testSms && <div className="regex-result"><div className="result-item"><span>ID:</span> <b>{regexResult.trx}</b></div><div className="result-item"><span>Amt:</span> <b>{regexResult.amt}</b></div></div>}
              </div>
            </div>}
          </div>

          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('mapping')}><div className="section-title">{collapsedSections.mapping ? <ChevronRight size={12} /> : <ChevronDown size={12} />} Field Mapping</div></div>
            {!collapsedSections.mapping && <div className="accordion-content">
              <button className="btn btn-secondary" style={{width:'100%', justifyContent:'center', marginBottom: '12px'}} onClick={() => updateConfig({...config, fields: [...config.fields, {id: Date.now().toString(), variable: '', headers: ''}]})}><Plus size={14}/> Add Field</button>
              
              <div className="field-mapping-container">
                <div className="field-header-row">
                  <span style={{flex: 1}}>Var</span>
                  <span style={{flex: 2}}>Form Headers</span>
                  <span style={{width: '30px'}}></span>
                </div>
                {config.fields.map(f => (
                  <div key={f.id} className="field-row" style={f.variable === 'email' ? {borderLeft: '2px solid var(--accent-color)'} : {}}>
                    <input 
                      placeholder="name" 
                      value={f.variable} 
                      readOnly={f.variable === 'email'}
                      style={f.variable === 'email' ? {opacity: 0.8, cursor: 'not-allowed'} : {}}
                      onChange={e => updateConfig({...config, fields: config.fields.map(x=>x.id===f.id?{...x, variable: e.target.value}:x)})} 
                    />
                    <input placeholder="Name, Full Name" value={f.headers} onChange={e => updateConfig({...config, fields: config.fields.map(x=>x.id===f.id?{...x, headers: e.target.value}:x)})} />
                    {f.variable !== 'email' ? (
                      <button className="btn-delete" onClick={() => updateConfig({...config, fields: config.fields.filter(x=>x.id!==f.id)})}><Trash2 size={14}/></button>
                    ) : (
                      <div style={{width: '30px', display: 'flex', justifyContent: 'center'}} title="Mandatory Field"><Lock size={12} style={{opacity: 0.5}}/></div>
                    )}
                  </div>
                ))}
              </div>
            </div>}
          </div>

          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('library')}><div className="section-title">{collapsedSections.library ? <ChevronRight size={12} /> : <ChevronDown size={12} />} Library</div></div>
            {!collapsedSections.library && <div className="accordion-content">
              <div className="variable-tag-list">
                {config.fields.map(f => f.variable && <span key={f.id} className="variable-tag" onClick={() => insertTag(f.variable)}>{"{" + f.variable + "}"}</span>)}
                <span className="variable-tag" onClick={() => insertTag('whatsappLink')}>{"{whatsappLink}"}</span>
              </div>
              <div className="component-picker" style={{marginTop:'8px'}}>
                {HTML_COMPONENTS.map(c => (
                  <div key={c.label} className="comp-btn-wrapper">
                    <button className="comp-btn" onClick={() => insertComponent(c.snippet)}>{c.icon} {c.label}</button>
                  </div>
                ))}
              </div>
            </div>}
          </div>
        </aside>

        <section className="editor-panel">
          <div className="tabs">
            <div className={"tab " + (activeTab === 'code' ? 'active' : '')} onClick={() => setActiveTab('code')}><Code size={14}/> Code.gs</div>
            <div className={"tab " + (activeTab === 'welcome-edit' ? 'active' : '')} onClick={() => setActiveTab('welcome-edit')}><Edit3 size={14}/> Welcome</div>
            <div className={"tab " + (activeTab === 'confirmed-edit' ? 'active' : '')} onClick={() => setActiveTab('confirmed-edit')}><Edit3 size={14}/> Confirmed</div>
            <div className={"tab " + (activeTab.startsWith('preview') ? 'active' : '')} onClick={() => setActiveTab(activeTab.includes('confirmed') ? 'preview-confirmed' : 'preview-welcome')}><Eye size={14}/> Preview</div>
            <div className="editor-header-actions">
              {activeTab === 'code' && <div className={"sync-toggle " + (isSyncLocked ? 'locked' : '')} onClick={() => setIsSyncLocked(!isSyncLocked)}>{isSyncLocked ? <Lock size={12}/> : <Unlock size={12}/>} {isSyncLocked ? 'Manual' : 'Synced'}</div>}
              {activeTab.startsWith('preview') && (
                <div style={{display:'flex', gap:'4px'}}>
                  <button className={"btn btn-secondary " + (previewMode === 'desktop' ? 'active' : '')} onClick={() => setPreviewMode('desktop')} style={{padding:'4px 8px', fontSize:'10px', display:'flex', alignItems:'center', gap:'4px'}}><Monitor size={12}/> Desktop</button>
                  <button className={"btn btn-secondary " + (previewMode === 'mobile' ? 'active' : '')} onClick={() => setPreviewMode('mobile')} style={{padding:'4px 8px', fontSize:'10px', display:'flex', alignItems:'center', gap:'4px'}}><Smartphone size={12}/> Mobile</button>
                </div>
              )}
            </div>
          </div>
          <div className="editor-wrapper">
            {activeTab.includes('edit') || activeTab === 'code' ? (
              <>
                <div className="highlighter-layer" dangerouslySetInnerHTML={{ __html: highlightedCode + '\n\n' }} style={{ whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre', fontSize: settings.zoom + 'px' }} />
                <textarea ref={editorRef} className={"editor-area " + (flashCode ? 'code-flash' : '')} name={activeTab === 'code' ? 'manualCode' : (activeTab.includes('welcome') ? 'welcomeTemplate' : 'confirmedTemplate')} value={activeTab === 'code' ? manualCode : (activeTab.includes('welcome') ? config.welcomeTemplate : config.confirmedTemplate)} onChange={activeTab === 'code' ? handleManualCodeChange : handleInputChange} onScroll={handleScroll} spellCheck={false} style={{ whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre', fontSize: settings.zoom + 'px' }} />
                {activeTab.includes('edit') && <button className="btn btn-secondary format-btn" onClick={() => { const n = activeTab.includes('welcome') ? 'welcomeTemplate' : 'confirmedTemplate'; updateConfig({...config, [n]: formatHTML((config as any)[n])}); }}><Wand2 size={12}/></button>}
              </>
            ) : (
              <div className="preview-container">
                <div className={"preview-frame-container " + (previewMode === 'mobile' ? 'preview-mobile' : 'preview-desktop')}>
                  <iframe 
                    title="Preview"
                    className="preview-frame" 
                    srcDoc={renderPreview(activeTab.includes('welcome') ? 'welcome' : 'confirmed')} 
                  />
                </div>
              </div>
            )}
          </div>
          <div className="status-bar">
            <div className={"save-indicator " + (isSaving ? 'saving' : '')}>{isSaving ? <Zap size={10}/> : <CheckCircle2 size={10}/>} {isSaving ? 'Saving...' : 'Saved'}</div>
            <div>{config.projectName}</div>
          </div>
        </section>
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><div>Settings</div><button className="btn btn-secondary" style={{padding:'4px'}} onClick={() => setShowSettings(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div className="settings-row">
                <label>Theme</label>
                <select name="theme" value={settings.theme} onChange={handleSettingsChange}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
              <div className="settings-row">
                <label>Zoom</label>
                <input name="zoom" type="number" value={settings.zoom} onChange={handleSettingsChange} />
              </div>
              <div className="settings-row">
                <label>Word Wrap</label>
                <label className="switch">
                  <input name="wordWrap" type="checkbox" checked={settings.wordWrap} onChange={handleSettingsChange} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <div className="modal-footer"><button className="btn" onClick={() => setShowSettings(false)}>Done</button></div>
          </div>
        </div>
      )}

      {modalMode !== 'none' && (
        <div className="modal-overlay" onClick={() => setModalMode('none')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>{modalMode === 'create' ? 'New Project' : modalMode === 'rename' ? 'Rename Project' : 'Clone Project'}</div>
              <button className="btn btn-secondary" style={{padding:'4px'}} onClick={() => setModalMode('none')}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  autoFocus 
                  value={modalInputValue} 
                  onChange={e => setModalValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleModalAction()}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalMode('none')}>Cancel</button>
              <button className="btn" onClick={handleModalAction}>
                {modalMode === 'create' ? 'Create' : modalMode === 'rename' ? 'Rename' : 'Clone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
