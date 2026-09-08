import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Copy, Code, Settings, X, Plus, Trash2, List, ChevronDown, ChevronRight, 
  Eye, EyeOff, Edit3, Smartphone, Monitor, Zap, Save, Lock, Unlock, Layout, 
  MousePointer2, CopyPlus, Type, CheckCircle2, Wand2, Upload, Download,
  Sparkles, Check, AlertCircle, GitBranch, Maximize2, Minimize2
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';

// --- TYPES ---

export type MappingType = 'field' | 'value';

export interface VariableMapping {
  id: string;
  variable: string;
  type: MappingType;
  value: string;
}

export interface ConditionalBranch {
  id: string;
  type: 'if' | 'else_if' | 'else';
  operator?: string;
  matchValue: string;
  targetVariable: string;
  assignValue: string;
}

export interface ConditionalRule {
  id: string;
  targetField: string;
  branches: ConditionalBranch[];
}

export interface SmsParser {
  id: string;
  name: string;
  regexTrx: string;
  regexAmt: string;
}

export interface Config {
  id: string;
  projectName: string;
  eventName: string;
  senderName: string;
  receivedSubject: string;
  confirmedSubject: string;
  smsXmlFileId: string;
  smsSender: string;
  batchSize: number;
  syncInterval: number;
  sheetFormResponses: string;
  sheetSmsDump: string;
  sheetMatched: string;
  sheetLogs: string;
  whatsappLink: string;
  smsParsers: SmsParser[];
  receivedTemplate: string;
  confirmedTemplate: string;
  variables: VariableMapping[];
  conditionalRules: ConditionalRule[];
}

export interface AppSettings {
  theme: 'dark' | 'light';
  font: string;
  wordWrap: boolean;
  zoom: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

// --- CONSTANTS & PRESETS ---

const DEFAULT_ID = 'default-project';
const DEFAULT_SIDEBAR_WIDTH = 340;
const MIN_SIDEBAR_WIDTH = 260;
const MAX_SIDEBAR_WIDTH = 700;

const SMS_PARSER_PRESETS: { name: string; regexTrx: string; regexAmt: string }[] = [
  { name: 'bKash', regexTrx: "TrxID\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:received|Tk|Amount)\\s*:?\\s*([\\d,.]+)" },
  { name: 'Nagad', regexTrx: "TxnID\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:Amount|Tk)\\s*:?\\s*([\\d,.]+)" },
  { name: 'Rocket', regexTrx: "(?:TxnId|Txn ID)\\s*:?\\s*([0-9]+)", regexAmt: "(?:Tk|Amount)\\s*:?\\s*([\\d,.]+)" },
  { name: 'Upay', regexTrx: "(?:TrxID|TxnID)\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:Tk|Amount)\\s*:?\\s*([\\d,.]+)" }
];

const defaultConfig: Config = {
  id: DEFAULT_ID,
  projectName: "Seminar Registration",
  eventName: "Web Development Bootcamp 2026",
  senderName: "Event Organizing Team",
  receivedSubject: "Registration Received: $eventName",
  confirmedSubject: "Payment Confirmed: $eventName",
  smsXmlFileId: "",
  smsSender: "bkash",
  batchSize: 50,
  syncInterval: 15,
  sheetFormResponses: "Form Responses 1",
  sheetSmsDump: "SMS_Dump",
  sheetMatched: "Matched_Data",
  sheetLogs: "Execution_Logs",
  whatsappLink: "https://chat.whatsapp.com/demo-invite-code",
  smsParsers: [
    { id: '1', name: 'bKash', regexTrx: "TrxID\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:received|Tk|Amount)\\s*:?\\s*([\\d,.]+)" },
    { id: '2', name: 'Nagad', regexTrx: "TxnID\\s*:?\\s*([A-Z0-9]+)", regexAmt: "(?:Amount|Tk)\\s*:?\\s*([\\d,.]+)" }
  ],
  variables: [
    { id: '1', variable: 'name', type: 'field', value: 'Name, Full Name, Participant Name' },
    { id: '2', variable: 'email', type: 'field', value: 'Email, Email Address' },
    { id: '3', variable: 'trxId', type: 'field', value: 'Trx ID, Transaction ID, TrxID, Transaction' },
    { id: '4', variable: 'paymentMethod', type: 'field', value: 'Payment Method, Payment Medium, BKash / Nagad' },
    { id: '5', variable: 'ticketType', type: 'value', value: 'Standard Attendee' }
  ],
  conditionalRules: [],
  receivedTemplate: `<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 20px; font-weight: 700;">$eventName</h2>
    <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Registration Received</p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 15px; margin-top: 0;">Dear <strong>$name</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for registering! We have received your submission. Once your payment transaction is verified by our automated system, you will receive a confirmation email with complete access details.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 12px; letter-spacing: 0.05em;">Submission Summary</div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
        <span style="color: #64748b;">Participant Name:</span>
        <span style="font-weight: 600;">$name</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
        <span style="color: #64748b;">Transaction ID:</span>
        <span style="font-family: monospace; font-weight: 700; color: #2563eb;">$trxId</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px;">
        <span style="color: #64748b;">Status:</span>
        <span style="color: #d97706; font-weight: 600; background-color: #fef3c7; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">Verification Pending</span>
      </div>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">If you have any questions or entered the wrong TrxID, please contact us immediately.</p>
  </div>
  <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
    Sent by $senderName
  </div>
</div>`,
  confirmedTemplate: `<div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; text-align: center; color: white;">
    <h2 style="margin: 0; font-size: 20px; font-weight: 700;">$eventName</h2>
    <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Payment Confirmed & Seat Reserved</p>
  </div>
  <div style="padding: 24px;">
    <p style="font-size: 15px; margin-top: 0;">Congratulations <strong>$name</strong>!</p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">Your payment transaction (<strong style="font-family: monospace;">$trxId</strong>) has been verified successfully. Your seat for <strong>$eventName</strong> is now confirmed!</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 16px; margin: 20px 0;">
      <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
        <span style="color: #166534;">Verified Amount:</span>
        <span style="font-weight: 700; color: #166534;">Tk $amount</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;">
        <span style="color: #166534;">Payment Status:</span>
        <span style="font-weight: 700; color: #16a34a;">Verified</span>
      </div>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="$whatsappLink" style="display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(37,211,102,0.2);">Join Official WhatsApp Group</a>
      <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Please join the group for venue details, schedule, and live updates.</p>
    </div>
  </div>
  <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
    Sent by $senderName
  </div>
</div>`
};

const HTML_COMPONENTS = [
  { label: 'CTA Button', icon: <MousePointer2 size={12}/>, snippet: '<div style="text-align:center; margin:20px 0;"><a href="$whatsappLink" style="display:inline-block; background-color:#2563eb; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight:600; font-size:14px;">Join Official WhatsApp Group</a></div>' },
  { label: 'Status Alert', icon: <Zap size={12}/>, snippet: '<div style="background-color:#eff6ff; border-left:4px solid #3b82f6; padding:12px 16px; border-radius:4px; margin:16px 0; font-size:13px; color:#1e40af;"><strong>Notice:</strong> Please keep your transaction ID ($trxId) for verification.</div>' },
  { label: 'Summary Card', icon: <Layout size={12}/>, snippet: '<div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:16px; margin:16px 0;"><div style="font-weight:700; font-size:12px; color:#64748b; margin-bottom:8px;">DETAILS</div><div style="font-size:13px; color:#334155;"><strong>Event:</strong> $eventName</div></div>' },
  { label: 'Data Row', icon: <List size={12}/>, snippet: '<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f1f5f9; font-size:13px;"><span style="color:#64748b;">Label:</span><strong>$variable</strong></div>' },
  { label: 'Email Footer', icon: <Layout size={12}/>, snippet: '<div style="margin-top:24px; border-top:1px solid #e2e8f0; padding-top:12px; font-size:12px; color:#94a3b8; text-align:center;">Sent by $senderName &bull; Do not reply directly to this email.</div>' }
];

// --- HTML FORMATTER ---

const formatHTML = (html: string): string => {
  if (!html || !html.trim()) return '';
  const tab = '  ';
  let result = '';
  let indent = 0;
  
  const clean = html.replace(/\r\n/g, '\n').replace(/>\s+</g, '><').trim();
  const tokens = clean.match(/(<!--[\s\S]*?-->|<[^>]+>|[^<]+)/g) || [clean];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;

    if (token.startsWith('<!--')) {
      result += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      result += tab.repeat(indent) + token + '\n';
    } else if (token.startsWith('<')) {
      const isSelfClosing = token.endsWith('/>');
      const tagMatch = token.match(/^<([a-zA-Z0-9]+)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
      const isVoid = voidTags.has(tagName);

      const nextToken = tokens[i + 1]?.trim();
      const tokenAfterNext = tokens[i + 2]?.trim();
      const isInlineBlock = nextToken && !nextToken.startsWith('<') && 
                            tokenAfterNext && tokenAfterNext.toLowerCase() === `</${tagName}>`;

      if (isInlineBlock) {
        result += tab.repeat(indent) + token + nextToken + tokenAfterNext + '\n';
        i += 2;
      } else {
        result += tab.repeat(indent) + token + '\n';
        if (!isSelfClosing && !isVoid && !token.startsWith('<!')) {
          indent++;
        }
      }
    } else {
      result += tab.repeat(indent) + token + '\n';
    }
  }

  return result.trim();
};

// --- DYNAMIC VARIABLE & CONDITIONAL EVALUATION HELPERS ---

export const compileAssignmentJS = (destVar: string, assignValue: string): string => {
  const cleanDest = destVar.replace(/^\$/, '');
  const trimmed = (assignValue || '').trim();

  if (!trimmed) {
    return `d['${cleanDest}'] = "";`;
  }

  // Quoted string (e.g. "text" or 'text') -> explicit string
  const quotedMatch = trimmed.match(/^"([^"]*)"$/) || trimmed.match(/^'([^']*)'$/);
  if (quotedMatch) {
    return `d['${cleanDest}'] = ${JSON.stringify(quotedMatch[1])};`;
  }

  // Pure Number (e.g. 500, 25.5, -10) -> number type
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `d['${cleanDest}'] = ${Number(trimmed)};`;
  }

  // Booleans
  if (trimmed.toLowerCase() === 'true') return `d['${cleanDest}'] = true;`;
  if (trimmed.toLowerCase() === 'false') return `d['${cleanDest}'] = false;`;

  // Arithmetic or Expression or Variable Reference ($amount * 0.1, $fee + 20, "VIP-" + $trxId)
  if (/[\+\-\*\/\%\$]/.test(trimmed)) {
    const jsExpr = trimmed.replace(/\$([a-zA-Z0-9_]+)/g, (_, v) => {
      return `(!isNaN(Number(d['${v}'])) && String(d['${v}']).trim() !== "" ? Number(d['${v}']) : d['${v}'])`;
    });
    return `try { d['${cleanDest}'] = ${jsExpr}; } catch (e) { d['${cleanDest}'] = ${JSON.stringify(trimmed)}; }`;
  }

  // Default fallback string (e.g. unquoted text like Free)
  return `d['${cleanDest}'] = ${JSON.stringify(trimmed)};`;
};

export const evaluateAssignmentSimulation = (assignValue: string, data: Record<string, any>): any => {
  const trimmed = (assignValue || '').trim();
  if (!trimmed) return '';

  // Quoted string
  const quotedMatch = trimmed.match(/^"([^"]*)"$/) || trimmed.match(/^'([^']*)'$/);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  // Pure Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  // Booleans
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;

  // Arithmetic or Expression
  if (/[\+\-\*\/\%\$]/.test(trimmed)) {
    try {
      const jsExpr = trimmed.replace(/\$([a-zA-Z0-9_]+)/g, (_, v) => {
        const val = data[v];
        if (val === undefined || val === null) return '""';
        if (typeof val === 'number') return String(val);
        const num = Number(val);
        if (!isNaN(num) && String(val).trim() !== '') return String(num);
        return JSON.stringify(String(val));
      });
      const fn = new Function(`return (${jsExpr});`);
      return fn();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
};

export const compileBranchCondition = (_targetField: string, operator: string = 'contains', matchValue: string): string => {
  const trimmed = (matchValue || '').trim();
  if (!trimmed) return 'true';

  // 1. Custom expression mode OR condition containing $ references
  if (operator === 'expr' || trimmed.includes('$')) {
    return trimmed.replace(/\$([a-zA-Z0-9_]+)/g, (_, v) => {
      return `(d['${v}'] !== undefined ? (isNaN(Number(d['${v}'])) ? String(d['${v}']).toLowerCase() : Number(d['${v}'])) : "")`;
    });
  }

  // Helper for single token
  const compileSingleToken = (op: string, valStr: string): string => {
    const t = valStr.trim();
    if (!t) return 'true';

    const leadingOpMatch = t.match(/^(==|!=|>=|<=|>|<)\s*(.*)$/);
    let effectiveOp = op;
    let effectiveVal = t;
    if (leadingOpMatch) {
      effectiveOp = leadingOpMatch[1];
      effectiveVal = leadingOpMatch[2].trim();
    }

    const isQuoted = (effectiveVal.startsWith('"') && effectiveVal.endsWith('"')) || 
                    (effectiveVal.startsWith("'") && effectiveVal.endsWith("'"));
    const rawVal = isQuoted ? effectiveVal.slice(1, -1) : effectiveVal;
    const isNum = !isQuoted && /^-?\d+(\.\d+)?$/.test(effectiveVal);

    if (effectiveOp === 'contains') {
      return `targetStr.indexOf(${JSON.stringify(rawVal.toLowerCase())}) > -1`;
    }
    if (effectiveOp === '==') {
      if (isNum) return `targetNum === ${Number(effectiveVal)}`;
      return `targetStr === ${JSON.stringify(rawVal.toLowerCase())}`;
    }
    if (effectiveOp === '!=') {
      if (isNum) return `targetNum !== ${Number(effectiveVal)}`;
      return `targetStr !== ${JSON.stringify(rawVal.toLowerCase())}`;
    }
    if (effectiveOp === '>') {
      return `targetNum > ${isNum ? Number(effectiveVal) : `Number(${JSON.stringify(rawVal)})`}`;
    }
    if (effectiveOp === '<') {
      return `targetNum < ${isNum ? Number(effectiveVal) : `Number(${JSON.stringify(rawVal)})`}`;
    }
    if (effectiveOp === '>=') {
      return `targetNum >= ${isNum ? Number(effectiveVal) : `Number(${JSON.stringify(rawVal)})`}`;
    }
    if (effectiveOp === '<=') {
      return `targetNum <= ${isNum ? Number(effectiveVal) : `Number(${JSON.stringify(rawVal)})`}`;
    }
    return `targetStr.indexOf(${JSON.stringify(rawVal.toLowerCase())}) > -1`;
  };

  const hasOr = /(?:^|[^\\])\|\|/.test(trimmed);
  const hasAnd = /(?:^|[^\\])\&\&/.test(trimmed);

  if (hasOr && !hasAnd) {
    const tokens = trimmed.split(/\|\|/);
    return tokens.map(tok => compileSingleToken(operator, tok)).join(' || ');
  }

  if (hasAnd && !hasOr) {
    const tokens = trimmed.split(/\&\&/);
    return tokens.map(tok => compileSingleToken(operator, tok)).join(' && ');
  }

  return compileSingleToken(operator, trimmed);
};

export const evaluateConditionSimulation = (
  targetVal: any,
  operator: string = 'contains',
  matchValue: string,
  data: Record<string, any>
): boolean => {
  const trimmed = (matchValue || '').trim();
  if (!trimmed) return true;

  const targetRaw = targetVal;
  const targetNum = Number(targetRaw) || 0;
  const targetStr = String(targetRaw !== undefined && targetRaw !== null ? targetRaw : '').toLowerCase();

  // Custom expression mode or contains $
  if (operator === 'expr' || trimmed.includes('$')) {
    try {
      const expr = trimmed.replace(/\$([a-zA-Z0-9_]+)/g, (_, v) => {
        const val = data[v];
        if (val === undefined || val === null) return '""';
        if (typeof val === 'number') return String(val);
        if (!isNaN(Number(val)) && val !== '') return String(Number(val));
        return JSON.stringify(String(val).toLowerCase());
      });
      const fn = new Function(`return Boolean(${expr});`);
      return fn();
    } catch {
      return false;
    }
  }

  const evalSingleToken = (op: string, valStr: string): boolean => {
    const t = valStr.trim();
    if (!t) return true;

    const leadingOpMatch = t.match(/^(==|!=|>=|<=|>|<)\s*(.*)$/);
    let effectiveOp = op;
    let effectiveVal = t;
    if (leadingOpMatch) {
      effectiveOp = leadingOpMatch[1];
      effectiveVal = leadingOpMatch[2].trim();
    }

    const isQuoted = (effectiveVal.startsWith('"') && effectiveVal.endsWith('"')) || 
                    (effectiveVal.startsWith("'") && effectiveVal.endsWith("'"));
    const rawVal = isQuoted ? effectiveVal.slice(1, -1) : effectiveVal;
    const isNum = !isQuoted && /^-?\d+(\.\d+)?$/.test(effectiveVal);

    if (effectiveOp === 'contains') {
      return targetStr.includes(rawVal.toLowerCase());
    }
    if (effectiveOp === '==') {
      if (isNum) return targetNum === Number(effectiveVal);
      return targetStr === rawVal.toLowerCase();
    }
    if (effectiveOp === '!=') {
      if (isNum) return targetNum !== Number(effectiveVal);
      return targetStr !== rawVal.toLowerCase();
    }
    if (effectiveOp === '>') {
      return targetNum > (isNum ? Number(effectiveVal) : (Number(rawVal) || 0));
    }
    if (effectiveOp === '<') {
      return targetNum < (isNum ? Number(effectiveVal) : (Number(rawVal) || 0));
    }
    if (effectiveOp === '>=') {
      return targetNum >= (isNum ? Number(effectiveVal) : (Number(rawVal) || 0));
    }
    if (effectiveOp === '<=') {
      return targetNum <= (isNum ? Number(effectiveVal) : (Number(rawVal) || 0));
    }
    return targetStr.includes(rawVal.toLowerCase());
  };

  const hasOr = /(?:^|[^\\])\|\|/.test(trimmed);
  const hasAnd = /(?:^|[^\\])\&\&/.test(trimmed);

  if (hasOr && !hasAnd) {
    const tokens = trimmed.split(/\|\|/);
    return tokens.some(tok => evalSingleToken(operator, tok));
  }

  if (hasAnd && !hasOr) {
    const tokens = trimmed.split(/\&\&/);
    return tokens.every(tok => evalSingleToken(operator, tok));
  }

  return evalSingleToken(operator, trimmed);
};

// --- MAIN COMPONENT ---

const App: React.FC = () => {
  const [projects, setProjects] = useState<Config[]>(() => {
    const saved = localStorage.getItem('warsg_projects_v5') || localStorage.getItem('warsg_projects_v4') || localStorage.getItem('warsg_projects_v3');
    if (!saved) return [defaultConfig];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.length === 0) return [defaultConfig];
      return parsed.map((p: any) => {
        // Migration from fields to variables
        let vars: VariableMapping[] = [];
        if (Array.isArray(p.variables) && p.variables.length > 0) {
          vars = p.variables;
        } else if (Array.isArray(p.fields) && p.fields.length > 0) {
          vars = p.fields.map((f: any) => ({
            id: f.id,
            variable: f.variable,
            type: 'field' as MappingType,
            value: f.headers || ''
          }));
        } else {
          vars = defaultConfig.variables;
        }

        let rules: ConditionalRule[] = [];
        if (Array.isArray(p.conditionalRules)) {
          const isLegacyDemo = p.conditionalRules.length === 1 && p.conditionalRules[0].id === 'rule-1';
          if (!isLegacyDemo) {
            rules = p.conditionalRules;
          }
        }

        return {
          ...defaultConfig,
          ...p,
          receivedSubject: p.receivedSubject || p.welcomeSubject || defaultConfig.receivedSubject,
          receivedTemplate: p.receivedTemplate || p.welcomeTemplate || defaultConfig.receivedTemplate,
          variables: vars,
          conditionalRules: rules,
          smsParsers: Array.isArray(p.smsParsers) && p.smsParsers.length > 0 ? p.smsParsers : defaultConfig.smsParsers
        };
      });
    } catch {
      return [defaultConfig];
    }
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return localStorage.getItem('warsg_active_id_v5') || localStorage.getItem('warsg_active_id_v4') || DEFAULT_ID;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  };

  const config = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0] || defaultConfig;
  }, [projects, activeProjectId]);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateConfig = (newConfig: Config) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? newConfig : p));
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 500);
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('warsg_settings_v5') || localStorage.getItem('warsg_settings_v4');
    if (!saved) return { theme: 'dark', font: '"JetBrains Mono", monospace', wordWrap: false, zoom: 13 };
    try {
      return JSON.parse(saved);
    } catch {
      return { theme: 'dark', font: '"JetBrains Mono", monospace', wordWrap: false, zoom: 13 };
    }
  });

  const [activeTab, setActiveTab] = useState<'code' | 'received-edit' | 'confirmed-edit'>('code');
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  const [previewType, setPreviewType] = useState<'received' | 'confirmed'>('received');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showSettings, setShowSettings] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    general: false,
    sheets: true,
    regex: true,
    variables: false,
    conditionals: false,
    library: true
  });

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('warsg_sidebar_width');
    if (!saved) return DEFAULT_SIDEBAR_WIDTH;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) ? DEFAULT_SIDEBAR_WIDTH : Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, parsed));
  });

  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
        setSidebarWidth(clamped);
        rafId = null;
      });
    };

    const stopResizing = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Persist sidebar width with debounce so dragging does not thrash disk
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('warsg_sidebar_width', sidebarWidth.toString());
    }, 400);
    return () => clearTimeout(timer);
  }, [sidebarWidth]);

  const [manualCode, setManualCode] = useState<string>('');
  const [isSyncLocked, setIsSyncLocked] = useState(false);
  const [flashCode, setFlashCode] = useState(false);
  const [testSms, setTestSms] = useState('');
  const [regexResult, setRegexResult] = useState<{ trx?: string; amt?: string; parserName?: string }>({});

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const activeProjectIdRef = useRef(activeProjectId);
  activeProjectIdRef.current = activeProjectId;

  // Sync with LocalStorage (Debounced 300ms to eliminate typing latency)
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem('warsg_projects_v5', JSON.stringify(projects));
        localStorage.setItem('warsg_active_id_v5', activeProjectId);
      } catch (err) {
        console.error('Failed to save projects to localStorage:', err);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [projects, activeProjectId]);

  // Flush pending project changes before window unload to prevent data loss
  useEffect(() => {
    const handleUnload = () => {
      try {
        localStorage.setItem('warsg_projects_v5', JSON.stringify(projectsRef.current));
        localStorage.setItem('warsg_active_id_v5', activeProjectIdRef.current);
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem('warsg_settings_v5', JSON.stringify(settings));
      } catch (e) {}
    }, 300);
    return () => clearTimeout(handler);
  }, [settings]);

  // SMS Regex Live Tester
  useEffect(() => {
    if (!testSms.trim()) {
      setRegexResult({});
      return;
    }
    try {
      let foundTrx = 'No match';
      let foundAmt = 'No match';
      let matchedParser = 'None';

      for (const parser of (config.smsParsers || [])) {
        if (!parser.regexTrx && !parser.regexAmt) continue;
        const rTrx = parser.regexTrx ? new RegExp(parser.regexTrx, 'i') : null;
        const rAmt = parser.regexAmt ? new RegExp(parser.regexAmt, 'i') : null;
        const matchTrx = rTrx ? testSms.match(rTrx) : null;
        const matchAmt = rAmt ? testSms.match(rAmt) : null;

        if (matchTrx || matchAmt) {
          if (matchTrx) foundTrx = matchTrx[1];
          if (matchAmt) foundAmt = matchAmt[1];
          matchedParser = parser.name;
          break;
        }
      }
      setRegexResult({ trx: foundTrx, amt: foundAmt, parserName: matchedParser });
    } catch {
      setRegexResult({ trx: 'Invalid Regex', amt: 'Invalid Regex', parserName: 'Error' });
    }
  }, [testSms, config.smsParsers]);

  // All available variable tags for library & placeholders
  const allAvailableVariables = useMemo(() => {
    const set = new Set<string>();
    // Standard system variables
    ['name', 'email', 'trxId', 'amount', 'smsSender', 'eventName', 'senderName', 'whatsappLink'].forEach(v => set.add(v));
    // Variables from mappings
    (config.variables || []).forEach(v => { if (v.variable) set.add(v.variable.replace(/^\$/, '')); });
    // Variables from conditional statements
    (config.conditionalRules || []).forEach(r => {
      (r.branches || []).forEach(b => { if (b.targetVariable) set.add(b.targetVariable.replace(/^\$/, '')); });
    });
    return Array.from(set);
  }, [config.variables, config.conditionalRules]);

  // Code Generation Engine
  const autoGeneratedCode = useMemo(() => {
    const varMappingsJS = (config.variables || []).map(v => {
      const keys = v.type === 'field' 
        ? v.value.split(',').map(k => k.trim()).filter(Boolean)
        : [];
      return `    { var: "${v.variable}", type: "${v.type}", value: ${JSON.stringify(v.value)}, keys: ${JSON.stringify(keys)} }`;
    }).join(',\n');

    const smsParsersJS = JSON.stringify(
      (config.smsParsers || []).map(p => ({ name: p.name, regexTrx: p.regexTrx, regexAmt: p.regexAmt })),
      null, 
      2
    );

    // Build conditional logic evaluation function
    const conditionalRulesJS = (config.conditionalRules || []).map(rule => {
      const targetVar = rule.targetField.replace(/^\$/, '');
      const branchCode = (rule.branches || []).map(b => {
        const assignCode = compileAssignmentJS(b.targetVariable, b.assignValue);
        if (b.type === 'if') {
          const cond = compileBranchCondition(rule.targetField, b.operator || 'contains', b.matchValue);
          return `    if (${cond}) {\n      ${assignCode}\n    }`;
        } else if (b.type === 'else_if') {
          const cond = compileBranchCondition(rule.targetField, b.operator || 'contains', b.matchValue);
          return ` else if (${cond}) {\n      ${assignCode}\n    }`;
        } else {
          return ` else {\n      ${assignCode}\n    }`;
        }
      }).join('');

      return `    // in '$${targetVar}'\n    targetRaw = d['${targetVar}'];\n    targetNum = Number(targetRaw) || 0;\n    targetStr = String(targetRaw !== undefined && targetRaw !== null ? targetRaw : "").toLowerCase();\n${branchCode}`;
    }).join('\n\n');

    const escapeForTemplate = (str: string) => JSON.stringify(str);

    return `/**
 * =========================================================================
 * WARSG (Web-based Automatic Response System Generator)
 * Generated Script: Code.gs
 * Project: ${config.projectName}
 * Generated: ${new Date().toLocaleDateString()}
 * =========================================================================
 * 
 * QUICK SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet linked to your Google Form.
 * 2. Click Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this generated script.
 * 4. Run the "setupTriggers" function once and grant the required permissions.
 * 5. Test using "testReceivedEmail" and "testConfirmedEmail".
 */

// --- CONFIGURATION ---
var EVENT_NAME = ${JSON.stringify(config.eventName)};
var SENDER_NAME = ${JSON.stringify(config.senderName)};
var SUBJECT_RECEIVED = ${JSON.stringify(config.receivedSubject || "Registration Received: $eventName")};
var SUBJECT_CONFIRMED = ${JSON.stringify(config.confirmedSubject || "Payment Confirmed: $eventName")};

var SMS_XML_FILE_ID = ${JSON.stringify(config.smsXmlFileId)};
var SMS_SENDER = ${JSON.stringify(config.smsSender)};
var BATCH_SIZE = ${Number(config.batchSize) || 50};
var SYNC_INTERVAL = ${Number(config.syncInterval) || 15};

var SHEET_FORM_RESPONSES = ${JSON.stringify(config.sheetFormResponses)};
var SHEET_SMS_DUMP = ${JSON.stringify(config.sheetSmsDump)};
var SHEET_MATCHED = ${JSON.stringify(config.sheetMatched)};
var SHEET_LOGS = ${JSON.stringify(config.sheetLogs || "Execution_Logs")};
var WHATSAPP_LINK = ${JSON.stringify(config.whatsappLink)};

// Configured SMS Parsers
var SMS_PARSERS = ${smsParsersJS};

// Configured Variable Mappings
var VARIABLE_MAPPINGS = [
${varMappingsJS}
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
    Logger.log("Failed to write to log sheet: " + err.toString());
  }
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

// --- CONDITIONAL RULES EVALUATION ---

function evaluateConditionalRules(data) {
  var d = Object.assign({}, data);
  try {
    var targetRaw, targetNum, targetStr;
${conditionalRulesJS || '    // No conditional rules defined'}
  } catch (err) {
    Logger.log("Error evaluating conditional rules: " + err.toString());
  }
  return d;
}

// --- CORE PIPELINE ---

function runFullSync() {
  try {
    checkAndInitialize();
    processSmsXml();
    matchAndSendEmails();
  } catch (err) {
    logEntry("Critical error in runFullSync: " + err.toString(), "FATAL");
  }
}

function processSmsXml() {
  if (!SMS_XML_FILE_ID || SMS_XML_FILE_ID.trim() === "") {
    logEntry("SMS XML File ID is not configured. Skipping SMS sync.", "WARN");
    return;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dumpSheet = getOrCreateSheet(ss, SHEET_SMS_DUMP);

  var existingTrx = [];
  if (dumpSheet.getLastRow() > 1) {
    var trxData = dumpSheet.getRange(2, 1, dumpSheet.getLastRow() - 1, 1).getValues();
    existingTrx = trxData.map(function(r) { return String(r[0]).trim().toUpperCase(); });
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

      // Optional Sender filtering (e.g. bkash, nagad)
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
  } catch (err) {
    logEntry("Error processing SMS XML: " + err.toString(), "ERROR");
  }
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

// --- FORM SUBMIT HANDLER (RECEIVED EMAIL) ---

function handleFormSubmit(e) {
  if (!e) {
    Logger.log("handleFormSubmit called without event object. Use testReceivedEmail() to test.");
    return;
  }

  var responses = e.namedValues || {};
  var emailData = {};

  // Map variables
  VARIABLE_MAPPINGS.forEach(function(m) {
    if (m.type === 'value') {
      emailData[m.var] = m.value;
    } else {
      emailData[m.var] = getFuzzyVal(responses, m.keys);
    }
  });

  // Evaluate conditional rules
  emailData = evaluateConditionalRules(emailData);

  // Find recipient email dynamically
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
    logEntry("Form submission received but no email address could be matched.", "WARN");
    return;
  }

  try {
    var htmlContent = getHtmlTemplate('received', emailData);
    var subject = resolveVariables(SUBJECT_RECEIVED, emailData);

    GmailApp.sendEmail(recipientEmail, subject, "", {
      htmlBody: htmlContent,
      name: SENDER_NAME
    });
    logEntry("Sent Received email to " + recipientEmail, "SUCCESS");
  } catch (err) {
    logEntry("Failed to send Received email to " + recipientEmail + ": " + err.toString(), "ERROR");
  }
}

// --- MATCHING ENGINE & CONFIRMATION EMAIL ---

function matchAndSendEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var formSheet = ss.getSheetByName(SHEET_FORM_RESPONSES);
  var dumpSheet = ss.getSheetByName(SHEET_SMS_DUMP);
  var matchSheet = getOrCreateSheet(ss, SHEET_MATCHED);

  if (!formSheet) {
    logEntry("Form responses sheet not found: " + SHEET_FORM_RESPONSES, "ERROR");
    return;
  }
  if (!dumpSheet) {
    logEntry("SMS dump sheet not found: " + SHEET_SMS_DUMP, "ERROR");
    return;
  }

  var processedTrx = [];
  if (matchSheet.getLastRow() > 1) {
    var matchData = matchSheet.getRange(2, 1, matchSheet.getLastRow() - 1, 1).getValues();
    processedTrx = matchData.map(function(r) { return String(r[0]).trim().toUpperCase(); });
  }

  var smsMap = {};
  if (dumpSheet.getLastRow() > 1) {
    var smsData = dumpSheet.getRange(2, 1, dumpSheet.getLastRow() - 1, 3).getValues();
    for (var i = 0; i < smsData.length; i++) {
      var sTrx = String(smsData[i][0]).trim().toUpperCase();
      if (sTrx) {
        smsMap[sTrx] = { amount: smsData[i][1], sender: smsData[i][2] };
      }
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

  var idxTrx = getColIndex(headers, (trxMapping && trxMapping.keys && trxMapping.keys.length > 0) ? trxMapping.keys : ["trx", "transaction", "trx id"]);
  var idxEmail = getColIndex(headers, (emailMapping && emailMapping.keys && emailMapping.keys.length > 0) ? emailMapping.keys : ["email", "email address", "mail"]);

  if (idxTrx === -1 || idxEmail === -1) {
    logEntry("Critical column lookup failed: Trx ID or Email column not found in form sheet.", "FATAL");
    return;
  }

  var newMatches = [];
  var batchCount = 0;

  for (var r = 1; r < formData.length; r++) {
    if (BATCH_SIZE > 0 && batchCount >= BATCH_SIZE) break;

    var row = formData[r];
    var rawTrx = row[idxTrx];
    var fTrx = cleanTrxId(rawTrx);
    var email = String(row[idxEmail] || "").trim();

    if (!fTrx || !email) continue;
    if (processedTrx.indexOf(fTrx) > -1) continue;

    if (smsMap.hasOwnProperty(fTrx)) {
      var emailData = {
        trxId: fTrx,
        email: email,
        amount: smsMap[fTrx].amount,
        smsSender: smsMap[fTrx].sender
      };

      // Extract all other configured variables
      VARIABLE_MAPPINGS.forEach(function(m) {
        if (m.type === 'value') {
          emailData[m.var] = m.value;
        } else {
          var colIdx = getColIndex(headers, m.keys);
          if (colIdx > -1) emailData[m.var] = row[colIdx];
        }
      });

      // Apply conditional statements
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
        logEntry("Confirmed payment for " + email + " (Trx: " + fTrx + ", Tk " + smsMap[fTrx].amount + ")", "SUCCESS");
      } catch (err) {
        emailStatus = "Error: " + err.toString();
        logEntry("Error sending confirmation email to " + email + ": " + err.toString(), "ERROR");
      }

      newMatches.push([
        fTrx,
        email,
        emailData.name || "Participant",
        smsMap[fTrx].amount,
        smsMap[fTrx].sender,
        new Date(),
        emailStatus
      ]);

      processedTrx.push(fTrx);
      batchCount++;
    }
  }

  if (newMatches.length > 0) {
    matchSheet.getRange(matchSheet.getLastRow() + 1, 1, newMatches.length, newMatches[0].length).setValues(newMatches);
    logEntry("Completed matching run: processed " + newMatches.length + " transactions.", "INFO");
  }
}

// --- TEMPLATE RENDERING ---

function resolveVariables(text, data) {
  if (!text) return "";
  var allData = Object.assign({
    whatsappLink: WHATSAPP_LINK,
    eventName: EVENT_NAME,
    senderName: SENDER_NAME
  }, data);

  // Sort keys by descending length to prevent partial replacement bugs
  var keys = Object.keys(allData).sort(function(a, b) { return b.length - a.length; });

  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var val = allData[k];
    var safeVal = (val !== undefined && val !== null && String(val).trim() !== "") ? String(val) : "N/A";
    var escapedKey = k.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&');

    // Replace $variableName (with boundary check)
    text = text.replace(new RegExp('\\\\$' + escapedKey + '(?![a-zA-Z0-9_])', 'g'), function() { return safeVal; });
    // Replace {variableName} for compatibility
    text = text.replace(new RegExp('\\\\{' + escapedKey + '\\\\}', 'g'), function() { return safeVal; });
  }
  return text;
}

function getHtmlTemplate(type, data) {
  var template = type === 'received' 
    ? ${escapeForTemplate(config.receivedTemplate)} 
    : ${escapeForTemplate(config.confirmedTemplate)};
  return resolveVariables(template, data);
}

// --- SETUP & TESTING ---

function setupTriggers() {
  checkAndInitialize();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  var managedHandlers = ['handleFormSubmit', 'runFullSync'];

  triggers.forEach(function(t) {
    if (managedHandlers.indexOf(t.getHandlerFunction()) > -1) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('handleFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  var interval = Number(SYNC_INTERVAL) || 15;
  if (interval >= 60) {
    var hours = Math.max(1, Math.floor(interval / 60));
    ScriptApp.newTrigger('runFullSync')
      .timeBased()
      .everyHours(hours)
      .create();
  } else {
    var validMinutes = [1, 5, 10, 15, 30];
    var closest = validMinutes.reduce(function(prev, curr) {
      return (Math.abs(curr - interval) < Math.abs(prev - interval) ? curr : prev);
    });
    ScriptApp.newTrigger('runFullSync')
      .timeBased()
      .everyMinutes(closest)
      .create();
  }

  logEntry("Triggers setup complete: Instant Form Submit + Periodic Sync (" + interval + "m)", "SUCCESS");
}

function testReceivedEmail() {
  var email = Session.getActiveUser().getEmail();
  var mockData = {
    name: "Test Participant",
    email: email,
    trxId: "TEST99TRX88",
    amount: "500"
  };
  mockData = evaluateConditionalRules(mockData);
  var subject = "[TEST] " + resolveVariables(SUBJECT_RECEIVED, mockData);
  var body = getHtmlTemplate('received', mockData);
  GmailApp.sendEmail(email, subject, "", { htmlBody: body, name: SENDER_NAME });
  logEntry("Test Received email dispatched to " + email, "INFO");
}

// Alias for backwards compatibility
function testWelcomeEmail() {
  testReceivedEmail();
}

function testConfirmedEmail() {
  var email = Session.getActiveUser().getEmail();
  var mockData = {
    name: "Test Participant",
    email: email,
    trxId: "TEST99TRX88",
    amount: "500",
    smsSender: "bKash"
  };
  mockData = evaluateConditionalRules(mockData);
  var subject = "[TEST] " + resolveVariables(SUBJECT_CONFIRMED, mockData);
  var body = getHtmlTemplate('confirmed', mockData);
  GmailApp.sendEmail(email, subject, "", { htmlBody: body, name: SENDER_NAME });
  logEntry("Test Confirmed email dispatched to " + email, "INFO");
}
`;
  }, [config]);

  // Synchronize autoGeneratedCode into manualCode when not locked
  useEffect(() => {
    if (!isSyncLocked) {
      setManualCode(autoGeneratedCode);
    }
  }, [autoGeneratedCode, isSyncLocked]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let val: any = value;
    if (name === 'smsXmlFileId') {
      const match = value.match(/[-\w]{25,}/);
      val = match ? match[0] : value;
    }
    if (name === 'batchSize' || name === 'syncInterval') {
      val = parseInt(value, 10) || 0;
    }
    updateConfig({ ...config, [name]: val });
  };

  const handleManualCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualCode(e.target.value);
    setIsSyncLocked(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      if (activeTab === 'code') {
        setManualCode(newVal);
        setIsSyncLocked(true);
      } else {
        const fieldKey = activeTab.includes('received') ? 'receivedTemplate' : 'confirmedTemplate';
        updateConfig({ ...config, [fieldKey]: newVal });
      }
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Modal State for Project Actions & Confirmations
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'rename' | 'clone' | 'reset' | 'delete'>('none');
  const [modalInputValue, setModalValue] = useState('');

  const openModal = (mode: 'create' | 'rename' | 'clone' | 'reset' | 'delete') => {
    setModalMode(mode);
    setModalValue(mode === 'create' ? '' : config.projectName);
  };

  const handleResetConfirm = () => {
    updateConfig({
      ...JSON.parse(JSON.stringify(defaultConfig)),
      id: config.id,
      projectName: config.projectName
    });
    setIsSyncLocked(false);
    setModalMode('none');
    addToast("Project reset to default seminar settings");
  };

  const handleDeleteConfirm = () => {
    if (projects.length <= 1) return;
    const remaining = projects.filter(p => p.id !== activeProjectId);
    setProjects(remaining);
    setActiveProjectId(remaining[0].id);
    setIsSyncLocked(false);
    setModalMode('none');
    addToast(`Deleted project "${config.projectName}"`, "info");
  };

  const handleModalAction = () => {
    if (!modalInputValue.trim()) return;

    if (modalMode === 'create') {
      const newId = Date.now().toString();
      const newProject: Config = {
        ...JSON.parse(JSON.stringify(defaultConfig)),
        id: newId,
        projectName: modalInputValue.trim()
      };
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newId);
      setIsSyncLocked(false);
      addToast(`Created project "${modalInputValue.trim()}"`);
    } else if (modalMode === 'rename') {
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, projectName: modalInputValue.trim() } : p));
      addToast(`Renamed project to "${modalInputValue.trim()}"`);
    } else if (modalMode === 'clone') {
      const newId = Date.now().toString();
      const newProject: Config = {
        ...JSON.parse(JSON.stringify(config)),
        id: newId,
        projectName: modalInputValue.trim()
      };
      setProjects(prev => [...prev, newProject]);
      setActiveProjectId(newId);
      setIsSyncLocked(false);
      addToast(`Cloned into "${modalInputValue.trim()}"`);
    }

    setModalMode('none');
  };

  // Global Keyboard Shortcuts (Esc to dismiss modals/preview, Ctrl+S to save, Alt+P to toggle preview, Shift+Alt+F to format HTML)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Escape key: dismiss open dialogs, settings, maximize mode, or floating preview
      if (e.key === 'Escape') {
        if (modalMode !== 'none') {
          setModalMode('none');
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (isPreviewMaximized) {
          setIsPreviewMaximized(false);
          return;
        }
        if (showPreview) {
          setShowPreview(false);
          return;
        }
      }

      // Ctrl+S / Cmd+S: Intercept browser save dialog and immediately persist state
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        try {
          localStorage.setItem('warsg_projects_v5', JSON.stringify(projectsRef.current));
          localStorage.setItem('warsg_active_id_v5', activeProjectIdRef.current);
          localStorage.setItem('warsg_settings_v5', JSON.stringify(settings));
          addToast("Project saved successfully", "success");
        } catch (err) {
          console.error("Save error:", err);
        }
        return;
      }

      // Alt+P: Toggle HTML Email Preview
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setShowPreview(prev => !prev);
        return;
      }

      // Shift+Alt+F: Format HTML template if on template tab
      if (e.shiftKey && e.altKey && (e.key === 'f' || e.key === 'F')) {
        if (activeTab !== 'code') {
          e.preventDefault();
          const n = activeTab === 'confirmed-edit' ? 'confirmedTemplate' : 'receivedTemplate';
          updateConfig({ ...config, [n]: formatHTML((config as any)[n]) });
          addToast("Formatted HTML template");
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [modalMode, showSettings, isPreviewMaximized, showPreview, settings, activeTab, config]);

  // Variable Tag Insertion ($name format)
  const insertTag = (tag: string) => {
    const cleanTag = tag.replace(/^\$/, '');
    let targetTab = activeTab;
    if (!activeTab.includes('edit')) {
      targetTab = 'received-edit';
      setActiveTab('received-edit');
    }

    const fieldKey = targetTab === 'confirmed-edit' ? 'confirmedTemplate' : 'receivedTemplate';
    const text = config[fieldKey] || '';
    
    let newText = text;
    if (editorRef.current && activeTab.includes('edit')) {
      const start = editorRef.current.selectionStart || text.length;
      const end = editorRef.current.selectionEnd || text.length;
      newText = text.substring(0, start) + "$" + cleanTag + text.substring(end);
    } else {
      newText = text + " $" + cleanTag;
    }

    updateConfig({ ...config, [fieldKey]: newText });
    addToast(`Inserted $${cleanTag}`);
  };

  const insertComponent = (snippet: string) => {
    let targetTab = activeTab;
    if (!activeTab.includes('edit')) {
      targetTab = 'received-edit';
      setActiveTab('received-edit');
    }

    const fieldKey = targetTab === 'confirmed-edit' ? 'confirmedTemplate' : 'receivedTemplate';
    const text = config[fieldKey] || '';

    let newText = text;
    if (editorRef.current && activeTab.includes('edit')) {
      const start = editorRef.current.selectionStart || text.length;
      const end = editorRef.current.selectionEnd || text.length;
      newText = text.substring(0, start) + "\n" + snippet + "\n" + text.substring(end);
    } else {
      newText = text + "\n" + snippet;
    }

    updateConfig({ ...config, [fieldKey]: newText });
    addToast("Inserted HTML snippet");
  };

  // Variable Mapping actions
  const addVariableMapping = () => {
    const newVar: VariableMapping = {
      id: Date.now().toString(),
      variable: 'newVar',
      type: 'field',
      value: ''
    };
    updateConfig({
      ...config,
      variables: [...(config.variables || []), newVar]
    });
    addToast("Added new variable mapping");
  };

  const updateVariableMapping = (id: string, updates: Partial<VariableMapping>) => {
    updateConfig({
      ...config,
      variables: config.variables.map(v => v.id === id ? { ...v, ...updates } : v)
    });
  };

  const removeVariableMapping = (id: string) => {
    updateConfig({
      ...config,
      variables: config.variables.filter(v => v.id !== id)
    });
    addToast("Removed variable", "info");
  };

  // Conditional Rules actions
  const addConditionalRule = () => {
    const firstField = allAvailableVariables.find(v => v === 'paymentMethod' || v === 'amount') 
      || config.variables.find(v => v.type === 'field')?.variable 
      || allAvailableVariables[0] 
      || 'paymentMethod';
    const newRule: ConditionalRule = {
      id: Date.now().toString(),
      targetField: firstField,
      branches: [
        { id: Date.now().toString() + '-1', type: 'if', operator: 'contains', matchValue: '', targetVariable: 'customVar', assignValue: '' }
      ]
    };
    updateConfig({
      ...config,
      conditionalRules: [...(config.conditionalRules || []), newRule]
    });
    addToast("Added conditional rule");
  };

  const removeConditionalRule = (ruleId: string) => {
    updateConfig({
      ...config,
      conditionalRules: config.conditionalRules.filter(r => r.id !== ruleId)
    });
    addToast("Deleted rule", "info");
  };

  const addBranchToRule = (ruleId: string, type: 'else_if' | 'else') => {
    updateConfig({
      ...config,
      conditionalRules: config.conditionalRules.map(r => {
        if (r.id !== ruleId) return r;
        const firstBranch = r.branches[0];
        const lastBranch = r.branches[r.branches.length - 1];
        const defaultTargetVar = lastBranch?.targetVariable || firstBranch?.targetVariable || 'customVar';

        const newBranch: ConditionalBranch = {
          id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 5),
          type: type,
          operator: 'contains',
          matchValue: '',
          targetVariable: defaultTargetVar,
          assignValue: ''
        };

        const newBranches = [...r.branches];
        if (type === 'else_if') {
          // If an 'else' branch exists, insert 'else_if' immediately before the 'else' branch
          const elseIndex = newBranches.findIndex(b => b.type === 'else');
          if (elseIndex !== -1) {
            newBranches.splice(elseIndex, 0, newBranch);
          } else {
            newBranches.push(newBranch);
          }
        } else if (type === 'else') {
          // Only add 'else' if it does not already exist
          if (!newBranches.some(b => b.type === 'else')) {
            newBranches.push(newBranch);
          }
        }

        return {
          ...r,
          branches: newBranches
        };
      })
    });
    addToast(type === 'else_if' ? "Added Else If branch" : "Added Else branch");
  };

  const updateBranch = (ruleId: string, branchId: string, updates: Partial<ConditionalBranch>) => {
    updateConfig({
      ...config,
      conditionalRules: config.conditionalRules.map(r => {
        if (r.id !== ruleId) return r;
        return {
          ...r,
          branches: r.branches.map(b => b.id === branchId ? { ...b, ...updates } : b)
        };
      })
    });
  };

  const removeBranch = (ruleId: string, branchId: string) => {
    updateConfig({
      ...config,
      conditionalRules: config.conditionalRules.map(r => {
        if (r.id !== ruleId) return r;
        return {
          ...r,
          branches: r.branches.filter(b => b.id !== branchId && b.type !== 'if')
        };
      })
    });
    addToast("Removed branch", "info");
  };

  const addPresetParser = (preset: typeof SMS_PARSER_PRESETS[0]) => {
    const exists = config.smsParsers.some(p => p.name.toLowerCase() === preset.name.toLowerCase());
    if (exists) {
      addToast(`${preset.name} parser already added`, 'info');
      return;
    }
    const newParser: SmsParser = {
      id: Date.now().toString(),
      name: preset.name,
      regexTrx: preset.regexTrx,
      regexAmt: preset.regexAmt
    };
    updateConfig({
      ...config,
      smsParsers: [...config.smsParsers, newParser]
    });
    addToast(`Added ${preset.name} parser preset`);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "warsg_" + config.projectName.replace(/[\s\W]+/g, '_').toLowerCase() + ".json";
    a.click();
    addToast("Project configuration exported");
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!imported || typeof imported !== 'object') throw new Error("Invalid format");
        const newId = Date.now().toString();

        let vars: VariableMapping[] = [];
        if (Array.isArray(imported.variables)) vars = imported.variables;
        else if (Array.isArray(imported.fields)) {
          vars = imported.fields.map((f: any) => ({
            id: f.id,
            variable: f.variable,
            type: 'field' as MappingType,
            value: f.headers || ''
          }));
        } else vars = defaultConfig.variables;

        const newProject: Config = {
          ...defaultConfig,
          ...imported,
          id: newId,
          receivedSubject: imported.receivedSubject || imported.welcomeSubject || defaultConfig.receivedSubject,
          receivedTemplate: imported.receivedTemplate || imported.welcomeTemplate || defaultConfig.receivedTemplate,
          variables: vars,
          conditionalRules: Array.isArray(imported.conditionalRules) ? imported.conditionalRules : defaultConfig.conditionalRules,
          smsParsers: Array.isArray(imported.smsParsers) ? imported.smsParsers : defaultConfig.smsParsers
        };
        setProjects(prev => [...prev, newProject]);
        setActiveProjectId(newId);
        setIsSyncLocked(false);
        addToast("Imported project successfully");
      } catch {
        alert("Invalid JSON configuration file");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
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
    addToast("Downloaded Code.gs");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(manualCode);
    addToast("Code copied to clipboard!");
  };

  // Preview Renderer with Conditional Simulation
  const renderPreview = (type: 'received' | 'confirmed') => {
    let body = type === 'received' ? config.receivedTemplate : config.confirmedTemplate;
    const mock: Record<string, any> = {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      eventName: config.eventName || "Web Development Seminar 2026",
      senderName: config.senderName || "Event Organizing Team",
      whatsappLink: config.whatsappLink || "https://chat.whatsapp.com/demo",
      amount: 500,
      trxId: "9J28A7BK12",
      smsSender: config.smsSender || "bKash",
      paymentMethod: "bKash"
    };

    // Populate mock data from variable mappings
    (config.variables || []).forEach(v => {
      if (!v.variable) return;
      if (v.type === 'value') {
        mock[v.variable] = v.value || `[${v.variable}]`;
      } else if (mock[v.variable] === undefined) {
        mock[v.variable] = v.variable === 'name' ? 'Jane Doe' :
                           v.variable === 'email' ? 'jane.doe@example.com' :
                           v.variable === 'trxId' ? '9J28A7BK12' :
                           v.variable === 'paymentMethod' ? 'bKash Personal' :
                           `Sample ${v.variable}`;
      }
    });

    // Evaluate conditional rules against mock data
    (config.conditionalRules || []).forEach(rule => {
      const targetVar = rule.targetField.replace(/^\$/, '');
      const targetVal = mock[targetVar];
      for (const branch of (rule.branches || [])) {
        const destVar = branch.targetVariable.replace(/^\$/, '');
        if (branch.type === 'else') {
          mock[destVar] = evaluateAssignmentSimulation(branch.assignValue, mock);
          break;
        }
        if (evaluateConditionSimulation(targetVal, branch.operator || 'contains', branch.matchValue, mock)) {
          mock[destVar] = evaluateAssignmentSimulation(branch.assignValue, mock);
          break;
        }
      }
    });

    // Replace both $variableName and {variableName} with mock data (sorted by descending length)
    const keys = Object.keys(mock).sort((a, b) => b.length - a.length);
    keys.forEach(k => {
      const safeVal = mock[k] !== undefined && mock[k] !== null ? String(mock[k]) : "N/A";
      const escaped = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      body = body.replace(new RegExp('\\$' + escaped + '(?![a-zA-Z0-9_])', 'g'), () => safeVal);
      body = body.replace(new RegExp('\\{' + escaped + '\\}', 'g'), () => safeVal);
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px 16px;
              background-color: #f8fafc;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              -webkit-font-smoothing: antialiased;
            }
            a { color: #2563eb; }
            .btn {
              display: inline-block;
              background-color: #2563eb;
              color: #ffffff !important;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 14px;
            }
            .inner-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin: 16px 0;
            }
            .info-row {
              padding: 6px 0;
              border-bottom: 1px solid #f1f5f9;
              font-size: 13px;
            }
            .info-row:last-child {
              border-bottom: none;
            }
          </style>
        </head>
        <body>${body}</body>
      </html>
    `;
  };

  // Memoized Preview HTML: Evaluated when showPreview is active
  const previewHtml = useMemo(() => {
    if (!showPreview) return '';
    const type = previewType || (activeTab === 'confirmed-edit' ? 'confirmed' : 'received');
    return renderPreview(type);
  }, [
    showPreview,
    previewType,
    activeTab, 
    config.receivedTemplate, 
    config.confirmedTemplate, 
    config.eventName, 
    config.senderName, 
    config.whatsappLink, 
    config.smsSender, 
    config.variables, 
    config.conditionalRules
  ]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'zoom' ? parseInt(value, 10) || 13 : value)
    }));
  };

  const resetToDefault = () => {
    openModal('reset');
  };

  const highlightedCode = useMemo(() => {
    const code = activeTab === 'code' 
      ? manualCode 
      : (activeTab === 'confirmed-edit' ? config.confirmedTemplate : config.receivedTemplate);
    const lang = activeTab === 'code' ? 'javascript' : 'markup';
    try {
      return Prism.highlight(code || '', Prism.languages[lang], lang);
    } catch {
      return code || '';
    }
  }, [manualCode, config.receivedTemplate, config.confirmedTemplate, activeTab]);

  return (
    <div 
      className={"app-container " + (settings.theme === 'light' ? 'theme-light' : '')}
      style={{ '--code-font': settings.font } as React.CSSProperties}
    >
      {/* --- Top Navbar --- */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-title">WARSG</div>
          <span className="navbar-badge">v2.3</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={resetToDefault} title="Reset Project to Defaults"><Zap size={14} /> Reset</button>
          <button className="btn btn-secondary" onClick={() => setShowSettings(true)} title="Settings"><Settings size={14} /></button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={importConfig} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} title="Import Project JSON"><Upload size={14} /></button>
          <button className="btn btn-secondary" onClick={exportConfig} title="Export Project JSON"><Save size={14} /></button>
          <button className="btn btn-secondary" onClick={downloadCode} title="Download Code.gs"><Download size={14} /></button>
          <button className="btn" onClick={copyCode} title="Copy Apps Script to Clipboard"><Copy size={14} /> Copy Code</button>
        </div>
      </nav>

      {/* --- Main Workspace --- */}
      <main className="main-content">
        <aside className="sidebar" style={{ width: `${sidebarWidth}px` }}>
          {/* Project Manager Bar */}
          <div className="project-manager">
            <label>Active Project</label>
            <select value={activeProjectId} onChange={e => { setActiveProjectId(e.target.value); setIsSyncLocked(false); }}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}
            </select>
            <div className="project-actions">
              <button className="btn btn-secondary" title="New Project" onClick={() => openModal('create')}><Plus size={14}/></button>
              <button className="btn btn-secondary" title="Clone Project" onClick={() => openModal('clone')}><CopyPlus size={14}/></button>
              <button className="btn btn-secondary" title="Rename Project" onClick={() => openModal('rename')}><Type size={14}/></button>
              <button 
                className="btn btn-secondary" 
                title={projects.length <= 1 ? "Cannot delete the only project" : "Delete Project"} 
                disabled={projects.length <= 1}
                onClick={() => openModal('delete')}
              >
                <Trash2 size={14}/>
              </button>
            </div>
          </div>

          {/* Section 1: General Settings */}
          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('general')}>
              <div className="section-title">
                {collapsedSections.general ? <ChevronRight size={12} /> : <ChevronDown size={12} />} 
                General Settings
              </div>
            </div>
            {!collapsedSections.general && (
              <div className="accordion-content">
                <div className="form-group">
                  <label>Event Name ($eventName)</label>
                  <input name="eventName" value={config.eventName} onChange={handleInputChange} placeholder="Seminar Title" />
                </div>
                <div className="form-group">
                  <label>Sender Alias Name ($senderName)</label>
                  <input name="senderName" value={config.senderName} onChange={handleInputChange} placeholder="e.g. IEEE Student Branch" />
                </div>
                <div className="form-group">
                  <label>Received Email Subject</label>
                  <input name="receivedSubject" value={config.receivedSubject} onChange={handleInputChange} placeholder="Registration Received: $eventName" />
                </div>
                <div className="form-group">
                  <label>Confirmation Email Subject</label>
                  <input name="confirmedSubject" value={config.confirmedSubject} onChange={handleInputChange} placeholder="Payment Confirmed: $eventName" />
                </div>
                <div className="form-group">
                  <label>WhatsApp Link ($whatsappLink)</label>
                  <input name="whatsappLink" value={config.whatsappLink} onChange={handleInputChange} placeholder="https://chat.whatsapp.com/..." />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Spreadsheet & Sheets */}
          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('sheets')}>
              <div className="section-title">
                {collapsedSections.sheets ? <ChevronRight size={12} /> : <ChevronDown size={12} />} 
                Spreadsheet & Sync
              </div>
            </div>
            {!collapsedSections.sheets && (
              <div className="accordion-content">
                <div className="form-group">
                  <label>Google Drive SMS XML File ID</label>
                  <input 
                    name="smsXmlFileId" 
                    value={config.smsXmlFileId} 
                    onChange={handleInputChange} 
                    placeholder="Paste Drive File ID or Shareable Link" 
                  />
                  <div className="form-hint">Links are automatically parsed to extract the unique file ID.</div>
                </div>
                <div className="form-group">
                  <label>SMS Sender Filter (Optional)</label>
                  <input 
                    name="smsSender" 
                    value={config.smsSender} 
                    onChange={handleInputChange} 
                    placeholder="e.g. bkash (leave empty for any sender)" 
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Sync Interval (mins)</label>
                    <input 
                      type="number" 
                      name="syncInterval" 
                      value={config.syncInterval} 
                      onChange={handleInputChange} 
                      min="1"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Batch Size</label>
                    <input 
                      type="number" 
                      name="batchSize" 
                      value={config.batchSize} 
                      onChange={handleInputChange} 
                      min="1"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Form Responses Sheet Name</label>
                  <input name="sheetFormResponses" value={config.sheetFormResponses} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>SMS Dump Sheet Name</label>
                  <input name="sheetSmsDump" value={config.sheetSmsDump} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Matched Data Sheet Name</label>
                  <input name="sheetMatched" value={config.sheetMatched} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Execution Logs Sheet Name</label>
                  <input name="sheetLogs" value={config.sheetLogs || "Execution_Logs"} onChange={handleInputChange} />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: SMS Parsing */}
          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('regex')}>
              <div className="section-title">
                {collapsedSections.regex ? <ChevronRight size={12} /> : <ChevronDown size={12} />} 
                SMS Parsing
              </div>
            </div>
            {!collapsedSections.regex && (
              <div className="accordion-content">
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quick Presets:</div>
                <div className="preset-badge-list">
                  {SMS_PARSER_PRESETS.map(preset => (
                    <span key={preset.name} className="preset-badge" onClick={() => addPresetParser(preset)}>
                      <Plus size={10} /> {preset.name}
                    </span>
                  ))}
                </div>

                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'center', marginBottom: '8px' }} 
                  onClick={() => updateConfig({
                    ...config, 
                    smsParsers: [...(config.smsParsers || []), { id: Date.now().toString(), name: 'Custom Parser', regexTrx: '', regexAmt: '' }]
                  })}
                >
                  <Plus size={14}/> Add Custom Parser
                </button>
                
                {(config.smsParsers || []).map(p => (
                  <div key={p.id} className="parser-row" style={{ border: '1px solid var(--border-color)', padding: '10px', borderRadius: 'var(--radius-md)', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input 
                        style={{ fontWeight: 'bold', fontSize: '11px', height: '24px', width: '70%' }} 
                        value={p.name} 
                        onChange={e => updateConfig({ ...config, smsParsers: config.smsParsers.map(x => x.id === p.id ? { ...x, name: e.target.value } : x) })} 
                      />
                      <button 
                        className="btn-delete" 
                        onClick={() => updateConfig({ ...config, smsParsers: config.smsParsers.filter(x => x.id !== p.id) })}
                        title="Delete Parser"
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '10px' }}>Trx Regex (Capture Group 1)</label>
                      <input 
                        style={{ fontSize: '11px', height: '28px', fontFamily: 'var(--code-font)' }} 
                        value={p.regexTrx} 
                        onChange={e => updateConfig({ ...config, smsParsers: config.smsParsers.map(x => x.id === p.id ? { ...x, regexTrx: e.target.value } : x) })} 
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '10px' }}>Amount Regex (Capture Group 1)</label>
                      <input 
                        style={{ fontSize: '11px', height: '28px', fontFamily: 'var(--code-font)' }} 
                        value={p.regexAmt} 
                        onChange={e => updateConfig({ ...config, smsParsers: config.smsParsers.map(x => x.id === p.id ? { ...x, regexAmt: e.target.value } : x) })} 
                      />
                    </div>
                  </div>
                ))}

                {/* Live SMS Tester */}
                <div className="regex-tester">
                  <label style={{ color: 'var(--accent-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={11} /> Test Sample SMS
                  </label>
                  <textarea 
                    placeholder="Paste sample SMS text to test..." 
                    style={{ height: '60px', fontSize: '11px', marginTop: '6px' }} 
                    value={testSms} 
                    onChange={e => setTestSms(e.target.value)} 
                  />
                  {testSms && (
                    <div className="regex-result">
                      <div className="result-item"><span>Matched Parser:</span> <b>{regexResult.parserName}</b></div>
                      <div className="result-item"><span>Extracted TrxID:</span> <b style={{ color: 'var(--accent-color)' }}>{regexResult.trx}</b></div>
                      <div className="result-item"><span>Extracted Amount:</span> <b>{regexResult.amt}</b></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Variable Mapping (Renamed from Field Mapping) */}
          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('variables')}>
              <div className="section-title">
                {collapsedSections.variables ? <ChevronRight size={12} /> : <ChevronDown size={12} />} 
                Variable Mapping
              </div>
            </div>
            {!collapsedSections.variables && (
              <div className="accordion-content">
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Define variables using <code>$name</code> across boxes. Choose <strong>Field</strong> to extract form column data or <strong>Value</strong> for static content.
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }} 
                  onClick={addVariableMapping}
                >
                  <Plus size={14}/> Add Variable
                </button>
                
                <div className="var-mapping-container">
                  <div className="var-header-row">
                    <span style={{ width: '78px' }}>Type</span>
                    <span style={{ width: '90px' }}>Variable</span>
                    <span style={{ flex: 1 }}>Column Header / Value</span>
                    <span style={{ width: '26px' }}></span>
                  </div>

                  {(config.variables || []).map(v => (
                    <div key={v.id} className="var-row">
                      <select 
                        className="var-type-select"
                        value={v.type}
                        onChange={e => updateVariableMapping(v.id, { type: e.target.value as MappingType })}
                      >
                        <option value="field">Field</option>
                        <option value="value">Value</option>
                      </select>

                      <div className="var-name-wrapper">
                        <span className="var-prefix">$</span>
                        <input 
                          className="var-name-input"
                          value={v.variable}
                          onChange={e => updateVariableMapping(v.id, { variable: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                          placeholder="varName"
                        />
                      </div>

                      <input 
                        className="var-value-input"
                        placeholder={v.type === 'field' ? "Column 1, Column 2" : "Static value"}
                        value={v.value}
                        onChange={e => updateVariableMapping(v.id, { value: e.target.value })}
                      />

                      <button 
                        className="btn-delete" 
                        title="Remove Variable"
                        onClick={() => removeVariableMapping(v.id)}
                      >
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Conditional Statements (NEW!) */}
          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('conditionals')}>
              <div className="section-title">
                {collapsedSections.conditionals ? <ChevronRight size={12} /> : <ChevronDown size={12} />} 
                Conditional Statements
              </div>
            </div>
            {!collapsedSections.conditionals && (
              <div className="accordion-content">
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', justifyContent: 'center', marginBottom: '10px' }} 
                  onClick={addConditionalRule}
                >
                  <Plus size={14}/> Add Conditional Rule
                </button>

                <div className="conditional-container">
                  {(config.conditionalRules || []).length === 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 10px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      No conditional rules configured. Click <strong>+ Add Conditional Rule</strong> to define an IF branch.
                    </div>
                  )}

                  {(config.conditionalRules || []).map(rule => {
                    const hasElse = (rule.branches || []).some(b => b.type === 'else');
                    return (
                      <div key={rule.id} className="conditional-card">
                        <div className="conditional-header">
                          <div className="conditional-in-label">
                            <GitBranch size={12} color="var(--accent-color)"/>
                            <span>in</span>
                            <select 
                              className="conditional-in-select"
                              value={rule.targetField.replace(/^\$/, '')}
                              onChange={e => updateConfig({
                                ...config,
                                conditionalRules: config.conditionalRules.map(r => r.id === rule.id ? { ...r, targetField: e.target.value } : r)
                              })}
                            >
                              {(() => {
                                const targetClean = (rule.targetField || '').replace(/^\$/, '');
                                const options = allAvailableVariables.includes(targetClean)
                                  ? allAvailableVariables
                                  : [targetClean, ...allAvailableVariables].filter(Boolean);
                                return options.map(v => (
                                  <option key={v} value={v}>${v}</option>
                                ));
                              })()}
                            </select>
                          </div>
                          <button 
                            className="btn-delete" 
                            title="Delete Rule"
                            onClick={() => removeConditionalRule(rule.id)}
                          >
                            <Trash2 size={13}/>
                          </button>
                        </div>

                        {/* Branches */}
                        {rule.branches.map((branch, bIdx) => (
                          <div key={branch.id} className="conditional-branch">
                            <div className="branch-header">
                              <span className={`branch-badge ${branch.type}`}>
                                {branch.type === 'if' ? 'IF' : branch.type === 'else_if' ? 'ELSE IF' : 'ELSE'}
                              </span>
                              {bIdx > 0 && (
                                <button 
                                  className="btn-delete" 
                                  style={{ width: '20px', height: '20px' }}
                                  title={`Remove ${branch.type === 'else' ? 'Else' : 'Else If'} Branch`}
                                  onClick={() => removeBranch(rule.id, branch.id)}
                                >
                                  <X size={12}/>
                                </button>
                              )}
                            </div>

                            <div className="branch-inputs">
                              {branch.type !== 'else' && (
                                <div className="branch-row">
                                  <select 
                                    className="branch-op-select"
                                    value={branch.operator || 'contains'}
                                    onChange={e => updateBranch(rule.id, branch.id, { operator: e.target.value })}
                                  >
                                    <option value="contains">contains</option>
                                    <option value="==">==</option>
                                    <option value="!=">!=</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                    <option value=">=">&gt;=</option>
                                    <option value="<=">&lt;=</option>
                                    <option value="expr">expr</option>
                                  </select>
                                  <input 
                                    list="all-variables-datalist"
                                    placeholder={
                                      (branch.operator === '>' || branch.operator === '<' || branch.operator === '>=' || branch.operator === '<=')
                                        ? 'e.g. 500, or 100 && < 500'
                                        : branch.operator === 'expr'
                                        ? 'e.g. $amount > 500 && $paymentMethod == "bkash"'
                                        : 'e.g. "bkash", 500, or "bkash" || "nagad"'
                                    }
                                    value={branch.matchValue}
                                    onChange={e => updateBranch(rule.id, branch.id, { matchValue: e.target.value })}
                                  />
                                </div>
                              )}

                              <div className="branch-row">
                                <label style={{ width: '76px' }}>set $:</label>
                                <input 
                                  list="var-names-datalist"
                                  style={{ width: '75px', flex: 'none', fontFamily: 'var(--code-font)' }}
                                  placeholder="variable"
                                  value={branch.targetVariable.replace(/^\$/, '')}
                                  onChange={e => updateBranch(rule.id, branch.id, { targetVariable: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>=</span>
                                <input 
                                  list="all-variables-datalist"
                                  placeholder='e.g. "Free", 500, or $amount * 0.1'
                                  value={branch.assignValue}
                                  onChange={e => updateBranch(rule.id, branch.id, { assignValue: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Branch Actions */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                          <button 
                            className="btn btn-secondary btn-add-branch"
                            onClick={() => addBranchToRule(rule.id, 'else_if')}
                            title={hasElse ? "Add Else If branch (inserted before Else)" : "Add Else If branch"}
                          >
                            <Plus size={10}/> Else If
                          </button>
                          {!hasElse && (
                            <button 
                              className="btn btn-secondary btn-add-branch"
                              onClick={() => addBranchToRule(rule.id, 'else')}
                              title="Add Else fallback branch"
                            >
                              <Plus size={10}/> Else
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Library & Variables */}
          <div className="accordion-section">
            <div className="accordion-header" onClick={() => toggleSection('library')}>
              <div className="section-title">
                {collapsedSections.library ? <ChevronRight size={12} /> : <ChevronDown size={12} />} 
                Template Library & Variables
              </div>
            </div>
            {!collapsedSections.library && (
              <div className="accordion-content">
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Click to insert variable (using <code>$name</code> syntax):
                </div>
                <div className="variable-tag-list">
                  {allAvailableVariables.map(v => (
                    <span key={v} className="variable-tag" onClick={() => insertTag(v)}>
                      {"$" + v}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '14px', marginBottom: '6px' }}>HTML Components:</div>
                <div className="component-picker">
                  {HTML_COMPONENTS.map(c => (
                    <div key={c.label} className="comp-btn-wrapper">
                      <button className="comp-btn" onClick={() => insertComponent(c.snippet)}>
                        {c.icon} {c.label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Resizer Handle */}
        <div 
          className={"sidebar-resizer " + (isResizing ? 'resizing' : '')} 
          onMouseDown={startResizing}
          onDoubleClick={() => {
            setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
            addToast("Sidebar width reset to default", "info");
          }}
          title="Drag to resize sidebar (double-click to reset)"
        />

        {/* Center / Right Editor & Preview Panel */}
        <section className="editor-panel">
          <div className="tabs">
            <div className={"tab " + (activeTab === 'code' ? 'active' : '')} onClick={() => setActiveTab('code')}>
              <Code size={14}/> Code.gs
            </div>
            <div className={"tab " + (activeTab === 'received-edit' ? 'active' : '')} onClick={() => { setActiveTab('received-edit'); setPreviewType('received'); }}>
              <Edit3 size={14}/> Received Template
            </div>
            <div className={"tab " + (activeTab === 'confirmed-edit' ? 'active' : '')} onClick={() => { setActiveTab('confirmed-edit'); setPreviewType('confirmed'); }}>
              <Edit3 size={14}/> Confirmed Template
            </div>

            <div className="editor-header-actions">
              {activeTab === 'code' && (
                <div 
                  className={"sync-toggle " + (isSyncLocked ? 'locked' : '')} 
                  onClick={() => {
                    if (isSyncLocked) {
                      setManualCode(autoGeneratedCode);
                      setIsSyncLocked(false);
                      setFlashCode(true);
                      setTimeout(() => setFlashCode(false), 500);
                      addToast("Code synced with generator settings");
                    } else {
                      setIsSyncLocked(true);
                      addToast("Manual code editing enabled", "info");
                    }
                  }}
                  title={isSyncLocked ? "Click to resync with config" : "Click to lock manual edits"}
                >
                  {isSyncLocked ? <Lock size={12}/> : <Unlock size={12}/>} 
                  {isSyncLocked ? 'Manual Edit' : 'Auto-Synced'}
                </div>
              )}
            </div>
          </div>

          <div className="editor-wrapper">
            <div className={"editor-scroll-container " + (flashCode ? 'code-flash' : '')}>
              <div className={"editor-grid " + (settings.wordWrap ? 'wrap' : '')}>
                <div 
                  className="highlighter-layer" 
                  dangerouslySetInnerHTML={{ __html: highlightedCode + '\n\n' }} 
                  style={{ 
                    whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre', 
                    fontSize: settings.zoom + 'px',
                    fontFamily: settings.font
                  }} 
                />
                <textarea 
                  ref={editorRef} 
                  className="editor-area" 
                  name={activeTab === 'code' ? 'manualCode' : (activeTab === 'received-edit' ? 'receivedTemplate' : 'confirmedTemplate')} 
                  value={activeTab === 'code' ? manualCode : (activeTab === 'received-edit' ? config.receivedTemplate : config.confirmedTemplate)} 
                  onChange={activeTab === 'code' ? handleManualCodeChange : handleInputChange} 
                  onKeyDown={handleKeyDown} 
                  spellCheck={false} 
                  style={{ 
                    whiteSpace: settings.wordWrap ? 'pre-wrap' : 'pre', 
                    fontSize: settings.zoom + 'px',
                    fontFamily: settings.font
                  }} 
                />
              </div>
            </div>

            {/* Floating Email Preview in the Right Bottom Corner */}
            {showPreview && (
              <div className={"corner-preview-window " + (isPreviewMaximized ? "maximized" : "")}>
                <div 
                  className="corner-preview-header"
                  onDoubleClick={() => setIsPreviewMaximized(prev => !prev)}
                  title="Double-click header to toggle maximize"
                >
                  <div className="corner-preview-title">
                    <Eye size={13} color="var(--accent-color)" />
                    <span>Email Preview</span>
                    <span className="badge-html">HTML</span>
                  </div>

                  <div className="corner-preview-controls">
                    <div className="preview-pill-group">
                      <button 
                        className={"preview-pill-btn " + (previewType === 'received' ? 'active' : '')}
                        onClick={() => setPreviewType('received')}
                        title="Preview Received Email Template"
                      >
                        Received
                      </button>
                      <button 
                        className={"preview-pill-btn " + (previewType === 'confirmed' ? 'active' : '')}
                        onClick={() => setPreviewType('confirmed')}
                        title="Preview Confirmed Email Template"
                      >
                        Confirmed
                      </button>
                    </div>

                    <div className="preview-pill-group">
                      <button 
                        className={"preview-pill-btn " + (previewMode === 'desktop' ? 'active' : '')}
                        onClick={() => setPreviewMode('desktop')}
                        title="Desktop View"
                      >
                        <Monitor size={11}/>
                      </button>
                      <button 
                        className={"preview-pill-btn " + (previewMode === 'mobile' ? 'active' : '')}
                        onClick={() => setPreviewMode('mobile')}
                        title="Mobile View"
                      >
                        <Smartphone size={11}/>
                      </button>
                    </div>

                    <button 
                      className="btn-maximize-preview"
                      onClick={() => setIsPreviewMaximized(prev => !prev)}
                      title={isPreviewMaximized ? "Restore Size (Esc)" : "Maximize Preview"}
                    >
                      {isPreviewMaximized ? <Minimize2 size={13}/> : <Maximize2 size={13}/>}
                    </button>

                    <button 
                      className="btn-close-preview"
                      onClick={() => {
                        setShowPreview(false);
                        setIsPreviewMaximized(false);
                      }}
                      title="Hide Preview (Esc)"
                    >
                      <X size={13}/>
                    </button>
                  </div>
                </div>

                <div className="corner-preview-body">
                  <div className={"corner-preview-frame-wrap " + (previewMode === 'mobile' ? 'mode-mobile' : 'mode-desktop')}>
                    <iframe 
                      title="Email Template Preview (HTML)"
                      className="preview-frame" 
                      srcDoc={previewHtml} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Right Bottom Corner Actions: Format HTML & Show/Hide Preview */}
            <div className="editor-corner-actions">
              {activeTab !== 'code' && (
                <button 
                  className="btn btn-secondary format-btn" 
                  title="Format HTML Template (Shift+Alt+F)"
                  onClick={() => { 
                    const n = activeTab === 'confirmed-edit' ? 'confirmedTemplate' : 'receivedTemplate'; 
                    updateConfig({ ...config, [n]: formatHTML((config as any)[n]) }); 
                    addToast("Formatted HTML template");
                  }}
                >
                  <Wand2 size={13}/> Format HTML
                </button>
              )}
              <button 
                className={"btn " + (showPreview ? "btn-primary active" : "btn-secondary")}
                title={showPreview ? "Hide Email Preview (Alt+P or Esc)" : "Show Email Preview (Alt+P)"}
                onClick={() => setShowPreview(prev => !prev)}
              >
                {showPreview ? <EyeOff size={13}/> : <Eye size={13}/>}
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>
          </div>

          <div className="status-bar">
            <div className={"save-indicator " + (isSaving ? 'saving' : '')}>
              {isSaving ? <Zap size={10}/> : <CheckCircle2 size={10}/>} 
              {isSaving ? 'Saving changes...' : 'Ready'}
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span>{config.projectName}</span>
              <span>{settings.wordWrap ? 'Wrap: On' : 'Wrap: Off'}</span>
              <span>{settings.zoom}px</span>
            </div>
          </div>
        </section>
      </main>

      {/* --- Settings Modal --- */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>Editor & App Settings</div>
              <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => setShowSettings(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="settings-row">
                <label>UI Theme</label>
                <select name="theme" value={settings.theme} onChange={handleSettingsChange}>
                  <option value="dark">Dark (Zed Dark)</option>
                  <option value="light">Light (Clean)</option>
                </select>
              </div>
              <div className="settings-row">
                <label>Editor Font Family</label>
                <select name="font" value={settings.font} onChange={handleSettingsChange}>
                  <option value='"JetBrains Mono", monospace'>JetBrains Mono</option>
                  <option value='"Fira Code", monospace'>Fira Code</option>
                  <option value='"Source Code Pro", monospace'>Source Code Pro</option>
                  <option value='"Courier New", monospace'>Courier New</option>
                  <option value='monospace'>System Monospace</option>
                </select>
              </div>
              <div className="settings-row">
                <label>Editor Font Size</label>
                <input name="zoom" type="number" min="10" max="24" value={settings.zoom} onChange={handleSettingsChange} />
              </div>
              <div className="settings-row">
                <label>Word Wrap</label>
                <label className="switch">
                  <input name="wordWrap" type="checkbox" checked={settings.wordWrap} onChange={handleSettingsChange} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setSettings({ theme: 'dark', font: '"JetBrains Mono", monospace', wordWrap: false, zoom: 13 });
                  addToast("Settings restored to defaults");
                }}
                title="Restore default editor settings"
              >
                <Zap size={13}/> Reset Settings
              </button>
              <button className="btn" onClick={() => setShowSettings(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Project Actions Modal (Create / Rename / Clone / Reset) --- */}
      {modalMode !== 'none' && (
        <div className="modal-overlay" onClick={() => setModalMode('none')}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {modalMode === 'reset' ? (
              <>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning-color)' }}>
                    <AlertCircle size={16} /> Reset Project to Default
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => setModalMode('none')}><X size={16}/></button>
                </div>
                <div className="modal-body">
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    Are you sure you want to reset project <strong>"{config.projectName}"</strong> to default seminar registration settings?
                  </p>
                  <div className="modal-alert-box">
                    <AlertCircle size={16} style={{ flexShrink: 0, color: 'var(--error-color)', marginTop: '2px' }} />
                    <div>
                      All custom variables, conditional logic rules, SMS parsers, sheet configurations, and email templates will be restored to defaults. This action cannot be undone.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode('none')}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleResetConfirm}>
                    <Zap size={14} /> Reset to Default
                  </button>
                </div>
              </>
            ) : modalMode === 'delete' ? (
              <>
                <div className="modal-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error-color)' }}>
                    <Trash2 size={16} /> Delete Project
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => setModalMode('none')}><X size={16}/></button>
                </div>
                <div className="modal-body">
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                    Are you sure you want to delete project <strong>"{config.projectName}"</strong>?
                  </p>
                  <div className="modal-alert-box">
                    <AlertCircle size={16} style={{ flexShrink: 0, color: 'var(--error-color)', marginTop: '2px' }} />
                    <div>
                      This action will permanently delete this project configuration and all associated email templates.
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode('none')}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                    <Trash2 size={14} /> Delete Project
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <div>
                    {modalMode === 'create' ? 'Create New Project' : modalMode === 'rename' ? 'Rename Project' : 'Clone Project'}
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => setModalMode('none')}><X size={16}/></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Project Name</label>
                    <input 
                      autoFocus 
                      value={modalInputValue} 
                      onChange={e => setModalValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleModalAction()}
                      placeholder="e.g. Annual Summit Registration"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalMode('none')}>Cancel</button>
                  <button className="btn" onClick={handleModalAction}>
                    {modalMode === 'create' ? 'Create' : modalMode === 'rename' ? 'Save' : 'Clone'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- Variable Suggestion Datalists for Fast Input --- */}
      <datalist id="all-variables-datalist">
        {allAvailableVariables.map(v => (
          <option key={v} value={`$${v}`} />
        ))}
      </datalist>
      <datalist id="var-names-datalist">
        {allAvailableVariables.map(v => (
          <option key={v} value={v} />
        ))}
      </datalist>

      {/* --- Toast Feedback Container --- */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? <Check size={14} color="var(--success-color)"/> : 
             toast.type === 'warning' ? <AlertCircle size={14} color="var(--warning-color)"/> :
             <Sparkles size={14} color="var(--accent-color)"/>}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
