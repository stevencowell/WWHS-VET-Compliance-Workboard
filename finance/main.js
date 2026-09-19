"use strict";

const APP_VERSION = "3.0";
const BUILD_STAMP = "2026-09-17_browser_vault";
const OFFLINE_AI_MESSAGE = "Online AI is not connected. Use the local tools or copy a question into your chosen assistant.";
let storageWritesSuppressed = 0;
let financeMutationDepth = 0;
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const MAX_READABLE_BACKUP_BYTES = 32 * 1024 * 1024;
const MAX_IMPORT_FILES = 100;

const STORAGE_KEYS = {
  budgetItems: "finance_studio_budget_items_v3",
  budgetMeta: "finance_studio_budget_meta_v1",
  budgetPlan: "finance_studio_budget_plan_v1",
  scenarios: "finance_studio_planning_scenarios_v3",
  subcategoryRules: "finance_studio_subcategory_rules_v3",
  merchantReviewHidden: "finance_studio_merchant_review_hidden_v1",
  taxSettings: "finance_studio_tax_settings_v1",
  taxManualExpenses: "finance_studio_tax_manual_expenses_v1",
  taxRules: "finance_studio_tax_rules_v1",
  taxOverrides: "finance_studio_tax_overrides_v1",
  theme: "finance_studio_theme_v1",
  assistantMode: "finance_studio_assistant_mode_v1",
  assistantWebLookup: "finance_studio_assistant_web_lookup_v1",
  globalAccountScope: "finance_studio_global_account_scope_v1",
  datasetSnapshot: "finance_studio_dataset_snapshot_v1",
};

const BUDGET_BASELINE_VERSION = "template_budget_v5";
const ASSISTANT_BRAND_NAME = "BudgetBuddy";
const ASSISTANT_NICKNAME = "Buddy";
const TAX_DEFAULT_FY_START_MONTH = 7;
const TAX_DEFAULT_OWNERSHIP_SHARE = 50;
const ESSENTIAL_SPEND_KEYWORDS = Object.freeze([
  "housing",
  "groceries",
  "transport",
  "health",
  "insurance",
  "family",
  "work",
  "pets",
  "financial",
  "loan",
  "airbnb",
]);


const currency = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateLong = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const monthLabel = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "short",
});

const AppState = {
  rawData: null,
  transactions: [],
  globalAccountScope:
    String(loadStorage(STORAGE_KEYS.globalAccountScope, "all") || "all").trim() || "all",
  monthlyCashflow: [],
  categorySummary: [],
  subcategorySummary: [],
  topMerchants: [],
  topIncomeSources: [],
  metrics: null,
  airbnbSummary: null,
  budgetDefaults: [],
  budgetItems: [],
  subcategoryRules: [],
  merchantReviewHidden: loadStorage(STORAGE_KEYS.merchantReviewHidden, []) || [],
  merchantReviewControls: {
    filter: "all",
    sort: "amount-desc",
  },
  scenarios: [],
  activeView: "overview",
  transactionFilters: {
    search: "",
    category: "all",
    subcategory: "all",
    subscription: "all",
    account: String(loadStorage(STORAGE_KEYS.globalAccountScope, "all") || "all").trim() || "all",
    type: "all",
    dateFrom: "",
    dateTo: "",
    sort: "date-desc",
    page: 1,
    perPage: 40,
  },
  overviewFilters: {
    period: "all",
    account: String(loadStorage(STORAGE_KEYS.globalAccountScope, "all") || "all").trim() || "all",
    dateFrom: "",
    dateTo: "",
  },
  overviewInspectMetric: "",
  transactionInspectMetric: "",
  categoryFilters: {
    category: "all",
    type: "all",
    period: "all",
  },
  categoryDetail: null,
  selectedCategoryTransactions: new Set(),
  selectedStatementMonth: "",
  budgetDetail: null,
  budgetUnbudgetedExpanded: false,
  ai: {
    subscriptions: [],
    anomalies: [],
    opportunities: [],
    inspectKind: "",
    inspectId: "",
    recurringRunRate: 0,
    flaggedAnnualSpend: 0,
    airbnbLoanRepaymentsAnnual: 0,
    airbnbOperatingExpenseAnnual: 0,
    uncategorizedExpense: 0,
    uncategorizedExpenseCount: 0,
    uncategorizedExpenseRatio: 0,
    merchantReviewQueue: [],
  },
  tax: {
    ownershipShare: TAX_DEFAULT_OWNERSHIP_SHARE,
    fyStartMonth: TAX_DEFAULT_FY_START_MONTH,
    streamView: "split",
    selectedFinancialYear: "",
    manualExpenses: [],
    rules: [],
    overrides: [],
    report: null,
    mapDraftTxId: "",
    inspectScope: "",
    inspectCategory: "",
  },
  assistant: {
    messages: [],
    isLoading: false,
    pendingImage: null,
    pendingDataFile: null,
    uploadedDataContext: null,
    mode:
      String(loadStorage(STORAGE_KEYS.assistantMode, "finance") || "finance")
        .toLowerCase()
        .trim() === "chat"
        ? "chat"
        : "finance",
    account: String(loadStorage(STORAGE_KEYS.globalAccountScope, "all") || "all").trim() || "all",
    webLookupEnabled:
      String(loadStorage(STORAGE_KEYS.assistantWebLookup, "off") || "off")
        .toLowerCase()
        .trim() === "on",
    lastFacts: null,
    lastQueryResult: null,
    lastBudgetContext: null,
    pendingAction: null,
    lastStagedAction: null,
    undoStack: [],
  },
  classificationAudit: [],
  classificationDiagnostics: null,
  budgetSuggestions: [],
  budgetFinancialYear: null,
};

let uniqueIdCounter = 0;
function createId(prefix = "id") {
  uniqueIdCounter += 1;
  return `${prefix}_${Date.now()}_${uniqueIdCounter}`;
}

function toLocalIsoDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseFlexibleDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) return raw.replaceAll("/", "-");

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("/");
    return `${year}-${month}-${day}`;
  }

  const bankDateMatch = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (bankDateMatch) {
    const monthMap = {
      jan: "01",
      feb: "02",
      mar: "03",
      apr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      aug: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dec: "12",
    };
    const day = bankDateMatch[1].padStart(2, "0");
    const month = monthMap[bankDateMatch[2].toLowerCase()];
    const year = bankDateMatch[3];
    if (month) return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

function monthKeyFromDate(dateStr) {
  if (!dateStr || dateStr.length < 7) return "";
  return dateStr.slice(0, 7);
}

function parseMonthStart(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  return new Date(`${monthKey}-01T00:00:00`);
}

function formatMonth(monthKey) {
  const date = parseMonthStart(monthKey);
  if (!date) return monthKey;
  return monthLabel.format(date);
}

function formatDate(dateStr) {
  if (!dateStr) return "--";
  const raw = String(dateStr).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  const normalized = parseFlexibleDate(raw);
  const normalizedIso = String(normalized || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (normalizedIso) return `${normalizedIso[3]}/${normalizedIso[2]}/${normalizedIso[1]}`;
  return raw;
}

function formatPct(value, digits = 1) {
  if (!Number.isFinite(value)) return "--";
  return `${value.toFixed(digits)}%`;
}

function getBudgetSuggestionBasisLabel(value = "") {
  const normalized = normalizeLabel(value);
  if (normalized === "fixed recurring") return "Regular repeating payment";
  if (normalized === "bill cycle") return "Regular bill cycle";
  if (normalized === "recent trend blend") return "Based on recent trend";
  if (normalized === "planned lumpy") return "Based on past lump sums";
  if (normalized === "hold actual") return "Held at last full-year amount";
  if (normalized === "full year actual") return "Based on last full year";
  if (normalized === "rolling 12m actual") return "Based on last 12 months";
  if (normalized === "fy run rate") return "Annualised from this financial year";
  return "Based on transaction history";
}

function getBudgetSuggestionCadenceLabel(value = "") {
  const normalized = normalizeLabel(value);
  if (normalized === "weekly") return "Weekly";
  if (normalized === "fortnightly") return "Fortnightly";
  if (normalized === "monthly") return "Monthly";
  if (normalized === "quarterly") return "Quarterly";
  if (normalized === "annually") return "Yearly";
  if (normalized === "recent trend") return "Recent trend";
  if (normalized === "run rate") return "Run rate";
  if (normalized === "observed") return "Irregular";
  return "Observed pattern";
}

function getAvailableAccounts(transactions = AppState.transactions) {
  return [...new Set(transactions.map((tx) => String(tx.account || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function filterTransactionsByAccount(transactions = [], account = "all") {
  const target = String(account || "all");
  if (target === "all") return [...transactions];
  return transactions.filter((tx) => String(tx.account || "").trim() === target);
}

function normalizeAccountScope(scope = "all", transactions = AppState.transactions) {
  const target = String(scope || "all").trim();
  if (!target || target === "all") return "all";
  const accounts = new Set(getAvailableAccounts(transactions));
  return accounts.has(target) ? target : "all";
}

function resolvePeriodBounds(availableMonths = [], period = "all", customFrom = "", customTo = "") {
  const sortedMonths = [...availableMonths].sort();
  const first = sortedMonths[0];
  const last = sortedMonths[sortedMonths.length - 1];
  if (!first || !last) return null;

  if (period === "last12") {
    return {
      start: sortedMonths[Math.max(sortedMonths.length - 12, 0)],
      end: last,
    };
  }
  if (period === "last6") {
    return {
      start: sortedMonths[Math.max(sortedMonths.length - 6, 0)],
      end: last,
    };
  }
  if (period === "last3") {
    return {
      start: sortedMonths[Math.max(sortedMonths.length - 3, 0)],
      end: last,
    };
  }
  if (period === "ytd") {
    const year = last.slice(0, 4);
    return {
      start: `${year}-01`,
      end: last,
    };
  }
  if (period === "custom") {
    const start = customFrom || first;
    const end = customTo || last;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  return { start: first, end: last };
}

function filterTransactionsByOverviewPeriod(
  transactions = [],
  filters = AppState.overviewFilters
) {
  const period = String(filters?.period || "all");
  if (period === "all") return [...transactions];
  if (!transactions.length) return [];

  if (period === "custom") {
    const availableDates = [...new Set(transactions.map((tx) => String(tx.date || "").trim()).filter(Boolean))].sort();
    const firstDate = availableDates[0];
    const lastDate = availableDates[availableDates.length - 1];
    if (!firstDate || !lastDate) return [];

    const fromDate = parseFlexibleDate(String(filters?.dateFrom || "")) || firstDate;
    const toDate = parseFlexibleDate(String(filters?.dateTo || "")) || lastDate;
    const startDate = fromDate <= toDate ? fromDate : toDate;
    const endDate = fromDate <= toDate ? toDate : fromDate;

    return transactions.filter((tx) => tx.date && tx.date >= startDate && tx.date <= endDate);
  }

  const availableMonths = buildMonthlyCashflow(transactions).map((row) => row.month);
  const bounds = resolvePeriodBounds(
    availableMonths,
    period,
    String(filters?.dateFrom || ""),
    String(filters?.dateTo || "")
  );
  if (!bounds) return [];

  return transactions.filter((tx) => tx.month && tx.month >= bounds.start && tx.month <= bounds.end);
}

function getGlobalScopedTransactions(transactions = AppState.transactions, options = {}) {
  const { ignoreAccount = false, ignorePeriod = false, filters = AppState.overviewFilters } = options;
  const normalizedScope = normalizeAccountScope(AppState.globalAccountScope, transactions);
  const accountScoped = ignoreAccount
    ? [...transactions]
    : filterTransactionsByAccount(transactions, normalizedScope);
  if (ignorePeriod) return accountScoped;
  return filterTransactionsByOverviewPeriod(accountScoped, filters);
}

function percentChange(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline === 0) return 0;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

function isEssentialSpendCategory(category = "") {
  const name = String(category || "").toLowerCase();
  return ESSENTIAL_SPEND_KEYWORDS.some((keyword) => name.includes(keyword));
}

function sum(values) {
  return values.reduce((acc, value) => acc + toNumber(value), 0);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = sum(values) / values.length;
  const variance = sum(values.map((x) => (x - mean) ** 2)) / values.length;
  return Math.sqrt(variance);
}

const TAX_AIRBNB_CATEGORY_RULES = Object.freeze([
  { category: "Council Rates", notes: "Council rates records", keywords: ["COUNCIL RATES"] },
  { category: "Water Rates", notes: "Water usage charges", keywords: ["WATER RATES", "WATER USAGE"] },
  {
    category: "Building/Landlord/Contents Insurance",
    notes: "Insurance coverage",
    keywords: ["HOME INSURANCE", "AAMI", "SUNCORP", "ALLIANZ", "INSURANCE", "LANDLORD"],
  },
  { category: "Mortgage Interest", notes: "Interest amount requires supporting evidence", keywords: ["LOAN INTEREST", "MORTGAGE INTEREST"] },
  { category: "Utilities & Services", notes: "Property utilities", keywords: ["ELECTRICITY", "ELECTRICITY", "GAS", "UTILITY"] },
  { category: "Internet & Phone (Airbnb)", notes: "Internet and phone services", keywords: ["BROADBAND", "INTERNET", "PHONE"] },
  { category: "Advertising & Marketing", notes: "Listing/marketing fees", keywords: ["ADVERT", "MARKETING", "LISTING", "PROMOTION"] },
  { category: "Property Management Fees", notes: "Management services", keywords: ["MANAGEMENT FEE", "PROPERTY MANAGEMENT"] },
  {
    category: "Property Maintenance (Mgr statement)",
    notes: "Ongoing maintenance",
    keywords: ["MAINTENANCE", "REPAIR", "PLUMB", "ELECTRICIAN", "PEST", "GARDEN"],
  },
  { category: "Cleaning & Linen (Mgr statement)", notes: "Cleaning + linen", keywords: ["CLEAN", "LINEN"] },
  { category: "Land Tax (VIC)", notes: "SRO Land Tax", keywords: ["LAND TAX", "SROVIC", "SRO VIC"] },
  { category: "Short-Stay Levy (VIC)", notes: "From 1 Jan 2025", keywords: ["SHORT-STAY LEVY", "SHORT STAY LEVY"] },
  {
    category: "Additional Airbnb Expenses (Receipts)",
    notes: "Pool/irrigation/garden/household items (<$300)",
    keywords: ["POOL", "IRRIGATION", "HOUSEHOLD", "BUNNINGS", "KMART", "TARGET"],
  },
]);

const TAX_AIRBNB_DEFAULT_CATEGORY = "Additional Airbnb Expenses (Receipts)";
const TAX_GENERAL_CATEGORY_RULES = Object.freeze([
  { category: "Tax Paid (ATO/BAS/GST)", notes: "Tax paid and remittances", keywords: ["ATO", "BAS", "GST", "PAYG", "INCOME TAX"] },
  {
    category: "Accounting & Tax Agent Fees",
    notes: "Accountant, bookkeeping, agent fees",
    keywords: ["ACCOUNTANT", "ACCOUNTING", "BOOKKEEP", "TAX AGENT", "H&R BLOCK"],
  },
  {
    category: "Business Software & AI Tools",
    notes: "Software subscriptions used for work/business",
    keywords: ["OPENAI", "CHATGPT", "CURSOR", "CLAUDE", "MICROSOFT", "ADOBE", "XERO", "MYOB", "QUICKBOOKS"],
  },
  { category: "Bank & Loan Interest (Non-Property)", notes: "Interest and finance charges", keywords: ["INTEREST", "FINANCE CHARGE"] },
  { category: "Office & Admin", notes: "Stationery and office consumables", keywords: ["OFFICEWORKS", "STATIONERY", "PRINT", "POST"] },
  {
    category: "Work-Related Travel",
    notes: "Business travel and accommodation",
    keywords: ["UBER", "TAXI", "JETSTAR", "QANTAS", "VIRGIN", "BOOKING.COM", "HOTEL"],
  },
  {
    category: "Professional Development",
    notes: "Training, courses, memberships",
    keywords: ["COURSE", "TRAINING", "SEMINAR", "CONFERENCE", "MEMBERSHIP", "UNION"],
  },
  { category: "Other General Deductions", notes: "Other general records requiring tax review", keywords: [] },
]);

const TAX_GENERAL_DEFAULT_CATEGORY = "Other General Deductions";
const FULL_BACKUP_TYPE = "finance_studio_full_backup";
const FULL_BACKUP_VERSION = 1;

function normalizeTaxSettings(raw = {}) {
  const ownershipShare = clamp(toNumber(raw?.ownershipShare, TAX_DEFAULT_OWNERSHIP_SHARE), 0, 100);
  const fyStartMonth = clamp(Math.round(toNumber(raw?.fyStartMonth, TAX_DEFAULT_FY_START_MONTH)), 1, 12);
  return {
    ownershipShare,
    fyStartMonth,
  };
}

function normalizeTaxManualExpenseRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const date = parseFlexibleDate(row?.date || "");
      const scopeRaw = normalizeLabel(String(row?.scope || row?.stream || "airbnb"));
      const scope = scopeRaw === "general" ? "general" : "airbnb";
      const category = String(row?.category || "").trim() || (scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY);
      const amount = Math.abs(toNumber(row?.amount, 0));
      const description = String(row?.description || row?.notes || "").trim();
      const id = String(row?.id || createId(`taxManual${index}`)).trim();
      if (!date || amount <= 0) return null;
      return { id, scope, date, category, amount: Number(amount.toFixed(2)), description };
    })
    .filter(Boolean);
}

function normalizeTaxScope(value = "") {
  return normalizeLabel(String(value || "")) === "general" ? "general" : "airbnb";
}

function normalizeTaxStreamView(value = "") {
  const normalized = normalizeLabel(String(value || ""));
  if (normalized === "combined") return "combined";
  if (normalized === "airbnb") return "airbnb";
  if (normalized === "general") return "general";
  return "split";
}

function buildTaxStreamScopedRows({
  rows = [],
  streamView = "split",
  colSpan = 1,
  renderRow = (row) => String(row || ""),
  emptyMessage = "No rows available.",
  airbnbEmptyMessage = "No Airbnb rows in current view.",
  generalEmptyMessage = "No General rows in current view.",
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const mode = normalizeTaxStreamView(streamView);
  if (!safeRows.length) {
    return `<tr><td colspan="${colSpan}">${escapeHtml(emptyMessage)}</td></tr>`;
  }

  const rowScope = (row) => normalizeTaxScope(row?.scope || row?.stream || "airbnb");
  const scopedRows =
    mode === "airbnb" || mode === "general"
      ? safeRows.filter((row) => rowScope(row) === mode)
      : safeRows;

  if (!scopedRows.length) {
    const noneLabel = mode === "airbnb" ? "Airbnb" : "General";
    return `<tr><td colspan="${colSpan}">No ${noneLabel} rows in current view.</td></tr>`;
  }
  if (mode === "combined" || mode === "airbnb" || mode === "general") {
    return scopedRows.map((row) => renderRow(row)).join("");
  }

  const airbnbRows = scopedRows.filter((row) => rowScope(row) === "airbnb");
  const generalRows = scopedRows.filter((row) => rowScope(row) === "general");
  const blocks = [];
  const pushBlock = (title, scoped, scopedEmptyMessage) => {
    blocks.push(`<tr class="tax-stream-divider"><td colspan="${colSpan}">${escapeHtml(title)}</td></tr>`);
    blocks.push(
      scoped.length
        ? scoped.map((row) => renderRow(row)).join("")
        : `<tr><td colspan="${colSpan}">${escapeHtml(scopedEmptyMessage)}</td></tr>`
    );
  };
  pushBlock("Airbnb Property", airbnbRows, airbnbEmptyMessage);
  pushBlock("General records for review", generalRows, generalEmptyMessage);
  return blocks.join("");
}

function buildTaxTransactionSignature(tx = {}) {
  const date = parseFlexibleDate(tx?.date || "");
  const description = normalizeLabel(String(tx?.description || ""));
  const amount = Number(Math.abs(toNumber(tx?.amount, 0)).toFixed(2));
  const account = normalizeLabel(String(tx?.account || ""));
  return `${date}|${description}|${amount}|${account}`;
}

function getTaxCategoriesForScope(scope = "airbnb") {
  const normalizedScope = normalizeTaxScope(scope);
  return normalizedScope === "general"
    ? TAX_GENERAL_CATEGORY_RULES.map((item) => item.category)
    : TAX_AIRBNB_CATEGORY_RULES.map((item) => item.category);
}

function normalizeTaxRuleRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const scope = normalizeTaxScope(row?.scope || row?.stream || "airbnb");
      const categories = getTaxCategoriesForScope(scope);
      const fallbackCategory = scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY;
      const categoryRaw = String(row?.category || "").trim();
      const category = categories.includes(categoryRaw) ? categoryRaw : fallbackCategory;
      const keyword = String(row?.keyword || "").trim();
      const keywordUpper = keyword.toUpperCase();
      const account = String(row?.account || "").trim();
      let dateFrom = parseFlexibleDate(row?.dateFrom || row?.fromDate || "");
      let dateTo = parseFlexibleDate(row?.dateTo || row?.toDate || "");
      const minAmountRaw = toNumber(row?.minAmount, NaN);
      const maxAmountRaw = toNumber(row?.maxAmount, NaN);
      let minAmount = Number.isFinite(minAmountRaw) && minAmountRaw > 0 ? Number(minAmountRaw.toFixed(2)) : null;
      let maxAmount = Number.isFinite(maxAmountRaw) && maxAmountRaw > 0 ? Number(maxAmountRaw.toFixed(2)) : null;
      if (dateFrom && dateTo && dateFrom > dateTo) {
        const tmp = dateFrom;
        dateFrom = dateTo;
        dateTo = tmp;
      }
      if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
        const tmp = minAmount;
        minAmount = maxAmount;
        maxAmount = tmp;
      }
      const id = String(row?.id || createId(`taxRule${index}`)).trim();
      const enabled = row?.enabled !== false;
      if (!keywordUpper) return null;
      return {
        id,
        scope,
        category,
        keyword,
        keywordUpper,
        account,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        enabled,
      };
    })
    .filter(Boolean);
}

function normalizeTaxOverrideRows(rows = []) {
  const normalized = (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const txId = String(row?.txId || row?.transactionId || "").trim();
      const signature =
        String(row?.signature || "").trim() ||
        buildTaxTransactionSignature({
          date: row?.date || row?.txDate || "",
          description: row?.description || row?.txDescription || "",
          amount: row?.amount ?? row?.txAmount ?? 0,
          account: row?.account || row?.txAccount || "",
        });
      if (!txId && !signature) return null;
      const scope = normalizeTaxScope(row?.scope || row?.stream || "airbnb");
      const categories = getTaxCategoriesForScope(scope);
      const fallbackCategory = scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY;
      const isUnmapped = row?.isUnmapped === true || normalizeLabel(String(row?.action || "")) === "unmap";
      const excludeFromTax = row?.excludeFromTax === true || isUnmapped;
      const categoryRaw = String(row?.category || "").trim();
      const category = isUnmapped
        ? fallbackCategory
        : categories.includes(categoryRaw)
          ? categoryRaw
          : fallbackCategory;
      const id = String(row?.id || createId(`taxOverride${index}`)).trim();
      const updatedAt = String(row?.updatedAt || new Date().toISOString());
      return { id, txId, signature, scope, category, isUnmapped, excludeFromTax, updatedAt };
    })
    .filter(Boolean);

  const map = new Map();
  normalized.forEach((row) => {
    const key = row.txId ? `tx:${row.txId}` : `sig:${row.signature}`;
    map.set(key, row);
  });
  return [...map.values()];
}

function normalizeThemeValue(value = "") {
  return String(value || "").trim().toLowerCase() === "dark" ? "dark" : "light";
}

function normalizeAssistantModeValue(value = "") {
  return String(value || "").trim().toLowerCase() === "chat" ? "chat" : "finance";
}

function normalizeAssistantWebLookupValue(value = "") {
  if (value === true) return "on";
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "on" || normalized === "true" || normalized === "1" || normalized === "yes"
    ? "on"
    : "off";
}

function normalizeMerchantReviewHiddenRows(rows = []) {
  return [...new Set((Array.isArray(rows) ? rows : []).map((item) => normalizeRuleKeyword(item)).filter(Boolean))];
}

function normalizeScenarioRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const name = String(row?.name || row?.label || "").trim();
      const costChange = toNumber(row?.costChange ?? row?.monthlyChange ?? row?.amountChange, NaN);
      const duration = Math.round(toNumber(row?.duration ?? row?.months, NaN));
      const id = String(row?.id || createId(`scenario${index}`)).trim();
      if (!name || !Number.isFinite(costChange) || !Number.isFinite(duration) || duration <= 0) return null;
      return {
        id,
        name,
        costChange: Number(costChange.toFixed(2)),
        duration,
      };
    })
    .filter(Boolean);
}

function normalizeSubcategoryRuleRows(rows = []) {
  const byKeyword = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    const keyword = String(row?.keyword || row?.merchant || "").trim();
    const normalizedKeyword = normalizeRuleKeyword(keyword);
    if (!normalizedKeyword) return;
    const normalizedTarget = canonicalizeCategorySubcategory(
      row?.category || "Uncategorized",
      row?.subcategory || "Other",
      row?.subcategory || "Other",
      -1,
      null
    );
    if (!normalizedTarget?.category || !normalizedTarget?.subcategory) return;
    if (normalizeLabel(normalizedTarget.category) === "transfers") return;
    byKeyword.set(normalizedKeyword, {
      id: String(row?.id || createId(`rule${index}`)).trim(),
      keyword,
      category: normalizedTarget.category,
      subcategory: normalizedTarget.subcategory,
    });
  });
  return [...byKeyword.values()];
}

function buildBudgetSignatureFromDataset(dataset = {}) {
  const rows = (Array.isArray(dataset?.recent_transactions) ? dataset.recent_transactions : []).map((row) => {
    const date = parseFlexibleDate(row?.date || "");
    return {
      date,
      account: String(row?.account || "").trim(),
      month: date ? date.slice(0, 7) : "",
    };
  });
  return buildBudgetDataSignature(rows);
}

function normalizeBudgetMetaSnapshot(raw = {}, dataset = {}) {
  const fallbackSignature = buildBudgetSignatureFromDataset(dataset);
  return {
    version: String(raw?.version || BUDGET_BASELINE_VERSION).trim() || BUDGET_BASELINE_VERSION,
    signature: String(raw?.signature || fallbackSignature).trim() || fallbackSignature || "empty",
  };
}

function buildNormalizedBackupTaxSnapshot(rawLocalState = {}, rawDatasetTax = {}) {
  const settings = normalizeTaxSettings(rawLocalState.tax_settings || rawLocalState.taxSettings || rawDatasetTax.settings || {});
  const streamView = normalizeTaxStreamView(
    rawLocalState.tax_stream_view ||
      rawLocalState.taxStreamView ||
      rawDatasetTax?.settings?.streamView ||
      rawDatasetTax?.streamView ||
      "split"
  );
  return {
    settings: {
      ...settings,
      streamView,
    },
    manual_expenses: normalizeTaxManualExpenseRows(
      rawLocalState.tax_manual_expenses ||
        rawLocalState.taxManualExpenses ||
        rawDatasetTax.manual_expenses ||
        rawDatasetTax.manualExpenses ||
        []
    ),
    rules: normalizeTaxRuleRows(rawLocalState.tax_rules || rawLocalState.taxRules || rawDatasetTax.rules || []),
    overrides: normalizeTaxOverrideRows(
      rawLocalState.tax_overrides || rawLocalState.taxOverrides || rawDatasetTax.overrides || []
    ),
  };
}

function isFinanceStudioBackupPayload(payload = {}) {
  return (
    Boolean(payload) &&
    typeof payload === "object" &&
    String(payload.backup_type || payload.backupType || "").trim() === FULL_BACKUP_TYPE
  );
}

function normalizeFinanceStudioBackupPayload(payload = {}) {
  if (!isFinanceStudioBackupPayload(payload)) return null;
  const dataset =
    payload?.dataset && typeof payload.dataset === "object"
      ? payload.dataset
      : payload?.data && typeof payload.data === "object"
      ? payload.data
      : null;
  if (!dataset || !Array.isArray(dataset.recent_transactions)) return null;

  const localState =
    payload?.local_state && typeof payload.local_state === "object"
      ? payload.local_state
      : payload?.localState && typeof payload.localState === "object"
      ? payload.localState
      : {};
  const normalizedTaxSnapshot = buildNormalizedBackupTaxSnapshot(localState, dataset.tax_data || {});

  return {
    backupType: FULL_BACKUP_TYPE,
    backupVersion: Math.max(
      1,
      Math.round(toNumber(payload.backup_version ?? payload.backupVersion, FULL_BACKUP_VERSION))
    ),
    dataset: {
      ...dataset,
      recent_transactions: Array.isArray(dataset.recent_transactions) ? dataset.recent_transactions : [],
      monthly_cashflow: Array.isArray(dataset.monthly_cashflow) ? dataset.monthly_cashflow : [],
      category_summary: Array.isArray(dataset.category_summary) ? dataset.category_summary : [],
      subcategory_summary: Array.isArray(dataset.subcategory_summary) ? dataset.subcategory_summary : [],
      budget_summary: Array.isArray(dataset.budget_summary) ? dataset.budget_summary : [],
      top_merchants: Array.isArray(dataset.top_merchants) ? dataset.top_merchants : [],
      top_income_sources: Array.isArray(dataset.top_income_sources) ? dataset.top_income_sources : [],
      tax_data: normalizedTaxSnapshot,
    },
    summary: payload?.summary && typeof payload.summary === "object" ? payload.summary : {},
    localState: {
      budgetItems: normalizeBudgetItems(localState.budget_items || localState.budgetItems || dataset.budget_summary || []),
      budgetMeta: normalizeBudgetMetaSnapshot(localState.budget_meta || localState.budgetMeta || {}, dataset),
      budgetPlan: localState.budget_plan == null ? null : validateStoredBudgetPlan(localState.budget_plan),
      subcategoryRules: normalizeSubcategoryRuleRows(
        localState.subcategory_rules || localState.subcategoryRules || []
      ),
      merchantReviewHidden: normalizeMerchantReviewHiddenRows(
        localState.merchant_review_hidden || localState.merchantReviewHidden || []
      ),
      scenarios: normalizeScenarioRows(localState.scenarios || []),
      taxSnapshot: normalizedTaxSnapshot,
      theme: normalizeThemeValue(localState.theme || ""),
      assistantMode: normalizeAssistantModeValue(localState.assistant_mode || localState.assistantMode || ""),
      assistantWebLookup: normalizeAssistantWebLookupValue(
        localState.assistant_web_lookup ?? localState.assistantWebLookup ?? ""
      ),
      globalAccountScope: String(
        localState.global_account_scope || localState.globalAccountScope || "all"
      ).trim() || "all",
    },
  };
}

function taxRuleMatchesTransaction(tx, rule) {
  if (!tx || !rule?.enabled) return false;
  const amount = Math.abs(toNumber(tx.amount, 0));
  if (!(amount > 0) || toNumber(tx.amount, 0) >= 0) return false;
  if (normalizeLabel(tx.category) === "transfers") return false;
  const descriptionUpper = String(tx.description || "").toUpperCase();
  if (!descriptionUpper.includes(rule.keywordUpper)) return false;
  if (rule.account) {
    const txAccount = normalizeLabel(tx.account || "");
    if (txAccount !== normalizeLabel(rule.account)) return false;
  }
  if (rule.dateFrom && tx.date < rule.dateFrom) return false;
  if (rule.dateTo && tx.date > rule.dateTo) return false;
  if (rule.minAmount !== null && amount < rule.minAmount) return false;
  if (rule.maxAmount !== null && amount > rule.maxAmount) return false;
  return true;
}

function resolveTaxMappingForTransaction(
  tx,
  ruleRows = [],
  overrideByTxId = new Map(),
  overrideBySignature = new Map()
) {
  if (!tx || toNumber(tx.amount, 0) >= 0) return null;
  if (normalizeLabel(tx.category) === "transfers") return null;

  const override = overrideByTxId.get(String(tx.id || "").trim());
  const signature = buildTaxTransactionSignature(tx);
  const signatureOverride = override || overrideBySignature.get(signature);
  if (signatureOverride) {
    if (signatureOverride.isUnmapped) {
      return {
        scope: "",
        category: "",
        source: "override",
        sourceId: signatureOverride.id,
        unmapped: true,
        excludeFromTax: Boolean(signatureOverride.excludeFromTax),
      };
    }
    return {
      scope: signatureOverride.scope,
      category: signatureOverride.category,
      source: "override",
      sourceId: signatureOverride.id,
    };
  }

  const matchedRule = ruleRows.find((rule) => taxRuleMatchesTransaction(tx, rule));
  if (matchedRule) {
    return {
      scope: matchedRule.scope,
      category: matchedRule.category,
      source: "rule",
      sourceId: matchedRule.id,
    };
  }

  const descriptionUpper = String(tx.description || "").toUpperCase();
  const normalizedCategory = normalizeLabel(tx.category || "");
  const normalizedSubcategory = normalizeLabel(tx.subcategory || "");
  const airbnbSignal = isAirbnbSignal(
    descriptionUpper,
    normalizedCategory,
    normalizedSubcategory,
    tx.property
  );
  if (airbnbSignal) {
    return {
      scope: "airbnb",
      category: inferTaxAirbnbCategory(tx),
      source: "auto",
      sourceId: "auto-airbnb",
      unmapped: true,
      reviewRequired: true,
    };
  }
  if (isGeneralTaxCandidate(tx)) {
    return {
      scope: "general",
      category: inferTaxGeneralCategory(tx),
      source: "auto",
      sourceId: "auto-general",
      unmapped: true,
      reviewRequired: true,
    };
  }
  return null;
}

function getFinancialYearLabelFromDate(dateStr, fyStartMonth = TAX_DEFAULT_FY_START_MONTH) {
  const parsed = parseFlexibleDate(dateStr);
  if (!parsed) return "";
  const [yearRaw, monthRaw] = parsed.split("-");
  const year = toNumber(yearRaw, 0);
  const month = toNumber(monthRaw, 0);
  if (!year || !month) return "";
  const startYear = month >= fyStartMonth ? year : year - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

function getCurrentFinancialYearLabel(fyStartMonth = TAX_DEFAULT_FY_START_MONTH) {
  const nowIso = toLocalIsoDate(new Date());
  return getFinancialYearLabelFromDate(nowIso, fyStartMonth);
}

function getFinancialYearRange(label = "", fyStartMonth = TAX_DEFAULT_FY_START_MONTH) {
  const match = String(label || "").match(/^(\d{4})-\d{2}$/);
  if (!match) return { start: "", end: "" };
  const startYear = toNumber(match[1], 0);
  if (!startYear) return { start: "", end: "" };
  const endYear = startYear + 1;
  const start = `${startYear}-${String(fyStartMonth).padStart(2, "0")}-01`;
  const end = new Date(Date.UTC(endYear, fyStartMonth - 1, 1) - 86400000)
    .toISOString()
    .slice(0, 10);
  return { start, end };
}

function inferTaxAirbnbCategory(tx) {
  if (!tx) return TAX_AIRBNB_DEFAULT_CATEGORY;
  const descriptionUpper = String(tx.description || "").toUpperCase();
  const subcategory = normalizeLabel(tx.subcategory || "");
  const category = normalizeLabel(tx.category || "");

  if (subcategory === "rates") {
    if (descriptionUpper.includes("LAND TAX") || descriptionUpper.includes("SRO")) return "Land Tax (VIC)";
    if (descriptionUpper.includes("WATER")) return "Water Rates";
    return "Council Rates";
  }
  // A repayment may contain principal. Only explicit interest wording can suggest interest.
  if (tx.is_loan_payment || /loan payment|mortgage|repayment/.test(subcategory) || /\bREPAYMENT\b/.test(descriptionUpper)) {
    return TAX_AIRBNB_DEFAULT_CATEGORY;
  }
  if (subcategory === "interest" || /\bINTEREST\b/.test(descriptionUpper)) return "Mortgage Interest";
  if (subcategory === "maintenance") return "Property Maintenance (Mgr statement)";
  if (subcategory === "cleaning") return "Cleaning & Linen (Mgr statement)";
  if (subcategory === "utilities") {
    if (descriptionUpper.includes("BROADBAND")) return "Internet & Phone (Airbnb)";
    if (descriptionUpper.includes("WATER")) return "Water Rates";
    return "Utilities & Services";
  }

  for (const rule of TAX_AIRBNB_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => descriptionUpper.includes(keyword))) {
      return rule.category;
    }
  }
  return TAX_AIRBNB_DEFAULT_CATEGORY;
}

function isGeneralTaxCandidate(tx) {
  if (!tx || toNumber(tx.amount, 0) >= 0) return false;
  const category = String(tx.category || "").trim();
  const subcategory = String(tx.subcategory || "").trim();
  if (category === "Airbnb" || String(tx.property || "").trim() === "Airbnb") return false;
  if (category === "Transfers") return false;
  const normalizedSub = normalizeLabel(subcategory);
  const descriptionUpper = String(tx.description || "").toUpperCase();
  if (normalizedSub === "tax" || normalizedSub === "interest") return true;
  if (category === "Financial") return true;
  const hasWorkSignal = /\bWORK(?:\s|$|-|\/)/.test(descriptionUpper) || /\bUNION\b/.test(descriptionUpper);
  return (
    descriptionUpper.includes("ATO") ||
    descriptionUpper.includes("BAS") ||
    descriptionUpper.includes("GST") ||
    descriptionUpper.includes("ACCOUNTANT") ||
    descriptionUpper.includes("BOOKKEEP") ||
    descriptionUpper.includes("TAX AGENT") ||
    descriptionUpper.includes("DEDUCTION") ||
    hasWorkSignal
  );
}

function inferTaxGeneralCategory(tx) {
  if (!tx) return TAX_GENERAL_DEFAULT_CATEGORY;
  const descriptionUpper = String(tx.description || "").toUpperCase();
  const normalizedSub = normalizeLabel(tx.subcategory || "");
  const normalizedCategory = normalizeLabel(tx.category || "");
  for (const rule of TAX_GENERAL_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => descriptionUpper.includes(keyword))) return rule.category;
  }
  if (normalizedSub === "tax" || descriptionUpper.includes("ATO")) return "Tax Paid (ATO/BAS/GST)";
  if (normalizedSub === "interest") return "Bank & Loan Interest (Non-Property)";
  if (normalizedSub === "subscriptions" || normalizedCategory === "lifestyle") return "Business Software & AI Tools";
  if (normalizedCategory === "transport") return "Work-Related Travel";
  return TAX_GENERAL_DEFAULT_CATEGORY;
}

function selectDefaultTaxFinancialYear(transactions = [], availableFinancialYears = [], fyStartMonth = TAX_DEFAULT_FY_START_MONTH) {
  const years = Array.isArray(availableFinancialYears) ? availableFinancialYears.filter(Boolean) : [];
  const fallbackLabel = years[years.length - 1] || getCurrentFinancialYearLabel(fyStartMonth);
  const transferApi = getTransferClassificationApi();
  if (!(transferApi && typeof transferApi.selectBudgetSuggestionScope === "function")) {
    return {
      label: fallbackLabel,
      scopeMode: "active_fy",
      sourceReason: "",
    };
  }

  const scopeSelection = transferApi.selectBudgetSuggestionScope(transactions, fyStartMonth);
  const selectedScope = scopeSelection?.financialYear || {};
  const scopeMode = String(selectedScope.scopeMode || "active_fy").trim() || "active_fy";
  const scopedLatestDate = String(selectedScope.latestDate || "").trim();
  const scopedLabel = getFinancialYearLabelFromDate(scopedLatestDate, fyStartMonth);

  if (scopeMode === "previous_full_fy" && scopedLabel && years.includes(scopedLabel)) {
    return {
      label: scopedLabel,
      scopeMode,
      sourceReason: String(selectedScope.sourceReason || "").trim(),
    };
  }

  return {
    label: fallbackLabel,
    scopeMode: "active_fy",
    sourceReason: "",
  };
}

function buildTaxAirbnbTrackingReport(transactions = [], taxState = AppState.tax) {
  const settings = normalizeTaxSettings({
    ownershipShare: taxState?.ownershipShare,
    fyStartMonth: taxState?.fyStartMonth,
  });
  const manualExpenses = normalizeTaxManualExpenseRows(taxState?.manualExpenses || []);
  const rules = normalizeTaxRuleRows(taxState?.rules || []);
  const overrides = normalizeTaxOverrideRows(taxState?.overrides || []);
  const overrideByTxId = new Map(overrides.map((row) => [String(row.txId || ""), row]));
  const overrideBySignature = new Map(overrides.map((row) => [String(row.signature || ""), row]));
  const allYears = new Set();

  const baseTransactions = Array.isArray(transactions) ? transactions : [];
  const taxCandidateRows = baseTransactions
    .filter((tx) => tx && toNumber(tx.amount, 0) < 0 && normalizeLabel(tx.category) !== "transfers")
    .map((tx) => {
      const mapping = resolveTaxMappingForTransaction(tx, rules, overrideByTxId, overrideBySignature);
      const descriptionUpper = String(tx.description || "").toUpperCase();
      const normalizedCategory = normalizeLabel(tx.category || "");
      const normalizedSubcategory = normalizeLabel(tx.subcategory || "");
      const likelyAirbnb = isAirbnbSignal(
        descriptionUpper,
        normalizedCategory,
        normalizedSubcategory,
        tx.property
      );
      const likelyGeneral = isGeneralTaxCandidate(tx);
      const likelyTax = Boolean(mapping || likelyAirbnb || likelyGeneral);
      return { tx, mapping, likelyTax, likelyAirbnb, likelyGeneral };
    })
    .filter((row) => row.likelyTax || row.mapping);

  taxCandidateRows.forEach((row) => {
    const label = getFinancialYearLabelFromDate(row.tx.date, settings.fyStartMonth);
    if (label) allYears.add(label);
  });
  manualExpenses.forEach((row) => {
    const label = getFinancialYearLabelFromDate(row.date, settings.fyStartMonth);
    if (label) allYears.add(label);
  });

  const financialYears = [...allYears].sort((a, b) => a.localeCompare(b));
  const requestedFinancialYear = String(taxState?.selectedFinancialYear || "").trim();
  const hasExplicitFinancialYear = financialYears.includes(requestedFinancialYear);
  const defaultSelection = hasExplicitFinancialYear
    ? { label: requestedFinancialYear, scopeMode: "manual", sourceReason: "" }
    : selectDefaultTaxFinancialYear(baseTransactions, financialYears, settings.fyStartMonth);
  const selectedFinancialYear =
    defaultSelection.label || financialYears[financialYears.length - 1] || getCurrentFinancialYearLabel(settings.fyStartMonth);

  const categoryMap = new Map();
  const registerCategorySeed = (scope, rule) => {
    categoryMap.set(`${scope}::${rule.category}`, {
      scope,
      category: rule.category,
      notes: rule.notes,
      total: 0,
      deductible: 0,
      txCount: 0,
      source: "bank",
      lastDate: "",
    });
  };
  TAX_AIRBNB_CATEGORY_RULES.forEach((rule) => registerCategorySeed("airbnb", rule));
  TAX_GENERAL_CATEGORY_RULES.forEach((rule) => registerCategorySeed("general", rule));

  const monthlyTotals = new Map();
  const mappedTransactions = [];
  const unmatched = [];
  let airbnbBankTotal = 0;
  let generalBankTotal = 0;
  let manualTotal = 0;

  taxCandidateRows.forEach((entry) => {
    const tx = entry.tx;
    const label = getFinancialYearLabelFromDate(tx.date, settings.fyStartMonth);
    if (label !== selectedFinancialYear) return;
    if (!entry.mapping || entry.mapping.unmapped) {
      if (entry.mapping?.unmapped && entry.mapping?.excludeFromTax) {
        return;
      }
      unmatched.push({
        txId: tx.id || "",
        scope: entry.likelyAirbnb ? "airbnb" : "general",
        date: tx.date,
        description: tx.description,
        amount: Number(Math.abs(toNumber(tx.amount, 0)).toFixed(2)),
        account: tx.account,
        source: "auto",
      });
      return;
    }

    const scope = normalizeTaxScope(entry.mapping.scope);
    const mappedCategory = String(entry.mapping.category || "").trim() ||
      (scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY);
    const amount = Math.abs(toNumber(tx.amount, 0));
    const key = `${scope}::${mappedCategory}`;
    const row = categoryMap.get(key) || {
      scope,
      category: mappedCategory,
      notes: entry.mapping.source === "rule" ? "Mapped by custom rule" : "Auto-detected from transaction history",
      total: 0,
      deductible: 0,
      txCount: 0,
      source: entry.mapping.source === "override" ? "override" : "bank",
      lastDate: "",
    };
    row.total += amount;
    row.deductible += scope === "airbnb" ? amount * (settings.ownershipShare / 100) : amount;
    row.txCount += 1;
    row.lastDate = !row.lastDate || String(tx.date || "") > row.lastDate ? String(tx.date || "") : row.lastDate;
    categoryMap.set(key, row);

    const monthKey = monthKeyFromDate(tx.date);
    if (monthKey) monthlyTotals.set(monthKey, toNumber(monthlyTotals.get(monthKey), 0) + amount);
    if (scope === "airbnb") airbnbBankTotal += amount;
    else generalBankTotal += amount;
    mappedTransactions.push({
      id: tx.id || createId("taxAuto"),
      scope,
      date: tx.date,
      description: tx.description,
      amount: Number(amount.toFixed(2)),
      category: mappedCategory,
      deductible: Number(
        (scope === "airbnb" ? amount * (settings.ownershipShare / 100) : amount).toFixed(2)
      ),
      account: tx.account,
      source: entry.mapping.source,
      sourceId: entry.mapping.sourceId || "",
    });

    if (
      (scope === "airbnb" && mappedCategory === TAX_AIRBNB_DEFAULT_CATEGORY) ||
      (scope === "general" && mappedCategory === TAX_GENERAL_DEFAULT_CATEGORY)
    ) {
      unmatched.push({
        txId: tx.id || "",
        scope,
        date: tx.date,
        description: tx.description,
        amount: Number(amount.toFixed(2)),
        account: tx.account,
        source: entry.mapping.source,
      });
    }
  });

  manualExpenses.forEach((row) => {
    const label = getFinancialYearLabelFromDate(row.date, settings.fyStartMonth);
    if (label !== selectedFinancialYear) return;
    const scope = row.scope === "general" ? "general" : "airbnb";
    const category = row.category || (scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY);
    const amount = Math.abs(toNumber(row.amount, 0));
    const key = `${scope}::${category}`;
    const target = categoryMap.get(key) || {
      scope,
      category,
      notes: "Manual receipt entry",
      total: 0,
      deductible: 0,
      txCount: 0,
      source: "manual",
      lastDate: "",
    };
    target.total += amount;
    target.deductible += scope === "airbnb" ? amount * (settings.ownershipShare / 100) : amount;
    target.txCount += 1;
    target.source = "bank+manual";
    target.lastDate = !target.lastDate || String(row.date || "") > target.lastDate ? String(row.date || "") : target.lastDate;
    categoryMap.set(key, target);
    const monthKey = monthKeyFromDate(row.date);
    if (monthKey) monthlyTotals.set(monthKey, toNumber(monthlyTotals.get(monthKey), 0) + amount);
    manualTotal += amount;
  });

  const categories = [...categoryMap.values()]
    .map((row) => ({
      ...row,
      scopeLabel: row.scope === "airbnb" ? "Airbnb Property" : "General records for review",
      total: Number(row.total.toFixed(2)),
      deductible: Number(row.deductible.toFixed(2)),
    }))
    .sort((a, b) => b.deductible - a.deductible || b.total - a.total || a.category.localeCompare(b.category));

  const airbnbManualTotal = sum(
    manualExpenses
      .filter(
        (row) =>
          row.scope !== "general" &&
          getFinancialYearLabelFromDate(row.date, settings.fyStartMonth) === selectedFinancialYear
      )
      .map((row) => row.amount)
  );
  const generalManualTotal = sum(
    manualExpenses
      .filter(
        (row) =>
          row.scope === "general" &&
          getFinancialYearLabelFromDate(row.date, settings.fyStartMonth) === selectedFinancialYear
      )
      .map((row) => row.amount)
  );
  const airbnbTotal = airbnbBankTotal + airbnbManualTotal;
  const generalTotal = generalBankTotal + generalManualTotal;
  const deductibleTotal = airbnbTotal * (settings.ownershipShare / 100) + generalTotal;

  const totals = {
    totalExpenses: Number((airbnbTotal + generalTotal).toFixed(2)),
    deductibleTotal: Number(deductibleTotal.toFixed(2)),
    ownerShare: Number((airbnbTotal * (settings.ownershipShare / 100)).toFixed(2)),
    airbnbTotal: Number(airbnbTotal.toFixed(2)),
    generalTotal: Number(generalTotal.toFixed(2)),
    bankTotal: Number((airbnbBankTotal + generalBankTotal).toFixed(2)),
    manualTotal: Number(manualTotal.toFixed(2)),
    transactionCount: categories.reduce((acc, item) => acc + toNumber(item.txCount, 0), 0),
    mappedCategoryCount: categories.filter((item) => item.total > 0).length,
  };

  const monthlySeries = [...monthlyTotals.entries()]
    .map(([month, amount]) => ({
      month,
      amount: Number(toNumber(amount, 0).toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    settings,
    financialYears,
    selectedFinancialYear,
    scopeMode: defaultSelection.scopeMode || (hasExplicitFinancialYear ? "manual" : "active_fy"),
    sourceReason: hasExplicitFinancialYear ? "" : defaultSelection.sourceReason || "",
    dateRange: getFinancialYearRange(selectedFinancialYear, settings.fyStartMonth),
    totals,
    categories,
    mappedTransactions,
    unmatched: unmatched.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    monthlySeries,
    rules,
    overrides,
    manualEntries: manualExpenses
      .filter((row) => getFinancialYearLabelFromDate(row.date, settings.fyStartMonth) === selectedFinancialYear)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
  };
}

function normalizeMerchant(description) {
  if (!description) return "Unknown";
  let cleaned = description.toUpperCase();
  cleaned = cleaned
    .replace(/\b(POS|W\/D|PAYMENT|TRANSFER|DEBIT|CREDIT|CARD|EFTPOS|DIRECT|ONLINE|BPAY|WITHDRAWAL)\b/g, "")
    .replace(/[0-9]/g, " ")
    .replace(/[^A-Z\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    cleaned = description.toUpperCase().replace(/\s+/g, " ").trim();
  }
  const words = cleaned.split(" ").filter(Boolean).slice(0, 3);
  return words.join(" ") || "Unknown";
}

function normalizeRuleKeyword(value = "") {
  return normalizeLabel(String(value || ""));
}

function getRuleMatchTexts(tx = {}) {
  return [
    String(tx.description || ""),
    String(tx.canonical_description || ""),
    String(tx.canonical_payee_key || ""),
    String(tx.payee_label || ""),
    normalizeMerchant(tx.description || ""),
  ]
    .map((value) => normalizeRuleKeyword(value))
    .filter(Boolean);
}

function transactionMatchesRuleKeyword(tx, keyword) {
  const needle = normalizeRuleKeyword(keyword);
  if (!needle) return false;
  return getRuleMatchTexts(tx).some((text) => text.includes(needle));
}

function isMerchantLegalEntitySignal(description = "") {
  const text = String(description || "").toUpperCase();
  return /\b(?:PTY|LIMITED|LTD|HOLDINGS|INVSTMNT|INVESTMENT|SERVIC|ENTERPRISES|GROUP)\b/.test(text);
}

function merchantReviewReasonsForTransaction(tx) {
  const reasons = [];
  const category = normalizeLabel(tx?.category);
  const subcategory = normalizeLabel(tx?.subcategory);
  const description = String(tx?.description || "").toUpperCase();

  if (category === "uncategorized") reasons.push("Uncategorized");
  if (description.includes("INSUR") && category !== "insurance") reasons.push("Insurance text mismatch");
  if ((description.includes("CHEMIST") || description.includes("PHARM")) && category !== "health") {
    reasons.push("Pharmacy text mismatch");
  }
  if (
    (description.includes("AIRBNB") || description.includes("MERCURE") || description.includes("HOTEL") || description.includes("MOTEL")) &&
    category !== "travel" &&
    !(category === "income" && subcategory === "airbnb income") &&
    category !== "airbnb"
  ) {
    reasons.push("Accommodation text mismatch");
  }
  if (isMerchantLegalEntitySignal(description) && (category === "uncategorized" || category === "investments")) {
    reasons.push("Legal business name");
  }

  return [...new Set(reasons)];
}

function suggestMerchantResolutionForTransaction(tx) {
  const description = String(tx?.description || "");
  const text = description.toUpperCase();
  let best = null;

  const consider = (category, subcategory, confidence, reason) => {
    if (!category || !subcategory) return;
    const normalized = canonicalizeCategorySubcategory(category, subcategory, description, toNumber(tx?.amount, -1), tx?.property || null);
    const candidate = {
      category: normalized.category,
      subcategory: normalized.subcategory,
      confidence: clamp(toNumber(confidence, 0), 0, 0.99),
      reason: String(reason || "").trim(),
    };
    if (!best || candidate.confidence > best.confidence) best = candidate;
  };

  if (/\bINSUR(?:ANCE)?\b/.test(text)) {
    consider("Insurance", "Other Insurance", 0.9, "Insurance wording in merchant text.");
  }
  if (text.includes("CHEMIST") || text.includes("PHARM")) {
    consider("Health", "Pharmacy", 0.97, "Pharmacy wording in merchant text.");
  }
  if (
    text.includes("AIRBNB") ||
    text.includes("MERCURE") ||
    text.includes("HOTEL") ||
    text.includes("MOTEL") ||
    text.includes("RESORT") ||
    text.includes("LODGE") ||
    text.includes("BOOKING.COM") ||
    text.includes("WOTIF") ||
    text.includes("EXPEDIA") ||
    text.includes("AGODA")
  ) {
    consider("Travel", "Accommodation", 0.95, "Accommodation wording in merchant text.");
  }
  if (text.includes("TEACH STARTER") || text.includes("TWINKL") || text.includes("TEACHERSPAYTEACHERS")) {
    consider("Work", "Other", 0.92, "Teacher/work resource merchant.");
  }
  if (
    text.includes("WOOLWORTHS") ||
    text.includes("COLES") ||
    text.includes("ALDI") ||
    text.includes("IGA") ||
    text.includes("COSTCO") ||
    text.includes("BAKERS DELIGHT") ||
    text.includes("BUTCH") ||
    text.includes("MEAT")
  ) {
    consider("Groceries", "Groceries", 0.88, "Grocery/butcher wording in merchant text.");
  }
  if (
    text.includes("CAFE") ||
    text.includes("COFFEE") ||
    text.includes("BAKEHOUSE") ||
    text.includes("ZAMBRERO") ||
    text.includes("TAVERN") ||
    text.includes("BISTRO") ||
    text.includes("RESTAURANT")
  ) {
    consider("Dining & Takeaway", inferDiningSubcategory("", text), 0.84, "Dining venue wording in merchant text.");
  }
  if (
    text.includes("SPOTLIGHT") ||
    text.includes("ICONIC") ||
    text.includes("GAZMAN") ||
    text.includes("CONNOR") ||
    text.includes("PILLOW TALK") ||
    text.includes("ADAIRS")
  ) {
    consider("Lifestyle", "Retail", 0.88, "Retail merchant wording.");
  }
  if (text.includes("PETSTOCK") || text.includes("BIRDZ") || text.includes("PETS")) {
    consider("Pets", "Other", 0.86, "Pet merchant wording.");
  }

  const fallback = canonicalizeCategorySubcategory("Uncategorized", "Other", description, toNumber(tx?.amount, -1), tx?.property || null);
  if (fallback.category !== "Uncategorized") {
    consider(
      fallback.category,
      fallback.subcategory,
      best ? Math.max(best.confidence, 0.76) : 0.76,
      best?.reason || "Current classifier can infer a likely category from the merchant text."
    );
  }

  return best;
}

function merchantSuggestionConfidenceLabel(score) {
  const value = clamp(toNumber(score, 0), 0, 0.99);
  if (value >= 0.9) return "High";
  if (value >= 0.75) return "Medium";
  return "Low";
}

function merchantSuggestionDiffersFromCurrent(tx, suggestion) {
  if (!suggestion?.category || !suggestion?.subcategory) return false;
  return (
    normalizeLabel(tx?.category) !== normalizeLabel(suggestion.category) ||
    normalizeLabel(tx?.subcategory) !== normalizeLabel(suggestion.subcategory)
  );
}

function buildMerchantReviewQueue(transactions = [], options = {}) {
  const rows = Array.isArray(transactions) ? transactions : [];
  const hiddenKeys = new Set(
    (Array.isArray(options.hiddenKeys) ? options.hiddenKeys : []).map((item) => normalizeRuleKeyword(item))
  );
  const groups = new Map();

  rows.forEach((tx) => {
    if (!(toNumber(tx?.amount, 0) < 0)) return;
    if (normalizeLabel(tx?.category) === "transfers") return;

    const reasons = merchantReviewReasonsForTransaction(tx);
    const suggestion = suggestMerchantResolutionForTransaction(tx);
    if (!reasons.length && merchantSuggestionDiffersFromCurrent(tx, suggestion)) {
      reasons.push("Suggested category mismatch");
    }
    if (!reasons.length) return;

    const merchant = normalizeMerchant(tx.description || "");
    const key = normalizeRuleKeyword(merchant || tx.description || "");
    if (!key || hiddenKeys.has(key)) return;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        merchant,
        keyword: merchant,
        currentCategory: tx.category || "Uncategorized",
        currentSubcategory: tx.subcategory || "Other",
        reasons: new Set(),
        transactionCount: 0,
        totalAmount: 0,
        latestDate: tx.date || "",
        sampleDescriptions: [],
        suggestionVotes: new Map(),
      });
    }

    const group = groups.get(key);
    group.transactionCount += 1;
    group.totalAmount += Math.abs(toNumber(tx.amount, 0));
    if (String(tx.date || "") > String(group.latestDate || "")) group.latestDate = tx.date || group.latestDate;
    reasons.forEach((reason) => group.reasons.add(reason));
    if (!group.sampleDescriptions.includes(tx.description) && group.sampleDescriptions.length < 3) {
      group.sampleDescriptions.push(tx.description);
    }
    if (normalizeLabel(group.currentCategory) === "uncategorized" && normalizeLabel(tx.category) !== "uncategorized") {
      group.currentCategory = tx.category || group.currentCategory;
      group.currentSubcategory = tx.subcategory || group.currentSubcategory;
    }

    if (suggestion?.category && suggestion?.subcategory) {
      const suggestionKey = `${suggestion.category}___${suggestion.subcategory}`;
      const current = group.suggestionVotes.get(suggestionKey) || {
        category: suggestion.category,
        subcategory: suggestion.subcategory,
        count: 0,
        confidenceSum: 0,
        reason: suggestion.reason || "",
      };
      current.count += 1;
      current.confidenceSum += toNumber(suggestion.confidence, 0);
      if (!current.reason && suggestion.reason) current.reason = suggestion.reason;
      group.suggestionVotes.set(suggestionKey, current);
    }
  });

  return [...groups.values()]
    .map((item) => {
      const { suggestionVotes, ...rest } = item;
      const topSuggestion = [...item.suggestionVotes.values()].sort(
        (a, b) =>
          b.count - a.count ||
          b.confidenceSum / Math.max(1, b.count) - a.confidenceSum / Math.max(1, a.count) ||
          a.category.localeCompare(b.category)
      )[0];
      const suggestionCount = topSuggestion?.count || 0;
      const avgSuggestionConfidence = topSuggestion
        ? topSuggestion.confidenceSum / Math.max(1, topSuggestion.count)
        : 0;
      const consistency = suggestionCount / Math.max(1, item.transactionCount);
      const confidenceScore = topSuggestion
        ? clamp(avgSuggestionConfidence * 0.75 + consistency * 0.25, 0, 0.99)
        : 0;

      return {
        ...rest,
        reasons: [...item.reasons],
        totalAmount: Number(item.totalAmount.toFixed(2)),
        suggestedCategory: topSuggestion?.category || "",
        suggestedSubcategory: topSuggestion?.subcategory || "",
        suggestionReason: topSuggestion?.reason || "",
        confidenceScore: Number(confidenceScore.toFixed(2)),
        confidenceLabel: topSuggestion ? merchantSuggestionConfidenceLabel(confidenceScore) : "",
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount || b.transactionCount - a.transactionCount || a.merchant.localeCompare(b.merchant));
}

function getMerchantReviewQueueView(items = [], controls = {}) {
  const rows = Array.isArray(items) ? [...items] : [];
  const filter = String(controls?.filter || "all").trim().toLowerCase();
  const sort = String(controls?.sort || "amount-desc").trim().toLowerCase();

  const filtered = rows.filter((item) => {
    if (filter === "suggested") return Boolean(item?.suggestedCategory);
    if (filter === "high-confidence") {
      return Boolean(item?.suggestedCategory) && normalizeLabel(item?.confidenceLabel) === "high";
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (sort === "confidence-desc") {
      return (
        toNumber(b?.confidenceScore, 0) - toNumber(a?.confidenceScore, 0) ||
        b.totalAmount - a.totalAmount ||
        b.transactionCount - a.transactionCount ||
        String(b.latestDate || "").localeCompare(String(a.latestDate || "")) ||
        a.merchant.localeCompare(b.merchant)
      );
    }
    if (sort === "latest-desc") {
      return (
        String(b.latestDate || "").localeCompare(String(a.latestDate || "")) ||
        b.totalAmount - a.totalAmount ||
        b.transactionCount - a.transactionCount ||
        a.merchant.localeCompare(b.merchant)
      );
    }
    if (sort === "transactions-desc") {
      return (
        toNumber(b?.transactionCount, 0) - toNumber(a?.transactionCount, 0) ||
        b.totalAmount - a.totalAmount ||
        String(b.latestDate || "").localeCompare(String(a.latestDate || "")) ||
        a.merchant.localeCompare(b.merchant)
      );
    }
    return (
      b.totalAmount - a.totalAmount ||
      toNumber(b?.confidenceScore, 0) - toNumber(a?.confidenceScore, 0) ||
      toNumber(b?.transactionCount, 0) - toNumber(a?.transactionCount, 0) ||
      String(b.latestDate || "").localeCompare(String(a.latestDate || "")) ||
      a.merchant.localeCompare(b.merchant)
    );
  });
}

function mode(values) {
  if (!values.length) return "";
  const counts = new Map();
  values.forEach((value) => {
    const key = String(value || "");
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  let bestKey = "";
  let bestCount = -1;
  counts.forEach((count, key) => {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  });
  return bestKey;
}

function downloadBlob(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function fileDateStamp() {
  return toLocalIsoDate(new Date());
}

function cssVar(name, fallback = "") {
  try {
    const value = getComputedStyle(document.body).getPropertyValue(name).trim();
    return value || fallback;
  } catch {
    return fallback;
  }
}

const UI = {
  loader: null,
  loaderText: null,
  toastContainer: null,

  init() {
    this.loader = document.createElement("div");
    this.loader.className = "loading-overlay";
    this.loader.setAttribute("aria-hidden", "true");
    this.loader.innerHTML = `
      <div class="loading-panel" role="status" aria-live="polite" aria-atomic="true">
        <span class="spinner" aria-hidden="true"></span>
        <p id="loadingText">Processing...</p>
      </div>
    `;
    document.body.appendChild(this.loader);
    this.loaderText = this.loader.querySelector("#loadingText");

    this.toastContainer = document.createElement("div");
    this.toastContainer.className = "toast-container";
    this.toastContainer.setAttribute("aria-live", "polite");
    this.toastContainer.setAttribute("aria-atomic", "false");
    document.body.appendChild(this.toastContainer);
  },

  showLoading(message = "Processing...") {
    if (this.loaderText) this.loaderText.textContent = message;
    this.loader?.classList.add("active");
    this.loader?.setAttribute("aria-hidden", "false");
  },

  hideLoading() {
    this.loader?.classList.remove("active");
    this.loader?.setAttribute("aria-hidden", "true");
  },

  toast(title, message, type = "info") {
    const toast = document.createElement("article");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.innerHTML = `
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(message)}</p>
    `;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3800);
  },
};

const ChartManager = {
  instances: {},
  getCanvas(id) {
    return document.getElementById(id);
  },
  showFallback(id, message) {
    const canvas = this.getCanvas(id);
    if (!canvas) return;
    const wrap = canvas.closest(".chart-wrap");
    if (!wrap) return;
    let fallback = wrap.querySelector(`[data-chart-fallback="${id}"]`);
    if (!fallback) {
      fallback = document.createElement("p");
      fallback.className = "chart-fallback";
      fallback.dataset.chartFallback = id;
      wrap.appendChild(fallback);
    }
    fallback.textContent = message;
    canvas.hidden = true;
  },
  clearFallback(id) {
    const canvas = this.getCanvas(id);
    if (!canvas) return;
    canvas.hidden = false;
    const wrap = canvas.closest(".chart-wrap");
    wrap?.querySelector(`[data-chart-fallback="${id}"]`)?.remove();
  },
  getBaseOptions() {
    const dark = document.body?.dataset?.theme === "dark";
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          labels: {
            color: cssVar("--muted", dark ? "#9bb0c8" : "#31404a"),
            font: {
              family: "IBM Plex Sans",
              size: 12,
              weight: "600",
            },
          },
        },
        tooltip: {
          backgroundColor: dark ? "rgba(10, 18, 28, 0.95)" : "rgba(23, 33, 41, 0.95)",
          titleColor: dark ? "#f3f8ff" : "#ffffff",
          bodyColor: dark ? "#d9e7f8" : "#e9f4f2",
          borderColor: dark ? "rgba(47, 129, 247, 0.25)" : "rgba(255, 255, 255, 0.12)",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: {
            color: cssVar("--muted", dark ? "#9bb0c8" : "#5b6673"),
            font: { family: "IBM Plex Sans", size: 11 },
          },
          grid: {
            color: dark ? "rgba(88, 120, 156, 0.2)" : "rgba(23, 33, 41, 0.08)",
          },
        },
        y: {
          ticks: {
            color: cssVar("--muted", dark ? "#9bb0c8" : "#5b6673"),
            font: { family: "IBM Plex Sans", size: 11 },
          },
          grid: {
            color: dark ? "rgba(88, 120, 156, 0.2)" : "rgba(23, 33, 41, 0.08)",
          },
        },
      },
    };
  },

  set(id, config) {
    if (this.instances[id]) {
      this.instances[id].destroy();
    }
    const canvas = this.getCanvas(id);
    if (!canvas) return;
    if (typeof Chart === "undefined") {
      this.showFallback(
        id,
        "Charts are unavailable right now. The summary cards and tables below still reflect the current data."
      );
      return;
    }
    this.clearFallback(id);

    const merged = {
      ...config,
      options: {
        ...this.getBaseOptions(),
        ...(config.options || {}),
      },
    };
    try {
      this.instances[id] = new Chart(canvas, merged);
    } catch (error) {
      this.showFallback(id, "This chart could not be rendered, but the surrounding data is still available.");
    }
  },

  remove(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
    this.clearFallback(id);
  },
};

const ThemeController = {
  init() {
    const storedTheme = String(loadStorage(STORAGE_KEYS.theme, "light") || "light").toLowerCase();
    const theme = storedTheme === "dark" ? "dark" : "light";
    this.applyTheme(theme, { persist: false });
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      this.toggleTheme();
    });
    this.syncToggleLabel();
  },

  currentTheme() {
    return document.body?.dataset?.theme === "dark" ? "dark" : "light";
  },

  applyTheme(theme, options = {}) {
    const persist = options.persist !== false;
    const rerender = options.rerender !== false;
    document.body.dataset.theme = theme === "dark" ? "dark" : "light";
    if (persist) {
      saveStorage(STORAGE_KEYS.theme, document.body.dataset.theme);
    }
    this.syncToggleLabel();
    if (rerender && AppState.transactions.length) {
      App.renderAll();
    }
  },

  toggleTheme() {
    const nextTheme = this.currentTheme() === "dark" ? "light" : "dark";
    this.applyTheme(nextTheme, { persist: true, rerender: true });
  },

  syncToggleLabel() {
    const button = document.getElementById("themeToggle");
    if (!button) return;
    const darkModeOn = this.currentTheme() === "dark";
    button.textContent = darkModeOn ? "Light Mode" : "Dark Mode";
    button.setAttribute("aria-pressed", darkModeOn ? "true" : "false");
  },
};

function groupBy(transactions, keyFn) {
  const map = new Map();
  transactions.forEach((tx) => {
    const key = keyFn(tx);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(tx);
  });
  return map;
}

let cachedNodeTransferClassificationApi;

function getTransferClassificationApi() {
  if (typeof window !== "undefined" && window.TransferClassification) {
    return window.TransferClassification;
  }
  if (typeof require === "function") {
    if (cachedNodeTransferClassificationApi !== undefined) {
      return cachedNodeTransferClassificationApi;
    }
    try {
      cachedNodeTransferClassificationApi = require("./transfer-classification.js");
    } catch {
      cachedNodeTransferClassificationApi = null;
    }
    return cachedNodeTransferClassificationApi;
  }
  return null;
}

function getTransactionFinancialPolicy(tx) {
  const transferApi = getTransferClassificationApi();
  if (transferApi && typeof transferApi.getTransactionFinancialPolicy === "function") {
    return transferApi.getTransactionFinancialPolicy(tx);
  }
  const normalizedCategory = normalizeLabel(tx?.category || "");
  return {
    includeInSpending: toNumber(tx?.amount, 0) < 0 && normalizedCategory !== "transfers",
    includeInIncome: toNumber(tx?.amount, 0) > 0 && normalizedCategory !== "transfers",
    includeInBudget: normalizedCategory !== "transfers",
  };
}

function includeTransactionInSpending(tx) {
  return Boolean(getTransactionFinancialPolicy(tx).includeInSpending);
}

function includeTransactionInIncome(tx) {
  return Boolean(getTransactionFinancialPolicy(tx).includeInIncome);
}

function includeTransactionInBudget(tx) {
  return Boolean(getTransactionFinancialPolicy(tx).includeInBudget);
}

function isMatchedInternalTransfer(tx) {
  return Boolean(
    tx &&
      tx.is_internal_transfer &&
      tx.internal_transfer_matched &&
      String(tx.transfer_pair_id || "").trim()
  );
}

function isMortgagePrincipalTransaction(tx) {
  const normalizedCategory = normalizeLabel(tx?.category || "");
  const normalizedSubcategory = normalizeLabel(tx?.subcategory || "");
  return (
    Boolean(tx?.is_loan_payment) ||
    (normalizedCategory === "airbnb" && normalizedSubcategory === "loan payment") ||
    (normalizedCategory === "housing" &&
      (
        normalizedSubcategory === "mortgage loan" ||
        normalizedSubcategory === "mortgage base" ||
        normalizedSubcategory === "mortgage extra" ||
        normalizedSubcategory === "mortgage additional lump"
      ))
  );
}

function getFinancialYearScope(transactions = [], fyStartMonth = TAX_DEFAULT_FY_START_MONTH) {
  const transferApi = getTransferClassificationApi();
  const fallback = {
    label: "",
    start: "",
    end: "",
    latestDate: "",
    daysElapsed: 0,
    totalDays: 0,
    fractionElapsed: 0,
  };
  const financialYear =
    transferApi && typeof transferApi.getFinancialYearContext === "function"
      ? transferApi.getFinancialYearContext(transactions, fyStartMonth) || fallback
      : fallback;
  const scopedTransactions =
    financialYear.start && financialYear.latestDate
      ? (Array.isArray(transactions) ? transactions : []).filter(
          (tx) => String(tx?.date || "") >= financialYear.start && String(tx?.date || "") <= financialYear.latestDate
        )
      : [...(Array.isArray(transactions) ? transactions : [])];
  return { financialYear, scopedTransactions };
}

function buildClassificationDiagnostics(transactions = []) {
  const transferApi = getTransferClassificationApi();
  if (transferApi && typeof transferApi.buildBeforeAfterReport === "function") {
    return transferApi.buildBeforeAfterReport(transactions);
  }
  return {
    beforeUncategorized: { amount: 0, count: 0 },
    afterUncategorized: { amount: 0, count: 0 },
    movedOutOfUncategorized: { amount: 0, count: 0 },
    reclassifiedIntoMortgage: 0,
    markedInternalTransfers: 0,
    markedSinkingTransfers: 0,
    remainingUncategorizedTotal: 0,
    remainingUncategorizedCount: 0,
    atmWithdrawalsFy: { amount: 0, count: 0 },
    remainingUncategorizedTop: [],
  };
}

function buildAnnualBudgetSuggestions(transactions = [], fyStartMonth = TAX_DEFAULT_FY_START_MONTH) {
  const transferApi = getTransferClassificationApi();
  if (transferApi && typeof transferApi.buildBudgetSuggestions === "function") {
    return transferApi.buildBudgetSuggestions(transactions, { fyStartMonth });
  }
  return { financialYear: null, suggestions: [] };
}

function appendClassificationAudit(entry) {
  if (!entry || typeof entry !== "object") return;
  const normalized = {
    tx_id: String(entry.tx_id || "").trim() || "--",
    matched_rule_name: String(entry.matched_rule_name || "").trim() || "unknown_rule",
    confidence: Number(toNumber(entry.confidence, 0).toFixed(2)),
    payee_label: String(entry.payee_label || "").trim(),
    canonical_payee_key: String(entry.canonical_payee_key || "").trim(),
    old_category: String(entry.old_category || "Uncategorized").trim() || "Uncategorized",
    old_subcategory: String(entry.old_subcategory || "Other").trim() || "Other",
    new_category: String(entry.new_category || "Uncategorized").trim() || "Uncategorized",
    new_subcategory: String(entry.new_subcategory || "Other").trim() || "Other",
    changed_at: new Date().toISOString(),
  };
  AppState.classificationAudit.unshift(normalized);
  if (AppState.classificationAudit.length > 500) {
    AppState.classificationAudit = AppState.classificationAudit.slice(0, 500);
  }
}

function applyTransferClassificationOverrides(transactions = [], options = {}) {
  const rows = Array.isArray(transactions) ? transactions : [];
  if (!rows.length) return { auditLog: [], matchedInternalCount: 0, pairCount: 0 };

  const transferApi = getTransferClassificationApi();
  if (!transferApi || typeof transferApi.classifyTransactions !== "function") {
    return { auditLog: [], matchedInternalCount: 0, pairCount: 0 };
  }

  const knownInternalAccounts = getAvailableAccounts(rows);
  const result = transferApi.classifyTransactions(rows, {
    knownInternalAccounts,
  });

  const shouldRecordAudit = options.recordAudit !== false;
  if (shouldRecordAudit && Array.isArray(result.auditLog) && result.auditLog.length) {
    result.auditLog.forEach((entry) => appendClassificationAudit(entry));
  }
  return result;
}

function normalizeAirbnbFinancingCategory(tx) {
  normalizeToOfficialTaxonomy(tx);
  return tx;
}

function normalizeAirbnbFinancingForSet(transactions) {
  transactions.forEach((tx) => {
    normalizeToOfficialTaxonomy(tx);
  });
  return transactions;
}

function normalizeTransactionSetToOfficialTaxonomy(transactions = [], options = {}) {
  if (!Array.isArray(transactions)) return [];
  normalizeAirbnbFinancingForSet(transactions);
  transactions.forEach((tx) => {
    normalizeToOfficialTaxonomy(tx);
  });
  applyTransferClassificationOverrides(transactions, options);
  return transactions;
}

function collectTaxonomySanity(transactions = []) {
  const officialCategories = new Set(getTaxonomyCategories());
  const uniqueCategories = [...new Set(
    (Array.isArray(transactions) ? transactions : [])
      .map((tx) => String(tx?.category || "Uncategorized").trim() || "Uncategorized")
  )].sort((a, b) => a.localeCompare(b));
  const legacyCategories = uniqueCategories.filter((category) => !officialCategories.has(category));
  return {
    uniqueCategories,
    legacyCategories,
    previewCategories: uniqueCategories.slice(0, 12),
    allOfficial: legacyCategories.length === 0,
  };
}

function prepareTransactionsForExport(transactions = []) {
  const cloned = (Array.isArray(transactions) ? transactions : []).map((tx) => ({ ...tx }));
  const officialCategories = new Set(getTaxonomyCategories());
  const legacyCategories = [...new Set(
    cloned
      .map((tx) => String(tx?.category || "Uncategorized").trim() || "Uncategorized")
      .filter((category) => !officialCategories.has(category))
  )].sort((a, b) => a.localeCompare(b));

  normalizeTransactionSetToOfficialTaxonomy(cloned, { recordAudit: false });

  return {
    transactions: cloned,
    legacyCategories,
  };
}

function normalizeTransaction(raw, index = 0) {
  const date = parseFlexibleDate(raw.date);
  const amount = toNumber(String(raw.amount).replace(/[^0-9.-]/g, ""), 0);
  const rawCategory = String(raw.category || "Uncategorized").trim() || "Uncategorized";
  const rawSubcategory = String(raw.subcategory || "Other").trim() || "Other";
  const tx = {
    id: raw.id || createId(`tx${index}`),
    date,
    month: monthKeyFromDate(date),
    source_type: String(raw.source_type || raw.sourceType || "").trim(),
    description: String(raw.description || "Unknown Transaction").trim(),
    payee: String(raw.payee || "").trim(),
    memo: String(raw.memo || raw.notes || "").trim(),
    reference: String(raw.reference || raw.ref || "").trim(),
    counterparty: String(raw.counterparty || "").trim(),
    amount,
    balance: toNumber(String(raw.balance ?? "").replace(/[^0-9.-]/g, ""), 0),
    account: String(raw.account || "").trim(),
    raw_category: String(raw.raw_category || raw.rawCategory || raw.category || "Uncategorized").trim() || "Uncategorized",
    raw_subcategory: String(raw.raw_subcategory || raw.rawSubcategory || raw.subcategory || "Other").trim() || "Other",
    category: rawCategory,
    subcategory: rawSubcategory,
    manual_category_override: String(
      raw.manual_category_override || raw.manualCategoryOverride || ""
    ).trim(),
    manual_subcategory_override: String(
      raw.manual_subcategory_override || raw.manualSubcategoryOverride || ""
    ).trim(),
    type: raw.type || (amount >= 0 ? "income" : "expense"),
    property: raw.property ?? null,
    isSubscription: Boolean(raw.isSubscription ?? raw.is_subscription ?? false),
    transfer_pair_id:
      String(
        raw.transfer_pair_id ||
          raw.transferPairId ||
          raw.linked_transfer_id ||
          raw.linkedTransferId ||
          raw.matched_transfer ||
          raw.matchedTransfer ||
          raw.transfer_match_id ||
          raw.transferMatchId ||
          ""
      ).trim(),
    internal_transfer_matched: Boolean(raw.internal_transfer_matched || raw.internalTransferMatched || false),
    canonical_description: String(raw.canonical_description || raw.canonicalDescription || "").trim(),
    canonical_payee_key: String(raw.canonical_payee_key || raw.canonicalPayeeKey || "").trim(),
    payee_label: String(raw.payee_label || raw.payeeLabel || "").trim(),
    payee_alias_rule_id: String(raw.payee_alias_rule_id || raw.payeeAliasRuleId || "").trim(),
    classification_rule_id: String(raw.classification_rule_id || raw.classificationRuleId || "").trim(),
    classification_confidence: toNumber(raw.classification_confidence ?? raw.classificationConfidence, 0),
    classification_reason: String(raw.classification_reason || raw.classificationReason || "").trim(),
    pre_cleanup_category: String(raw.pre_cleanup_category || raw.preCleanupCategory || rawCategory).trim() || rawCategory,
    pre_cleanup_subcategory: String(raw.pre_cleanup_subcategory || raw.preCleanupSubcategory || rawSubcategory).trim() || rawSubcategory,
    is_internal_transfer: Boolean(raw.is_internal_transfer || raw.isInternalTransfer || false),
    is_sinking_transfer: Boolean(raw.is_sinking_transfer || raw.isSinkingTransfer || false),
    is_loan_payment: Boolean(raw.is_loan_payment || raw.isLoanPayment || false),
    is_loan_payment_counterpart: Boolean(raw.is_loan_payment_counterpart || raw.isLoanPaymentCounterpart || false),
    exclude_from_spending: Boolean(raw.exclude_from_spending || raw.excludeFromSpending || false),
    exclude_from_income: Boolean(raw.exclude_from_income || raw.excludeFromIncome || false),
    exclude_from_budget: Boolean(raw.exclude_from_budget || raw.excludeFromBudget || false),
  };

  const isLikelyUnclassified =
    normalizeLabel(rawCategory) === "uncategorized" ||
    normalizeLabel(rawSubcategory) === "imported";
  if (isLikelyUnclassified) {
    classifyImportedTransaction(tx);
  }

  normalizeToOfficialTaxonomy(tx);
  return tx;
}

function applyRulesToTransactions(transactions, rules) {
  if (!rules.length) return transactions;
  const normalizedRules = rules
    .map((rule) => ({
      ...rule,
      keywordLower: normalizeRuleKeyword(rule.keyword),
    }))
    .filter((rule) => rule.keywordLower);

  if (!normalizedRules.length) return transactions;

  transactions.forEach((tx) => {
    normalizedRules.forEach((rule) => {
      if (transactionMatchesRuleKeyword(tx, rule.keywordLower)) {
        tx.category = rule.category;
        tx.subcategory = rule.subcategory;
      }
    });
    applyCategoryTaxonomy(tx);
  });
  return transactions;
}

function buildMonthlyCashflow(transactions) {
  const map = new Map();
  transactions.forEach((tx) => {
    if (!tx.month) return;
    if (!map.has(tx.month)) {
      map.set(tx.month, { month: tx.month, income: 0, expenses: 0, net: 0 });
    }
    const item = map.get(tx.month);
    if (includeTransactionInIncome(tx)) item.income += tx.amount;
    else if (includeTransactionInSpending(tx)) item.expenses += Math.abs(tx.amount);
  });
  const rows = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  rows.forEach((row) => {
    row.net = row.income - row.expenses;
  });
  return rows;
}

function buildCategorySummary(transactions) {
  const map = new Map();
  transactions.forEach((tx) => {
    const includeIncome = includeTransactionInIncome(tx);
    const includeSpending = includeTransactionInSpending(tx);
    if (!includeIncome && !includeSpending) return;
    const category = tx.category || "Uncategorized";
    if (!map.has(category)) {
      map.set(category, { category, income: 0, expense: 0, net: 0 });
    }
    const item = map.get(category);
    if (includeIncome) item.income += tx.amount;
    if (includeSpending) item.expense += Math.abs(tx.amount);
  });
  const rows = [...map.values()].sort((a, b) => b.expense - a.expense);
  rows.forEach((row) => {
    row.net = row.income - row.expense;
  });
  return rows;
}

function buildSubcategorySummary(transactions) {
  const map = new Map();
  transactions.forEach((tx) => {
    const includeIncome = includeTransactionInIncome(tx);
    const includeSpending = includeTransactionInSpending(tx);
    if (!includeIncome && !includeSpending) return;
    const category = tx.category || "Uncategorized";
    const subcategory = tx.subcategory || "Other";
    const key = `${category}___${subcategory}`;
    if (!map.has(key)) {
      map.set(key, {
        category,
        subcategory,
        income: 0,
        expense: 0,
        net: 0,
        transactions: 0,
      });
    }
    const item = map.get(key);
    if (includeIncome) item.income += tx.amount;
    if (includeSpending) item.expense += Math.abs(tx.amount);
    item.transactions += 1;
  });
  const rows = [...map.values()].sort((a, b) => b.expense - a.expense);
  rows.forEach((row) => {
    row.net = row.income - row.expense;
  });
  return rows;
}

function buildTopMerchants(transactions, limit = 6) {
  const expenseTx = transactions.filter((tx) => includeTransactionInSpending(tx));
  const map = new Map();
  expenseTx.forEach((tx) => {
    const merchant = normalizeMerchant(tx.description);
    if (!map.has(merchant)) map.set(merchant, 0);
    map.set(merchant, map.get(merchant) + Math.abs(tx.amount));
  });
  return [...map.entries()]
    .map(([merchant, total]) => ({ merchant, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function buildTopIncomeSources(transactions, limit = 6) {
  const incomeTx = transactions.filter((tx) => includeTransactionInIncome(tx));
  const map = new Map();
  incomeTx.forEach((tx) => {
    const source = tx.subcategory && tx.subcategory !== "Other" ? tx.subcategory : tx.category;
    if (!map.has(source)) map.set(source, 0);
    map.set(source, map.get(source) + tx.amount);
  });
  return [...map.entries()]
    .map(([source, total]) => ({ source, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function buildMetrics(monthlyCashflow, categorySummary = []) {
  const totalIncome = sum(monthlyCashflow.map((m) => m.income));
  const totalExpense = sum(monthlyCashflow.map((m) => m.expenses));
  const netPosition = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netPosition / totalIncome) * 100 : 0;
  const averageMonthlyNet = monthlyCashflow.length ? netPosition / monthlyCashflow.length : 0;

  let essentialAnnual = 0;
  let discretionaryAnnual = 0;
  categorySummary.forEach((cat) => {
    const name = cat.category.toLowerCase();
    if (normalizeLabel(name) === "transfers") return;
    const isEssential = isEssentialSpendCategory(name);
    if (isEssential) essentialAnnual += cat.expense;
    else discretionaryAnnual += cat.expense;
  });

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_position: netPosition,
    savings_rate: savingsRate,
    average_monthly_net: averageMonthlyNet,
    essential_annual: essentialAnnual,
    discretionary_annual: discretionaryAnnual,
  };
}

function calculateUncategorizedStats(transactions) {
  const expenses = transactions.filter((tx) => includeTransactionInSpending(tx));
  const totalExpense = sum(expenses.map((tx) => Math.abs(tx.amount)));
  const uncategorizedRows = expenses.filter(
    (tx) => normalizeLabel(tx.category) === "uncategorized"
  );
  const uncategorizedExpense = sum(uncategorizedRows.map((tx) => Math.abs(tx.amount)));

  return {
    count: uncategorizedRows.length,
    expense: uncategorizedExpense,
    ratio: totalExpense > 0 ? uncategorizedExpense / totalExpense : 0,
    transactionIds: uncategorizedRows.map((tx) => tx.id),
  };
}

function normalizeBudgetItems(rawBudget = []) {
  const normalizedRows = rawBudget
    .map((item, index) => {
      const rawCategory = String(item.category || item.group || "Uncategorized").trim() || "Uncategorized";
      const rawItem = String(item.item || "General").trim() || "General";
      const normalized = normalizeBudgetCategoryItem(rawCategory, rawItem);
      return {
        id: item.id || createId(`budget${index}`),
        category: normalized.category,
        item: normalized.item,
        annual_budget: Math.max(0, toNumber(item.annual_budget, 0)),
        notes: String(item.notes || "").trim(),
        seeded_actual: toNumber(item.actual ?? item.seeded_actual, 0),
      };
    })
    .filter((item) => normalizeLabel(item.category) !== "transfers");

  const byLine = new Map();
  normalizedRows.forEach((item) => {
    const key = buildBudgetItemKey(item.category, item.item);
    const existing = byLine.get(key);
    if (!existing) {
      byLine.set(key, { ...item });
      return;
    }
    const existingPositive = toNumber(existing.annual_budget, 0) > 0;
    const incomingPositive = toNumber(item.annual_budget, 0) > 0;
    if (!existingPositive && incomingPositive) {
      existing.annual_budget = Math.max(0, toNumber(item.annual_budget, 0));
      if (String(item.notes || "").trim()) existing.notes = String(item.notes || "").trim();
    }
    existing.seeded_actual = Math.max(toNumber(existing.seeded_actual, 0), toNumber(item.seeded_actual, 0));
    if (!String(existing.notes || "").trim() && String(item.notes || "").trim()) {
      existing.notes = String(item.notes || "").trim();
    }
  });

  return [...byLine.values()];
}

function normalizeBudgetSummaryRows(rows = []) {
  return rows.map((item) => ({
    ...(() => {
      const normalized = normalizeBudgetCategoryItem(
        String(item.group || item.category || "Uncategorized").trim() || "Uncategorized",
        String(item.item || "General").trim() || "General"
      );
      return {
        group: normalized.category,
        item: normalized.item,
      };
    })(),
    annual_budget: Math.max(0, toNumber(item.annual_budget, 0)),
    actual: null,
    variance: null,
    notes: String(item.notes || "").trim(),
  }));
}

function buildBudgetItemKey(category, item) {
  return `${normalizeLabel(category)}|${normalizeLabel(item)}`;
}

function assertBudgetImportRecord(value, allowed, label) {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(`${label} must be an object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && (Object.getPrototypeOf(prototype) !== null || Object.getOwnPropertyDescriptor(prototype, "constructor")?.value?.name !== "Object")) {
    throw new Error(`${label} must be a plain object.`);
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || !allowed.includes(key) || !descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new Error(`${label} contains an unsupported field.`);
    }
  }
}

function budgetImportText(value, label, maxLength, { optional = false } = {}) {
  if (value === undefined && optional) return "";
  if (typeof value !== "string" || value.length > maxLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new Error(`${label} must be text of no more than ${maxLength} characters.`);
  }
  const result = value.trim();
  if (!optional && !result) throw new Error(`${label} is required.`);
  return result;
}

function budgetImportOptions(options, allowPlan = false) {
  assertBudgetImportRecord(options, allowPlan ? ["mode", "planKey", "planValue"] : ["mode"], "Budget import options");
  const mode = options.mode === undefined ? "merge" : options.mode;
  if (mode !== "merge" && mode !== "replace") throw new Error("Choose merge or replace for the budget import.");
  return mode;
}

function previewBudgetImport(lines, options = {}) {
  const mode = budgetImportOptions(options);
  if (!Array.isArray(lines) || lines.length > 1000) throw new Error("Choose no more than 1,000 budget lines.");
  if (mode === "replace" && lines.length === 0) throw new Error("Select at least one budget line before replacing the budget.");
  const existing = structuredClone(AppState.budgetItems);
  const existingByKey = new Map(existing.map(item => [buildBudgetItemKey(item.category, item.item), item]));
  const incoming = new Map();
  const warnings = [];
  for (const line of lines) {
    assertBudgetImportRecord(line, ["id", "category", "item", "annual_budget", "basis", "notes"], "Budget line");
    const category = budgetImportText(line.category, "Budget category", 160);
    const item = budgetImportText(line.item, "Budget item", 240);
    const sourceId = budgetImportText(line.id, "Budget line ID", 160, { optional: true });
    const notes = budgetImportText(line.notes, "Budget notes", 4000, { optional: true });
    if (line.basis !== undefined && !["register", "historical-estimate", "needs-review"].includes(line.basis)) {
      throw new Error("Unsupported fallback amounts cannot become approved budget targets.");
    }
    if (typeof line.annual_budget !== "number" || !Number.isFinite(line.annual_budget) || line.annual_budget < 0 || line.annual_budget > 1e9) {
      throw new Error("Each annual budget must be a finite number between 0 and 1,000,000,000.");
    }
    const normal = normalizeBudgetCategoryItem(category, item);
    if (normalizeLabel(category) === "transfers" || normal.category === "Transfers") {
      throw new Error("Transfers belong in the payment plan, not expense budget targets.");
    }
    if (!isOfficialCategory(normal.category) || (normal.category === "Uncategorized" && normalizeLabel(category) !== "uncategorized" && normalizeLabel(category) !== "uncategorised")) {
      throw new Error(`Review the budget category for ${item} before importing it.`);
    }
    const key = buildBudgetItemKey(normal.category, normal.item);
    if (incoming.has(key)) throw new Error(`Select only one target for ${normal.category} > ${normal.item}.`);
    const previous = existingByKey.get(key);
    const amount = Number(line.annual_budget.toFixed(2));
    if (category !== normal.category || item !== normal.item) warnings.push(`${category} > ${item} maps to ${normal.category} > ${normal.item}.`);
    if (amount !== line.annual_budget) warnings.push(`${normal.category} > ${normal.item} is rounded to the nearest cent.`);
    if (line.basis === "historical-estimate" || line.basis === "needs-review") warnings.push(`${normal.category} > ${normal.item} is a selected estimate; confirm that the annual target still suits you.`);
    incoming.set(key, {
      id: previous?.id || sourceId || `budget_import_${encodeURIComponent(key)}`,
      category: normal.category, item: normal.item, annual_budget: amount, notes,
      seeded_actual: previous?.seeded_actual ?? 0,
    });
  }
  const preserved = mode === "merge" ? existing.filter(item => !incoming.has(buildBudgetItemKey(item.category, item.item))) : [];
  const items = [...preserved, ...incoming.values()];
  // IDs are UI identities only; category/item controls replacement. Keep them unique
  // even when a source file reused an ID for another category.
  const usedIds = new Set(preserved.map(item => item.id));
  for (const item of incoming.values()) {
    const baseId = item.id;
    let suffix = 1;
    while (usedIds.has(item.id)) item.id = `${baseId}_${suffix++}`;
    usedIds.add(item.id);
  }
  return {
    items, importedCount: incoming.size,
    replacedCount: mode === "replace" ? existing.length : [...incoming.keys()].filter(key => existingByKey.has(key)).length,
    preservedCount: preserved.length, warnings,
  };
}

function validateStoredBudgetPlan(value) {
  const validate = getFinanceStorage()?.validateBudgetPlan;
  if (typeof validate !== "function") throw new Error("Reload Finance Studio before importing or restoring a payment plan.");
  const clean = validate(value);
  // Defence in depth: the shell validator owns the versioned schema, while this
  // boundary also limits the serialized value before it enters private storage.
  if (!clean || clean.type !== "finance-studio-budget-plan" || clean.version !== 1) throw new Error("This payment plan format is not supported.");
  importTextBytes(JSON.stringify(clean), 2 * 1024 * 1024);
  return clean;
}

function importBudgetOnly(lines, options = {}) {
  const mode = budgetImportOptions(options, true);
  const preview = previewBudgetImport(lines, { mode });
  const hasPlan = Object.hasOwn(options, "planValue");
  if (Object.hasOwn(options, "planKey") && options.planKey !== STORAGE_KEYS.budgetPlan) throw new Error("Only the Finance payment-plan key can be imported.");
  if (Object.hasOwn(options, "planKey") && !hasPlan) throw new Error("Choose a payment plan to save with this key.");
  const plan = hasPlan ? validateStoredBudgetPlan(options.planValue) : null;
  const storage = getFinanceStorage();
  if (storageWritesSuppressed || financeMutationDepth || storage?.privateWorkspace !== true || typeof storage?.atomic !== "function" || typeof storage?.getItem !== "function" || typeof storage?.setItem !== "function") {
    throw new Error("Unlock your private Finance workspace before importing a budget. Sample mode cannot save it.");
  }
  // The real private adapter rejects reads after it is closed/locked.
  storage.getItem(STORAGE_KEYS.budgetItems);
  if (!lines.length && !hasPlan) return preview;
  const nextItems = structuredClone(preview.items);
  const meta = { version: BUDGET_BASELINE_VERSION, signature: buildBudgetDataSignature(AppState.transactions) };
  try {
    storage.atomic(() => {
      if (lines.length) {
        saveStorage(STORAGE_KEYS.budgetItems, nextItems);
        saveStorage(STORAGE_KEYS.budgetMeta, meta);
      }
      if (hasPlan) saveStorage(STORAGE_KEYS.budgetPlan, plan);
    });
  } catch (error) {
    storage.onError?.(error);
    throw error;
  }
  // Do not repaint or rebuild a dataset inside the transaction: unrelated records
  // and the displayed budget must remain untouched if the atomic commit fails.
  if (lines.length) AppState.budgetItems = nextItems;
  return preview;
}

function getRecentBudgetScope(transactions = [], monthLimit = 12) {
  const months = [...new Set(transactions.map((tx) => tx.month).filter(Boolean))].sort();
  if (!months.length) {
    return {
      scopedTransactions: [...transactions],
      months: [],
      monthsInScope: 0,
      fromMonth: "",
      toMonth: "",
    };
  }

  const scopedMonths = months.slice(-Math.max(1, monthLimit));
  const monthSet = new Set(scopedMonths);
  return {
    scopedTransactions: transactions.filter((tx) => monthSet.has(tx.month)),
    months: scopedMonths,
    monthsInScope: scopedMonths.length,
    fromMonth: scopedMonths[0] || "",
    toMonth: scopedMonths[scopedMonths.length - 1] || "",
  };
}

function buildBudgetDataSignature(transactions = []) {
  if (!transactions.length) return "empty";
  const dates = transactions.map((tx) => tx.date).filter(Boolean).sort();
  const accounts = getAvailableAccounts(transactions).join("|");
  const months = [...new Set(transactions.map((tx) => tx.month).filter(Boolean))].sort();
  return [dates[0] || "", dates[dates.length - 1] || "", transactions.length, months.length, accounts].join("::");
}

function generateBaselineBudgetFromActuals(transactions = [], options = {}) {
  if (!transactions.length) return [];
  const fyStartMonth = clamp(
    Math.round(toNumber(options.fyStartMonth, AppState.tax?.fyStartMonth || TAX_DEFAULT_FY_START_MONTH)),
    1,
    12
  );
  const suggestionPack = buildAnnualBudgetSuggestions(transactions, fyStartMonth);
  // Seed only lines supported by loaded activity, never invented household amounts.
  const rows = (suggestionPack.suggestions || []).map((suggestion) => ({
    id: createId("budgetAuto"),
    category: suggestion.category,
    item: suggestion.item,
    annual_budget: Number(Math.max(0, toNumber(suggestion.reality_budget, 0)).toFixed(2)),
    notes: `Reality ${currencyPrecise.format(toNumber(suggestion.reality_budget, 0))} | Target ${currencyPrecise.format(
      toNumber(suggestion.target_budget, 0)
    )} | Method ${getBudgetSuggestionBasisLabel(suggestion.basis)} | Pattern ${getBudgetSuggestionCadenceLabel(
      suggestion.cadence
    )}${suggestion.scope_reason ? ` | ${suggestion.scope_reason}` : ""}.`,
    seeded_actual: Number(toNumber(suggestion.actual_to_date, 0).toFixed(2)),
  })).sort((a, b) => b.seeded_actual - a.seeded_actual || b.annual_budget - a.annual_budget);
  return normalizeBudgetItems(rows);
}
function normalizeLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeLabel(value) {
  const text = normalizeLabel(value);
  if (!text) return "";
  return text
    .split(" ")
    .map((part) => (part.endsWith("s") && part.length > 3 ? part.slice(0, -1) : part))
    .join(" ");
}

const BUDGET_CATEGORY_ALIASES = {};

const BUDGET_LINE_MATCHERS = {
  "housing|mortgage loan": {
    subcategories: ["Mortgage / Loan", "Mortgage (Base)", "Mortgage (Extra)", "Mortgage (Additional Lump)"],
    descriptionTerms: ["mortgage", "loan repayment", "loan payment"],
  },
};

function buildBudgetLineKey(category, item) {
  return `${normalizeLabel(category)}|${normalizeLabel(item)}`;
}

function resolveBudgetMatches(item, transactions) {
  const normalizedCategory = normalizeLabel(item.category);
  const normalizedItem = normalizeLabel(item.item);
  const singularItem = singularizeLabel(item.item);
  const matcher = BUDGET_LINE_MATCHERS[buildBudgetLineKey(item.category, item.item)] || null;

  const candidateCategories = new Set([normalizedCategory]);
  (BUDGET_CATEGORY_ALIASES[normalizedCategory] || []).forEach((alias) => {
    candidateCategories.add(alias);
  });
  (matcher?.categoryAliases || []).forEach((alias) => {
    candidateCategories.add(normalizeLabel(alias));
  });

  const categoryTx = transactions.filter((tx) =>
    candidateCategories.has(normalizeLabel(tx.category)) && includeTransactionInBudget(tx)
  );
  if (!categoryTx.length) {
    return {
      looksLikeIncomeBudget: false,
      matchedTransactions: [],
    };
  }

  const looksLikeIncomeBudget =
    matcher?.forceIncome ||
    normalizedCategory.includes("income") ||
    normalizedItem.includes("income") ||
    normalizedItem.includes("salary") ||
    normalizedItem.includes("wage");
  const isGenericIncomeLine =
    !normalizedItem ||
    normalizedItem === "income" ||
    normalizedItem === "total income" ||
    normalizedItem === "salary" ||
    normalizedItem === "wage" ||
    normalizedItem === normalizedCategory;

  const subcategoryNeedles = new Set();
  if (normalizedItem) subcategoryNeedles.add(normalizedItem);
  if (singularItem) subcategoryNeedles.add(singularItem);
  (matcher?.subcategories || []).forEach((sub) => {
    const normalized = normalizeLabel(sub);
    const singular = singularizeLabel(sub);
    if (normalized) subcategoryNeedles.add(normalized);
    if (singular) subcategoryNeedles.add(singular);
  });

  const subcategoryMatch = categoryTx.filter((tx) => {
    if (!tx.subcategory) return false;
    const sub = normalizeLabel(tx.subcategory);
    const subSingular = singularizeLabel(tx.subcategory);
    return subcategoryNeedles.has(sub) || subcategoryNeedles.has(subSingular);
  });

  const descriptionNeedles = new Set();
  if (normalizedItem.length >= 4) descriptionNeedles.add(normalizedItem);
  if (singularItem.length >= 4) descriptionNeedles.add(singularItem);
  (matcher?.descriptionTerms || []).forEach((term) => {
    const normalized = normalizeLabel(term);
    if (normalized.length >= 3) descriptionNeedles.add(normalized);
  });

  const descriptionMatch = categoryTx.filter((tx) => {
    const desc = normalizeLabel(tx.description);
    if (!desc || !descriptionNeedles.size) return false;
    for (const needle of descriptionNeedles) {
      if (desc.includes(needle)) return true;
    }
    return false;
  });

  if (looksLikeIncomeBudget) {
      const incomeSubcategoryMatch = subcategoryMatch.filter((tx) => includeTransactionInIncome(tx));
    if (incomeSubcategoryMatch.length) {
      return {
        looksLikeIncomeBudget: true,
        matchedTransactions: incomeSubcategoryMatch,
      };
    }

      const incomeDescriptionMatch = descriptionMatch.filter((tx) => includeTransactionInIncome(tx));
    if (incomeDescriptionMatch.length) {
      return {
        looksLikeIncomeBudget: true,
        matchedTransactions: incomeDescriptionMatch,
      };
    }

    if (!isGenericIncomeLine) {
      return {
        looksLikeIncomeBudget: true,
        matchedTransactions: [],
      };
    }

    return {
      looksLikeIncomeBudget: true,
        matchedTransactions: categoryTx.filter((tx) => includeTransactionInIncome(tx)),
      };
  }

  if (subcategoryMatch.length) {
      return {
        looksLikeIncomeBudget: false,
        matchedTransactions: subcategoryMatch.filter((tx) => includeTransactionInSpending(tx)),
      };
  }

  if (descriptionMatch.length) {
      return {
        looksLikeIncomeBudget: false,
        matchedTransactions: descriptionMatch.filter((tx) => includeTransactionInSpending(tx)),
      };
  }

  return {
    looksLikeIncomeBudget: false,
    matchedTransactions: [],
  };
}

function computeBudgetActual(item, transactions) {
  const { looksLikeIncomeBudget, matchedTransactions } = resolveBudgetMatches(item, transactions);
  if (!matchedTransactions.length) {
    return 0;
  }

  if (looksLikeIncomeBudget) {
    return sum(matchedTransactions.map((tx) => tx.amount));
  }
  return sum(matchedTransactions.map((tx) => Math.abs(tx.amount)));
}

function getFinanceStorage() {
  return typeof window !== "undefined" ? window.FINANCE_STORAGE : globalThis.FINANCE_STORAGE;
}

function assertImportFiles(files, maxBytes = MAX_IMPORT_BYTES) {
  if (!Array.isArray(files) || !files.length || files.length > MAX_IMPORT_FILES) {
    throw new Error(`Choose between 1 and ${MAX_IMPORT_FILES} files at a time.`);
  }
  let total = 0;
  for (const file of files) {
    if (!Number.isSafeInteger(file?.size) || file.size < 0) throw new Error("Could not verify the selected file size.");
    total += file.size;
    if (file.size > maxBytes || total > maxBytes) {
      throw new Error(`This import is too large. Choose files totalling no more than ${maxBytes / (1024 * 1024)} MB.`);
    }
  }
}

function importTextBytes(text, maxBytes = MAX_IMPORT_BYTES) {
  if (typeof text !== "string") throw new Error("Import contents must be text.");
  if (text.length > maxBytes) throw new Error(`This import exceeds the ${maxBytes / (1024 * 1024)} MB input limit.`);
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > maxBytes) throw new Error(`This import exceeds the ${maxBytes / (1024 * 1024)} MB input limit.`);
  return bytes;
}

function atomicFinanceMutation(operation) {
  if (financeMutationDepth) return operation();
  const previousState = structuredClone(AppState);
  const previousTheme = document.body?.dataset?.theme;
  const storage = getFinanceStorage();
  financeMutationDepth += 1;
  try {
    return !storageWritesSuppressed && typeof storage?.atomic === "function"
      ? storage.atomic(operation) : operation();
  } catch (error) {
    Object.assign(AppState, previousState);
    if (document.body?.dataset && previousTheme !== undefined) document.body.dataset.theme = previousTheme;
    storageWritesSuppressed += 1;
    try {
      ThemeController.syncToggleLabel();
      App.renderAll();
    } catch {
      // Preserve the original import error even if a damaged view cannot repaint.
    } finally {
      storageWritesSuppressed -= 1;
    }
    throw error;
  } finally {
    financeMutationDepth -= 1;
  }
}

function saveStorage(key, value) {
  if (storageWritesSuppressed) return;
  const storage = getFinanceStorage();
  try {
    if (!storage || typeof storage.setItem !== "function") throw new Error("Unlock your Finance workspace before saving.");
    storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    storage?.onError?.(error);
    if (UI.toastContainer) UI.toast("Not saved", "Your change could not be saved. Keep this page open and try again.", "error");
    throw error;
  }
}

function loadStorage(key, fallback = null) {
  const storage = getFinanceStorage();
  if (!storage || typeof storage.getItem !== "function") return fallback;
  const raw = storage.getItem(key);
  if (raw === null || raw === undefined) return fallback;
  return JSON.parse(raw);
}

function exportSnapshotData() {
  const exportPrep = prepareTransactionsForExport(AppState.transactions);
  const exportTransactions = exportPrep.transactions;
  const monthlyCashflow = buildMonthlyCashflow(exportTransactions);
  const categorySummary = buildCategorySummary(exportTransactions);
  const subcategorySummary = buildSubcategorySummary(exportTransactions);
  const metrics = buildMetrics(monthlyCashflow, categorySummary);
  const topMerchants = buildTopMerchants(exportTransactions);
  const topIncomeSources = buildTopIncomeSources(exportTransactions);
  const airbnbSummary = summarizeAirbnb(exportTransactions);
  const classificationDiagnostics = buildClassificationDiagnostics(exportTransactions);
  const budgetSuggestions = buildAnnualBudgetSuggestions(
    exportTransactions,
    AppState.tax?.fyStartMonth || TAX_DEFAULT_FY_START_MONTH
  );

  const payload = {
    generated_at: new Date().toISOString(),
    metrics,
    monthly_cashflow: monthlyCashflow,
    category_summary: categorySummary,
    subcategory_summary: subcategorySummary,
    recent_transactions: exportTransactions.map((tx) => ({
      date: tx.date,
      source_type: tx.source_type || "",
      description: tx.description,
      amount: tx.amount,
      balance: tx.balance,
      account: tx.account,
      category: tx.category,
      subcategory: tx.subcategory,
      manual_category_override: tx.manual_category_override || "",
      manual_subcategory_override: tx.manual_subcategory_override || "",
      type: tx.type || (tx.amount >= 0 ? "income" : "expense"),
      property: tx.property,
      raw_category: tx.raw_category || "",
      raw_subcategory: tx.raw_subcategory || "",
      canonical_description: tx.canonical_description || "",
      canonical_payee_key: tx.canonical_payee_key || "",
      payee_label: tx.payee_label || "",
      payee_alias_rule_id: tx.payee_alias_rule_id || "",
      classification_rule_id: tx.classification_rule_id || "",
      classification_confidence: Number(toNumber(tx.classification_confidence, 0).toFixed(2)),
      classification_reason: tx.classification_reason || "",
      pre_cleanup_category: tx.pre_cleanup_category || "",
      pre_cleanup_subcategory: tx.pre_cleanup_subcategory || "",
      is_internal_transfer: Boolean(tx.is_internal_transfer),
      is_sinking_transfer: Boolean(tx.is_sinking_transfer),
      is_loan_payment: Boolean(tx.is_loan_payment),
      is_loan_payment_counterpart: Boolean(tx.is_loan_payment_counterpart),
      exclude_from_spending: Boolean(tx.exclude_from_spending),
      exclude_from_income: Boolean(tx.exclude_from_income),
      exclude_from_budget: Boolean(tx.exclude_from_budget),
    })),
    budget_summary: AppState.budgetItems.map((item) => ({
      group: item.category,
      item: item.item,
      annual_budget: item.annual_budget,
      actual: computeBudgetActual(item, AppState.transactions),
      notes: item.notes || "",
    })),
    top_merchants: topMerchants,
    top_income_sources: topIncomeSources,
    airbnb_summary: airbnbSummary,
    classification_diagnostics: classificationDiagnostics,
    budget_suggestions: budgetSuggestions,
    tax_data: TaxController.getSnapshot(),
    metadata: {
      app_version: APP_VERSION,
      exported_at: new Date().toISOString(),
      taxonomy_guard_legacy_categories: exportPrep.legacyCategories,
    },
  };

  downloadBlob(
    JSON.stringify(payload, null, 2),
    `financial_snapshot_${fileDateStamp()}.json`,
    "application/json"
  );
}

function buildFinanceStudioBackupPayload() {
  const datasetBase = buildDatasetFromCsvTransactions(AppState.transactions || []);
  const taxSnapshot = TaxController.getSnapshot();
  const dataset = {
    ...datasetBase,
    tax_data: taxSnapshot,
  };
  const budgetItems = normalizeBudgetItems(AppState.budgetItems || []);
  const subcategoryRules = normalizeSubcategoryRuleRows(AppState.subcategoryRules || []);
  const scenarios = normalizeScenarioRows(AppState.scenarios || []);
  const merchantReviewHidden = normalizeMerchantReviewHiddenRows(AppState.merchantReviewHidden || []);
  const normalizedScope =
    normalizeAccountScope(String(AppState.globalAccountScope || "all"), AppState.transactions) || "all";

  return {
    backup_type: FULL_BACKUP_TYPE,
    backup_version: FULL_BACKUP_VERSION,
    generated_at: new Date().toISOString(),
    app_version: APP_VERSION,
    build_stamp: BUILD_STAMP,
    summary: {
      transaction_count: Array.isArray(dataset.recent_transactions) ? dataset.recent_transactions.length : 0,
      budget_line_count: budgetItems.length,
      subcategory_rule_count: subcategoryRules.length,
      tax_rule_count: Array.isArray(taxSnapshot.rules) ? taxSnapshot.rules.length : 0,
      scenario_count: scenarios.length,
      global_account_scope: normalizedScope,
    },
    dataset,
    local_state: {
      budget_items: budgetItems,
      budget_plan: (() => {
        const plan = loadStorage(STORAGE_KEYS.budgetPlan, null);
        return plan === null ? null : validateStoredBudgetPlan(plan);
      })(),
      budget_meta: {
        version: BUDGET_BASELINE_VERSION,
        signature: buildBudgetDataSignature(AppState.transactions || []),
      },
      subcategory_rules: subcategoryRules,
      merchant_review_hidden: merchantReviewHidden,
      scenarios,
      tax_settings: taxSnapshot.settings,
      tax_stream_view: taxSnapshot.settings?.streamView || "split",
      tax_manual_expenses: taxSnapshot.manual_expenses,
      tax_rules: taxSnapshot.rules,
      tax_overrides: taxSnapshot.overrides,
      theme: ThemeController.currentTheme(),
      assistant_mode: normalizeAssistantModeValue(AppState.assistant?.mode),
      assistant_web_lookup: normalizeAssistantWebLookupValue(AppState.assistant?.webLookupEnabled),
      global_account_scope: normalizedScope,
    },
  };
}

function exportFinanceStudioBackup() {
  const payload = buildFinanceStudioBackupPayload();
  downloadBlob(
    JSON.stringify(payload, null, 2),
    `finance_studio_backup_${fileDateStamp()}.json`,
    "application/json"
  );
}

function parseCsvRows(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      current = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    current += char;
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

function parseCsvText(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const objects = [];

  for (let i = 1; i < rows.length; i += 1) {
    const values = rows[i];
    const entry = {};
    headers.forEach((header, idx) => {
      entry[header] = values[idx] !== undefined ? values[idx].trim() : "";
    });
    objects.push(entry);
  }
  return objects;
}

const CSV_TRANSFER_ACCOUNT_PATTERNS = [
  "TRANSFER",
  "TFR FROM",
  "TFR TO",
  " TO-",
  " FROM-",
  "ONLINE TO-",
  "ONLINE FROM-",
  "MOB TO-",
  "MOB FROM-",
];

const CSV_FUEL_KEYWORDS = [
  "BP ",
  "CAL",
  "CALTEX",
  "AMPOL",
  "SHELL",
  "MOBIL",
  "GULF",
  "UNITED",
  "LIBERTY",
  "REDDY EXPRESS",
];

const CSV_GROCERY_KEYWORDS = [
  "WOOLWORTHS",
  "COLES",
  "ALDI",
  "IGA",
  "SUPERMARKET",
  "GROCERY"
];

const CSV_DINING_KEYWORDS = [
  "CAFE",
  "RESTAURANT",
  "BAKERY",
  "COFFEE",
  "BISTRO",
  "TAKEAWAY"
];

const DINING_TAKEAWAY_KEYWORDS = [
  "UBER EATS",
  "MENULOG",
  "DOORDASH",
  "DELIVEROO",
  "DELIVERY",
  "TAKEAWAY",
  "TAKE AWAY",
  "PIZZA HUT",
  "DOMINO",
  "RED ROOSTER",
  "HUNGRY JACK",
  "GRILL'D",
];

const CSV_RETAIL_KEYWORDS = [
  "DEPARTMENT STORE",
  "RETAIL",
  "BOOKSHOP",
  "NEWSAGENCY",
  "HARDWARE",
  "CLOTHING"
];

const CSV_SUBSCRIPTION_KEYWORDS = [
  "PAYPAL AUSTRALIA",
  "STAN.COM.AU",
  "NETFLIX",
  "SPOTIFY",
  "OPENAI *CHATGPT",
  "MICROSOFT",
  "APPLE.COM/BILL",
  "GOOGLE *",
  "AMZNPRIME",
  "CURSOR.COM",
  "TEACHERSPAYTEACHERS",
];

const CSV_HOME_FURNISHING_KEYWORDS = [
  "EARLY SETTLER",
  "PILLOW TALK",
];

const CSV_TRAVEL_KEYWORDS = [
  "HOTEL",
  "MOTEL",
  "ACCOMMODATION",
  "TRAVEL"
];

const TRAVEL_FLIGHT_KEYWORDS = [
  "QANTAS",
  "JETSTAR",
  "VIRGIN AUSTRALIA",
  "REX AIR",
  "WEBJET",
  "SKYSCANNER",
  "AIR NEW ZEALAND",
  "SINGAPORE AIRLINES",
  "EMIRATES",
  "AIRASIA",
];

const TRAVEL_ACCOMMODATION_KEYWORDS = [
  "AIRBNB",
  "HOTEL",
  "MERCURE",
  "MOTEL",
  "RESORT",
  "LODGE",
  "BOOKING.COM",
  "WOTIF",
  "EXPEDIA",
  "AGODA",
  ...CSV_TRAVEL_KEYWORDS,
];

const TRAVEL_TRANSPORT_KEYWORDS = [
  "UBER",
  "TAXI",
  "DIDI",
  "OLA",
  "TRAIN",
  "TRAM",
  "BUS",
  "FERRY",
  "CAR HIRE",
  "RENTAL CAR",
  "HERTZ",
  "AVIS",
  "EUROPCAR",
];

const TRAVEL_ACTIVITY_KEYWORDS = [
  "TOUR",
  "ATTRACTION",
  "THEME PARK",
  "DAY PASS",
  "ENTRY TICKET",
  "HOLIDAY ACTIVITY",
];

const CSV_VEHICLE_SERVICE_KEYWORDS = [
  "VEHICLE SERVICE",
  "CAR SERVICE",
  "TYRE",
  "MECHANIC"
];

const CSV_HEALTHCARE_PROVIDER_KEYWORDS = [
  "MEDICAL",
  "DENTAL",
  "PODIATRY",
  "PHYSIOTHERAPY"
];

const CSV_EDUCATION_KEYWORDS = [
  "SCHOOL FEES",
  "EDUCATION",
  "TUITION"
];

const CATEGORY_TAXONOMY = Object.freeze({
  Income: ["Salary", "Airbnb Income", "Other Income", "Family Repayment", "Gift"],
  Housing: [
    "Mortgage / Loan",
    "Mortgage (Base)",
    "Mortgage (Extra)",
    "Mortgage (Additional Lump)",
    "Electricity",
    "Water",
    "Rates",
    "Internet",
    "Home Maintenance",
  ],
  Groceries: ["Groceries"],
  "Dining & Takeaway": ["Dining Out", "Takeaway/Delivery"],
  Transport: ["Fuel", "Registration", "Vehicle Costs", "Other"],
  Travel: ["Flights", "Accommodation", "Transport", "Holiday Activities", "Other Travel"],
  Health: ["Medical", "Pharmacy", "Wellbeing", "Other"],
  Insurance: ["Health Insurance", "Home Insurance", "Other Insurance", "Income Protection"],
  Family: ["Education", "Kids Activities", "Gifts / Family"],
  Lifestyle: ["Subscriptions", "Retail", "Personal Care", "Entertainment", "Other"],
  Work: ["Union Fees", "Other"],
  Pets: ["Vet", "Other"],
  Cash: ["ATM Withdrawal"],
  Financial: ["Bank Fees", "Interest", "Tax"],
  Investments: ["Investment Contribution"],
  Airbnb: ["Cleaning", "Maintenance", "Rates", "Utilities", "Loan Payment"],
  Transfers: [
    "Internal Transfers Out",
    "Internal Transfers In",
    "External Transfer Out",
    "External Transfer In",
    "Sinking Fund Transfer - Gifts/Clothes",
    "Sinking Fund Transfer - Vehicle/Boat",
    "Loan Account Credit",
    "Transfer from inside going out",
    "Transfer from outside coming in",
    "Put aside for upcoming bills",
    "Transfer from loan account",
    "Transfer to loan account",
  ],
  Uncategorized: ["Other"],
});

const CATEGORY_SYNONYMS = Object.freeze({
  income: "Income",
  housing: "Housing",
  "housing utilities": "Housing",
  groceries: "Groceries",
  "groceries dining": "Dining & Takeaway",
  dining: "Dining & Takeaway",
  takeaway: "Dining & Takeaway",
  restaurant: "Dining & Takeaway",
  "dining takeaway": "Dining & Takeaway",
  "dining and takeaway": "Dining & Takeaway",
  transport: "Transport",
  travel: "Travel",
  holiday: "Travel",
  "travel accommodation": "Travel",
  health: "Health",
  healthcare: "Health",
  work: "Work",
  professional: "Work",
  pets: "Pets",
  pet: "Pets",
  cash: "Cash",
  "cash withdrawal": "Cash",
  atm: "Cash",
  insurance: "Insurance",
  "health insurance": "Insurance",
  family: "Family",
  "kids education": "Family",
  lifestyle: "Lifestyle",
  "lifestyle shopping": "Lifestyle",
  financial: "Financial",
  investments: "Investments",
  "savings investments": "Investments",
  airbnb: "Airbnb",
  "airbnb financing": "Airbnb",
  transfers: "Transfers",
  "cash card": "Cash",
  "home garden": "Housing",
  "miscellaneous expenses": "Uncategorized",
  "entertainment recreation": "Lifestyle",
  "travel accommodation": "Lifestyle",
  uncategorized: "Uncategorized",
});

function getTaxonomyCategories() {
  return Object.keys(CATEGORY_TAXONOMY);
}

function getTaxonomySubcategories(category) {
  const normalized = normalizeLabel(category);
  const match = getTaxonomyCategories().find((name) => normalizeLabel(name) === normalized);
  return match ? [...CATEGORY_TAXONOMY[match]] : [];
}

function isOfficialCategory(category) {
  return Object.prototype.hasOwnProperty.call(CATEGORY_TAXONOMY, category);
}

function defaultSubcategoryForCategory(category) {
  if (category === "Income") return "Other Income";
  if (category === "Housing") return "Home Maintenance";
  if (category === "Groceries") return "Groceries";
  if (category === "Dining & Takeaway") return "Dining Out";
  if (category === "Transport") return "Vehicle Costs";
  if (category === "Travel") return "Other Travel";
  if (category === "Health") return "Medical";
  if (category === "Insurance") return "Other Insurance";
  if (category === "Family") return "Gifts / Family";
  if (category === "Lifestyle") return "Retail";
  if (category === "Work") return "Other";
  if (category === "Pets") return "Other";
  if (category === "Cash") return "ATM Withdrawal";
  if (category === "Financial") return "Bank Fees";
  if (category === "Investments") return "Investment Contribution";
  if (category === "Airbnb") return "Utilities";
  if (category === "Transfers") return "Transfer from inside going out";
  return "Other";
}

function inferTransferSubcategory(normalizedSubcategory = "", descriptionUpper = "", amount = 0) {
  const text = String(descriptionUpper || "").toUpperCase();
  const value = toNumber(amount, 0);
  const isIncoming = value > 0;

  if (normalizedSubcategory.includes("internal transfers in")) return "Internal Transfers In";
  if (normalizedSubcategory.includes("internal transfers out")) return "Internal Transfers Out";
  if (normalizedSubcategory.includes("external transfer in")) return "External Transfer In";
  if (normalizedSubcategory.includes("external transfer out")) return "External Transfer Out";
  if (normalizedSubcategory.includes("sinking fund transfer gifts clothes")) return "Sinking Fund Transfer - Gifts/Clothes";
  if (normalizedSubcategory.includes("sinking fund transfer vehicle boat")) return "Sinking Fund Transfer - Vehicle/Boat";
  if (normalizedSubcategory.includes("loan account credit")) return "Loan Account Credit";
  if (normalizedSubcategory.includes("transfer from loan account")) return "Transfer from loan account";
  if (normalizedSubcategory.includes("transfer to loan account")) return "Transfer to loan account";
  if (normalizedSubcategory.includes("transfer from outside coming in")) return "Transfer from outside coming in";
  if (normalizedSubcategory.includes("transfer from inside going out")) return "Transfer from inside going out";
  if (
    normalizedSubcategory.includes("put aside for upcoming bill") ||
    normalizedSubcategory.includes("sinking fund") ||
    normalizedSubcategory.includes("sinking")
  ) {
    return "Put aside for upcoming bills";
  }

  // Legacy labels migration.
  if (normalizedSubcategory.includes("partner transfer")) {
    return isIncoming ? "Transfer from outside coming in" : "Transfer from inside going out";
  }
  if (normalizedSubcategory.includes("internal transfer")) {
    return isIncoming ? "Transfer from outside coming in" : "Transfer from inside going out";
  }

  const hasLoanSignal =
    text.includes("LOAN ACCOUNT") ||
    /\b(?:TO|FROM)\s+(?:\d+L\d+|L\d+)\b/.test(text) ||
    /^TFR TO L\d+/.test(text) ||
    /^TFR FROM L\d+/.test(text);
  if (hasLoanSignal) {
    return isIncoming ? "Transfer from loan account" : "Transfer to loan account";
  }

  const hasUpcomingBillsSignal = /\b(?:SINKING FUND|UPCOMING BILLS)\b/.test(text);
  if (hasUpcomingBillsSignal) return "Put aside for upcoming bills";

  if (isIncoming) return "Transfer from outside coming in";
  if (value < 0) return "Transfer from inside going out";
  return "Transfer from inside going out";
}

function hasStructuredLoanTransferReference(descriptionUpper = "") {
  const text = String(descriptionUpper || "").toUpperCase();
  return (
    text.includes("LOAN ACCOUNT") ||
    /\b(?:TO|FROM)\s+(?:\d+L\d+|L\d+)\b/.test(text) ||
    /^TFR TO \d+L\d+\b/.test(text) ||
    /^TFR FROM \d+L\d+\b/.test(text) ||
    /^TFR TO L\d+\b/.test(text) ||
    /^TFR FROM L\d+\b/.test(text)
  );
}

function inferAirbnbSubcategory(normalizedSubcategory = "", descriptionUpper = "") {
  if (normalizedSubcategory.includes("clean") || descriptionUpper.includes("CLEAN") || descriptionUpper.includes("LINEN")) {
    return "Cleaning";
  }
  if (
    normalizedSubcategory.includes("maint") ||
    normalizedSubcategory.includes("repair") ||
    descriptionUpper.includes("PEST") ||
    descriptionUpper.includes("REPAIR") ||
    descriptionUpper.includes("MAINT")
  ) {
    return "Maintenance";
  }
  if (
    normalizedSubcategory.includes("rate") ||
    descriptionUpper.includes("COUNCIL RATES") ||
    descriptionUpper.includes("LAND TAX")
  ) {
    return "Rates";
  }
  if (
    normalizedSubcategory.includes("loan") ||
    descriptionUpper.includes("LOAN") ||
    descriptionUpper.startsWith("TFR TO L") ||
    descriptionUpper.includes("LOAN ACCOUNT")
  ) {
    return "Loan Payment";
  }
  return "Utilities";
}

function inferDiningSubcategory(normalizedSubcategory = "", descriptionUpper = "") {
  const normalized = String(normalizedSubcategory || "");
  const text = String(descriptionUpper || "").toUpperCase();
  if (
    normalized.includes("takeaway") ||
    normalized.includes("delivery") ||
    normalized.includes("uber eats") ||
    normalized.includes("menulog") ||
    normalized.includes("doordash") ||
    normalized.includes("deliveroo") ||
    containsAny(text, DINING_TAKEAWAY_KEYWORDS)
  ) {
    return "Takeaway/Delivery";
  }
  return "Dining Out";
}

function isDiningSignal(descriptionUpper = "", normalizedCategory = "", normalizedSubcategory = "") {
  const text = String(descriptionUpper || "").toUpperCase();
  const category = String(normalizedCategory || "");
  const subcategory = String(normalizedSubcategory || "");
  const categorySignal = category.includes("dining") || category.includes("takeaway");
  const subcategorySignal =
    subcategory.includes("dining") ||
    subcategory.includes("takeaway") ||
    subcategory.includes("restaurant") ||
    subcategory.includes("cafe") ||
    subcategory.includes("bistro") ||
    subcategory.includes("pub");
  const merchantSignal = containsAny(text, CSV_DINING_KEYWORDS) || containsAny(text, DINING_TAKEAWAY_KEYWORDS);
  return categorySignal || subcategorySignal || merchantSignal;
}

function hasAccommodationSignal(descriptionUpper = "", normalizedSubcategory = "") {
  const text = String(descriptionUpper || "").toUpperCase();
  const normalized = String(normalizedSubcategory || "");
  const subcategorySignal =
    normalized.includes("accommodation") ||
    normalized.includes("motel") ||
    normalized.includes("resort") ||
    normalized.includes("lodge") ||
    normalized.includes("hotel stay") ||
    normalized.includes("travel stay");
  const merchantSignal =
    containsAny(text, TRAVEL_ACCOMMODATION_KEYWORDS) ||
    /\b(?:MOTOR INN|INN|MOTEL|RESORT|LODGE|BOOKING\.COM|WOTIF|EXPEDIA|AGODA|ACCOMMODATION|CHECK-IN|CHECK OUT|ROOM)\b/.test(
      text
    );
  return subcategorySignal || merchantSignal;
}

function inferTravelSubcategory(normalizedSubcategory = "", descriptionUpper = "") {
  const text = String(descriptionUpper || "").toUpperCase();
  const normalized = String(normalizedSubcategory || "");
  if (
    normalized.includes("flight") ||
    normalized.includes("airfare") ||
    normalized.includes("airline") ||
    containsAny(text, TRAVEL_FLIGHT_KEYWORDS)
  ) {
    return "Flights";
  }
  if (
    normalized.includes("accommodation") ||
    normalized.includes("motel") ||
    normalized.includes("resort") ||
    normalized.includes("lodg") ||
    normalized.includes("stay") ||
    hasAccommodationSignal(text, normalized)
  ) {
    return "Accommodation";
  }
  if (
    normalized.includes("transport") ||
    normalized.includes("rideshare") ||
    normalized.includes("car hire") ||
    normalized.includes("rental") ||
    normalized.includes("taxi") ||
    normalized.includes("train") ||
    normalized.includes("bus") ||
    normalized.includes("ferry") ||
    containsAny(text, TRAVEL_TRANSPORT_KEYWORDS)
  ) {
    return "Transport";
  }
  if (
    normalized.includes("holiday") ||
    normalized.includes("activity") ||
    normalized.includes("tour") ||
    normalized.includes("attraction") ||
    normalized.includes("ticket") ||
    containsAny(text, TRAVEL_ACTIVITY_KEYWORDS)
  ) {
    return "Holiday Activities";
  }
  return "Other Travel";
}

function isAirbnbSignal(descriptionUpper = "", normalizedCategory = "", normalizedSubcategory = "", property = "") {
  // Property context comes from the imported record, never a household supplier list.
  return normalizedCategory.includes("airbnb") || normalizedSubcategory.includes("airbnb") || normalizeLabel(property) === "airbnb";
}

function resolveCanonicalCategory(category, subcategory, amount = 0, description = "", property = "") {
  const normalizedCategory = normalizeLabel(category);
  const normalizedSubcategory = normalizeLabel(subcategory);
  const descriptionUpper = String(description || "").toUpperCase();
  const hasAirbnb = isAirbnbSignal(descriptionUpper, normalizedCategory, normalizedSubcategory, property);
  const isTransferLikeDescription =
    descriptionUpper.startsWith("TFR") ||
    descriptionUpper.includes(" TRANSFER") ||
    descriptionUpper.includes("AUTH REF");
  const hasStructuredLoanReference = hasStructuredLoanTransferReference(descriptionUpper);
  const isLoanTransferDescription = isTransferLikeDescription && hasStructuredLoanReference;
  const looksLikeLegacyMortgageTagWithoutLoanReference =
    isTransferLikeDescription &&
    amount < 0 &&
    (normalizedSubcategory.includes("mortgage") || normalizedSubcategory.includes("loan payment")) &&
    !hasStructuredLoanReference &&
    !descriptionUpper.includes("MORTGAGE") &&
    !descriptionUpper.includes("HOME LOAN") &&
    !descriptionUpper.includes("LOAN ACCOUNT");

  if (isLoanTransferDescription) return amount < 0 ? (hasAirbnb ? "Airbnb" : "Housing") : "Transfers";
  if (looksLikeLegacyMortgageTagWithoutLoanReference) return "Transfers";
  if (isTransferLikeDescription && normalizedSubcategory.includes("loan payment")) {
    return amount < 0 ? (hasAirbnb ? "Airbnb" : "Housing") : "Transfers";
  }
  if (
    normalizedCategory === "transfers" ||
    normalizedSubcategory.includes("transfer") ||
    normalizedSubcategory.includes("sinking") ||
    normalizedSubcategory.includes("upcoming bill") ||
    normalizedSubcategory.includes("loan account")
  ) {
    return "Transfers";
  }

  // Generic merchant wording only; private payee rules belong in the vault.
  if (descriptionUpper.includes("WOOLWORTHS") || descriptionUpper.includes("COLES")) {
    return "Groceries";
  }
  if (
    containsAny(descriptionUpper, CSV_FUEL_KEYWORDS) ||
    descriptionUpper.includes("7-ELEVEN") ||
    descriptionUpper.includes("PEARL ENERGY")
  ) {
    return "Transport";
  }
  if (
    amount > 0 &&
    /\b(?:PAYROLL|SALARY|WAGES?)\b/.test(descriptionUpper)
  ) {
    return "Income";
  }
  if (
    normalizedSubcategory.includes("offset home loan transfer") ||
    descriptionUpper.includes("LOAN ACCOUNT") ||
    hasStructuredLoanReference
  ) {
    return hasAirbnb ? "Airbnb" : "Housing";
  }
  if (hasAirbnb && amount < 0) {
    return "Airbnb";
  }

  const hasDining = isDiningSignal(descriptionUpper, normalizedCategory, normalizedSubcategory);
  const hasAccommodationByText = hasAccommodationSignal(descriptionUpper, "");
  const hasAccommodation = hasAccommodationSignal(descriptionUpper, normalizedSubcategory);
  if (amount < 0 && hasDining && !hasAccommodationByText && !hasAirbnb) return "Dining & Takeaway";

  const hasTravelSignal =
    normalizedCategory.includes("travel") ||
    normalizedCategory.includes("holiday") ||
    normalizedSubcategory.includes("travel") ||
    normalizedSubcategory.includes("flight") ||
    normalizedSubcategory.includes("accommodation") ||
    normalizedSubcategory.includes("holiday") ||
    containsAny(descriptionUpper, TRAVEL_FLIGHT_KEYWORDS) ||
    hasAccommodation ||
    containsAny(descriptionUpper, TRAVEL_TRANSPORT_KEYWORDS) ||
    containsAny(descriptionUpper, TRAVEL_ACTIVITY_KEYWORDS);
  if (hasTravelSignal && amount < 0) return "Travel";

  if (normalizedCategory.startsWith("transport")) return "Transport";
  if (normalizedCategory.startsWith("travel")) return "Travel";
  if (normalizedCategory.startsWith("work")) return "Work";
  if (normalizedCategory.startsWith("pet")) return "Pets";
  if (normalizedCategory.startsWith("cash") || normalizedCategory.includes("atm")) return "Cash";
  if (normalizedCategory.includes("dining") || normalizedCategory.includes("takeaway")) return "Dining & Takeaway";
  if (normalizedCategory.startsWith("airbnb")) {
    return amount > 0 ? "Income" : "Airbnb";
  }
  if (
    normalizedCategory.includes("grocer") &&
    (normalizedSubcategory.includes("dining") || normalizedSubcategory.includes("takeaway") || hasDining)
  ) {
    return "Dining & Takeaway";
  }

  if (normalizedCategory in CATEGORY_SYNONYMS) return CATEGORY_SYNONYMS[normalizedCategory];
  const exact = getTaxonomyCategories().find((name) => normalizeLabel(name) === normalizedCategory);
  if (exact) return exact;

  if (normalizedSubcategory.includes("salary") || normalizedSubcategory.includes("airbnb income")) return "Income";
  if (
    normalizedSubcategory.includes("transfer") ||
    normalizedSubcategory.includes("sinking") ||
    normalizedSubcategory.includes("upcoming bill") ||
    normalizedSubcategory.includes("loan account")
  ) {
    return "Transfers";
  }
  if (normalizedSubcategory.includes("loan payment") && hasAirbnb) return "Airbnb";
  if (normalizedSubcategory.includes("loan payment")) return "Housing";
  if (
    normalizedSubcategory.includes("travel") ||
    normalizedSubcategory.includes("flight") ||
    normalizedSubcategory.includes("holiday") ||
    normalizedSubcategory.includes("accommodation")
  ) {
    return "Travel";
  }
  if (normalizedSubcategory.includes("dining") || normalizedSubcategory.includes("takeaway")) return "Dining & Takeaway";
  if (normalizedSubcategory.includes("grocer")) return "Groceries";
  if (normalizedSubcategory.includes("fuel") || normalizedSubcategory.includes("vehicle")) return "Transport";
  if (normalizedSubcategory.includes("union fee") || normalizedSubcategory.includes("professional membership")) return "Work";
  if (normalizedSubcategory.includes("vet")) return "Pets";
  if (normalizedSubcategory.includes("atm withdrawal") || normalizedSubcategory.includes("cash withdrawal")) return "Cash";
  if (normalizedSubcategory.includes("pharmacy") || normalizedSubcategory.includes("medical")) return "Health";
  if (normalizedSubcategory.includes("insurance") || normalizedSubcategory.includes("income protection")) return "Insurance";
  if (normalizedSubcategory.includes("education") || normalizedSubcategory.includes("kids")) return "Family";
  if (normalizedSubcategory.includes("subscription") || normalizedSubcategory.includes("retail")) return "Lifestyle";
  if (normalizedSubcategory.includes("bank") || normalizedSubcategory.includes("interest") || normalizedSubcategory.includes("tax")) {
    return "Financial";
  }
  if (normalizedSubcategory.includes("investment")) return "Investments";
  if (hasAirbnb) return "Airbnb";

  if (amount > 0) return "Income";
  return "Uncategorized";
}

function canonicalizeCategorySubcategory(category, subcategory, description = "", amount = 0, property = "") {
  const descriptionUpper = String(description || "").toUpperCase();
  const normalizedSubcategory = normalizeLabel(subcategory);
  const normalizedCategory = normalizeLabel(category);
  const isTransferLikeDescription =
    descriptionUpper.startsWith("TFR") ||
    descriptionUpper.includes(" TRANSFER") ||
    descriptionUpper.includes("AUTH REF");
  const hasStructuredLoanReference = hasStructuredLoanTransferReference(descriptionUpper);
  const isLoanTransferDescription = isTransferLikeDescription && hasStructuredLoanReference;
  const looksLikeLegacyMortgageTagWithoutLoanReference =
    isTransferLikeDescription &&
    amount < 0 &&
    (normalizedSubcategory.includes("mortgage") || normalizedSubcategory.includes("loan payment")) &&
    !hasStructuredLoanReference &&
    !descriptionUpper.includes("MORTGAGE") &&
    !descriptionUpper.includes("HOME LOAN") &&
    !descriptionUpper.includes("LOAN ACCOUNT");
  const canonicalCategory = resolveCanonicalCategory(category, subcategory, amount, descriptionUpper, property);
  const hasAirbnb = isAirbnbSignal(descriptionUpper, normalizedCategory, normalizedSubcategory, property);
  let canonicalSubcategory = "";

  if (isLoanTransferDescription || (isTransferLikeDescription && normalizedSubcategory.includes("loan payment"))) {
    if (amount < 0) {
      return hasAirbnb
        ? { category: "Airbnb", subcategory: "Loan Payment" }
        : { category: "Housing", subcategory: "Mortgage / Loan" };
    }
    return {
      category: "Transfers",
      subcategory: inferTransferSubcategory(normalizedSubcategory, descriptionUpper, amount),
    };
  }
  if (looksLikeLegacyMortgageTagWithoutLoanReference) {
    return {
      category: "Transfers",
      subcategory: inferTransferSubcategory(normalizedSubcategory, descriptionUpper, amount),
    };
  }
  if (
    normalizedCategory === "transfers" ||
    normalizedSubcategory.includes("transfer") ||
    normalizedSubcategory.includes("sinking") ||
    normalizedSubcategory.includes("upcoming bill") ||
    normalizedSubcategory.includes("loan account")
  ) {
    return {
      category: "Transfers",
      subcategory: inferTransferSubcategory(normalizedSubcategory, descriptionUpper, amount),
    };
  }

  // Generic merchant wording only; private payee rules belong in the vault.
  if (descriptionUpper.includes("WOOLWORTHS") || descriptionUpper.includes("COLES")) {
    return { category: "Groceries", subcategory: "Groceries" };
  }
  if (
    containsAny(descriptionUpper, CSV_FUEL_KEYWORDS) ||
    descriptionUpper.includes("7-ELEVEN") ||
    descriptionUpper.includes("PEARL ENERGY")
  ) {
    return { category: "Transport", subcategory: "Fuel" };
  }
  if (
    amount > 0 &&
    /\b(?:PAYROLL|SALARY|WAGES?)\b/.test(descriptionUpper)
  ) {
    return { category: "Income", subcategory: "Salary" };
  }
  if (
    normalizedSubcategory.includes("offset home loan transfer") ||
    descriptionUpper.includes("LOAN ACCOUNT") ||
    hasStructuredLoanReference
  ) {
    return hasAirbnb
      ? { category: "Airbnb", subcategory: "Loan Payment" }
      : { category: "Housing", subcategory: "Mortgage / Loan" };
  }

  if (canonicalCategory === "Income") {
    if (normalizedSubcategory.includes("salary") || descriptionUpper.includes("PAYROLL")) canonicalSubcategory = "Salary";
    else if (normalizedSubcategory.includes("airbnb income") || (amount > 0 && descriptionUpper.includes("AIRBNB"))) {
      canonicalSubcategory = "Airbnb Income";
    } else {
      canonicalSubcategory = "Other Income";
    }
  } else if (canonicalCategory === "Housing") {
    if (
      normalizedSubcategory.includes("mortgage additional lump") ||
      normalizedSubcategory.includes("additional lump")
    ) {
      canonicalSubcategory = "Mortgage (Additional Lump)";
    } else if (normalizedSubcategory.includes("mortgage extra")) {
      canonicalSubcategory = "Mortgage (Extra)";
    } else if (
      normalizedSubcategory.includes("mortgage base") ||
      normalizedSubcategory.includes("mortgage") ||
      normalizedSubcategory.includes("loan payment") ||
      descriptionUpper.includes("MORTGAGE")
    ) {
      canonicalSubcategory = "Mortgage / Loan";
    } else if (normalizedSubcategory.includes("electricity") || normalizedSubcategory.includes("gas") || descriptionUpper.includes("ELECTRICITY")) {
      canonicalSubcategory = "Electricity";
    } else if (normalizedSubcategory.includes("water") || /\bWATER (?:BILL|RATES|UTILITY)\b/.test(descriptionUpper)) {
      canonicalSubcategory = "Water";
    } else if (normalizedSubcategory.includes("rate") || descriptionUpper.includes("COUNCIL RATES")) {
      canonicalSubcategory = "Rates";
    } else if (
      normalizedSubcategory.includes("internet") ||
      normalizedSubcategory.includes("telecom") ||
      descriptionUpper.includes("TELECOMMUNICATIONS")
    ) {
      canonicalSubcategory = "Internet";
    } else {
      canonicalSubcategory = "Home Maintenance";
    }
  } else if (canonicalCategory === "Groceries") {
    canonicalSubcategory = "Groceries";
  } else if (canonicalCategory === "Dining & Takeaway") {
    canonicalSubcategory = inferDiningSubcategory(normalizedSubcategory, descriptionUpper);
  } else if (canonicalCategory === "Transport") {
    if (normalizedSubcategory.includes("other")) {
      canonicalSubcategory = "Other";
    } else if (
      normalizedSubcategory.includes("registration") ||
      normalizedSubcategory.includes("licens") ||
      normalizedSubcategory.includes("toll") ||
      descriptionUpper.includes("TFNSW MARITIME")
    ) {
      canonicalSubcategory = "Registration";
    } else if (normalizedSubcategory.includes("fuel")) {
      canonicalSubcategory = "Fuel";
    } else {
      canonicalSubcategory = "Vehicle Costs";
    }
  } else if (canonicalCategory === "Travel") {
    canonicalSubcategory = inferTravelSubcategory(normalizedSubcategory, descriptionUpper);
  } else if (canonicalCategory === "Health") {
    if (normalizedSubcategory.includes("other")) canonicalSubcategory = "Other";
    else if (normalizedSubcategory.includes("pharmacy")) canonicalSubcategory = "Pharmacy";
    else if (normalizedSubcategory.includes("wellbeing") || descriptionUpper.includes("YOGA")) canonicalSubcategory = "Wellbeing";
    else canonicalSubcategory = "Medical";
  } else if (canonicalCategory === "Insurance") {
    if (normalizedSubcategory.includes("health insurance") || descriptionUpper.includes("HEALTH INSURANCE")) {
      canonicalSubcategory = "Health Insurance";
    } else if (normalizedSubcategory.includes("income protection") || descriptionUpper.includes("LIFE INSURANCE") || descriptionUpper.includes("INCOME PROTECTION")) {
      canonicalSubcategory = "Income Protection";
    } else if (normalizedSubcategory.includes("home insurance") || normalizedSubcategory.includes("insurance home") || descriptionUpper.includes("HOME INSURANCE")) {
      canonicalSubcategory = "Home Insurance";
    } else {
      canonicalSubcategory = "Other Insurance";
    }
  } else if (canonicalCategory === "Family") {
    if (
      normalizedSubcategory.includes("education") ||
      normalizedSubcategory.includes("school") ||
      normalizedSubcategory.includes("learning")
    ) {
      canonicalSubcategory = "Education";
    } else if (normalizedSubcategory.includes("kids")) {
      canonicalSubcategory = "Kids Activities";
    } else {
      canonicalSubcategory = "Gifts / Family";
    }
  } else if (canonicalCategory === "Work") {
    canonicalSubcategory = normalizedSubcategory.includes("union fee") ? "Union Fees" : "Other";
  } else if (canonicalCategory === "Pets") {
    canonicalSubcategory = normalizedSubcategory.includes("vet") ? "Vet" : "Other";
  } else if (canonicalCategory === "Cash") {
    canonicalSubcategory = "ATM Withdrawal";
  } else if (canonicalCategory === "Lifestyle") {
    if (normalizedSubcategory.includes("other")) {
      canonicalSubcategory = "Other";
    } else if (
      normalizedSubcategory.includes("subscription") ||
      descriptionUpper.includes("NETFLIX") ||
      descriptionUpper.includes("STAN.COM") ||
      descriptionUpper.includes("AMZNPRIME") ||
      descriptionUpper.includes("OPENAI") ||
      descriptionUpper.includes("CURSOR") ||
      descriptionUpper.includes("WIX.COM") ||
      descriptionUpper.includes("CLAUDE.AI")
    ) {
      canonicalSubcategory = "Subscriptions";
    } else if (normalizedSubcategory.includes("personal care")) {
      canonicalSubcategory = "Personal Care";
    } else if (
      normalizedSubcategory.includes("movie") ||
      normalizedSubcategory.includes("entertainment") ||
      normalizedSubcategory.includes("accommodation")
    ) {
      canonicalSubcategory = "Entertainment";
    } else {
      canonicalSubcategory = "Retail";
    }
  } else if (canonicalCategory === "Financial") {
    if (normalizedSubcategory.includes("interest") || descriptionUpper.includes("INTEREST")) canonicalSubcategory = "Interest";
    else if (normalizedSubcategory.includes("tax") || descriptionUpper.includes("ATO") || descriptionUpper.includes("TAX")) {
      canonicalSubcategory = "Tax";
    } else {
      canonicalSubcategory = "Bank Fees";
    }
  } else if (canonicalCategory === "Investments") {
    canonicalSubcategory = "Investment Contribution";
  } else if (canonicalCategory === "Airbnb") {
    canonicalSubcategory = inferAirbnbSubcategory(normalizedSubcategory, descriptionUpper);
  } else if (canonicalCategory === "Transfers") {
    canonicalSubcategory = inferTransferSubcategory(normalizedSubcategory, descriptionUpper, amount);
  } else {
    canonicalSubcategory = "Other";
  }

  const allowed = CATEGORY_TAXONOMY[canonicalCategory] || CATEGORY_TAXONOMY.Uncategorized;
  if (!allowed.includes(canonicalSubcategory)) {
    canonicalSubcategory = defaultSubcategoryForCategory(canonicalCategory);
  }

  return {
    category: canonicalCategory,
    subcategory: canonicalSubcategory,
  };
}

function normalizeToOfficialTaxonomy(tx) {
  if (!tx) return tx;
  let manualCategory = String(tx.manual_category_override || "").trim();
  let manualSubcategory = String(tx.manual_subcategory_override || "").trim();
  const manualCategoryNormalized = normalizeLabel(manualCategory);
  const manualSubcategoryNormalized = normalizeLabel(manualSubcategory);
  if (manualCategoryNormalized === "groceries" && manualSubcategoryNormalized === "dining") {
    manualCategory = "Dining & Takeaway";
    manualSubcategory = "Dining Out";
    tx.manual_category_override = manualCategory;
    tx.manual_subcategory_override = manualSubcategory;
  }
  const hasManualOverride = manualCategory && isOfficialCategory(manualCategory);
  if (hasManualOverride) {
    const allowed = CATEGORY_TAXONOMY[manualCategory] || CATEGORY_TAXONOMY.Uncategorized;
    tx.category = manualCategory;
    tx.subcategory = allowed.includes(manualSubcategory)
      ? manualSubcategory
      : defaultSubcategoryForCategory(manualCategory);
  } else {
    const mapped = canonicalizeCategorySubcategory(
      tx.category,
      tx.subcategory,
      tx.description,
      toNumber(tx.amount, 0),
      tx.property
    );
    tx.category = mapped.category;
    tx.subcategory = mapped.subcategory;
  }

  const amount = toNumber(tx.amount, 0);
  if (tx.category === "Airbnb" || (tx.category === "Income" && tx.subcategory === "Airbnb Income")) {
    tx.property = "Airbnb";
  } else if (tx.category === "Housing") {
    tx.property = tx.property || "Home";
  } else if (tx.category !== "Transfers") {
    tx.property = tx.property && normalizeLabel(tx.property) === "airbnb" ? "Airbnb" : tx.property || null;
  }

  if (amount > 0) tx.type = tx.category === "Transfers" ? "transfer" : "income";
  else if (amount < 0) tx.type = tx.category === "Transfers" ? "transfer" : "expense";
  else tx.type = "neutral";
  tx.isSubscription = isSubscriptionLikeTransaction(tx);
  return tx;
}

function normalizeBudgetCategoryItem(category, item) {
  const mapped = canonicalizeCategorySubcategory(category, item, item, -1, null);
  return {
    category: mapped.category,
    item: mapped.subcategory,
  };
}

function applyCategoryTaxonomy(tx) {
  return normalizeToOfficialTaxonomy(tx);
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

const SUBSCRIPTION_DESCRIPTION_SIGNALS = [
  "WIX.COM",
  "EVERNOTE",
  "KAYO",
  "APPLE SERVICES",
  "APPLE.COM/BILL",
  "PAYPAL AUSTRALIA",
  "SPOTIFY",
  "NETFLIX",
  "STAN.COM.AU",
  "OPENAI *CHATGPT",
  "GOOGLE PAYMENT",
];

function isSubscriptionLikeTransaction(tx) {
  if (!tx || toNumber(tx.amount, 0) >= 0) return false;
  const subcategory = normalizeLabel(tx.subcategory);
  if (subcategory === "subscriptions") return true;
  const descriptionUpper = String(tx.description || "").toUpperCase();
  if (containsAny(descriptionUpper, CSV_SUBSCRIPTION_KEYWORDS)) return true;
  if (containsAny(descriptionUpper, SUBSCRIPTION_DESCRIPTION_SIGNALS)) return true;
  return false;
}

function applyDetectedSubscriptionFlags(transactions = [], subscriptions = []) {
  const activeMerchantNames = new Set(
    (Array.isArray(subscriptions) ? subscriptions : [])
      .filter((item) => String(item?.status || "").trim() === "Active")
      .map((item) => normalizeLabel(item?.merchant))
      .filter(Boolean)
  );
  if (!activeMerchantNames.size) return;
  (Array.isArray(transactions) ? transactions : []).forEach((tx) => {
    if (!tx || toNumber(tx.amount, 0) >= 0) return;
    const merchant = normalizeLabel(normalizeMerchant(tx.description));
    if (activeMerchantNames.has(merchant)) tx.isSubscription = true;
  });
}

function isTransferDescription(text) {
  return CSV_TRANSFER_ACCOUNT_PATTERNS.some((pattern) => text.includes(pattern));
}

function isLoanFundingTransferDescription(text = "") {
  const normalized = String(text || "").toUpperCase();
  return (
    (normalized.includes("LOAN TO A/C") || normalized.includes("LOAN TO ACCOUNT")) &&
    normalized.includes("SWIFT PAYMENTS")
  );
}

function looksLikePayPalActivityCsvRows(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2 || !Array.isArray(rows[0])) return false;
  const headers = rows[0].map((cell) => normalizeLabel(cell));
  const requiredHeaders = ["date", "type", "status", "gross", "net"];
  return requiredHeaders.every((header) => headers.includes(header));
}

function parsePayPalActivityCsvTransactions(rows = [], fallbackAccount = "PayPal") {
  if (!looksLikePayPalActivityCsvRows(rows)) return [];
  const fallbackLabel = String(fallbackAccount || "").trim();
  const accountName =
    fallbackLabel &&
    !/^download(?:\s*\(\d+\))?$/i.test(fallbackLabel) &&
    !/^imported\s+csv$/i.test(fallbackLabel)
      ? fallbackLabel
      : "PayPal";
  const headers = rows[0].map((cell) => normalizeLabel(cell));
  const getCell = (row, ...names) => {
    for (const name of names) {
      const index = headers.indexOf(normalizeLabel(name));
      if (index >= 0) return String(row[index] || "").trim();
    }
    return "";
  };
  const skipTypeSignals = [
    "transfer to paypal account",
    "general hold",
    "general hold release",
    "general credit card deposit",
    "bank deposit to paypal account",
    "paypal balance transfer",
  ];

  const transactions = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) || !row.length) continue;

    const date = parseFlexibleDate(getCell(row, "date"));
    if (!date) continue;

    const status = normalizeLabel(getCell(row, "status"));
    if (status && !["completed", "cleared"].includes(status)) continue;

    const rawType = getCell(row, "type");
    const type = normalizeLabel(rawType);
    if (skipTypeSignals.some((signal) => type.includes(signal))) continue;

    const gross = toNumber(String(getCell(row, "gross")).replace(/[^0-9.-]/g, ""), NaN);
    const net = toNumber(String(getCell(row, "net")).replace(/[^0-9.-]/g, ""), NaN);
    const amount = Number.isFinite(net) ? net : gross;
    if (!Number.isFinite(amount) || Math.abs(amount) < 0.00001) continue;

    const name = getCell(row, "name");
    const itemTitle = getCell(row, "item title");
    const subject = getCell(row, "subject");
    const note = getCell(row, "note");
    const description = name || itemTitle || subject || note || rawType || "PayPal Transaction";
    const reference = getCell(row, "transaction id");
    const invoiceNumber = getCell(row, "invoice number");
    const memoParts = [rawType, itemTitle, note].filter((value, index, all) => value && all.indexOf(value) === index);

    const tx = {
      id: createId("txcsv"),
      date,
      month: monthKeyFromDate(date),
      source_type: "paypal_activity_csv",
      description,
      payee: name || description,
      memo: memoParts.join(" | "),
      reference: [reference, invoiceNumber].filter(Boolean).join(" | "),
      counterparty: getCell(row, "to email") || getCell(row, "from email"),
      amount,
      balance: toNumber(String(getCell(row, "balance")).replace(/[^0-9.-]/g, ""), 0),
      account: accountName,
      raw_category: "Uncategorized",
      raw_subcategory: "Other",
      category: "Uncategorized",
      subcategory: "Other",
      type: amount >= 0 ? "income" : "expense",
      property: null,
      isSubscription: false,
      transfer_pair_id: "",
      internal_transfer_matched: false,
      canonical_description: "",
      canonical_payee_key: "",
      payee_label: "",
      payee_alias_rule_id: "",
      classification_rule_id: "",
      classification_confidence: 0,
      classification_reason: "",
      pre_cleanup_category: "Uncategorized",
      pre_cleanup_subcategory: "Other",
      is_internal_transfer: false,
      is_sinking_transfer: false,
      is_loan_payment: false,
      is_loan_payment_counterpart: false,
      exclude_from_spending: false,
      exclude_from_income: false,
      exclude_from_budget: false,
    };
    classifyImportedTransaction(tx);
    normalizeToOfficialTaxonomy(tx);
    transactions.push(tx);
  }

  return transactions;
}

function classifyImportedTransaction(tx) {
  const text = String(tx.description || "").toUpperCase();
  const amount = toNumber(tx.amount, 0);
  tx.type = amount > 0 ? "income" : amount < 0 ? "expense" : "neutral";
  tx.category = tx.category || "Uncategorized";
  tx.subcategory = tx.subcategory || "Other";
  tx.property = tx.property || null;

  if (
    amount === 0 &&
    (text.includes("ONLINE BANKING") || text.includes("NABCONNECT") || text.includes("DIRECT CREDIT"))
  ) {
    tx.category = "Transfers";
    tx.subcategory = "Transfer from inside going out";
    tx.type = "transfer";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (amount !== 0 && isLoanFundingTransferDescription(text)) {
    tx.category = "Transfers";
    tx.subcategory = amount < 0 ? "Transfer from loan account" : "Transfer to loan account";
    tx.type = "transfer";
    return normalizeToOfficialTaxonomy(tx);
  }

  const transferLike =
    text.startsWith("TFR") ||
    (text.includes("TFR") && isTransferDescription(text)) ||
    text.includes("TRANSFER") ||
    text.includes("AUTH REF");

  if (transferLike) {
    tx.category = "Transfers";
    tx.subcategory = inferTransferSubcategory(normalizeLabel(tx.subcategory), text, amount);
    tx.type = "transfer";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (
    amount > 0 &&
    /\b(?:PAYROLL|SALARY|WAGES?)\b/.test(text)
  ) {
    tx.category = "Income";
    tx.subcategory = "Salary";
    tx.type = "income";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (amount > 0 && (text.includes("AIRBNB"))) {
    tx.category = "Income";
    tx.subcategory = "Airbnb Income";
    tx.property = "Airbnb";
    tx.type = "income";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (amount > 0 && (text.includes("DIRECT CREDIT") && text.includes("ATO"))) {
    tx.category = "Income";
    tx.subcategory = "Other Income";
    tx.type = "income";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (amount > 0 && text.startsWith("INTEREST CREDIT")) {
    tx.category = "Financial";
    tx.subcategory = "Interest";
    tx.type = "income";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.startsWith("INTEREST DEBIT") || text.includes("ATM OPERATOR FEE") || text.includes("PAPER STATEMENT")) {
    tx.category = "Financial";
    tx.subcategory = "Bank Fees";
    tx.type = "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  // Required mapping: Health insurance -> Insurance > Health Insurance
  if (text.includes("HEALTH INSURANCE") && amount < 0) {
    tx.category = "Insurance";
    tx.subcategory = "Health Insurance";
    tx.type = "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("LIFE INSURANCE") || text.includes("INCOME PROTECTION") || text.includes("LIFE INSURANCE")) {
    tx.category = "Insurance";
    tx.subcategory = "Income Protection";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("HOME INSURANCE") || text.includes("INSURANCE") || text.includes("INSURANCE")) {
    tx.category = "Insurance";
    tx.subcategory = text.includes("HOME INSURANCE") ? "Home Insurance" : "Other Insurance";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("CWH") || text.includes("CHEMIST") || text.includes("CINCOTTA") || text.includes("PHAR/SHOP")) {
    tx.category = "Health";
    tx.subcategory = "Pharmacy";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (
    containsAny(text, CSV_HEALTHCARE_PROVIDER_KEYWORDS) ||
    containsAny(text, ["DENTIST", "DENTAL", "DOCTOR", "MEDICAL", "PHYSIO", "CHIRO", "PATHOLOGY", "RADIOLOGY"])
  ) {
    tx.category = "Health";
    tx.subcategory = "Medical";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("YOGA")) {
    tx.category = "Health";
    tx.subcategory = "Wellbeing";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  // Required mapping: Electricity -> Housing > Electricity
  if (text.includes("ELECTRICITY")) {
    const hasAirbnbContext = isAirbnbSignal(text, normalizeLabel(tx.category), normalizeLabel(tx.subcategory), tx.property);
    tx.category = hasAirbnbContext ? "Airbnb" : "Housing";
    tx.subcategory = hasAirbnbContext ? "Utilities" : "Electricity";
    tx.property = hasAirbnbContext ? "Airbnb" : "Home";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (/\bWATER (?:BILL|RATES|UTILITY)\b/.test(text)) {
    tx.category = "Housing";
    tx.subcategory = "Water";
    tx.property = "Home";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("COUNCIL RATES")) {
    tx.category = "Housing";
    tx.subcategory = "Rates";
    tx.property = "Home";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("TELECOMMUNICATIONS") || text.includes("BROADBAND")) {
    const isAirbnb = isAirbnbSignal(text, normalizeLabel(tx.category), normalizeLabel(tx.subcategory), tx.property);
    tx.category = isAirbnb ? "Airbnb" : "Housing";
    tx.subcategory = isAirbnb ? "Utilities" : "Internet";
    tx.property = isAirbnb ? "Airbnb" : "Home";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }


  if (text.startsWith("BPAY:")) {
    if (text.includes("DEPRECIATION REPORT")) {
      tx.category = "Financial";
      tx.subcategory = "Tax";
      tx.type = amount > 0 ? "income" : "expense";
      return normalizeToOfficialTaxonomy(tx);
    }
    if (text.includes("TFNSW MARITIME")) {
      tx.category = "Transport";
      tx.subcategory = "Registration";
      tx.type = amount > 0 ? "income" : "expense";
      return normalizeToOfficialTaxonomy(tx);
    }
  }

  // Required mapping: Woolworths / Coles -> Groceries > Groceries
  if (containsAny(text, CSV_GROCERY_KEYWORDS) || text.includes("WOOLWORTHS") || text.includes("COLES")) {
    tx.category = "Groceries";
    tx.subcategory = "Groceries";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (containsAny(text, CSV_DINING_KEYWORDS) || containsAny(text, DINING_TAKEAWAY_KEYWORDS) || text.includes("SUBWAY")) {
    tx.category = "Dining & Takeaway";
    tx.subcategory = inferDiningSubcategory(normalizeLabel(tx.subcategory), text);
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  // Required mapping: service stations -> Transport > Fuel
  if (containsAny(text, CSV_FUEL_KEYWORDS) || text.includes("7-ELEVEN") || text.includes("PEARL ENERGY")) {
    tx.category = "Transport";
    tx.subcategory = "Fuel";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("TFNSW") || text.includes("MARITIME") || text.includes("LINKT")) {
    tx.category = "Transport";
    tx.subcategory = "Registration";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("NRMA") || containsAny(text, CSV_VEHICLE_SERVICE_KEYWORDS) || text.includes("CARWASH") || text.includes("VEHICLE SERVICE")) {
    tx.category = "Transport";
    tx.subcategory = "Vehicle Costs";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("EDUCATION FEE") || containsAny(text, CSV_EDUCATION_KEYWORDS) || text.includes("TWINKL") || text.includes("TEACHERSPAYTEACHERS")) {
    tx.category = "Family";
    tx.subcategory = "Education";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("BASKETBALL ASSO") || text.includes("BALLET") || (text.includes("SPORT") && !text.includes("CLUB"))) {
    tx.category = "Family";
    tx.subcategory = "Kids Activities";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("GIFT")) {
    tx.category = "Family";
    tx.subcategory = "Gifts / Family";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (
    containsAny(text, CSV_SUBSCRIPTION_KEYWORDS) ||
    containsAny(text, SUBSCRIPTION_DESCRIPTION_SIGNALS) ||
    text.includes("WIX.COM") ||
    text.includes("CLAUDE.AI")
  ) {
    tx.category = "Lifestyle";
    tx.subcategory = "Subscriptions";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (
    containsAny(text, CSV_TRAVEL_KEYWORDS) ||
    containsAny(text, TRAVEL_FLIGHT_KEYWORDS) ||
    containsAny(text, TRAVEL_ACCOMMODATION_KEYWORDS) ||
    containsAny(text, TRAVEL_TRANSPORT_KEYWORDS) ||
    containsAny(text, TRAVEL_ACTIVITY_KEYWORDS)
  ) {
    tx.category = "Travel";
    tx.subcategory = inferTravelSubcategory(normalizeLabel(tx.subcategory), text);
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (containsAny(text, CSV_RETAIL_KEYWORDS) || text.startsWith("SQ *") || text.startsWith("SP ") || text.startsWith("LS ")) {
    tx.category = "Lifestyle";
    tx.subcategory = "Retail";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("HAIRCUT") || text.includes("BEAUT")) {
    tx.category = "Lifestyle";
    tx.subcategory = "Personal Care";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("MOVIE TKTS") || text.includes("EZI*MOVIE")) {
    tx.category = "Lifestyle";
    tx.subcategory = "Entertainment";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("INVSTMNT")) {
    tx.category = "Investments";
    tx.subcategory = "Investment Contribution";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  // Explicit mappings for frequent Uncategorized merchants.
  if (text.includes("MORTGAGE REPAYMENT")) {
    tx.category = "Housing";
    tx.subcategory = "Mortgage / Loan";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("COUNCIL RATES")) {
    tx.category = "Housing";
    tx.subcategory = "Rates";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("TELEPHONE BILL")) {
    tx.category = "Housing";
    tx.subcategory = "Internet";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("UBER TRIP")) {
    tx.category = "Transport";
    tx.subcategory = "Vehicle Costs";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("AUSPOST")) {
    tx.category = "Lifestyle";
    tx.subcategory = "Retail";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.includes("GYM MEMBERSHIP")) {
    tx.category = "Health";
    tx.subcategory = "Wellbeing";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (text.startsWith("DIRECT DEBIT")) {
    tx.category = "Financial";
    tx.subcategory = "Bank Fees";
    tx.type = amount > 0 ? "income" : "expense";
    return normalizeToOfficialTaxonomy(tx);
  }

  if (amount > 0) {
    tx.category = "Income";
    tx.subcategory = "Other Income";
    tx.type = "income";
  } else {
    tx.category = "Uncategorized";
    tx.subcategory = "Other";
    tx.type = amount < 0 ? "expense" : "neutral";
  }

  return normalizeToOfficialTaxonomy(tx);
}

function parseBankCsvTransactions(text, fallbackAccount = "Imported CSV") {
  const rows = parseCsvRows(text);
  if (!rows.length) return [];
  const paypalTransactions = parsePayPalActivityCsvTransactions(rows, fallbackAccount);
  if (paypalTransactions.length) return paypalTransactions;

  let accountName = fallbackAccount;
  let startIndex = 0;

  if (rows[0]?.length && !parseFlexibleDate(rows[0][0])) {
    accountName = rows[0][0].trim() || fallbackAccount;
    startIndex = 1;
  }

  const transactions = [];
  for (let i = startIndex; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.length < 5) continue;

    const date = parseFlexibleDate(row[0]);
    if (!date) continue;

    const description = String(row[2] || "").trim().replace(/^"(.*)"$/, "$1");
    // Bank statements can include balance-only memos, such as available redraw.
    // A genuinely recorded numeric zero remains a transaction.
    if (String(row[4] ?? "").trim() === "") continue;
    const amount = toNumber(String(row[4]).replace(/[^0-9.-]/g, ""), NaN);
    if (!Number.isFinite(amount)) continue;
    const balance = toNumber(String(row[5] || "").replace(/[^0-9.-]/g, ""), 0);

    const tx = {
      id: createId("txcsv"),
      date,
      month: monthKeyFromDate(date),
      source_type: "bank_csv",
      description,
      payee: "",
      memo: "",
      reference: "",
      counterparty: "",
      amount,
      balance,
      account: accountName,
      raw_category: "Uncategorized",
      raw_subcategory: "Other",
      category: "Uncategorized",
      subcategory: "Other",
      type: amount >= 0 ? "income" : "expense",
      property: null,
      isSubscription: false,
      transfer_pair_id: "",
      internal_transfer_matched: false,
      canonical_description: "",
      canonical_payee_key: "",
      payee_label: "",
      payee_alias_rule_id: "",
      classification_rule_id: "",
      classification_confidence: 0,
      classification_reason: "",
      pre_cleanup_category: "Uncategorized",
      pre_cleanup_subcategory: "Other",
      is_internal_transfer: false,
      is_sinking_transfer: false,
      is_loan_payment: false,
      is_loan_payment_counterpart: false,
      exclude_from_spending: false,
      exclude_from_income: false,
      exclude_from_budget: false,
    };
    classifyImportedTransaction(tx);
    normalizeToOfficialTaxonomy(tx);
    transactions.push(tx);
  }

  return transactions;
}

function dedupeTransactions(transactions) {
  const transferApi = getTransferClassificationApi();
  const canonicalText = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (transferApi && typeof transferApi.canonicalizeDescription === "function") {
      return transferApi.canonicalizeDescription(raw);
    }
    return raw.replace(/\s+/g, " ").toUpperCase();
  };
  const canonicalAmount = (value) => {
    const parsed = toNumber(value, NaN);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : "";
  };
  const parseDateValue = (value) => {
    const parsed = Date.parse(`${String(value || "").trim()}T00:00:00Z`);
    return Number.isFinite(parsed) ? parsed : NaN;
  };
  const dayDistance = (left, right) => {
    const leftMs = parseDateValue(left);
    const rightMs = parseDateValue(right);
    if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return Number.POSITIVE_INFINITY;
    return Math.abs(Math.round((leftMs - rightMs) / 86400000));
  };
  const isPayPalActivityTransaction = (tx) => String(tx?.source_type || tx?.sourceType || "").trim() === "paypal_activity_csv";
  const isGenericPayPalBankTransaction = (tx) => {
    if (!tx || isPayPalActivityTransaction(tx)) return false;
    const rawText = String(tx.description || tx.payee || "").trim();
    if (!rawText) return false;
    const normalized = normalizeLabel(rawText);
    if (!normalized.includes("paypal")) return false;
    return (
      normalized.startsWith("pos w d paypal") ||
      normalized.startsWith("paypal australia") ||
      /paypal\s*\*/i.test(rawText)
    );
  };

  const seen = new Set();
  const exactDeduped = (Array.isArray(transactions) ? transactions : []).filter((tx) => {
    const key = [
      String(tx.date || "").trim(),
      canonicalText(tx.description),
      canonicalAmount(tx.amount),
      canonicalAmount(tx.balance),
      canonicalText(tx.account),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const keep = exactDeduped.map(() => true);
  const usedPayPalMatches = new Set();
  const paypalCandidatesByAmount = new Map();

  exactDeduped.forEach((tx, index) => {
    if (!isPayPalActivityTransaction(tx)) return;
    const amountKey = canonicalAmount(tx.amount);
    if (!amountKey) return;
    if (!paypalCandidatesByAmount.has(amountKey)) paypalCandidatesByAmount.set(amountKey, []);
    paypalCandidatesByAmount.get(amountKey).push({
      index,
      date: String(tx.date || "").trim(),
    });
  });

  paypalCandidatesByAmount.forEach((list) => {
    list.sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
  });

  exactDeduped.forEach((tx, index) => {
    if (!isGenericPayPalBankTransaction(tx)) return;
    const amountKey = canonicalAmount(tx.amount);
    if (!amountKey) return;
    const candidates = paypalCandidatesByAmount.get(amountKey) || [];
    let bestCandidate = null;
    let bestScore = Number.POSITIVE_INFINITY;
    candidates.forEach((candidate) => {
      if (usedPayPalMatches.has(candidate.index)) return;
      const daysApart = dayDistance(tx.date, candidate.date);
      if (daysApart > 3) return;
      const score = daysApart + Math.abs(candidate.index - index) * 0.001;
      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    });
    if (!bestCandidate) return;
    keep[index] = false;
    usedPayPalMatches.add(bestCandidate.index);
  });

  return exactDeduped.filter((_, index) => keep[index]);
}

function summarizeAirbnb(transactions) {
  let income = 0;
  let expenses = 0;
  let cleaning = 0;
  let maintenance = 0;
  let loanPayments = 0;
  let loanRedraws = 0;
  const utilities = {
    Electricity: 0,
    Internet: 0,
    Water: 0,
    Rates: 0,
  };

  transactions.forEach((tx) => {
    if (tx.category !== "Airbnb" && tx.property !== "Airbnb") return;
    if (tx.amount > 0) {
      income += tx.amount;
      return;
    }
    const value = Math.abs(tx.amount);
    expenses += value;
    if (tx.subcategory === "Cleaning") cleaning += value;
    else if (tx.subcategory === "Maintenance") maintenance += value;
    else if (tx.subcategory === "Loan Payment") loanPayments += value;
    else if (tx.subcategory === "Rates") utilities.Rates += value;
    else if (tx.subcategory === "Utilities") {
      const text = tx.description.toUpperCase();
      if (text.includes("ELECTRICITY")) utilities.Electricity += value;
      else if (text.includes("BROADBAND")) utilities.Internet += value;
      else if (text.includes("NORTH EAST WATER")) utilities.Water += value;
      else utilities.Electricity += value;
    }
  });

  const net = income - expenses;
  const margin = income > 0 ? (net / income) * 100 : 0;
  return {
    income: Number(income.toFixed(2)),
    expenses: Number(expenses.toFixed(2)),
    net: Number(net.toFixed(2)),
    loan_payments: Number(loanPayments.toFixed(2)),
    loan_redraws: Number(loanRedraws.toFixed(2)),
    cleaning: Number(cleaning.toFixed(2)),
    maintenance: Number(maintenance.toFixed(2)),
    utilities,
    total_revenue: Number(income.toFixed(2)),
    total_expenses: Number(expenses.toFixed(2)),
    net_profit: Number(net.toFixed(2)),
    profit_margin: Number(margin.toFixed(2)),
  };
}

function buildDatasetFromCsvTransactions(transactions) {
  const normalized = (Array.isArray(transactions) ? transactions : []).map((tx) => ({ ...tx }));
  normalizeTransactionSetToOfficialTaxonomy(normalized, { recordAudit: false });
  const sorted = [...normalized].sort((a, b) => a.date.localeCompare(b.date));
  const monthlyCashflow = buildMonthlyCashflow(sorted);
  const categorySummary = buildCategorySummary(sorted);
  const subcategorySummary = buildSubcategorySummary(sorted);
  const metrics = buildMetrics(monthlyCashflow, categorySummary);
  const topMerchants = buildTopMerchants(sorted, 20);
  const topIncome = buildTopIncomeSources(sorted, 20).map((item) => ({
    merchant: item.source,
    total: item.total,
  }));
  const airbnbSummary = summarizeAirbnb(sorted);
  const classificationDiagnostics = buildClassificationDiagnostics(sorted);
  const budgetSuggestions = buildAnnualBudgetSuggestions(
    sorted,
    AppState.tax?.fyStartMonth || TAX_DEFAULT_FY_START_MONTH
  );

  const budgetSummary = normalizeBudgetSummaryRows(generateBaselineBudgetFromActuals(sorted));
  return {
    generated_at: new Date().toISOString(),
    metrics: {
      total_income: Number(metrics.total_income.toFixed(2)),
      total_expense: Number(metrics.total_expense.toFixed(2)),
      net_position: Number(metrics.net_position.toFixed(2)),
      savings_rate: Number(metrics.savings_rate.toFixed(2)),
      average_monthly_net: Number(metrics.average_monthly_net.toFixed(2)),
      essential_annual: Number(metrics.essential_annual.toFixed(2)),
      discretionary_annual: Number(metrics.discretionary_annual.toFixed(2)),
    },
    category_summary: categorySummary.map((row) => ({
      category: row.category,
      income: Number(row.income.toFixed(2)),
      expense: Number(row.expense.toFixed(2)),
      net: Number(row.net.toFixed(2)),
    })),
    subcategory_summary: subcategorySummary.map((row) => ({
      category: row.category,
      subcategory: row.subcategory,
      income: Number(row.income.toFixed(2)),
      expense: Number(row.expense.toFixed(2)),
      net: Number(row.net.toFixed(2)),
    })),
    monthly_cashflow: monthlyCashflow.map((row) => ({
      month: row.month,
      income: Number(row.income.toFixed(2)),
      expenses: Number(row.expenses.toFixed(2)),
      net: Number(row.net.toFixed(2)),
    })),
    budget_summary: budgetSummary,
    airbnb_summary: airbnbSummary,
    classification_diagnostics: classificationDiagnostics,
    budget_suggestions: budgetSuggestions,
    top_merchants: topMerchants.map((item) => ({ merchant: item.merchant, total: Number(item.total.toFixed(2)) })),
    top_income_sources: topIncome,
    recent_transactions: sorted.map((tx) => ({
      id: tx.id,
      date: tx.date,
      source_type: tx.source_type || "",
      description: tx.description,
      payee: tx.payee || "",
      memo: tx.memo || "",
      reference: tx.reference || "",
      counterparty: tx.counterparty || "",
      amount: Number(tx.amount.toFixed(2)),
      balance: Number(tx.balance.toFixed(2)),
      account: tx.account,
      category: tx.category,
      subcategory: tx.subcategory,
      manual_category_override: tx.manual_category_override || "",
      manual_subcategory_override: tx.manual_subcategory_override || "",
      type: tx.type,
      property: tx.property,
      transfer_pair_id: tx.transfer_pair_id || "",
      internal_transfer_matched: Boolean(tx.internal_transfer_matched),
      raw_category: tx.raw_category || "",
      raw_subcategory: tx.raw_subcategory || "",
      canonical_description: tx.canonical_description || "",
      canonical_payee_key: tx.canonical_payee_key || "",
      payee_label: tx.payee_label || "",
      payee_alias_rule_id: tx.payee_alias_rule_id || "",
      classification_rule_id: tx.classification_rule_id || "",
      classification_confidence: Number(toNumber(tx.classification_confidence, 0).toFixed(2)),
      classification_reason: tx.classification_reason || "",
      pre_cleanup_category: tx.pre_cleanup_category || "",
      pre_cleanup_subcategory: tx.pre_cleanup_subcategory || "",
      is_internal_transfer: Boolean(tx.is_internal_transfer),
      is_sinking_transfer: Boolean(tx.is_sinking_transfer),
      is_loan_payment: Boolean(tx.is_loan_payment),
      is_loan_payment_counterpart: Boolean(tx.is_loan_payment_counterpart),
      exclude_from_spending: Boolean(tx.exclude_from_spending),
      exclude_from_income: Boolean(tx.exclude_from_income),
      exclude_from_budget: Boolean(tx.exclude_from_budget),
    })),
    calc_defaults: AppState.rawData?.calc_defaults || {},
    tax_data:
      AppState.tax && Array.isArray(AppState.tax.manualExpenses)
        ? TaxController.getSnapshot()
        : AppState.rawData?.tax_data || {},
    classification_audit: AppState.classificationAudit.slice(0, 200),
  };
}

function deriveTxFromCsvRow(row) {
  const headerKeys = Object.keys(row);
  const getValue = (...candidates) => {
    for (const key of headerKeys) {
      const normalized = key.replace(/\s+/g, "");
      if (candidates.includes(normalized)) return row[key];
    }
    return "";
  };

  const date = parseFlexibleDate(
    getValue("date", "transactiondate", "valuedate", "posteddate")
  );

  const desc = getValue("description", "merchant", "narrative", "details") || "Imported transaction";
  const payee = getValue("payee", "counterparty", "name");
  const memo = getValue("memo", "notes", "note");
  const reference = getValue("reference", "ref");
  const counterparty = getValue("counterparty", "payee", "name");
  const account = getValue("account", "accountname", "accountnumber", "acc");
  const balanceRaw = getValue("balance", "runningbalance");
  const transferPairId = getValue(
    "transfer_pair_id",
    "transferPairId",
    "linked_transfer_id",
    "linkedTransferId",
    "matched_transfer",
    "matchedTransfer"
  );

  const debit = toNumber(String(getValue("debit", "withdrawal", "expense")).replace(/[^0-9.-]/g, ""), NaN);
  const credit = toNumber(String(getValue("credit", "deposit", "income")).replace(/[^0-9.-]/g, ""), NaN);
  let amount = toNumber(String(getValue("amount", "value", "amt")).replace(/[^0-9.-]/g, ""), NaN);

  if (!Number.isFinite(amount)) {
    const debitValue = Number.isFinite(debit) ? debit : 0;
    const creditValue = Number.isFinite(credit) ? credit : 0;
    amount = creditValue - debitValue;
  }

  if (!date || !Number.isFinite(amount)) return null;

  return {
    id: createId("txcsv"),
    date,
    month: monthKeyFromDate(date),
    description: desc,
    payee: String(payee || "").trim(),
    memo: String(memo || "").trim(),
    reference: String(reference || "").trim(),
    counterparty: String(counterparty || "").trim(),
    amount,
    balance: toNumber(String(balanceRaw).replace(/[^0-9.-]/g, ""), 0),
    account: account || "Imported",
    category: "Uncategorized",
    subcategory: "Imported",
    type: amount >= 0 ? "income" : "expense",
    property: null,
    transfer_pair_id: String(transferPairId || "").trim(),
    internal_transfer_matched: false,
  };
}

const OverviewController = {
  init() {
    document.getElementById("overviewPeriodFilter")?.addEventListener("change", (event) => {
      AppState.overviewFilters.period = event.target.value;
      const custom = document.getElementById("customDateRange");
      if (event.target.value === "custom") {
        custom?.classList.remove("is-hidden");
        this.ensureCustomDateDefaults();
      } else {
        custom?.classList.add("is-hidden");
      }
      App.recomputeDerived();
      App.renderAll();
    });

    document.getElementById("overviewAccountFilter")?.addEventListener("change", (event) => {
      App.setGlobalAccountScope(String(event.target.value || "all"), { source: "overview" });
    });

    document.getElementById("overviewDateFrom")?.addEventListener("change", (event) => {
      AppState.overviewFilters.dateFrom = parseFlexibleDate(event.target.value || "");
      App.recomputeDerived();
      App.renderAll();
    });

    document.getElementById("overviewDateTo")?.addEventListener("change", (event) => {
      AppState.overviewFilters.dateTo = parseFlexibleDate(event.target.value || "");
      App.recomputeDerived();
      App.renderAll();
    });

    document.getElementById("clearOverviewFilters")?.addEventListener("click", () => {
      AppState.overviewFilters = { period: "all", account: AppState.globalAccountScope || "all", dateFrom: "", dateTo: "" };
      const period = document.getElementById("overviewPeriodFilter");
      const account = document.getElementById("overviewAccountFilter");
      const from = document.getElementById("overviewDateFrom");
      const to = document.getElementById("overviewDateTo");
      period.value = "all";
      App.setGlobalAccountScope("all", { source: "overview_clear", render: false, recompute: false });
      if (account) account.value = "all";
      from.value = "";
      to.value = "";
      document.getElementById("customDateRange")?.classList.add("is-hidden");
      App.recomputeDerived();
      App.renderAll();
    });

    ["showIncome", "showExpenses", "showNet"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => this.renderTrendChart(this.getFilteredMonthly()));
    });

    document.getElementById("categoryBars")?.addEventListener("click", (event) => {
      const bar = event.target.closest("[data-category]");
      if (!bar) return;
      const category = bar.getAttribute("data-category");
      if (!category) return;
      App.navigate("categories");
      const categoryFilter = document.getElementById("categoryFilter");
      if (categoryFilter) {
        categoryFilter.value = category;
        AppState.categoryFilters.category = category;
      }
      CategoryController.render();
    });

    document.getElementById("summaryCards")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("[data-summary-inspect]");
      if (!button) return;

      const metricKey = String(button.getAttribute("data-summary-inspect") || "").trim();
      if (!metricKey) return;

      AppState.overviewInspectMetric = AppState.overviewInspectMetric === metricKey ? "" : metricKey;
      this.renderInspectPanel();
      if (AppState.overviewInspectMetric) {
        document.getElementById("overviewInspectPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    document.getElementById("closeOverviewInspect")?.addEventListener("click", () => {
      AppState.overviewInspectMetric = "";
      this.renderInspectPanel();
    });

    document.getElementById("overviewQuickActions")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-overview-action]");
      if (!button) return;

      const action = String(button.getAttribute("data-overview-action") || "").trim();
      const value = String(button.getAttribute("data-overview-value") || "").trim();

      switch (action) {
        case "reset-overview":
          document.getElementById("clearOverviewFilters")?.click();
          break;
        case "review-uncategorized":
          AppState.transactionFilters.search = "";
          AppState.transactionFilters.category = "Uncategorized";
          AppState.transactionFilters.subcategory = "all";
          AppState.transactionFilters.subscription = "all";
          AppState.transactionFilters.type = "expense";
          AppState.transactionFilters.page = 1;
          App.navigate("transactions");
          TransactionsController.render();
          break;
        case "review-budget-gap":
          App.navigate("budget");
          if (value) {
            AppState.budgetDetail = { id: value };
          } else {
            AppState.budgetUnbudgetedExpanded = true;
          }
          BudgetController.render();
          const focusPanel = value ? "budgetDetailPanel" : "budgetUnbudgetedPanel";
          document.getElementById(focusPanel)?.scrollIntoView({ behavior: "smooth", block: "start" });
          break;
        case "inspect-top-category":
          if (!value) return;
          AppState.categoryFilters.category = value;
          App.navigate("categories");
          CategoryController.render();
          break;
        case "ask-buddy":
          App.openAssistantWithPrompt("", { topic: "spending" });
          break;
        case "open-planning":
          App.navigate("planning");
          PlanningController.render();
          break;
        default:
          break;
      }
    });
  },

  ensureCustomDateDefaults() {
    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions, { ignorePeriod: true });
    const availableDates = [...new Set(scopedTransactions.map((tx) => String(tx.date || "").trim()).filter(Boolean))].sort();
    const firstDate = availableDates[0] || "";
    const lastDate = availableDates[availableDates.length - 1] || "";
    if (!AppState.overviewFilters.dateFrom) AppState.overviewFilters.dateFrom = firstDate;
    if (!AppState.overviewFilters.dateTo) AppState.overviewFilters.dateTo = lastDate;
  },

  syncCustomDateInputs() {
    const custom = document.getElementById("customDateRange");
    const from = document.getElementById("overviewDateFrom");
    const to = document.getElementById("overviewDateTo");
    const isCustom = AppState.overviewFilters.period === "custom";
    custom?.classList.toggle("is-hidden", !isCustom);
    if (!from || !to) return;

    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions, { ignorePeriod: true });
    const availableDates = [...new Set(scopedTransactions.map((tx) => String(tx.date || "").trim()).filter(Boolean))].sort();
    const firstDate = availableDates[0] || "";
    const lastDate = availableDates[availableDates.length - 1] || "";

    from.min = firstDate;
    from.max = lastDate;
    to.min = firstDate;
    to.max = lastDate;
    from.value = parseFlexibleDate(AppState.overviewFilters.dateFrom || "") || "";
    to.value = parseFlexibleDate(AppState.overviewFilters.dateTo || "") || "";
  },

  renderAccountOptions() {
    const select = document.getElementById("overviewAccountFilter");
    if (!select) return;
    const previous = normalizeAccountScope(
      AppState.globalAccountScope || AppState.overviewFilters.account || select.value || "all",
      AppState.transactions
    );
    const accounts = getAvailableAccounts();
    select.innerHTML = `
      <option value="all">All Accounts (Combined)</option>
      ${accounts.map((account) => `<option value="${escapeHtml(account)}">${escapeHtml(account)}</option>`).join("")}
    `;
    const next = accounts.includes(previous) ? previous : "all";
    select.value = next;
    AppState.overviewFilters.account = next;
    AppState.globalAccountScope = next;
  },

  getFilteredTransactions() {
    return getGlobalScopedTransactions(AppState.transactions);
  },

  getFilteredMonthly() {
    const filteredTx = this.getFilteredTransactions();
    return buildMonthlyCashflow(filteredTx);
  },

  describeCurrentScope(firstDate = "", lastDate = "", monthCount = 0) {
    const period = String(AppState.overviewFilters.period || "all");
    if (period === "last12") return "Last 12 months";
    if (period === "last6") return "Last 6 months";
    if (period === "last3") return "Last 3 months";
    if (period === "ytd") return "Year to date";
    if (period === "custom") {
      if (firstDate && lastDate) {
        return `Custom range (${formatDate(firstDate)} to ${formatDate(lastDate)})`;
      }
      return "Custom range";
    }
    if (monthCount > 0) {
      return `${monthCount} month${monthCount === 1 ? "" : "s"} in scope`;
    }
    return "Current scope";
  },

  buildNarrativeModel(filteredTx, filteredMonthly) {
    const sortedDates = [...new Set(filteredTx.map((tx) => String(tx.date || "").trim()).filter(Boolean))].sort();
    const firstDate = sortedDates[0] || "";
    const lastDate = sortedDates[sortedDates.length - 1] || "";
    const accountCount = new Set(
      filteredTx.map((tx) => String(tx.account || "").trim()).filter(Boolean)
    ).size;
    const accountLabel =
      AppState.globalAccountScope === "all"
        ? "All accounts combined"
        : `Account ${AppState.globalAccountScope}`;
    const scopeLabel = this.describeCurrentScope(firstDate, lastDate, filteredMonthly.length);

    if (!filteredTx.length) {
      return {
        headline: "No transactions match the current overview scope.",
        lead: `${accountLabel}. Reset filters or widen the date range to bring transactions back into view.`,
        blocks: [
          {
            title: "What happened",
            body: "The active account or period filters narrowed the view to zero rows.",
          },
          {
            title: "Recommended move",
            body: "Reset the overview filters first, then re-check the transaction explorer if the dataset still looks sparse.",
          },
          {
            title: "Assistant option",
            body: "Prepare a question about imports or filters. Review it before copying; financial totals are optional.",
          },
        ],
        pills: [
          { label: "Scope", value: accountLabel },
          { label: "Period", value: scopeLabel },
          { label: "Coverage", value: "0 transactions" },
          { label: "Action", value: "Reset filters" },
        ],
        actions: [
          {
            action: "reset-overview",
            label: "Reset overview filters",
            meta: "Return to all accounts and all available months.",
          },
          {
            action: "ask-buddy",
            label: "AI help with this view",
            meta: "Review a prepared question. Financial totals are optional; nothing is sent automatically.",
          },
        ],
      };
    }

    const categorySummary = buildCategorySummary(filteredTx);
    const metrics = buildMetrics(filteredMonthly, categorySummary);
    const uncategorized = calculateUncategorizedStats(filteredTx);
    const topCategory = categorySummary
      .filter((row) => row.expense > 0)
      .sort((a, b) => b.expense - a.expense)[0] || null;
    const topMerchant = buildTopMerchants(filteredTx, 1)[0] || null;
    const budgetPresentation =
      typeof BudgetController !== "undefined" &&
      typeof BudgetController.getBudgetPresentationData === "function"
        ? BudgetController.getBudgetPresentationData()
        : null;
    const biggestGap = (budgetPresentation?.expenseRows || [])
      .filter((row) => row.variance < 0)
      .sort((a, b) => a.variance - b.variance)[0] || null;
    const unbudgetedCount = budgetPresentation?.unbudgetedRows?.length || 0;
    const unbudgetedTotal = toNumber(budgetPresentation?.totalUnbudgetedActual, 0);

    let headline = "Recorded income and spending are roughly equal in this view.";
    if (metrics.net_position > 0) headline = "Recorded income exceeds recorded spending in this view.";
    if (metrics.net_position < 0) headline = "Recorded spending exceeds recorded income in this view.";

    const savingsNarrative = Number.isFinite(metrics.savings_rate) && metrics.total_income > 0
      ? `The recorded net amount is ${formatPct(metrics.savings_rate)} of recorded income. This does not establish your available savings or current balance.`
      : "A net-to-income percentage is not available for this view yet.";

    const scopeRange =
      firstDate && lastDate
        ? `${formatDate(firstDate)} to ${formatDate(lastDate)}`
        : "Date range unavailable";
    const topSpendNarrative = topCategory
      ? `${topCategory.category} is the largest expense category at ${currency.format(topCategory.expense)}.${topMerchant ? ` ${topMerchant.merchant} is the biggest merchant at ${currency.format(topMerchant.total)}.` : ""}`
      : "There is not enough expense activity in this scope to identify a dominant spend category.";
    const budgetNarrative = biggestGap
      ? `Recorded spending on ${biggestGap.category} > ${biggestGap.item} is ${currency.format(Math.abs(biggestGap.variance))} above the suggested baseline to date. Check the assumptions before treating this as a spending limit.`
      : unbudgetedCount
      ? `${unbudgetedCount} expense line${unbudgetedCount === 1 ? "" : "s"} have no baseline amount, totalling ${currency.format(unbudgetedTotal)}. Review these before setting a budget.`
      : "No spending above the suggested baseline appears in this financial-year comparison. Coverage and baseline assumptions still need review.";
    const cleanupNarrative = uncategorized.count
      ? `${uncategorized.count} expense transaction${uncategorized.count === 1 ? "" : "s"} remain uncategorized, representing ${currency.format(uncategorized.expense)} or ${formatPct(uncategorized.ratio * 100)} of spend.`
      : "The current scope is fully categorized on the expense side.";

    const actions = [];
    if (uncategorized.count > 0) {
      actions.push({
        action: "review-uncategorized",
        label: `Review ${uncategorized.count} uncategorized expense transaction${uncategorized.count === 1 ? "" : "s"}`,
        meta: `${currency.format(uncategorized.expense)} still needs cleanup before reports are fully trustworthy.`,
      });
    }
    if (biggestGap) {
      actions.push({
        action: "review-budget-gap",
        value: biggestGap.id,
        label: "Review the suggested baseline",
        meta: `${biggestGap.category} > ${biggestGap.item} is ${currency.format(Math.abs(biggestGap.variance))} above the suggested baseline to date.`,
      });
    } else if (unbudgetedCount > 0) {
      actions.push({
        action: "review-budget-gap",
        label: "Review unbudgeted spend",
        meta: `${unbudgetedCount} active line${unbudgetedCount === 1 ? "" : "s"} have spend but no budget set.`,
      });
    }
    if (topCategory) {
      actions.push({
        action: "inspect-top-category",
        value: topCategory.category,
        label: `Inspect ${topCategory.category}`,
        meta: `Jump to Category Intelligence filtered to the current biggest expense category.`,
      });
    }
    if (metrics.net_position < 0 || (Number.isFinite(metrics.savings_rate) && metrics.savings_rate < 10)) {
      actions.push({
        action: "open-planning",
        label: "Open Planning Studio",
        meta: "Run scenarios if you need to rebuild buffer or reduce pressure quickly.",
      });
    }
    actions.push({
      action: "ask-buddy",
      label: "AI help with this view",
      meta: "Review a prepared question. Financial totals are optional; nothing is sent automatically.",
    });

    return {
      headline,
      lead: `${accountLabel}. ${scopeLabel}. ${filteredTx.length} transaction${filteredTx.length === 1 ? "" : "s"} across ${accountCount || 1} account${accountCount === 1 ? "" : "s"}, covering ${scopeRange}. ${savingsNarrative}`,
      blocks: [
        { title: "Main spend pressure", body: topSpendNarrative },
        { title: "Budget signal", body: budgetNarrative },
        { title: "Data hygiene", body: cleanupNarrative },
      ],
      pills: [
        { label: "Scope", value: accountLabel },
        { label: "Coverage", value: `${filteredTx.length} transactions across ${accountCount || 1} account${accountCount === 1 ? "" : "s"}` },
        {
          label: "Suggested baseline (FY)",
          value: biggestGap
            ? `${currency.format(Math.abs(biggestGap.variance))} above baseline`
            : unbudgetedCount
            ? `${unbudgetedCount} unbudgeted line${unbudgetedCount === 1 ? "" : "s"}`
            : "No major gap",
        },
        {
          label: "Cleanup",
          value: uncategorized.count
            ? `${uncategorized.count} uncategorized (${formatPct(uncategorized.ratio * 100)})`
            : "Fully categorized",
        },
      ],
      actions: actions.length > 4 ? [...actions.slice(0, 3), actions[actions.length - 1]] : actions,
    };
  },

  renderNarrativeSummary(filteredTx, filteredMonthly) {
    const narrative = document.getElementById("overviewNarrative");
    const pills = document.getElementById("overviewScopePills");
    const actions = document.getElementById("overviewQuickActions");
    if (!(narrative && pills && actions)) return;

    const model = this.buildNarrativeModel(filteredTx, filteredMonthly);
    narrative.innerHTML = `
      <h3 class="overview-story-headline">${escapeHtml(model.headline)}</h3>
      <p class="overview-story-lead">${escapeHtml(model.lead)}</p>
      <div class="overview-story-grid">
        ${model.blocks
          .map(
            (block) => `
              <article class="overview-story-block">
                <h3>${escapeHtml(block.title)}</h3>
                <p>${escapeHtml(block.body)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    `;

    pills.innerHTML = model.pills
      .map(
        (pill) => `
          <article class="overview-scope-pill">
            <p>${escapeHtml(pill.label)}</p>
            <strong>${escapeHtml(pill.value)}</strong>
          </article>
        `
      )
      .join("");

    actions.innerHTML = model.actions
      .map(
        (item) => `
          <button
            type="button"
            class="quick-action-card"
            data-overview-action="${escapeHtml(item.action)}"
            ${item.value ? `data-overview-value="${escapeHtml(item.value)}"` : ""}
          >
            <span class="quick-action-title">${escapeHtml(item.label)}</span>
            <span class="quick-action-meta">${escapeHtml(item.meta)}</span>
          </button>
        `
      )
      .join("");
  },

  resolveBounds(period, availableMonths, customFrom, customTo) {
    const sortedMonths = [...availableMonths].sort();
    const first = sortedMonths[0];
    const last = sortedMonths[sortedMonths.length - 1];

    if (period === "last12") {
      return {
        start: sortedMonths[Math.max(sortedMonths.length - 12, 0)],
        end: last,
      };
    }
    if (period === "last6") {
      return {
        start: sortedMonths[Math.max(sortedMonths.length - 6, 0)],
        end: last,
      };
    }
    if (period === "last3") {
      return {
        start: sortedMonths[Math.max(sortedMonths.length - 3, 0)],
        end: last,
      };
    }
    if (period === "ytd") {
      const year = last.slice(0, 4);
      return {
        start: `${year}-01`,
        end: last,
      };
    }
    if (period === "custom") {
      const start = customFrom || first;
      const end = customTo || last;
      return start <= end ? { start, end } : { start: end, end: start };
    }
    return { start: first, end: last };
  },

  renderSummaryCards(filteredMonthly) {
    const filteredTx = this.getFilteredTransactions();
    const metrics = buildMetrics(filteredMonthly, buildCategorySummary(filteredTx));
    const overallTx = getGlobalScopedTransactions(AppState.transactions, { ignorePeriod: true });
    const overallMonthly = buildMonthlyCashflow(overallTx);
    const overall = buildMetrics(overallMonthly, buildCategorySummary(overallTx));
    const monthCount = filteredMonthly.length || 1;
    const overallMonths = overallMonthly.length || 1;
    const uncategorizedCurrent = calculateUncategorizedStats(filteredTx);
    const uncategorizedOverall = calculateUncategorizedStats(overallTx);

    const cards = [
      {
        key: "total-income",
        label: "Total Income",
        value: currency.format(metrics.total_income),
        delta: percentChange(metrics.total_income / monthCount, overall.total_income / overallMonths),
        lowerIsBetter: false,
      },
      {
        key: "total-expenses",
        label: "Total Expenses",
        value: currency.format(metrics.total_expense),
        delta: percentChange(metrics.total_expense / monthCount, overall.total_expense / overallMonths),
        lowerIsBetter: true,
      },
      {
        key: "net-position",
        label: "Net Position",
        value: currency.format(metrics.net_position),
        delta: percentChange(metrics.average_monthly_net, overall.average_monthly_net),
        lowerIsBetter: false,
        note: "Income minus expenses in the selected scope.",
      },
      {
        key: "savings-rate",
        label: "Savings Rate",
        value: formatPct(metrics.savings_rate),
        delta: metrics.savings_rate - overall.savings_rate,
        suffix: "pp vs full period",
        lowerIsBetter: false,
        note: "Calculated from in-scope income and expenses.",
      },
      {
        key: "essential-spend",
        label: "Essential Spend",
        value: currency.format(metrics.essential_annual),
        delta: percentChange(metrics.essential_annual / monthCount, overall.essential_annual / overallMonths),
        lowerIsBetter: true,
        note: "Total spent on essential categories in the selected scope.",
      },
      {
        key: "discretionary-spend",
        label: "Discretionary Spend",
        value: currency.format(metrics.discretionary_annual),
        delta: percentChange(
          metrics.discretionary_annual / monthCount,
          overall.discretionary_annual / overallMonths
        ),
        lowerIsBetter: true,
        note: "Total spent on non-essential categories in the selected scope.",
      },
      {
        key: "uncategorized-expenses",
        label: "Uncategorized Expenses",
        value: currency.format(uncategorizedCurrent.expense),
        delta: percentChange(
          uncategorizedCurrent.expense / monthCount,
          uncategorizedOverall.expense / overallMonths
        ),
        lowerIsBetter: true,
        note: `${uncategorizedCurrent.count} transactions (${formatPct(uncategorizedCurrent.ratio * 100)})`,
      },
    ];

    const container = document.getElementById("summaryCards");
    container.innerHTML = cards
      .map((card) => {
        const isPctPoint = card.suffix;
        const deltaText = isPctPoint
          ? `${card.delta >= 0 ? "+" : ""}${card.delta.toFixed(1)} ${card.suffix}`
          : `${card.delta >= 0 ? "+" : ""}${card.delta.toFixed(1)}% vs full-period monthly avg`;
        const trendClass =
          card.delta === 0
            ? ""
            : card.lowerIsBetter
            ? card.delta < 0
              ? "variance-positive"
              : "variance-negative"
            : card.delta > 0
            ? "variance-positive"
            : "variance-negative";
        return `
          <article class="summary-card">
            <h3>${escapeHtml(card.label)}</h3>
            <p class="value">${escapeHtml(card.value)}</p>
            <p class="trend ${trendClass}">${escapeHtml(deltaText)}</p>
            ${card.note ? `<p class="helper">${escapeHtml(card.note)}</p>` : ""}
            <div class="summary-card-actions">
              <button
                type="button"
                class="btn btn-ghost"
                data-summary-inspect="${escapeHtml(card.key)}"
                aria-label="${escapeHtml(`Inspect ${card.label}`)}"
              >
                Inspect
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  },

  getInspectModel() {
    const metricKey = String(AppState.overviewInspectMetric || "").trim();
    if (!metricKey) return null;

    const filteredTx = this.getFilteredTransactions();
    const filteredMonthly = buildMonthlyCashflow(filteredTx);
    const monthCount = filteredMonthly.length;
    const categorySummary = buildCategorySummary(filteredTx);
    const metrics = buildMetrics(filteredMonthly, categorySummary);
    const financialTx = filteredTx.filter(
      (tx) => includeTransactionInIncome(tx) || includeTransactionInSpending(tx)
    );
    const incomeTx = filteredTx.filter((tx) => includeTransactionInIncome(tx));
    const expenseTx = filteredTx.filter((tx) => includeTransactionInSpending(tx));
    const essentialTx = expenseTx.filter((tx) => isEssentialSpendCategory(tx.category));
    const discretionaryTx = expenseTx.filter((tx) => !isEssentialSpendCategory(tx.category));
    const uncategorizedTx = expenseTx.filter(
      (tx) => normalizeLabel(tx.category) === "uncategorized"
    );
    const uncategorizedStats = calculateUncategorizedStats(filteredTx);
    const topIncomeSource = buildTopIncomeSources(filteredTx, 1)[0]?.source || "--";
    const topExpenseCategory =
      categorySummary.filter((row) => row.expense > 0).sort((a, b) => b.expense - a.expense)[0]?.category || "--";
    const distinctCategoryCount = (transactions) =>
      new Set(
        transactions.map((tx) => String(tx.category || "Uncategorized").trim() || "Uncategorized")
      ).size;
    const sortedTransactions = (transactions) =>
      transactions
        .slice()
        .sort(
          (a, b) =>
            String(b.date || "").localeCompare(String(a.date || "")) ||
            Math.abs(toNumber(b.amount, 0)) - Math.abs(toNumber(a.amount, 0))
        );
    const avgPerMonth = (value) => (monthCount ? value / monthCount : 0);

    switch (metricKey) {
      case "total-income":
        return {
          title: "Total Income Inspection",
          meta: "Income transactions included in the current Overview scope.",
          transactions: sortedTransactions(incomeTx),
          stats: [
            { label: "Total Income", value: currency.format(metrics.total_income) },
            { label: "Transactions", value: String(incomeTx.length) },
            { label: "Average / Month", value: currency.format(avgPerMonth(metrics.total_income)) },
            { label: "Largest Source", value: topIncomeSource },
          ],
        };
      case "total-expenses":
        return {
          title: "Total Expenses Inspection",
          meta: "Expense transactions included in the current Overview scope. Transfers are excluded.",
          transactions: sortedTransactions(expenseTx),
          stats: [
            { label: "Total Expenses", value: currency.format(metrics.total_expense) },
            { label: "Transactions", value: String(expenseTx.length) },
            { label: "Average / Month", value: currency.format(avgPerMonth(metrics.total_expense)) },
            { label: "Largest Category", value: topExpenseCategory },
          ],
        };
      case "net-position":
        return {
          title: "Net Position Inspection",
          meta: "Net Position is total income minus total expenses for the current Overview scope.",
          transactions: sortedTransactions(financialTx),
          stats: [
            { label: "Total Income", value: currency.format(metrics.total_income) },
            { label: "Total Expenses", value: currency.format(metrics.total_expense) },
            {
              label: "Net Position",
              value: currency.format(metrics.net_position),
              className: metrics.net_position >= 0 ? "variance-positive" : "variance-negative",
            },
            { label: "Average Net / Month", value: currency.format(avgPerMonth(metrics.net_position)) },
          ],
        };
      case "savings-rate":
        return {
          title: "Savings Rate Inspection",
          meta: "Savings Rate is net position divided by total income for the current Overview scope.",
          transactions: sortedTransactions(financialTx),
          stats: [
            { label: "Savings Rate", value: formatPct(metrics.savings_rate) },
            { label: "Net Position", value: currency.format(metrics.net_position) },
            { label: "Total Income", value: currency.format(metrics.total_income) },
            { label: "Total Expenses", value: currency.format(metrics.total_expense) },
          ],
        };
      case "essential-spend":
        return {
          title: "Essential Spend Inspection",
          meta: "Expense transactions in the essential category set used by the Overview cards.",
          transactions: sortedTransactions(essentialTx),
          stats: [
            { label: "Essential Spend", value: currency.format(metrics.essential_annual) },
            { label: "Transactions", value: String(essentialTx.length) },
            { label: "Average / Month", value: currency.format(avgPerMonth(metrics.essential_annual)) },
            { label: "Categories", value: String(distinctCategoryCount(essentialTx)) },
          ],
        };
      case "discretionary-spend":
        return {
          title: "Discretionary Spend Inspection",
          meta: "Expense transactions outside the essential category set used by the Overview cards.",
          transactions: sortedTransactions(discretionaryTx),
          stats: [
            { label: "Discretionary Spend", value: currency.format(metrics.discretionary_annual) },
            { label: "Transactions", value: String(discretionaryTx.length) },
            {
              label: "Average / Month",
              value: currency.format(avgPerMonth(metrics.discretionary_annual)),
            },
            { label: "Categories", value: String(distinctCategoryCount(discretionaryTx)) },
          ],
        };
      case "uncategorized-expenses":
        return {
          title: "Uncategorized Expense Inspection",
          meta: "Expense transactions still labeled Uncategorized in the current Overview scope.",
          transactions: sortedTransactions(uncategorizedTx),
          stats: [
            { label: "Uncategorized Spend", value: currency.format(uncategorizedStats.expense) },
            { label: "Transactions", value: String(uncategorizedStats.count) },
            { label: "Average / Month", value: currency.format(avgPerMonth(uncategorizedStats.expense)) },
            { label: "Share of Expenses", value: formatPct(uncategorizedStats.ratio * 100) },
          ],
        };
      default:
        return null;
    }
  },

  renderInspectPanel() {
    const panel = document.getElementById("overviewInspectPanel");
    const title = document.getElementById("overviewInspectTitle");
    const meta = document.getElementById("overviewInspectMeta");
    const stats = document.getElementById("overviewInspectStats");
    const tbody = document.querySelector("#overviewInspectTable tbody");
    if (!(panel && title && meta && stats && tbody)) return;

    const model = this.getInspectModel();
    if (!model) {
      panel.classList.add("is-hidden");
      title.textContent = "Overview Inspection";
      meta.textContent = "Select Inspect on a summary card to review the transactions behind that metric.";
      stats.innerHTML = "";
      tbody.innerHTML = `<tr><td colspan="6">Select Inspect on a summary card to review contributing transactions.</td></tr>`;
      return;
    }

    const visibleTransactions = model.transactions.slice(0, 200);
    const suffix =
      model.transactions.length > visibleTransactions.length
        ? ` Showing latest ${visibleTransactions.length} of ${model.transactions.length} matching transactions.`
        : ` ${model.transactions.length} matching transactions in scope.`;

    title.textContent = model.title;
    meta.textContent = `${model.meta}${suffix}`;
    stats.innerHTML = model.stats
      .map((stat) => {
        const valueClass = stat.className ? ` class="${escapeHtml(stat.className)}"` : "";
        return `
          <article class="detail-pill">
            <p class="helper">${escapeHtml(stat.label)}</p>
            <strong${valueClass}>${escapeHtml(stat.value)}</strong>
          </article>
        `;
      })
      .join("");

    tbody.innerHTML = visibleTransactions.length
      ? visibleTransactions
          .map((tx) => {
            const amount = toNumber(tx.amount, 0);
            const amountClass = amount >= 0 ? "variance-positive" : "variance-negative";
            return `
              <tr>
                <td>${escapeHtml(formatDate(tx.date))}</td>
                <td>${escapeHtml(tx.description)}</td>
                <td>${escapeHtml(tx.category || "Uncategorized")}</td>
                <td>${escapeHtml(tx.subcategory || "Other")}</td>
                <td>${escapeHtml(tx.account || "--")}</td>
                <td class="align-right ${amountClass}">${escapeHtml(currencyPrecise.format(amount))}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="6">No matching transactions in the current Overview scope.</td></tr>`;

    panel.classList.remove("is-hidden");
  },

  renderTrendChart(filteredMonthly) {
    const labels = filteredMonthly.map((m) => formatMonth(m.month));
    const datasets = [];
    const showIncome = document.getElementById("showIncome")?.checked;
    const showExpenses = document.getElementById("showExpenses")?.checked;
    const showNet = document.getElementById("showNet")?.checked;

    if (showIncome) {
      datasets.push({
        label: "Income",
        data: filteredMonthly.map((m) => m.income),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.18)",
        pointRadius: 2,
        tension: 0.25,
      });
    }
    if (showExpenses) {
      datasets.push({
        label: "Expenses",
        data: filteredMonthly.map((m) => m.expenses),
        borderColor: "#d97706",
        backgroundColor: "rgba(217, 119, 6, 0.12)",
        pointRadius: 2,
        tension: 0.25,
      });
    }
    if (showNet) {
      datasets.push({
        label: "Net",
        data: filteredMonthly.map((m) => m.net),
        borderColor: "#2f4858",
        backgroundColor: "rgba(47, 72, 88, 0.12)",
        pointRadius: 2,
        tension: 0.25,
      });
    }

    ChartManager.set("monthlyTrendChart", {
      type: "line",
      data: { labels, datasets },
      options: {
        plugins: { legend: { position: "top" } },
      },
    });
  },

  renderCategoryVisuals(filteredTx) {
    const expenseByCategory = new Map();
    filteredTx
      .filter((tx) => includeTransactionInSpending(tx))
      .forEach((tx) => {
        expenseByCategory.set(
          tx.category,
          (expenseByCategory.get(tx.category) || 0) + Math.abs(tx.amount)
        );
      });

    const sorted = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 8);
    const labels = top.map((item) => item[0]);
    const values = top.map((item) => item[1]);

    const chartData = values.length ? values : [1];
    const chartLabels = labels.length ? labels : ["No expense data in selected period"];

    ChartManager.set("categoryPieChart", {
      type: "doughnut",
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartData,
            backgroundColor: [
              "#0f766e",
              "#d97706",
              "#457b9d",
              "#588157",
              "#bc6c25",
              "#6d597a",
              "#9b2226",
              "#2a9d8f",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        scales: undefined,
        plugins: { legend: { position: "right" } },
      },
    });

    const totalExpense = sum(values);
    const barContainer = document.getElementById("categoryBars");
    if (!barContainer) return;

    if (!top.length) {
      barContainer.innerHTML = `<p class="helper">No expense data available for this period.</p>`;
      return;
    }

    barContainer.innerHTML = top
      .map(([category, amount]) => {
        const width = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
        return `
          <article class="bar-item" data-category="${escapeHtml(category)}">
            <div class="bar-label">
              <span>${escapeHtml(category)}</span>
              <strong>${escapeHtml(currency.format(amount))}</strong>
            </div>
            <div class="bar-visual"><span style="width: ${width.toFixed(1)}%"></span></div>
          </article>
        `;
      })
      .join("");
  },

  renderTopLists(filteredTx) {
    const merchantList = document.getElementById("merchantList");
    const incomeList = document.getElementById("incomeList");
    if (!merchantList || !incomeList) return;

    const merchants = buildTopMerchants(filteredTx, 6);
    const incomes = buildTopIncomeSources(filteredTx, 6);

    merchantList.innerHTML = merchants.length
      ? merchants
          .map(
            (item) =>
              `<li><span>${escapeHtml(item.merchant)}</span><strong>${escapeHtml(
                currency.format(item.total)
              )}</strong></li>`
          )
          .join("")
      : `<li><span>No expense merchants in this period.</span><strong>--</strong></li>`;

    incomeList.innerHTML = incomes.length
      ? incomes
          .map(
            (item) =>
              `<li><span>${escapeHtml(item.source)}</span><strong>${escapeHtml(
                currency.format(item.total)
              )}</strong></li>`
          )
          .join("")
      : `<li><span>No income sources in this period.</span><strong>--</strong></li>`;
  },

  renderAirbnbSummary() {
    const container = document.getElementById("airbnbSummary");
    const section = document.getElementById("airbnbOverviewSection");
    if (!container) return;
    const summary = AppState.airbnbSummary;
    if (!summary) {
      section?.classList.add("is-hidden");
      return;
    }

    const revenue = toNumber(summary.total_revenue, toNumber(summary.income, 0));
    const expenses = toNumber(summary.total_expenses, toNumber(summary.expenses, 0));
    const netProfit = toNumber(summary.net_profit, toNumber(summary.net, revenue - expenses));
    const profitMargin = toNumber(summary.profit_margin, revenue > 0 ? (netProfit / revenue) * 100 : 0);
    const hasActivity = revenue > 0 || expenses > 0;

    if (!hasActivity) {
      section?.classList.add("is-hidden");
      return;
    }
    section?.classList.remove("is-hidden");

    const cards = [
      ["Revenue", revenue],
      ["Expenses", expenses],
      ["Net Profit", netProfit],
      ["Profit Margin", profitMargin, "%"],
    ];

    container.innerHTML = cards
      .map(([label, value, suffix]) => {
        const isPercent = suffix === "%";
        const formatted = isPercent ? formatPct(value) : currency.format(value);
        const cls =
          label === "Expenses"
            ? "variance-negative"
            : label === "Net Profit" && value < 0
            ? "variance-negative"
            : label === "Net Profit"
            ? "variance-positive"
            : "";
        return `
          <article class="airbnb-card">
            <h3>${escapeHtml(label)}</h3>
            <p class="value ${cls}">${escapeHtml(formatted)}</p>
          </article>
        `;
      })
      .join("");
  },

  render() {
    this.syncCustomDateInputs();
    this.renderAccountOptions();
    const filteredTx = this.getFilteredTransactions();
    const filteredMonthly = buildMonthlyCashflow(filteredTx);
    this.renderNarrativeSummary(filteredTx, filteredMonthly);
    this.renderSummaryCards(filteredMonthly);
    this.renderInspectPanel();
    this.renderTrendChart(filteredMonthly);
    this.renderCategoryVisuals(filteredTx);
    this.renderTopLists(filteredTx);
    this.renderAirbnbSummary();
  },
};

function buildTransactionExplorerInspectModel(transactions = [], metricKey = "") {
  const normalizedMetric = String(metricKey || "").trim();
  if (!normalizedMetric) return null;

  const rows = Array.isArray(transactions) ? transactions : [];
  const sortTransactions = (items = []) =>
    items
      .slice()
      .sort(
        (a, b) =>
          String(b?.date || "").localeCompare(String(a?.date || "")) ||
          Math.abs(toNumber(b?.amount, 0)) - Math.abs(toNumber(a?.amount, 0))
      );
  const countDistinct = (items = [], selector) =>
    new Set((Array.isArray(items) ? items : []).map(selector).filter(Boolean)).size;
  const formatDateRange = (items = []) => {
    const dates = [...new Set((Array.isArray(items) ? items : []).map((tx) => String(tx?.date || "").trim()).filter(Boolean))].sort();
    if (!dates.length) return "--";
    if (dates[0] === dates[dates.length - 1]) return formatDate(dates[0]);
    return `${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])}`;
  };
  const average = (total, count) => (count > 0 ? total / count : 0);
  const sumAbsolute = (items = []) => sum((Array.isArray(items) ? items : []).map((tx) => Math.abs(toNumber(tx?.amount, 0))));

  const allRows = sortTransactions(rows);
  const incomeRows = sortTransactions(rows.filter((tx) => includeTransactionInIncome(tx)));
  const spendingRows = sortTransactions(rows.filter((tx) => includeTransactionInSpending(tx)));
  const operatingRows = sortTransactions([...incomeRows, ...spendingRows]);
  const mortgageRows = sortTransactions(rows.filter((tx) => isMortgagePrincipalTransaction(tx)));
  const transferRows = rows.filter((tx) => isMatchedInternalTransfer(tx));

  const operatingIncome = sum(incomeRows.map((tx) => toNumber(tx.amount, 0)));
  const operatingExpense = sum(spendingRows.map((tx) => Math.abs(toNumber(tx.amount, 0))));
  const operatingNet = sum(operatingRows.map((tx) => toNumber(tx.amount, 0)));
  const bankNet = sum(rows.map((tx) => toNumber(tx.amount, 0)));
  const bankCredits = sum(rows.filter((tx) => toNumber(tx.amount, 0) > 0).map((tx) => toNumber(tx.amount, 0)));
  const bankDebits = sum(rows.filter((tx) => toNumber(tx.amount, 0) < 0).map((tx) => Math.abs(toNumber(tx.amount, 0))));
  const mortgagePaid = sumAbsolute(mortgageRows);
  const mortgageBasePaid = sum(
    mortgageRows
      .filter((tx) => ["mortgage loan", "mortgage base"].includes(normalizeLabel(tx?.subcategory || "")))
      .map((tx) => Math.abs(toNumber(tx.amount, 0)))
  );
  const mortgageExtraPaid = sum(
    mortgageRows
      .filter((tx) => ["mortgage extra", "mortgage additional lump"].includes(normalizeLabel(tx?.subcategory || "")))
      .map((tx) => Math.abs(toNumber(tx.amount, 0)))
  );

  switch (normalizedMetric) {
    case "filtered-count":
      return {
        title: "Filtered Transactions Inspection",
        meta: "All transactions currently matching the Transaction Explorer filters.",
        transactions: allRows,
        stats: [
          { label: "Transactions", value: String(allRows.length) },
          { label: "Accounts", value: String(countDistinct(allRows, (tx) => String(tx.account || "--").trim() || "--")) },
          { label: "Date Range", value: formatDateRange(allRows) },
          {
            label: "Net Cash Movement",
            value: currency.format(bankNet),
            className: bankNet >= 0 ? "variance-positive" : "variance-negative",
          },
        ],
      };
    case "operating-net":
      return {
        title: "Money Left After Spending Inspection",
        meta: "Operating net uses only rows counted as income or spending. Internal transfers are excluded.",
        transactions: operatingRows,
        stats: [
          {
            label: "Money Left After Spending",
            value: currency.format(operatingNet),
            className: operatingNet >= 0 ? "variance-positive" : "variance-negative",
          },
          { label: "Income Included", value: currency.format(operatingIncome) },
          { label: "Spending Included", value: currency.format(operatingExpense) },
          { label: "Contributing Transactions", value: String(operatingRows.length) },
        ],
      };
    case "bank-net":
      return {
        title: "Net Cash Movement Inspection",
        meta: "Net cash movement uses every filtered row, including transfers and loan-account movements.",
        transactions: allRows,
        stats: [
          {
            label: "Net Cash Movement",
            value: currency.format(bankNet),
            className: bankNet >= 0 ? "variance-positive" : "variance-negative",
          },
          { label: "Total Credits", value: currency.format(bankCredits) },
          { label: "Total Debits", value: currency.format(bankDebits) },
          { label: "Visible Transfer Rows", value: String(transferRows.length) },
        ],
      };
    case "income":
      return {
        title: "Total Income Inspection",
        meta: "Transactions currently counted as income in the Transaction Explorer filter scope.",
        transactions: incomeRows,
        stats: [
          { label: "Total Income", value: currency.format(operatingIncome) },
          { label: "Transactions", value: String(incomeRows.length) },
          { label: "Average / Tx", value: currency.format(average(operatingIncome, incomeRows.length)) },
          { label: "Accounts", value: String(countDistinct(incomeRows, (tx) => String(tx.account || "--").trim() || "--")) },
        ],
      };
    case "spending":
      return {
        title: "Total Spending Inspection",
        meta: "Transactions currently counted as spending in the Transaction Explorer filter scope. Transfers are excluded.",
        transactions: spendingRows,
        stats: [
          { label: "Total Spending", value: currency.format(operatingExpense) },
          { label: "Transactions", value: String(spendingRows.length) },
          { label: "Average / Tx", value: currency.format(average(operatingExpense, spendingRows.length)) },
          {
            label: "Categories",
            value: String(countDistinct(spendingRows, (tx) => String(tx.category || "Uncategorized").trim() || "Uncategorized")),
          },
        ],
      };
    case "mortgage-principal":
      return {
        title: "Mortgage Principal Inspection",
        meta: "Rows flagged as mortgage principal in the current Transaction Explorer filter scope.",
        transactions: mortgageRows,
        stats: [
          { label: "Mortgage Principal Paid", value: currency.format(mortgagePaid), className: "variance-positive" },
          { label: "Transactions", value: String(mortgageRows.length) },
          { label: "Base / Standard", value: currency.format(mortgageBasePaid) },
          { label: "Extra / Lump", value: currency.format(mortgageExtraPaid) },
        ],
      };
    default:
      return null;
  }
}

const TransactionsController = {
  init() {
    const inputs = [
      "transactionSearch",
      "transactionCategory",
      "transactionSubcategory",
      "transactionSubscription",
      "transactionType",
      "transactionDateFrom",
      "transactionDateTo",
      "transactionSort",
    ];

    inputs.forEach((id) => {
      document.getElementById(id)?.addEventListener("input", () => {
        this.syncFilters();
        AppState.transactionFilters.page = 1;
        this.render();
      });
      document.getElementById(id)?.addEventListener("change", () => {
        this.syncFilters();
        AppState.transactionFilters.page = 1;
        this.render();
      });
    });

    document.getElementById("clearFilters")?.addEventListener("click", () => {
      AppState.transactionFilters = {
        ...AppState.transactionFilters,
        search: "",
        category: "all",
        subcategory: "all",
        subscription: "all",
        account: AppState.globalAccountScope || "all",
        type: "all",
        dateFrom: "",
        dateTo: "",
        sort: "date-desc",
        page: 1,
      };
      document.getElementById("transactionSearch").value = "";
      document.getElementById("transactionCategory").value = "all";
      document.getElementById("transactionSubcategory").value = "all";
      document.getElementById("transactionSubscription").value = "all";
      App.setGlobalAccountScope("all", { source: "transactions_clear", render: false, recompute: false });
      document.getElementById("transactionAccount").value = "all";
      document.getElementById("transactionType").value = "all";
      document.getElementById("transactionDateFrom").value = "";
      document.getElementById("transactionDateTo").value = "";
      document.getElementById("transactionSort").value = "date-desc";
      App.renderAll();
    });

    document.getElementById("transactionAccount")?.addEventListener("change", (event) => {
      const selectedAccount = String(event?.target?.value || "all");
      AppState.transactionFilters.account = selectedAccount;
      AppState.transactionFilters.category = "all";
      AppState.transactionFilters.subcategory = "all";
      const category = document.getElementById("transactionCategory");
      if (category) category.value = "all";
      const subcategory = document.getElementById("transactionSubcategory");
      if (subcategory) subcategory.value = "all";
      AppState.transactionFilters.page = 1;
      App.setGlobalAccountScope(selectedAccount, { source: "transactions" });
    });

    document.getElementById("prevPage")?.addEventListener("click", () => {
      if (AppState.transactionFilters.page > 1) {
        AppState.transactionFilters.page -= 1;
        this.render();
      }
    });

    document.getElementById("nextPage")?.addEventListener("click", () => {
      AppState.transactionFilters.page += 1;
      this.render();
    });

    document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
      const exportPrep = prepareTransactionsForExport(this.getFilteredTransactions());
      const filtered = exportPrep.transactions;
      const rows = [
        ["Date", "Description", "Category", "Subcategory", "Subscription", "Account", "Amount"],
        ...filtered.map((tx) => [
          tx.date,
          tx.description,
          tx.category,
          tx.subcategory,
          tx.isSubscription ? "Yes" : "No",
          tx.account,
          tx.amount,
        ]),
      ];
      const csv = rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
            .join(",")
        )
        .join("\n");
      downloadBlob(csv, `transactions_filtered_${fileDateStamp()}.csv`, "text/csv");
    });

    document.getElementById("transactionStatsCards")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("[data-transaction-inspect]");
      if (!button) return;

      const metricKey = String(button.getAttribute("data-transaction-inspect") || "").trim();
      if (!metricKey) return;

      AppState.transactionInspectMetric = AppState.transactionInspectMetric === metricKey ? "" : metricKey;
      this.renderInspectPanel();
      this.syncInspectButtons();
      if (AppState.transactionInspectMetric) {
        document.getElementById("transactionInspectPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    document.getElementById("closeTransactionInspect")?.addEventListener("click", () => {
      AppState.transactionInspectMetric = "";
      this.renderInspectPanel();
      this.syncInspectButtons();
    });

    document.querySelector("#transactionTable tbody")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const taxButton = target.closest("[data-tx-tax]");
      if (taxButton) {
        const txId = String(taxButton.getAttribute("data-tx-tax") || "").trim();
        if (txId) {
          TaxController.openTaxMapDialog(txId);
        }
        return;
      }
      const editButton = target.closest("[data-tx-edit]");
      if (!editButton) return;
      const txId = String(editButton.getAttribute("data-tx-edit") || "").trim();
      if (!txId) return;
      this.openEditDialog(txId);
    });

    document.getElementById("txEditCategory")?.addEventListener("change", () => {
      this.populateEditSubcategoryOptions();
    });

    document.getElementById("txEditCancel")?.addEventListener("click", () => {
      this.closeEditDialog();
    });

    document.getElementById("txEditSave")?.addEventListener("click", () => {
      this.applyEditDialog();
    });

    document.getElementById("transactionEditDialog")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        this.closeEditDialog();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const dialog = document.getElementById("transactionEditDialog");
      if (dialog && !dialog.hidden) {
        event.preventDefault();
        this.closeEditDialog();
      }
    });
  },

  updateAccountOptions() {
    const select = document.getElementById("transactionAccount");
    if (!select) return;
    const previous = normalizeAccountScope(
      AppState.globalAccountScope || AppState.transactionFilters.account || select.value || "all",
      AppState.transactions
    );
    const accounts = getAvailableAccounts();
    select.innerHTML = `
      <option value="all">All Accounts (Combined)</option>
      ${accounts.map((account) => `<option value="${escapeHtml(account)}">${escapeHtml(account)}</option>`).join("")}
    `;
    const next = accounts.includes(previous) ? previous : "all";
    select.value = next;
    AppState.transactionFilters.account = next;
    AppState.globalAccountScope = next;
  },

  syncFilters() {
    AppState.transactionFilters.search = document.getElementById("transactionSearch").value.trim();
    AppState.transactionFilters.category = document.getElementById("transactionCategory").value;
    AppState.transactionFilters.subcategory = document.getElementById("transactionSubcategory").value;
    AppState.transactionFilters.subscription = document.getElementById("transactionSubscription").value;
    const accountInput = document.getElementById("transactionAccount");
    if (accountInput) accountInput.value = AppState.globalAccountScope || "all";
    AppState.transactionFilters.account = AppState.globalAccountScope || "all";
    AppState.transactionFilters.type = document.getElementById("transactionType").value;
    AppState.transactionFilters.dateFrom = document.getElementById("transactionDateFrom").value;
    AppState.transactionFilters.dateTo = document.getElementById("transactionDateTo").value;
    AppState.transactionFilters.sort = document.getElementById("transactionSort").value;
  },

  updateFilterOptions() {
    this.updateAccountOptions();
    this.updateCategoryOptions();
    this.updateSubcategoryOptions();
  },

  updateCategoryOptions() {
    const select = document.getElementById("transactionCategory");
    if (!select) return;
    const previousValue = String(AppState.transactionFilters.category || select.value || "all");
    const categories = getTaxonomyCategories();
    select.innerHTML = `
      <option value="all">All Categories</option>
      ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
    `;
    select.value = categories.includes(previousValue) ? previousValue : "all";
    AppState.transactionFilters.category = select.value;
  },

  updateSubcategoryOptions() {
    const select = document.getElementById("transactionSubcategory");
    if (!select) return;
    const previousValue = String(AppState.transactionFilters.subcategory || select.value || "all");
    const accountScopedRows = getGlobalScopedTransactions(AppState.transactions);
    const category = String(AppState.transactionFilters.category || "all");
    const subcategories = [...new Set(
      accountScopedRows
        .filter((tx) => category === "all" || tx.category === category)
        .map((tx) => String(tx.subcategory || "Other").trim() || "Other")
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
    select.innerHTML = `
      <option value="all">All Subcategories</option>
      ${subcategories.map((subcategory) => `<option value="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</option>`).join("")}
    `;
    select.value = subcategories.includes(previousValue) ? previousValue : "all";
    AppState.transactionFilters.subcategory = select.value;
  },

  getFilteredTransactions() {
    const filter = AppState.transactionFilters;
    const search = filter.search.toLowerCase();
    let results = getGlobalScopedTransactions(AppState.transactions).filter((tx) => {
      if (filter.category !== "all" && tx.category !== filter.category) return false;
      if (filter.subcategory !== "all" && tx.subcategory !== filter.subcategory) return false;
      if (filter.subscription === "only" && !tx.isSubscription) return false;
      if (filter.subscription === "exclude" && tx.isSubscription) return false;
      if (filter.type === "income" && tx.amount <= 0) return false;
      if (filter.type === "expense" && tx.amount >= 0) return false;
      if (filter.dateFrom && tx.date < filter.dateFrom) return false;
      if (filter.dateTo && tx.date > filter.dateTo) return false;

      if (search) {
        const haystack = [
          tx.description,
          tx.category,
          tx.subcategory,
          tx.account,
          String(tx.amount),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const sort = filter.sort;
    results = [...results].sort((a, b) => {
      if (sort === "date-asc") return a.date.localeCompare(b.date);
      if (sort === "date-desc") return b.date.localeCompare(a.date);
      if (sort === "amount-asc") return Math.abs(a.amount) - Math.abs(b.amount);
      if (sort === "amount-desc") return Math.abs(b.amount) - Math.abs(a.amount);
      return 0;
    });

    return results;
  },

  syncInspectButtons() {
    document.querySelectorAll("[data-transaction-inspect]").forEach((button) => {
      const metricKey = String(button.getAttribute("data-transaction-inspect") || "").trim();
      const isActive = metricKey && metricKey === String(AppState.transactionInspectMetric || "").trim();
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  },

  getInspectModel(filtered = null) {
    const metricKey = String(AppState.transactionInspectMetric || "").trim();
    if (!metricKey) return null;
    return buildTransactionExplorerInspectModel(filtered || this.getFilteredTransactions(), metricKey);
  },

  renderInspectPanel(filtered = null) {
    const panel = document.getElementById("transactionInspectPanel");
    const title = document.getElementById("transactionInspectTitle");
    const meta = document.getElementById("transactionInspectMeta");
    const stats = document.getElementById("transactionInspectStats");
    const tbody = document.querySelector("#transactionInspectTable tbody");
    if (!(panel && title && meta && stats && tbody)) return;

    const model = this.getInspectModel(filtered);
    if (!model) {
      panel.classList.add("is-hidden");
      title.textContent = "Transaction Metric Inspection";
      meta.textContent = "Select Inspect on a summary card to review the transactions behind that metric.";
      stats.innerHTML = "";
      tbody.innerHTML = `<tr><td colspan="6">Select Inspect on a Transaction Explorer summary card to review contributing transactions.</td></tr>`;
      return;
    }

    const visibleTransactions = model.transactions.slice(0, 200);
    const suffix =
      model.transactions.length > visibleTransactions.length
        ? ` Showing latest ${visibleTransactions.length} of ${model.transactions.length} matching transactions.`
        : ` ${model.transactions.length} matching transactions in scope.`;

    title.textContent = model.title;
    meta.textContent = `${model.meta}${suffix}`;
    stats.innerHTML = model.stats
      .map((stat) => {
        const valueClass = stat.className ? ` class="${escapeHtml(stat.className)}"` : "";
        return `
          <article class="detail-pill">
            <p class="helper">${escapeHtml(stat.label)}</p>
            <strong${valueClass}>${escapeHtml(stat.value)}</strong>
          </article>
        `;
      })
      .join("");

    tbody.innerHTML = visibleTransactions.length
      ? visibleTransactions
          .map((tx) => {
            const amount = toNumber(tx.amount, 0);
            const amountClass = amount >= 0 ? "variance-positive" : "variance-negative";
            return `
              <tr>
                <td>${escapeHtml(formatDate(tx.date))}</td>
                <td>${escapeHtml(tx.description || "")}</td>
                <td>${escapeHtml(tx.category || "Uncategorized")}</td>
                <td>${escapeHtml(tx.subcategory || "Other")}</td>
                <td>${escapeHtml(tx.account || "--")}</td>
                <td class="align-right ${amountClass}">${escapeHtml(currencyPrecise.format(amount))}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="6">No matching transactions in the current Transaction Explorer scope.</td></tr>`;

    panel.classList.remove("is-hidden");
  },

  openEditDialog(txId) {
    const tx = AppState.transactions.find((row) => row.id === txId);
    const dialog = document.getElementById("transactionEditDialog");
    const title = document.getElementById("txEditTransactionTitle");
    const details = document.getElementById("txEditTransactionMeta");
    const categorySelect = document.getElementById("txEditCategory");
    if (!(tx && dialog && title && details && categorySelect)) return;

    const categories = getTaxonomyCategories();

    categorySelect.innerHTML = categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
    categorySelect.value = tx.category || categories[0] || "Uncategorized";
    this.populateEditSubcategoryOptions(tx.subcategory || "Other");

    title.textContent = tx.description || "Transaction";
    details.textContent = `${formatDate(tx.date)} | ${tx.account || "--"} | ${currencyPrecise.format(tx.amount)}`;
    dialog.dataset.txId = tx.id;
    dialog.hidden = false;
    categorySelect.focus({ preventScroll: true });
  },

  closeEditDialog() {
    const dialog = document.getElementById("transactionEditDialog");
    if (!dialog) return;
    dialog.hidden = true;
    delete dialog.dataset.txId;
  },

  populateEditSubcategoryOptions(preferred = "") {
    const categorySelect = document.getElementById("txEditCategory");
    const subSelect = document.getElementById("txEditSubcategory");
    if (!(categorySelect && subSelect)) return;

    const category = String(categorySelect.value || "").trim();
    const taxonomySubcategories = getTaxonomySubcategories(category);
    const subcategories = [...taxonomySubcategories];
    if (preferred && !subcategories.includes(preferred) && category === "Uncategorized") subcategories.unshift(preferred);
    if (!subcategories.length) subcategories.push("Other");

    subSelect.innerHTML = subcategories
      .map((subcategory) => `<option value="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</option>`)
      .join("");
    subSelect.value = subcategories.includes(preferred) ? preferred : subcategories[0];
  },

  applyEditDialog() {
    const dialog = document.getElementById("transactionEditDialog");
    const categorySelect = document.getElementById("txEditCategory");
    const subSelect = document.getElementById("txEditSubcategory");
    if (!(dialog && categorySelect && subSelect)) return;

    const txId = String(dialog.dataset.txId || "").trim();
    const tx = AppState.transactions.find((row) => row.id === txId);
    if (!tx) {
      this.closeEditDialog();
      return;
    }

    const newCategory = String(categorySelect.value || "").trim() || "Uncategorized";
    const newSubcategory = String(subSelect.value || "").trim() || "Other";
    const changed = tx.category !== newCategory || tx.subcategory !== newSubcategory;

    if (!changed) {
      this.closeEditDialog();
      UI.toast("No Change", "Category is already set to that value.", "warning");
      return;
    }

    tx.category = newCategory;
    tx.subcategory = newSubcategory;
    tx.manual_category_override = newCategory;
    tx.manual_subcategory_override = newSubcategory;
    normalizeToOfficialTaxonomy(tx);

    App.recomputeDerived();
    App.renderAll();
    App.persistNormalizedDatasetSnapshot();

    this.closeEditDialog();
    UI.toast("Transaction Updated", `${newCategory} > ${newSubcategory} applied and totals refreshed.`, "success");
  },

  renderTransferSummary(filtered = []) {
    const panel = document.getElementById("transferSummaryPanel");
    const tbody = document.querySelector("#transferSummaryTable tbody");
    const inEl = document.getElementById("transferTotalIn");
    const outEl = document.getElementById("transferTotalOut");
    const netEl = document.getElementById("transferNet");
    if (!(panel && tbody && inEl && outEl && netEl)) return;

    const transferRows = (Array.isArray(filtered) ? filtered : []).filter((tx) => isMatchedInternalTransfer(tx));

    if (!transferRows.length) {
      panel.classList.add("is-hidden");
      tbody.innerHTML = `<tr><td colspan="6">No transfer data in current filters.</td></tr>`;
      inEl.textContent = currency.format(0);
      outEl.textContent = currency.format(0);
      netEl.textContent = currency.format(0);
      netEl.classList.remove("variance-positive", "variance-negative");
      return;
    }

    panel.classList.remove("is-hidden");
    const grouped = new Map();
    transferRows.forEach((tx) => {
      const subcategory = String(tx.subcategory || "Other").trim() || "Other";
      const account = String(tx.account || "--").trim() || "--";
      const key = `${subcategory}__${account}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          subcategory,
          account,
          in: 0,
          out: 0,
          net: 0,
          transactions: 0,
        });
      }
      const row = grouped.get(key);
      const amount = toNumber(tx.amount, 0);
      if (amount >= 0) row.in += amount;
      else row.out += Math.abs(amount);
      row.net += amount;
      row.transactions += 1;
    });

    const rows = [...grouped.values()].sort(
      (a, b) =>
        Math.abs(b.net) - Math.abs(a.net) ||
        (b.in + b.out) - (a.in + a.out) ||
        a.subcategory.localeCompare(b.subcategory)
    );

    tbody.innerHTML = rows
      .map((row) => {
        const netClass = row.net >= 0 ? "variance-positive" : "variance-negative";
        return `
          <tr>
            <td>${escapeHtml(row.subcategory)}</td>
            <td>${escapeHtml(row.account)}</td>
            <td class="align-right">${escapeHtml(currencyPrecise.format(row.in))}</td>
            <td class="align-right">${escapeHtml(currencyPrecise.format(row.out))}</td>
            <td class="align-right ${netClass}">${escapeHtml(currencyPrecise.format(row.net))}</td>
            <td class="align-right">${escapeHtml(String(row.transactions))}</td>
          </tr>
        `;
      })
      .join("");

    const totalIn = sum(transferRows.filter((tx) => toNumber(tx.amount, 0) > 0).map((tx) => tx.amount));
    const totalOut = sum(transferRows.filter((tx) => toNumber(tx.amount, 0) < 0).map((tx) => Math.abs(tx.amount)));
    const net = totalIn - totalOut;
    inEl.textContent = currency.format(totalIn);
    outEl.textContent = currency.format(totalOut);
    netEl.textContent = currency.format(net);
    netEl.classList.toggle("variance-positive", net >= 0);
    netEl.classList.toggle("variance-negative", net < 0);
  },

  render() {
    this.updateFilterOptions();
    this.syncFilters();
    const filtered = this.getFilteredTransactions();
    const pageSize = AppState.transactionFilters.perPage;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    AppState.transactionFilters.page = clamp(AppState.transactionFilters.page, 1, totalPages);
    const page = AppState.transactionFilters.page;
    const start = (page - 1) * pageSize;
    const currentRows = filtered.slice(start, start + pageSize);

    const tbody = document.querySelector("#transactionTable tbody");
    if (tbody) {
      if (!currentRows.length) {
        tbody.innerHTML = `<tr><td colspan="7">No transactions match your filters.</td></tr>`;
      } else {
        tbody.innerHTML = currentRows
          .map((tx) => {
            const amountClass = tx.amount >= 0 ? "variance-positive" : "variance-negative";
            return `
              <tr>
                <td>${escapeHtml(formatDate(tx.date))}</td>
                <td>${escapeHtml(tx.description)}</td>
                <td>${escapeHtml(tx.category)}</td>
                <td>${escapeHtml(tx.subcategory)}</td>
                <td>${escapeHtml(tx.account || "--")}</td>
                <td class="align-right ${amountClass}">${escapeHtml(currencyPrecise.format(tx.amount))}</td>
                <td>
                  <div class="tx-row-actions">
                    <button type="button" class="btn btn-ghost" data-tx-edit="${escapeHtml(tx.id)}">Edit</button>
                    ${
                      includeTransactionInSpending(tx)
                        ? `<button type="button" class="btn btn-secondary" data-tx-tax="${escapeHtml(tx.id)}">Tax Map</button>`
                        : ""
                    }
                  </div>
                </td>
              </tr>
            `;
          })
          .join("");
      }
    }

    const transferRows = filtered.filter((tx) => isMatchedInternalTransfer(tx));
    const operatingIncomeRows = filtered.filter((tx) => includeTransactionInIncome(tx));
    const operatingExpenseRows = filtered.filter((tx) => includeTransactionInSpending(tx));
    const operatingRows = [...operatingIncomeRows, ...operatingExpenseRows];
    const operatingNet = sum(operatingRows.map((tx) => toNumber(tx.amount, 0)));
    const operatingIncome = sum(operatingIncomeRows.map((tx) => toNumber(tx.amount, 0)));
    const operatingExpense = sum(operatingExpenseRows.map((tx) => Math.abs(toNumber(tx.amount, 0))));
    const bankPositionNet = sum(filtered.map((tx) => toNumber(tx.amount, 0)));
    const loanTransferNet = sum(
      filtered
        .filter((tx) => isMortgagePrincipalTransaction(tx))
        .map((tx) => Math.abs(toNumber(tx.amount, 0)))
    );

    const countEl = document.getElementById("transactionCount");
    const operatingNetEl = document.getElementById("transactionTotal");
    const bankNetEl = document.getElementById("transactionBankNet");
    const incomeEl = document.getElementById("transactionIncome");
    const expenseEl = document.getElementById("transactionExpense");
    const loanNetEl = document.getElementById("transactionLoanNet");

    if (countEl) countEl.textContent = String(filtered.length);
    if (operatingNetEl) operatingNetEl.textContent = currency.format(operatingNet);
    if (bankNetEl) bankNetEl.textContent = currency.format(bankPositionNet);
    if (incomeEl) incomeEl.textContent = currency.format(operatingIncome);
    if (expenseEl) expenseEl.textContent = currency.format(operatingExpense);
    if (loanNetEl) loanNetEl.textContent = currency.format(loanTransferNet);

    [operatingNetEl, bankNetEl, loanNetEl].forEach((el) => {
      if (!el) return;
      el.classList.remove("variance-positive", "variance-negative");
    });
    if (operatingNetEl) {
      operatingNetEl.classList.toggle("variance-positive", operatingNet >= 0);
      operatingNetEl.classList.toggle("variance-negative", operatingNet < 0);
    }
    if (bankNetEl) {
      bankNetEl.classList.toggle("variance-positive", bankPositionNet >= 0);
      bankNetEl.classList.toggle("variance-negative", bankPositionNet < 0);
    }
    if (loanNetEl) {
      loanNetEl.classList.toggle("variance-positive", loanTransferNet >= 0);
      loanNetEl.classList.toggle("variance-negative", loanTransferNet < 0);
    }

    this.syncInspectButtons();
    this.renderInspectPanel(filtered);
    this.renderTransferSummary(filtered);

    document.getElementById("pageInfo").textContent = `Page ${page} of ${totalPages}`;
    document.getElementById("prevPage").disabled = page <= 1;
    document.getElementById("nextPage").disabled = page >= totalPages;
  },
};

const BudgetController = {
  init() {
    this.initCategorySelectors();
    document.getElementById("addBudgetItem")?.addEventListener("click", () => {
      const rawCategory = document.getElementById("budgetNewCategory").value.trim();
      const rawItem = document.getElementById("budgetNewItem").value.trim() || "General";
      const annualBudget = toNumber(document.getElementById("budgetNewAmount").value, NaN);

      if (!rawCategory) {
        UI.toast("Missing Category", "Provide a category before adding a budget line.", "error");
        return;
      }
      if (!Number.isFinite(annualBudget) || annualBudget <= 0) {
        UI.toast("Invalid Budget", "Enter an annual budget greater than 0. Zero-budget spend is tracked in Unbudgeted Spend.", "error");
        return;
      }

      const normalizedLine = normalizeBudgetCategoryItem(rawCategory, rawItem);
      if (!isOfficialCategory(normalizedLine.category)) {
        UI.toast("Invalid Category", "Use an official category from the list.", "error");
        return;
      }
      if (normalizeLabel(normalizedLine.category) === "transfers") {
        UI.toast("Transfer Budget Blocked", "Transfers are excluded from budget spend totals.", "warning");
        return;
      }
      const duplicate = AppState.budgetItems.find(
        (item) =>
          normalizeLabel(item.category) === normalizeLabel(normalizedLine.category) &&
          normalizeLabel(item.item) === normalizeLabel(normalizedLine.item)
      );
      if (duplicate) {
        duplicate.annual_budget = Math.max(0, annualBudget);
        UI.toast("Budget Updated", `${normalizedLine.category} > ${normalizedLine.item} already exists. Amount updated.`, "success");
        this.syncBudgetItemSuggestions();
        this.render();
        return;
      }

      AppState.budgetItems.push({
        id: createId("budget"),
        category: normalizedLine.category,
        item: normalizedLine.item,
        annual_budget: annualBudget,
        notes: "",
        seeded_actual: 0,
      });
      document.getElementById("budgetNewCategory").value = "";
      document.getElementById("budgetNewItem").value = "";
      document.getElementById("budgetNewAmount").value = "";
      this.syncBudgetItemSuggestions();
      this.render();
    });

    document.getElementById("saveBudget")?.addEventListener("click", () => {
      saveStorage(STORAGE_KEYS.budgetItems, AppState.budgetItems);
      saveStorage(STORAGE_KEYS.budgetMeta, {
        version: BUDGET_BASELINE_VERSION,
        signature: buildBudgetDataSignature(AppState.transactions),
      });
      UI.toast("Budget Saved", "Budget lines were saved to local storage.", "success");
    });

    document.getElementById("resetBudget")?.addEventListener("click", () => {
      if (!window.confirm("Rebuild budget lines from loaded transaction data? This replaces current budget lines.")) return;
      normalizeAirbnbFinancingForSet(AppState.transactions);
      AppState.budgetDefaults = generateBaselineBudgetFromActuals(AppState.transactions);
      AppState.budgetItems = normalizeBudgetItems(JSON.parse(JSON.stringify(AppState.budgetDefaults)));
      AppState.budgetDetail = null;
      saveStorage(STORAGE_KEYS.budgetItems, AppState.budgetItems);
      saveStorage(STORAGE_KEYS.budgetMeta, {
        version: BUDGET_BASELINE_VERSION,
        signature: buildBudgetDataSignature(AppState.transactions),
      });
      this.render();
      UI.toast("Budget Rebuilt", "Budget lines were rebuilt from your loaded transaction data.", "success");
    });

    document.querySelector("#budgetTable tbody")?.addEventListener("input", (event) => {
      const target = event.target;
      if (!target.matches("input[data-budget-id]")) return;
      const id = target.getAttribute("data-budget-id");
      const value = Math.max(0, toNumber(target.value, 0));
      const item = AppState.budgetItems.find((row) => row.id === id);
      if (item) {
        item.annual_budget = value;
      }
      // Auto-save edits so a refresh/restart does not lose recent changes.
      saveStorage(STORAGE_KEYS.budgetItems, AppState.budgetItems);
      saveStorage(STORAGE_KEYS.budgetMeta, {
        version: BUDGET_BASELINE_VERSION,
        signature: buildBudgetDataSignature(AppState.transactions),
      });
      this.render();
    });

    document.querySelector("#budgetTable tbody")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const inspectButton = target.closest("[data-budget-inspect]");
      if (inspectButton) {
        const id = inspectButton.getAttribute("data-budget-inspect");
        this.openDetail(id);
        document.getElementById("budgetDetailPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const removeButton = target.closest("[data-remove-id]");
      if (!removeButton) return;
      const id = removeButton.getAttribute("data-remove-id");
      AppState.budgetItems = AppState.budgetItems.filter((item) => item.id !== id);
       if (AppState.budgetDetail?.id === id) {
        AppState.budgetDetail = null;
      }
      this.render();
    });

    document.getElementById("closeBudgetDetail")?.addEventListener("click", () => {
      AppState.budgetDetail = null;
      this.renderDetailPanel();
    });

    document.getElementById("budgetUnbudgetedToggle")?.addEventListener("click", () => {
      AppState.budgetUnbudgetedExpanded = !AppState.budgetUnbudgetedExpanded;
      this.render();
    });
  },

  initCategorySelectors() {
    const categoryInput = document.getElementById("budgetNewCategory");
    const itemInput = document.getElementById("budgetNewItem");
    if (!(categoryInput && itemInput)) return;
    categoryInput.placeholder = "e.g. Housing";
    itemInput.placeholder = "e.g. Electricity";

    let categoryList = document.getElementById("budgetCategoryList");
    if (!categoryList) {
      categoryList = document.createElement("datalist");
      categoryList.id = "budgetCategoryList";
      document.body.appendChild(categoryList);
    }
    let itemList = document.getElementById("budgetItemList");
    if (!itemList) {
      itemList = document.createElement("datalist");
      itemList.id = "budgetItemList";
      document.body.appendChild(itemList);
    }

    categoryInput.setAttribute("list", "budgetCategoryList");
    itemInput.setAttribute("list", "budgetItemList");

    categoryInput.addEventListener("input", () => this.syncBudgetItemSuggestions());
    categoryInput.addEventListener("change", () => this.syncBudgetItemSuggestions());
    this.syncBudgetItemSuggestions();
  },

  syncBudgetItemSuggestions() {
    const categoryInput = document.getElementById("budgetNewCategory");
    const categoryList = document.getElementById("budgetCategoryList");
    const itemList = document.getElementById("budgetItemList");
    if (!(categoryInput && categoryList && itemList)) return;

    const categories = getTaxonomyCategories().filter((name) => normalizeLabel(name) !== "transfers");
    categoryList.innerHTML = categories
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");

    const selectedCategory = String(categoryInput.value || "").trim();
    const subcategories = getTaxonomySubcategories(selectedCategory);
    itemList.innerHTML = subcategories.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  },

  getScopedTransactions() {
    const scopedRows = getGlobalScopedTransactions(AppState.transactions, { ignorePeriod: true });
    return getFinancialYearScope(scopedRows, AppState.tax?.fyStartMonth || TAX_DEFAULT_FY_START_MONTH);
  },

  getMatchedTransactionsForItem(item) {
    const { scopedTransactions } = this.getScopedTransactions();
    const { matchedTransactions } = resolveBudgetMatches(item, scopedTransactions);
    return matchedTransactions
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getRowsWithActuals() {
    const { financialYear, scopedTransactions } = this.getScopedTransactions();
    const fractionElapsed = Math.max(0, toNumber(financialYear?.fractionElapsed, 0));
    return AppState.budgetItems.map((item) => {
      const actual = computeBudgetActual(item, scopedTransactions);
      const isIncome = normalizeLabel(item.category) === "income";
      const plannedToDate = Number((toNumber(item.annual_budget, 0) * fractionElapsed).toFixed(2));
      const variance = isIncome ? actual - plannedToDate : plannedToDate - actual;
      const percentUsed = item.annual_budget > 0 ? (actual / item.annual_budget) * 100 : Number.NaN;
      return {
        ...item,
        actual,
        plannedToDate,
        variance,
        percentUsed,
        isIncome,
      };
    });
  },

  getBudgetPresentationData() {
    const rows = this.getRowsWithActuals();
    const incomeRows = rows
      .filter((row) => row.isIncome && toNumber(row.annual_budget, 0) > 0)
      .sort((a, b) => b.annual_budget - a.annual_budget || Math.abs(b.actual) - Math.abs(a.actual));
    const expenseRows = rows
      .filter((row) => !row.isIncome && toNumber(row.annual_budget, 0) > 0)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    const plannedRows = rows
      .filter((row) => toNumber(row.annual_budget, 0) > 0)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    const unbudgetedRows = rows
      .filter((row) => !row.isIncome && toNumber(row.annual_budget, 0) <= 0 && toNumber(row.actual, 0) > 0)
      .sort((a, b) => b.actual - a.actual);
    const totalUnbudgetedActual = sum(unbudgetedRows.map((row) => row.actual));
    return {
      rows,
      incomeRows,
      expenseRows,
      plannedRows,
      unbudgetedRows,
      totalUnbudgetedActual,
    };
  },

  openDetail(id) {
    const item = AppState.budgetItems.find((row) => row.id === id);
    if (!item) return;
    AppState.budgetDetail = { id: item.id };
    this.renderDetailPanel();
  },

  renderDetailPanel() {
    const panel = document.getElementById("budgetDetailPanel");
    const title = document.getElementById("budgetDetailTitle");
    const detail = document.getElementById("budgetDetailContent");
    const tbody = document.querySelector("#budgetTransactionsTable tbody");
    if (!panel || !title || !detail || !tbody) return;

    if (!AppState.budgetDetail) {
      panel.classList.add("is-hidden");
      return;
    }

    const item = AppState.budgetItems.find((row) => row.id === AppState.budgetDetail.id);
    if (!item) {
      AppState.budgetDetail = null;
      panel.classList.add("is-hidden");
      return;
    }

    const rows = this.getRowsWithActuals();
    const row = rows.find((entry) => entry.id === item.id);
    const matched = this.getMatchedTransactionsForItem(item);
    panel.classList.remove("is-hidden");
    title.textContent = `${item.category} > ${item.item}`;

    detail.innerHTML = `
      <article class="detail-pill">
        <p class="helper">Annual Budget</p>
        <strong>${escapeHtml(currency.format(toNumber(item.annual_budget, 0)))}</strong>
      </article>
      <article class="detail-pill">
        <p class="helper">Actual (FY-to-date)</p>
        <strong>${escapeHtml(currency.format(toNumber(row?.actual, 0)))}</strong>
      </article>
      <article class="detail-pill">
        <p class="helper">Matched Transactions</p>
        <strong>${escapeHtml(String(matched.length))}</strong>
      </article>
      <article class="detail-pill">
        <p class="helper">% Used</p>
        <strong>${escapeHtml(formatPct(row?.percentUsed))}</strong>
      </article>
    `;

    tbody.innerHTML = matched.length
      ? matched
          .slice(0, 200)
          .map((tx) => {
            const amountClass = tx.amount >= 0 ? "variance-positive" : "variance-negative";
            return `
              <tr>
                <td>${escapeHtml(formatDate(tx.date))}</td>
                <td>${escapeHtml(tx.description)}</td>
                <td>${escapeHtml(tx.category)}</td>
                <td>${escapeHtml(tx.subcategory)}</td>
                <td>${escapeHtml(tx.account || "--")}</td>
                <td class="align-right ${amountClass}">${escapeHtml(currencyPrecise.format(tx.amount))}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="6">No matched transactions for this budget line in the current financial-year scope.</td></tr>`;
  },

  refreshBudgetRow(id) {
    if (!id) return;
    const row = this.getRowsWithActuals().find((item) => item.id === id);
    if (!row) return;

    const tr = document
      .querySelector(`#budgetTable tbody input[data-budget-id="${id}"]`)
      ?.closest("tr");
    if (!tr) return;

    const actualCell = tr.querySelector(".budget-actual-cell");
    const varianceCell = tr.querySelector(".budget-variance-cell");
    const percentCell = tr.querySelector(".budget-percent-cell");

    if (actualCell) {
      actualCell.textContent = currency.format(row.actual);
    }
    if (varianceCell) {
      varianceCell.textContent = currency.format(row.variance);
      varianceCell.classList.remove("variance-positive", "variance-negative");
      varianceCell.classList.add(row.variance >= 0 ? "variance-positive" : "variance-negative");
    }
    if (percentCell) {
      percentCell.textContent = formatPct(row.percentUsed);
    }
  },

  renderTotalsAndChart(presentation = null) {
    const data = presentation || this.getBudgetPresentationData();
    const incomeRows = data.incomeRows || [];
    const expenseRows = data.expenseRows || [];

    const expenseBudget = sum(expenseRows.map((row) => row.annual_budget));
    const expenseActual = sum(expenseRows.map((row) => row.actual));
    const expensePlannedToDate = sum(expenseRows.map((row) => row.plannedToDate || 0));
    const expenseVariance = expensePlannedToDate - expenseActual;
    const expensePercent = expenseBudget > 0 ? (expenseActual / expenseBudget) * 100 : 0;

    const incomeBudget = sum(incomeRows.map((row) => row.annual_budget));
    const incomeActual = sum(incomeRows.map((row) => row.actual));
    const incomePlannedToDate = sum(incomeRows.map((row) => row.plannedToDate || 0));
    const incomeVariance = incomeActual - incomePlannedToDate;
    const incomePercent = incomeBudget > 0 ? (incomeActual / incomeBudget) * 100 : 0;

    const netBudget = incomeBudget - expenseBudget;
    const netActual = incomeActual - expenseActual;
    const netPlannedToDate = incomePlannedToDate - expensePlannedToDate;
    const netVariance = netActual - netPlannedToDate;
    const netPercent = Math.abs(netBudget) > 0 ? (netActual / netBudget) * 100 : Number.NaN;

    document.getElementById("budgetExpenseBudget").textContent = currency.format(expenseBudget);
    document.getElementById("budgetExpenseActual").textContent = currency.format(expenseActual);
    const expenseVarianceCell = document.getElementById("budgetExpenseVariance");
    expenseVarianceCell.textContent = currency.format(expenseVariance);
    expenseVarianceCell.classList.remove("variance-positive", "variance-negative");
    expenseVarianceCell.classList.add(expenseVariance >= 0 ? "variance-positive" : "variance-negative");
    document.getElementById("budgetExpensePercent").textContent = formatPct(expensePercent);

    document.getElementById("budgetIncomeBudget").textContent = currency.format(incomeBudget);
    document.getElementById("budgetIncomeActual").textContent = currency.format(incomeActual);
    const incomeVarianceCell = document.getElementById("budgetIncomeVariance");
    incomeVarianceCell.textContent = currency.format(incomeVariance);
    incomeVarianceCell.classList.remove("variance-positive", "variance-negative");
    incomeVarianceCell.classList.add(incomeVariance >= 0 ? "variance-positive" : "variance-negative");
    document.getElementById("budgetIncomePercent").textContent = formatPct(incomePercent);

    document.getElementById("budgetNetBudget").textContent = currency.format(netBudget);
    document.getElementById("budgetNetActual").textContent = currency.format(netActual);
    const netVarianceCell = document.getElementById("budgetNetVariance");
    netVarianceCell.textContent = currency.format(netVariance);
    netVarianceCell.classList.remove("variance-positive", "variance-negative");
    netVarianceCell.classList.add(netVariance >= 0 ? "variance-positive" : "variance-negative");
    document.getElementById("budgetNetPercent").textContent = Number.isFinite(netPercent) ? formatPct(netPercent) : "--";

    document.getElementById("budgetTotalUnbudgeted").textContent = currency.format(data.totalUnbudgetedActual);
    this.renderCoverageHint();
    this.renderUnbudgetedRollup(data);

    const topRows = [...expenseRows]
      .sort((a, b) => b.annual_budget - a.annual_budget)
      .slice(0, 10);

    ChartManager.set("budgetProgressChart", {
      type: "bar",
      data: {
        labels: topRows.map((row) => row.item),
        datasets: [
          {
            label: "Budget",
            data: topRows.map((row) => row.annual_budget),
            backgroundColor: "rgba(15, 118, 110, 0.8)",
          },
          {
            label: "Actual",
            data: topRows.map((row) => row.actual),
            backgroundColor: "rgba(217, 119, 6, 0.8)",
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: "top" },
        },
      },
    });
  },

  renderUnbudgetedRollup(presentation = null) {
    const data = presentation || this.getBudgetPresentationData();
    const panel = document.getElementById("budgetUnbudgetedPanel");
    const toggle = document.getElementById("budgetUnbudgetedToggle");
    const tbody = document.querySelector("#budgetUnbudgetedTable tbody");
    const meta = document.getElementById("budgetUnbudgetedMeta");
    if (!(panel && toggle && tbody)) return;

    const hasRows = data.unbudgetedRows.length > 0;
    toggle.hidden = !hasRows;
    if (!hasRows) {
      panel.classList.add("is-hidden");
      AppState.budgetUnbudgetedExpanded = false;
      if (meta) {
        meta.textContent = "";
        meta.hidden = true;
      }
      tbody.innerHTML = `<tr><td colspan="3">No unbudgeted spend in the current financial-year scope.</td></tr>`;
      return;
    }

    if (meta) {
      meta.hidden = false;
      meta.textContent = `Unbudgeted spend this year: ${currency.format(data.totalUnbudgetedActual)} across ${data.unbudgetedRows.length} line(s).`;
    }
    toggle.textContent = AppState.budgetUnbudgetedExpanded ? "Hide details" : "View details";
    panel.classList.toggle("is-hidden", !AppState.budgetUnbudgetedExpanded);
    tbody.innerHTML = data.unbudgetedRows
      .map((row) => `
        <tr>
          <td>${escapeHtml(row.category)}</td>
          <td>${escapeHtml(row.item)}</td>
          <td class="align-right">${escapeHtml(currency.format(row.actual))}</td>
        </tr>
      `)
      .join("");
  },

  renderCoverageHint() {
    const hint = document.getElementById("budgetCoverageHint");
    if (!hint) return;
    const scopedRows = getGlobalScopedTransactions(AppState.transactions, { ignorePeriod: true });
    const { scopedTransactions } = getFinancialYearScope(
      scopedRows,
      AppState.tax?.fyStartMonth || TAX_DEFAULT_FY_START_MONTH
    );
    const scopedCategorySummary = buildCategorySummary(scopedTransactions);

    const mappedBudgetCategories = new Set();
    AppState.budgetItems.forEach((item) => {
      const normalizedCategory = normalizeLabel(item.category);
      if (normalizedCategory) mappedBudgetCategories.add(normalizedCategory);
      (BUDGET_CATEGORY_ALIASES[normalizedCategory] || []).forEach((alias) => {
        const normalizedAlias = normalizeLabel(alias);
        if (normalizedAlias) mappedBudgetCategories.add(normalizedAlias);
      });
      const matcher = BUDGET_LINE_MATCHERS[buildBudgetLineKey(item.category, item.item)];
      (matcher?.categoryAliases || []).forEach((alias) => {
        const normalizedAlias = normalizeLabel(alias);
        if (normalizedAlias) mappedBudgetCategories.add(normalizedAlias);
      });
    });

    const uncovered = scopedCategorySummary
      .filter((row) => row.expense > 0)
      .filter((row) => normalizeLabel(row.category) !== "transfers")
      .filter((row) => !mappedBudgetCategories.has(normalizeLabel(row.category)))
      .sort((a, b) => b.expense - a.expense)
      .slice(0, 3);

    if (!uncovered.length) {
      hint.textContent = "";
      hint.hidden = true;
      return;
    }

    hint.hidden = false;
    hint.textContent = `Missing direct budget lines: ${uncovered
      .map((row) => `${row.category} (${currency.format(row.expense)})`)
      .join(", ")}.`;
  },

  renderDiagnosticsAndSuggestions() {
    const fyMeta = document.getElementById("budgetFyMeta");
    const pills = document.getElementById("budgetDiagnosticsPills");
    const suggestionsBody = document.querySelector("#budgetSuggestionsTable tbody");
    const uncategorizedBody = document.querySelector("#budgetUncategorizedTable tbody");
    if (!(fyMeta && pills && suggestionsBody && uncategorizedBody)) return;

    const { financialYear, scopedTransactions } = this.getScopedTransactions();
    const diagnostics = buildClassificationDiagnostics(scopedTransactions);
    const suggestionPack = buildAnnualBudgetSuggestions(
      scopedTransactions,
      AppState.tax?.fyStartMonth || TAX_DEFAULT_FY_START_MONTH
    );
    AppState.classificationDiagnostics = diagnostics;
    AppState.budgetSuggestions = suggestionPack.suggestions || [];
    AppState.budgetFinancialYear = suggestionPack.financialYear || financialYear;

    const suggestionFinancialYear = suggestionPack.financialYear || financialYear;
    const accountScopeLabel =
      normalizeAccountScope(AppState.globalAccountScope, AppState.transactions) === "all"
        ? "All Accounts (Combined)"
        : AppState.globalAccountScope;
    fyMeta.textContent = suggestionFinancialYear?.label
      ? `Budget year: ${suggestionFinancialYear.label} (${formatDate(suggestionFinancialYear.start)} to ${formatDate(
          suggestionFinancialYear.latestDate || suggestionFinancialYear.end
        )}) | Account: ${accountScopeLabel}. Amounts are annual.`
      : "Budget year unavailable.";

    const hint = document.getElementById("budgetCoverageHint");
    if (hint && suggestionFinancialYear?.sourceReason) {
      hint.hidden = false;
      hint.textContent = hint.textContent
        ? `${hint.textContent} ${suggestionFinancialYear.sourceReason}`
        : suggestionFinancialYear.sourceReason;
    }

    const beforeUncategorized = diagnostics?.beforeUncategorized || { amount: 0, count: 0 };
    const afterUncategorized = diagnostics?.afterUncategorized || { amount: 0, count: 0 };
    const moved = diagnostics?.movedOutOfUncategorized || { amount: 0, count: 0 };
    const atmWithdrawals = diagnostics?.atmWithdrawalsFy || { amount: 0, count: 0 };
    pills.innerHTML = [
      ["Before Uncategorized", `${currency.format(toNumber(beforeUncategorized.amount, 0))} | ${toNumber(beforeUncategorized.count, 0)} tx`],
      ["After Uncategorized", `${currency.format(toNumber(afterUncategorized.amount, 0))} | ${toNumber(afterUncategorized.count, 0)} tx`],
      ["Moved Out Of Uncategorized", `${currency.format(toNumber(moved.amount, 0))} | ${toNumber(moved.count, 0)} tx`],
      ["Mortgage Reclassified", currency.format(toNumber(diagnostics?.reclassifiedIntoMortgage, 0))],
      ["Internal Transfers Excluded", currency.format(toNumber(diagnostics?.markedInternalTransfers, 0))],
      ["Sinking Transfers Excluded", currency.format(toNumber(diagnostics?.markedSinkingTransfers, 0))],
      ["ATM Withdrawals (FY)", `${currency.format(toNumber(atmWithdrawals.amount, 0))} | ${toNumber(atmWithdrawals.count, 0)} tx`],
    ]
      .map(
        ([label, value]) => `
          <article class="detail-pill">
            <p class="helper">${escapeHtml(label)}</p>
            <strong>${escapeHtml(value)}</strong>
          </article>
        `
      )
      .join("");

    const suggestions = (suggestionPack.suggestions || []).slice(0, 80);
    suggestionsBody.innerHTML = suggestions.length
      ? suggestions
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.category)}</td>
                <td>${escapeHtml(row.item)}</td>
                <td>${escapeHtml(getBudgetSuggestionBasisLabel(row.basis))}</td>
                <td>${escapeHtml(getBudgetSuggestionCadenceLabel(row.cadence))}</td>
                <td class="align-right">${escapeHtml(currency.format(toNumber(row.actual_to_date, 0)))}</td>
                <td class="align-right">${escapeHtml(currency.format(toNumber(row.reality_budget, 0)))}</td>
                <td class="align-right">${escapeHtml(currency.format(toNumber(row.target_budget, 0)))}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="7">No budget suggestions available for the active financial-year scope.</td></tr>`;

    const uncategorized = diagnostics?.remainingUncategorizedTop || [];
    uncategorizedBody.innerHTML = uncategorized.length
      ? uncategorized
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.canonical_description)}</td>
                <td class="align-right">${escapeHtml(String(toNumber(row.count, 0)))}</td>
                <td class="align-right">${escapeHtml(currency.format(toNumber(row.amount, 0)))}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="3">No remaining Uncategorized > Other expenses in the active financial-year scope.</td></tr>`;
  },

  render() {
    const tbody = document.querySelector("#budgetTable tbody");
    if (!tbody) return;

    // Enforce dedupe at render time so duplicate lines cannot appear in UI.
    AppState.budgetItems = normalizeBudgetItems(AppState.budgetItems);
    const plannedRows = AppState.budgetItems.filter((row) => row.annual_budget > 0);
    const presentation = this.getBudgetPresentationData();
    const rowsById = new Map(presentation.rows.map((row) => [row.id, row]));
    const incomeRows = plannedRows
      .map((row) => rowsById.get(row.id))
      .filter(Boolean)
      .filter((row) => row.isIncome)
      .sort((a, b) => b.annual_budget - a.annual_budget || Math.abs(b.actual) - Math.abs(a.actual));
    const expenseRows = plannedRows
      .map((row) => rowsById.get(row.id))
      .filter(Boolean)
      .filter((row) => !row.isIncome)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    const renderBudgetRow = (row) => {
            const varianceClass = row.variance >= 0 ? "variance-positive" : "variance-negative";
            const showAnnualWarning = row.isIncome && row.annual_budget > 0 && row.percentUsed > 300;
            const rowClass = row.isIncome ? "budget-income-row" : "";
            return `
              <tr class="${rowClass}">
                <td>${escapeHtml(row.category)}</td>
                <td>
                  <span class="budget-item-label">${escapeHtml(row.item)}</span>
                  ${
                    showAnnualWarning
                      ? '<div class="budget-line-warning">Check: this field expects an annual amount.</div>'
                      : ""
                  }
                </td>
                <td class="align-right">
                  <div class="currency-input">
                    <span class="currency-input-prefix">$</span>
                    <input
                      class="control budget-input currency-input-field"
                      type="number"
                      min="0"
                      step="50"
                      data-budget-id="${escapeHtml(row.id)}"
                      value="${escapeHtml(row.annual_budget)}"
                    />
                  </div>
                </td>
                <td class="align-right budget-actual-cell">${escapeHtml(currency.format(row.actual))}</td>
                <td class="align-right ${varianceClass} budget-variance-cell">${escapeHtml(currency.format(row.variance))}</td>
                <td class="align-right budget-percent-cell">${escapeHtml(formatPct(row.percentUsed))}</td>
                <td>
                  <div class="inline-actions compact budget-row-actions">
                    <button type="button" class="btn btn-ghost" data-budget-inspect="${escapeHtml(row.id)}">Inspect</button>
                    <button type="button" class="btn btn-ghost" data-remove-id="${escapeHtml(row.id)}">Remove</button>
                  </div>
                </td>
              </tr>
            `;
          };
    const bodyParts = [];
    if (incomeRows.length) {
      bodyParts.push('<tr class="budget-section-row budget-section-income"><td colspan="7">Income Lines</td></tr>');
      bodyParts.push(incomeRows.map((row) => renderBudgetRow(row)).join(""));
    }
    if (expenseRows.length) {
      bodyParts.push('<tr class="budget-section-row budget-section-expense"><td colspan="7">Spending Lines</td></tr>');
      bodyParts.push(expenseRows.map((row) => renderBudgetRow(row)).join(""));
    }

    tbody.innerHTML = bodyParts.length
      ? bodyParts.join("")
      : `<tr><td colspan="7">No planned budget lines. Add a line above with an annual budget greater than 0.</td></tr>`;

    this.renderTotalsAndChart(presentation);
    this.renderDetailPanel();
    this.renderDiagnosticsAndSuggestions();
    this.syncBudgetItemSuggestions();
  },
};

const StatementsController = {
  init() {
    document.getElementById("monthSelector")?.addEventListener("change", (event) => {
      AppState.selectedStatementMonth = event.target.value;
      this.render();
    });

    document.getElementById("downloadStatement")?.addEventListener("click", () => {
      if (!AppState.selectedStatementMonth) return;
      const monthData = AppState.monthlyCashflow.find(
        (row) => row.month === AppState.selectedStatementMonth
      );
      if (!monthData) return;

      const lines = [
        `Statement Snapshot - ${formatMonth(monthData.month)}`,
        `Generated: ${new Date().toLocaleString("en-AU")}`,
        "",
        `Income: ${currencyPrecise.format(monthData.income)}`,
        `Expenses: ${currencyPrecise.format(monthData.expenses)}`,
        `Net: ${currencyPrecise.format(monthData.net)}`,
        `Savings Rate: ${formatPct(monthData.income ? (monthData.net / monthData.income) * 100 : 0)}`,
      ];
      downloadBlob(lines.join("\n"), `statement_${monthData.month}.txt`, "text/plain");
    });

    document.querySelector("#cashflowTable tbody")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-month]");
      if (!button) return;
      const month = button.getAttribute("data-month");
      if (!month) return;
      AppState.selectedStatementMonth = month;
      const selector = document.getElementById("monthSelector");
      if (selector) selector.value = month;
      this.render();
      const focusAnchor = document.querySelector("#statements-view .statement-summary");
      if (focusAnchor && typeof focusAnchor.scrollIntoView === "function") {
        focusAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  },

  ensureSelectedMonth() {
    if (!AppState.monthlyCashflow.length) {
      AppState.selectedStatementMonth = "";
      return;
    }
    if (!AppState.selectedStatementMonth) {
      AppState.selectedStatementMonth = AppState.monthlyCashflow[AppState.monthlyCashflow.length - 1].month;
      return;
    }
    const exists = AppState.monthlyCashflow.some((m) => m.month === AppState.selectedStatementMonth);
    if (!exists) {
      AppState.selectedStatementMonth = AppState.monthlyCashflow[AppState.monthlyCashflow.length - 1].month;
    }
  },

  renderMonthSelector() {
    const selector = document.getElementById("monthSelector");
    if (!selector) return;
    this.ensureSelectedMonth();
    const monthsDesc = [...AppState.monthlyCashflow].sort((a, b) => b.month.localeCompare(a.month));
    selector.innerHTML = monthsDesc
      .map((row) => `<option value="${escapeHtml(row.month)}">${escapeHtml(formatMonth(row.month))}</option>`)
      .join("");
    selector.value = AppState.selectedStatementMonth || "";
  },

  renderTable() {
    const tbody = document.querySelector("#cashflowTable tbody");
    if (!tbody) return;
    const rowsDesc = [...AppState.monthlyCashflow].sort((a, b) => b.month.localeCompare(a.month));
    tbody.innerHTML = rowsDesc
      .map((row) => {
        const savingsRate = row.income > 0 ? (row.net / row.income) * 100 : 0;
        const netClass = row.net >= 0 ? "variance-positive" : "variance-negative";
        const isSelected = row.month === AppState.selectedStatementMonth;
        return `
          <tr class="${isSelected ? "active-row" : ""}">
            <td>${escapeHtml(formatMonth(row.month))}</td>
            <td class="align-right">${escapeHtml(currency.format(row.income))}</td>
            <td class="align-right">${escapeHtml(currency.format(row.expenses))}</td>
            <td class="align-right ${netClass}">${escapeHtml(currency.format(row.net))}</td>
            <td class="align-right">${escapeHtml(formatPct(savingsRate))}</td>
            <td><button type="button" class="btn btn-ghost" data-month="${escapeHtml(row.month)}">${isSelected ? "Viewing" : "View"}</button></td>
          </tr>
        `;
      })
      .join("");
  },

  renderSelectedMonthDetails() {
    const selected = AppState.monthlyCashflow.find((row) => row.month === AppState.selectedStatementMonth);
    if (!selected) return;

    const rows = AppState.monthlyCashflow;
    const idx = rows.findIndex((row) => row.month === selected.month);
    const previous = idx > 0 ? rows[idx - 1] : null;

    const incomeChange = previous ? percentChange(selected.income, previous.income) : 0;
    const expenseChange = previous ? percentChange(selected.expenses, previous.expenses) : 0;
    const netChange = previous ? percentChange(selected.net, previous.net) : 0;
    const savingsRate = selected.income > 0 ? (selected.net / selected.income) * 100 : 0;
    const prevSavingsRate =
      previous && previous.income > 0 ? (previous.net / previous.income) * 100 : 0;
    const savingsChange = savingsRate - prevSavingsRate;

    document.getElementById("statementIncome").textContent = currency.format(selected.income);
    document.getElementById("statementExpenses").textContent = currency.format(selected.expenses);
    document.getElementById("statementNet").textContent = currency.format(selected.net);
    document.getElementById("statementSavingsRate").textContent = formatPct(savingsRate);

    document.getElementById("statementIncomeChange").textContent = previous
      ? `${incomeChange >= 0 ? "+" : ""}${incomeChange.toFixed(1)}% vs previous month`
      : "No previous month";
    document.getElementById("statementExpensesChange").textContent = previous
      ? `${expenseChange >= 0 ? "+" : ""}${expenseChange.toFixed(1)}% vs previous month`
      : "No previous month";
    document.getElementById("statementNetChange").textContent = previous
      ? `${netChange >= 0 ? "+" : ""}${netChange.toFixed(1)}% vs previous month`
      : "No previous month";
    document.getElementById("statementSavingsRateChange").textContent = previous
      ? `${savingsChange >= 0 ? "+" : ""}${savingsChange.toFixed(1)} pp vs previous month`
      : "No previous month";

    const monthTx = getGlobalScopedTransactions(AppState.transactions).filter((tx) => tx.month === selected.month);
    const monthSpendTx = monthTx.filter((tx) => includeTransactionInSpending(tx));
    const expenseByCategory = new Map();
    monthSpendTx.forEach((tx) => {
      expenseByCategory.set(
        tx.category,
        (expenseByCategory.get(tx.category) || 0) + Math.abs(tx.amount)
      );
    });

    const topCategories = [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    ChartManager.set("statementCategoryChart", {
      type: "bar",
      data: {
        labels: topCategories.map((item) => item[0]),
        datasets: [
          {
            label: "Expense",
            data: topCategories.map((item) => item[1]),
            backgroundColor: "rgba(217, 119, 6, 0.82)",
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    });

    const biggestExpense = topCategories[0];
    const largestTx = [...monthTx]
      .filter((tx) => includeTransactionInSpending(tx))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
    const incomeTx = monthTx.filter((tx) => includeTransactionInIncome(tx));
    const expenseTx = monthSpendTx;
    const incomeCount = incomeTx.length;
    const expenseCount = expenseTx.length;

    const insights = [
      biggestExpense
        ? `Largest expense category: ${biggestExpense[0]} (${currency.format(biggestExpense[1])}).`
        : "No expense categories for this month.",
      largestTx
        ? `Largest single expense: ${largestTx.description} (${currency.format(Math.abs(largestTx.amount))}) on ${formatDate(
            largestTx.date
          )}.`
        : "No significant expense transactions this month.",
      `Transaction mix: ${incomeCount} income and ${expenseCount} expense transactions.`,
      savingsRate >= 20
        ? "Savings performance is above the 20% target."
        : "Savings performance is below the 20% target; review top variable categories.",
    ];
    document.getElementById("insightsList").innerHTML = insights
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");
  },

  render() {
    this.renderMonthSelector();
    this.renderSelectedMonthDetails();
    this.renderTable();
  },
};

const TaxController = {
  init() {
    document.getElementById("taxYearSelect")?.addEventListener("change", (event) => {
      AppState.tax.selectedFinancialYear = String(event.target.value || "");
      this.persistTaxState();
      this.render();
    });

    document.getElementById("taxOwnershipShare")?.addEventListener("change", (event) => {
      const share = clamp(toNumber(event.target.value, TAX_DEFAULT_OWNERSHIP_SHARE), 0, 100);
      AppState.tax.ownershipShare = share;
      this.persistTaxState();
      this.render();
    });

    document.getElementById("taxStreamView")?.addEventListener("change", (event) => {
      AppState.tax.streamView = normalizeTaxStreamView(event.target.value);
      this.persistTaxState();
      this.render();
    });

    document.getElementById("taxManualForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.addManualExpense();
    });

    document.getElementById("taxManualScope")?.addEventListener("change", () => {
      this.renderManualCategoryOptions();
    });

    document.getElementById("taxRuleScope")?.addEventListener("change", () => {
      this.renderTaxRuleCategoryOptions();
    });

    document.getElementById("taxRuleForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      this.addTaxRuleFromForm();
    });

    document.querySelector("#taxRulesTable tbody")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const removeBtn = target.closest("[data-tax-rule-delete]");
      if (!removeBtn) return;
      const ruleId = String(removeBtn.getAttribute("data-tax-rule-delete") || "").trim();
      if (!ruleId) return;
      this.removeTaxRule(ruleId);
    });

    document.querySelector("#taxCategoryTable tbody")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const inspectBtn = target.closest("[data-tax-inspect]");
      if (!inspectBtn) return;
      const payload = String(inspectBtn.getAttribute("data-tax-inspect") || "").trim();
      if (!payload) return;
      const [scopeRaw, ...categoryParts] = payload.split("::");
      const category = categoryParts.join("::").trim();
      if (!category) return;
      AppState.tax.inspectScope = normalizeTaxScope(scopeRaw || "");
      AppState.tax.inspectCategory = category;
      this.render();
      const panel = document.getElementById("taxCategoryInspectPanel");
      if (panel && typeof panel.scrollIntoView === "function") {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    document.getElementById("taxInspectClose")?.addEventListener("click", () => {
      AppState.tax.inspectScope = "";
      AppState.tax.inspectCategory = "";
      this.render();
    });

    document.querySelector("#taxUnmappedTable tbody")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const mapBtn = target.closest("[data-tax-map]");
      if (!mapBtn) return;
      const txId = String(mapBtn.getAttribute("data-tax-map") || "").trim();
      if (!txId) return;
      this.openTaxMapDialog(txId);
    });

    document.getElementById("taxRunAutoMap")?.addEventListener("click", () => {
      this.render();
      UI.toast("Tax Mapping Refreshed", "Auto-map recalculated using current rules and overrides.", "success");
    });

    document.getElementById("exportTaxForm")?.addEventListener("click", () => {
      this.exportTaxForm();
    });

    document.getElementById("taxMapScope")?.addEventListener("change", () => {
      this.renderTaxMapCategoryOptions();
    });

    document.getElementById("taxMapCancel")?.addEventListener("click", () => {
      this.closeTaxMapDialog();
    });

    document.getElementById("taxMapSave")?.addEventListener("click", () => {
      this.applyTaxMapDialog();
    });

    document.getElementById("taxMapUnmap")?.addEventListener("click", () => {
      this.unmapTaxMapDialog();
    });

    document.getElementById("taxMapDialog")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        this.closeTaxMapDialog();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const dialog = document.getElementById("taxMapDialog");
      if (dialog && !dialog.hidden) {
        event.preventDefault();
        this.closeTaxMapDialog();
      }
    });
  },

  loadFromDataset(rawTaxData = {}) {
    const rawSettingsFromData = rawTaxData?.settings && typeof rawTaxData.settings === "object" ? rawTaxData.settings : {};
    const rawSettingsFromStorage = loadStorage(STORAGE_KEYS.taxSettings, {}) || {};
    const settingsFromData = normalizeTaxSettings(rawTaxData?.settings || {});
    const settingsFromStorage = normalizeTaxSettings(rawSettingsFromStorage);
    const useDatasetSettings = rawTaxData?.settings && typeof rawTaxData.settings === "object";
    const baseSettings = useDatasetSettings ? settingsFromData : settingsFromStorage;
    const baseStreamView = normalizeTaxStreamView(
      useDatasetSettings ? rawSettingsFromData?.streamView : rawSettingsFromStorage?.streamView
    );

    const manualFromData = normalizeTaxManualExpenseRows(rawTaxData?.manual_expenses || []);
    const manualFromStorage = normalizeTaxManualExpenseRows(loadStorage(STORAGE_KEYS.taxManualExpenses, []) || []);
    const manualExpenses = Array.isArray(rawTaxData?.manual_expenses) ? manualFromData : manualFromStorage;

    const rulesFromData = normalizeTaxRuleRows(rawTaxData?.rules || []);
    const rulesFromStorage = normalizeTaxRuleRows(loadStorage(STORAGE_KEYS.taxRules, []) || []);
    const rules = Array.isArray(rawTaxData?.rules) ? rulesFromData : rulesFromStorage;

    const overridesFromData = normalizeTaxOverrideRows(rawTaxData?.overrides || []);
    const overridesFromStorage = normalizeTaxOverrideRows(loadStorage(STORAGE_KEYS.taxOverrides, []) || []);
    const overrides = Array.isArray(rawTaxData?.overrides) ? overridesFromData : overridesFromStorage;

    AppState.tax.ownershipShare = baseSettings.ownershipShare;
    AppState.tax.fyStartMonth = baseSettings.fyStartMonth;
    AppState.tax.streamView = baseStreamView;
    AppState.tax.manualExpenses = manualExpenses;
    AppState.tax.rules = rules;
    AppState.tax.overrides = overrides;
    if (AppState.tax.selectedFinancialYear) {
      AppState.tax.selectedFinancialYear = String(AppState.tax.selectedFinancialYear);
    }
  },

  getSnapshot() {
    return {
      settings: {
        ownershipShare: clamp(toNumber(AppState.tax.ownershipShare, TAX_DEFAULT_OWNERSHIP_SHARE), 0, 100),
        fyStartMonth: clamp(Math.round(toNumber(AppState.tax.fyStartMonth, TAX_DEFAULT_FY_START_MONTH)), 1, 12),
        streamView: normalizeTaxStreamView(AppState.tax.streamView),
      },
      manual_expenses: normalizeTaxManualExpenseRows(AppState.tax.manualExpenses || []),
      rules: normalizeTaxRuleRows(AppState.tax.rules || []),
      overrides: normalizeTaxOverrideRows(AppState.tax.overrides || []),
    };
  },

  persistTaxState({ syncSnapshot = true } = {}) {
    const snapshot = this.getSnapshot();
    saveStorage(STORAGE_KEYS.taxSettings, snapshot.settings);
    saveStorage(STORAGE_KEYS.taxManualExpenses, snapshot.manual_expenses);
    saveStorage(STORAGE_KEYS.taxRules, snapshot.rules);
    saveStorage(STORAGE_KEYS.taxOverrides, snapshot.overrides);
    if (AppState.rawData && typeof AppState.rawData === "object") {
      AppState.rawData.tax_data = snapshot;
    }
    if (syncSnapshot && App?.persistNormalizedDatasetSnapshot) {
      App.persistNormalizedDatasetSnapshot();
    }
  },

  normalizeOverridesToActiveTransactions() {
    AppState.tax.overrides = normalizeTaxOverrideRows(AppState.tax.overrides || []);
  },

  populateCategorySelect(scopeValue, selectEl, preferred = "") {
    if (!selectEl) return;
    const scope = normalizeTaxScope(scopeValue);
    const categories = getTaxCategoriesForScope(scope);
    const fallback = scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY;
    selectEl.innerHTML = categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
    const nextValue = categories.includes(preferred) ? preferred : fallback;
    selectEl.value = nextValue;
  },

  renderManualCategoryOptions() {
    const scopeSelect = document.getElementById("taxManualScope");
    const select = document.getElementById("taxManualCategory");
    if (!(scopeSelect && select)) return;
    this.populateCategorySelect(scopeSelect.value, select, select.value);
  },

  renderTaxRuleCategoryOptions() {
    const scopeSelect = document.getElementById("taxRuleScope");
    const select = document.getElementById("taxRuleCategory");
    if (!(scopeSelect && select)) return;
    this.populateCategorySelect(scopeSelect.value, select, select.value);
  },

  renderTaxMapCategoryOptions(preferred = "") {
    const scopeSelect = document.getElementById("taxMapScope");
    const select = document.getElementById("taxMapCategory");
    if (!(scopeSelect && select)) return;
    this.populateCategorySelect(scopeSelect.value, select, preferred || select.value);
  },

  addManualExpense() {
    const dateInput = document.getElementById("taxManualDate");
    const scopeInput = document.getElementById("taxManualScope");
    const categoryInput = document.getElementById("taxManualCategory");
    const amountInput = document.getElementById("taxManualAmount");
    const noteInput = document.getElementById("taxManualNote");
    if (!(dateInput && scopeInput && categoryInput && amountInput && noteInput)) return;

    const date = parseFlexibleDate(dateInput.value);
    const scope = normalizeTaxScope(scopeInput.value);
    const category = String(categoryInput.value || "").trim() || (scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY);
    const amount = Math.abs(toNumber(amountInput.value, 0));
    const description = String(noteInput.value || "").trim();

    if (!date || amount <= 0) {
      UI.toast("Tax Entry", "Enter a valid date and amount.", "error");
      return;
    }

    AppState.tax.manualExpenses.push({
      id: createId("taxManual"),
      scope,
      date,
      category,
      amount: Number(amount.toFixed(2)),
      description,
    });
    AppState.tax.manualExpenses = normalizeTaxManualExpenseRows(AppState.tax.manualExpenses);
    this.persistTaxState();
    this.render();
    dateInput.value = "";
    amountInput.value = "";
    noteInput.value = "";
    UI.toast("Tax Entry Added", "Manual tax expense saved.", "success");
  },

  addTaxRuleFromForm() {
    const keywordInput = document.getElementById("taxRuleKeyword");
    const scopeInput = document.getElementById("taxRuleScope");
    const categoryInput = document.getElementById("taxRuleCategory");
    const accountInput = document.getElementById("taxRuleAccount");
    const fromInput = document.getElementById("taxRuleDateFrom");
    const toInput = document.getElementById("taxRuleDateTo");
    const minInput = document.getElementById("taxRuleMinAmount");
    const maxInput = document.getElementById("taxRuleMaxAmount");
    if (!(keywordInput && scopeInput && categoryInput && accountInput && fromInput && toInput && minInput && maxInput)) return;

    const keyword = String(keywordInput.value || "").trim();
    if (!keyword) {
      UI.toast("Tax Rule", "Keyword is required.", "error");
      return;
    }

    const scope = normalizeTaxScope(scopeInput.value);
    const categories = getTaxCategoriesForScope(scope);
    const fallback = scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY;
    const category = categories.includes(String(categoryInput.value || "").trim()) ? String(categoryInput.value || "").trim() : fallback;

    const newRule = {
      id: createId("taxRule"),
      scope,
      category,
      keyword,
      account: String(accountInput.value || "").trim(),
      dateFrom: parseFlexibleDate(fromInput.value || ""),
      dateTo: parseFlexibleDate(toInput.value || ""),
      minAmount: toNumber(minInput.value, NaN),
      maxAmount: toNumber(maxInput.value, NaN),
      enabled: true,
    };

    const normalizedCandidate = normalizeTaxRuleRows([newRule])[0];
    if (!normalizedCandidate) {
      UI.toast("Tax Rule", "Rule could not be created.", "error");
      return;
    }

    const duplicate = normalizeTaxRuleRows(AppState.tax.rules || []).find((rule) => {
      return (
        rule.scope === normalizedCandidate.scope &&
        rule.category === normalizedCandidate.category &&
        rule.keywordUpper === normalizedCandidate.keywordUpper &&
        normalizeLabel(rule.account || "") === normalizeLabel(normalizedCandidate.account || "") &&
        String(rule.dateFrom || "") === String(normalizedCandidate.dateFrom || "") &&
        String(rule.dateTo || "") === String(normalizedCandidate.dateTo || "") &&
        toNumber(rule.minAmount, -1) === toNumber(normalizedCandidate.minAmount, -1) &&
        toNumber(rule.maxAmount, -1) === toNumber(normalizedCandidate.maxAmount, -1)
      );
    });
    if (duplicate) {
      UI.toast("Tax Rule", "An equivalent rule already exists.", "warning");
      return;
    }

    AppState.tax.rules = normalizeTaxRuleRows([...(AppState.tax.rules || []), newRule]);
    this.persistTaxState();
    this.render();

    keywordInput.value = "";
    accountInput.value = "";
    fromInput.value = "";
    toInput.value = "";
    minInput.value = "";
    maxInput.value = "";
    UI.toast("Tax Rule Added", "Future matching now includes this rule.", "success");
  },

  removeTaxRule(id = "") {
    if (!id) return;
    const before = (AppState.tax.rules || []).length;
    AppState.tax.rules = (AppState.tax.rules || []).filter((rule) => rule.id !== id);
    if ((AppState.tax.rules || []).length === before) return;
    this.persistTaxState();
    this.render();
    UI.toast("Tax Rule Removed", "Rule deleted.", "info");
  },

  removeManualExpense(id = "") {
    if (!id) return;
    const before = AppState.tax.manualExpenses.length;
    AppState.tax.manualExpenses = (AppState.tax.manualExpenses || []).filter((row) => row.id !== id);
    if (AppState.tax.manualExpenses.length === before) return;
    this.persistTaxState();
    this.render();
    UI.toast("Tax Entry Removed", "Manual expense removed.", "info");
  },

  bindManualTableActions() {
    const tbody = document.querySelector("#taxManualTable tbody");
    if (!tbody) return;
    tbody.querySelectorAll("[data-tax-remove-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.removeManualExpense(String(button.getAttribute("data-tax-remove-id") || ""));
      });
    });
  },

  renderYearOptions(report) {
    const select = document.getElementById("taxYearSelect");
    if (!select) return;
    const years = Array.isArray(report?.financialYears) ? report.financialYears : [];
    const selected = String(report?.selectedFinancialYear || "");
    select.innerHTML = years.length
      ? years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("")
      : `<option value="${escapeHtml(selected)}">${escapeHtml(selected || getCurrentFinancialYearLabel())}</option>`;
    select.value = selected || select.value;
  },

  buildTaxFormPreview(report) {
    const categories = (report?.categories || []).filter((row) => toNumber(row.total, 0) > 0);
    const airbnbRows = categories.filter((row) => row.scope === "airbnb");
    const generalRows = categories.filter((row) => row.scope === "general");
    const lines = [];
    lines.push(`Finance Studio Tax Records — For Review`);
    lines.push(`These are categorised records, not confirmed deductions. Check ownership, evidence and tax treatment before use.`);
    lines.push(`Financial Year: ${report.selectedFinancialYear || "--"} (${report.dateRange.start ? `${formatDate(report.dateRange.start)} to ${formatDate(report.dateRange.end)}` : "--"})`);
    lines.push(`Generated: ${dateLong.format(new Date())}`);
    lines.push("");
    lines.push(`A) Property-Related Expenses (Airbnb)`);
    if (!airbnbRows.length) lines.push(`  No mapped Airbnb expenses yet.`);
    airbnbRows.forEach((row) => {
      lines.push(`  - ${row.category}: Total ${currencyPrecise.format(row.total)} | Owner Share ${currencyPrecise.format(row.deductible)}`);
    });
    lines.push(`  Subtotal Airbnb Total: ${currencyPrecise.format(report.totals.airbnbTotal)}`);
    lines.push(`  Subtotal Airbnb Owner Share (${report.settings.ownershipShare}%): ${currencyPrecise.format(report.totals.ownerShare)}`);
    lines.push("");
    lines.push(`B) General records for review`);
    if (!generalRows.length) lines.push(`  No mapped general records yet.`);
    generalRows.forEach((row) => {
      lines.push(`  - ${row.category}: ${currencyPrecise.format(row.deductible)}`);
    });
    lines.push(`  Subtotal general records mapped for review: ${currencyPrecise.format(report.totals.generalTotal)}`);
    lines.push("");
    lines.push(`Mapped for review: ${currencyPrecise.format(report.totals.deductibleTotal)}`);
    lines.push(`Tracked Transactions: ${report.totals.transactionCount}`);
    lines.push(`Active Rules: ${(report.rules || []).length}`);
    lines.push(`Manual Overrides: ${(report.overrides || []).length}`);
    lines.push(`Unmapped Items: ${(report.unmatched || []).length}`);
    if ((report.unmatched || []).length) {
      lines.push("");
      lines.push(`Unmapped Expense List`);
      report.unmatched.slice(0, 25).forEach((row) => {
        lines.push(`  - [${row.scope === "general" ? "General" : "Airbnb"}] ${formatDate(row.date)} | ${row.description} | ${currencyPrecise.format(row.amount)}`);
      });
      if (report.unmatched.length > 25) {
        lines.push(`  ... ${report.unmatched.length - 25} more item(s).`);
      }
    }
    return lines.join("\n");
  },

  exportTaxForm() {
    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions);
    const report = AppState.tax.report || buildTaxAirbnbTrackingReport(scopedTransactions, AppState.tax);
    const fy = String(report.selectedFinancialYear || "current").replace(/[^0-9A-Za-z-]/g, "_");
    const previewText = this.buildTaxFormPreview(report);
    downloadBlob(previewText, `tax_return_preview_${fy}.txt`, "text/plain");

    const rows = [
      ["Stream", "Category", "Total", "Mapped for review", "Transactions", "Last Activity"],
      ...report.categories
        .filter((row) => toNumber(row.total, 0) > 0)
        .map((row) => [
          row.scopeLabel,
          row.category,
          Number(toNumber(row.total, 0).toFixed(2)),
          Number(toNumber(row.deductible, 0).toFixed(2)),
          toNumber(row.txCount, 0),
          row.lastDate || "",
        ]),
      [],
      ["Summary", "Total Tax Expenses", Number(toNumber(report.totals.totalExpenses, 0).toFixed(2)), "", "", ""],
      ["Summary", "Airbnb Total", Number(toNumber(report.totals.airbnbTotal, 0).toFixed(2)), "", "", ""],
      ["Summary", "General Total", Number(toNumber(report.totals.generalTotal, 0).toFixed(2)), "", "", ""],
      ["Summary", "Mapped for review", Number(toNumber(report.totals.deductibleTotal, 0).toFixed(2)), "", "", ""],
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    downloadBlob(csv, `tax_return_categories_${fy}.csv`, "text/csv");
    UI.toast("Tax Export", "Accountant preview (TXT + CSV) downloaded.", "success");
  },

  openTaxMapDialog(txId = "") {
    const tx = AppState.transactions.find((row) => row.id === txId);
    const dialog = document.getElementById("taxMapDialog");
    const meta = document.getElementById("taxMapMeta");
    const scopeSelect = document.getElementById("taxMapScope");
    const keywordInput = document.getElementById("taxMapKeyword");
    const accountInput = document.getElementById("taxMapAccount");
    const createRule = document.getElementById("taxMapCreateRule");
    if (!(tx && dialog && meta && scopeSelect && keywordInput && accountInput && createRule)) return;
    if (toNumber(tx.amount, 0) >= 0) {
      UI.toast("Tax Map", "Only expense transactions can be tax-mapped.", "warning");
      return;
    }

    const rules = normalizeTaxRuleRows(AppState.tax.rules || []);
    const normalizedOverrides = normalizeTaxOverrideRows(AppState.tax.overrides || []);
    const overrideByTxId = new Map(normalizedOverrides.map((row) => [row.txId, row]));
    const overrideBySignature = new Map(normalizedOverrides.map((row) => [row.signature, row]));
    const existing = resolveTaxMappingForTransaction(tx, rules, overrideByTxId, overrideBySignature);
    const existingMapping = existing && !existing.unmapped ? existing : null;
    const descriptionUpper = String(tx.description || "").toUpperCase();
    const normalizedCategory = normalizeLabel(tx.category || "");
    const normalizedSubcategory = normalizeLabel(tx.subcategory || "");
    const airbnbSignal = isAirbnbSignal(descriptionUpper, normalizedCategory, normalizedSubcategory, tx.property);
    const defaultScope = existingMapping?.scope || (airbnbSignal ? "airbnb" : "general");
    const defaultCategory = existingMapping?.category || (defaultScope === "airbnb" ? inferTaxAirbnbCategory(tx) : inferTaxGeneralCategory(tx));

    scopeSelect.value = defaultScope;
    this.renderTaxMapCategoryOptions(defaultCategory);
    keywordInput.value = normalizeMerchant(tx.description);
    accountInput.value = String(tx.account || "");
    createRule.checked = !Boolean(existing?.unmapped);
    meta.textContent = `${formatDate(tx.date)} | ${tx.account || "--"} | ${currencyPrecise.format(tx.amount)} | ${tx.description}${
      existing?.unmapped ? " | Currently excluded from Tax tracking" : ""
    }`;
    dialog.dataset.txId = tx.id;
    AppState.tax.mapDraftTxId = tx.id;
    dialog.hidden = false;
    document.getElementById("taxMapCategory")?.focus({ preventScroll: true });
  },

  closeTaxMapDialog() {
    const dialog = document.getElementById("taxMapDialog");
    if (!dialog) return;
    dialog.hidden = true;
    delete dialog.dataset.txId;
    AppState.tax.mapDraftTxId = "";
  },

  applyTaxMapDialog() {
    const dialog = document.getElementById("taxMapDialog");
    const scopeSelect = document.getElementById("taxMapScope");
    const categorySelect = document.getElementById("taxMapCategory");
    const keywordInput = document.getElementById("taxMapKeyword");
    const accountInput = document.getElementById("taxMapAccount");
    const createRuleInput = document.getElementById("taxMapCreateRule");
    if (!(dialog && scopeSelect && categorySelect && keywordInput && accountInput && createRuleInput)) return;

    const txId = String(dialog.dataset.txId || "").trim();
    const tx = AppState.transactions.find((row) => row.id === txId);
    if (!tx) {
      this.closeTaxMapDialog();
      return;
    }

    const scope = normalizeTaxScope(scopeSelect.value);
    const categories = getTaxCategoriesForScope(scope);
    const fallback = scope === "general" ? TAX_GENERAL_DEFAULT_CATEGORY : TAX_AIRBNB_DEFAULT_CATEGORY;
    const category = categories.includes(String(categorySelect.value || "").trim()) ? String(categorySelect.value || "").trim() : fallback;

    const nextOverride = {
      id: createId("taxOverride"),
      txId,
      signature: buildTaxTransactionSignature(tx),
      scope,
      category,
      updatedAt: new Date().toISOString(),
    };
    AppState.tax.overrides = normalizeTaxOverrideRows([...(AppState.tax.overrides || []).filter((row) => row.txId !== txId), nextOverride]);

    const createRule = Boolean(createRuleInput.checked);
    const keyword = String(keywordInput.value || "").trim();
    const account = String(accountInput.value || "").trim();
    if (createRule && keyword) {
      const candidate = normalizeTaxRuleRows([
        {
          id: createId("taxRule"),
          scope,
          category,
          keyword,
          account,
          enabled: true,
        },
      ])[0];
      if (candidate) {
        const exists = normalizeTaxRuleRows(AppState.tax.rules || []).some((rule) => {
          return (
            rule.scope === candidate.scope &&
            rule.category === candidate.category &&
            rule.keywordUpper === candidate.keywordUpper &&
            normalizeLabel(rule.account || "") === normalizeLabel(candidate.account || "")
          );
        });
        if (!exists) {
          AppState.tax.rules = normalizeTaxRuleRows([...(AppState.tax.rules || []), candidate]);
        }
      }
    }

    this.persistTaxState();
    this.render();
    this.closeTaxMapDialog();
    UI.toast("Tax Mapping Applied", "Transaction override saved and tax report updated.", "success");
  },

  unmapTaxMapDialog() {
    const dialog = document.getElementById("taxMapDialog");
    if (!dialog) return;
    const txId = String(dialog.dataset.txId || "").trim();
    const tx = AppState.transactions.find((row) => row.id === txId);
    if (!tx) {
      this.closeTaxMapDialog();
      return;
    }
    if (toNumber(tx.amount, 0) >= 0) {
      UI.toast("Tax Map", "Only expense transactions can be tax-unmapped.", "warning");
      return;
    }

    const nextOverride = {
      id: createId("taxOverride"),
      txId,
      signature: buildTaxTransactionSignature(tx),
      scope: "general",
      category: TAX_GENERAL_DEFAULT_CATEGORY,
      isUnmapped: true,
      excludeFromTax: true,
      updatedAt: new Date().toISOString(),
    };
    AppState.tax.overrides = normalizeTaxOverrideRows([
      ...(AppState.tax.overrides || []).filter((row) => row.txId !== txId),
      nextOverride,
    ]);
    this.persistTaxState();
    this.render();
    this.closeTaxMapDialog();
    UI.toast(
      "Tax Mapping Removed",
      "Transaction is now excluded from Tax tracking until you remap it.",
      "success"
    );
  },

  renderTaxRulesTable(report) {
    const tbody = document.querySelector("#taxRulesTable tbody");
    if (!tbody) return;
    const rules = normalizeTaxRuleRows(report?.rules || []);
    const expenseRows = getGlobalScopedTransactions(AppState.transactions).filter((tx) => toNumber(tx.amount, 0) < 0);
    if (!rules.length) {
      tbody.innerHTML = `<tr><td colspan="8">No tax rules yet. Add one to auto-map future transactions.</td></tr>`;
      return;
    }

    tbody.innerHTML = rules
      .map((rule) => {
        const matchCount = expenseRows.filter((tx) => taxRuleMatchesTransaction(tx, rule)).length;
        const dateWindow =
          rule.dateFrom || rule.dateTo
            ? `${rule.dateFrom ? formatDate(rule.dateFrom) : "--"} to ${rule.dateTo ? formatDate(rule.dateTo) : "--"}`
            : "--";
        const amountWindow =
          rule.minAmount !== null || rule.maxAmount !== null
            ? `${rule.minAmount !== null ? currencyPrecise.format(rule.minAmount) : "--"} to ${
                rule.maxAmount !== null ? currencyPrecise.format(rule.maxAmount) : "--"
              }`
            : "--";
        return `
          <tr>
            <td>${escapeHtml(rule.keyword)}</td>
            <td>${escapeHtml(rule.scope === "general" ? "General" : "Airbnb")}</td>
            <td>${escapeHtml(rule.category)}</td>
            <td>${escapeHtml(rule.account || "--")}</td>
            <td>${escapeHtml(dateWindow)}</td>
            <td>${escapeHtml(amountWindow)}</td>
            <td class="align-right">${escapeHtml(String(matchCount))}</td>
            <td><button class="btn btn-ghost" data-tax-rule-delete="${escapeHtml(rule.id)}">Delete</button></td>
          </tr>
        `;
      })
      .join("");
  },

  renderCategoryInspectPanel(report) {
    const panel = document.getElementById("taxCategoryInspectPanel");
    const title = document.getElementById("taxInspectTitle");
    const meta = document.getElementById("taxInspectMeta");
    const tbody = document.querySelector("#taxInspectTable tbody");
    if (!(panel && title && meta && tbody)) return;

    const scope = normalizeTaxScope(AppState.tax.inspectScope || "");
    const category = String(AppState.tax.inspectCategory || "").trim();
    if (!category) {
      panel.classList.add("is-hidden");
      tbody.innerHTML = `<tr><td colspan="6">Select a rollup row and click Inspect.</td></tr>`;
      return;
    }

    const bankRows = (report?.mappedTransactions || [])
      .filter(
        (row) =>
          normalizeTaxScope(row.scope || "") === scope &&
          String(row.category || "").trim() === category
      )
      .map((row) => ({
        date: row.date,
        description: row.description || "--",
        account: row.account || "--",
        source: row.source === "override" ? "Bank (override)" : "Bank",
        amount: toNumber(row.amount, 0),
        deductible: toNumber(row.deductible, 0),
      }));

    const ownershipShare = toNumber(report?.settings?.ownershipShare, TAX_DEFAULT_OWNERSHIP_SHARE);
    const manualRows = (report?.manualEntries || [])
      .filter(
        (row) =>
          normalizeTaxScope(row.scope || "") === scope &&
          String(row.category || "").trim() === category
      )
      .map((row) => {
        const amount = Math.abs(toNumber(row.amount, 0));
        return {
          date: row.date,
          description: row.description || "Manual entry",
          account: "--",
          source: "Manual",
          amount,
          deductible: scope === "airbnb" ? amount * (ownershipShare / 100) : amount,
        };
      });

    const rows = [...bankRows, ...manualRows].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const amountTotal = sum(rows.map((row) => toNumber(row.amount, 0)));
    const deductibleTotal = sum(rows.map((row) => toNumber(row.deductible, 0)));

    title.textContent = `${scope === "general" ? "General records for review" : "Airbnb Property"} - ${category}`;
    meta.textContent = `${rows.length} transaction(s) | Total ${currencyPrecise.format(amountTotal)} | Mapped for review ${currencyPrecise.format(deductibleTotal)}`;
    panel.classList.remove("is-hidden");

    tbody.innerHTML = rows.length
      ? rows
          .slice(0, 300)
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.date ? formatDate(row.date) : "--")}</td>
                <td>${escapeHtml(row.description || "--")}</td>
                <td>${escapeHtml(row.account || "--")}</td>
                <td>${escapeHtml(row.source || "--")}</td>
                <td class="align-right">${escapeHtml(currencyPrecise.format(row.amount))}</td>
                <td class="align-right">${escapeHtml(currencyPrecise.format(row.deductible))}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="6">No transactions found for this tax category in the selected year.</td></tr>`;
  },

  render() {
    this.normalizeOverridesToActiveTransactions();
    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions);
    AppState.tax.report = buildTaxAirbnbTrackingReport(scopedTransactions, AppState.tax);
    const report = AppState.tax.report;
    AppState.tax.rules = normalizeTaxRuleRows(report.rules || []);
    AppState.tax.overrides = normalizeTaxOverrideRows(report.overrides || []);
    AppState.tax.selectedFinancialYear = report.selectedFinancialYear;
    AppState.tax.ownershipShare = report.settings.ownershipShare;
    AppState.tax.fyStartMonth = report.settings.fyStartMonth;
    AppState.tax.streamView = normalizeTaxStreamView(AppState.tax.streamView);
    this.renderYearOptions(report);
    this.renderManualCategoryOptions();
    this.renderTaxRuleCategoryOptions();

    const ownershipInput = document.getElementById("taxOwnershipShare");
    if (ownershipInput) ownershipInput.value = String(report.settings.ownershipShare);
    const streamViewInput = document.getElementById("taxStreamView");
    if (streamViewInput) streamViewInput.value = AppState.tax.streamView;

    const fyLabel = document.getElementById("taxFyLabel");
    const fyDates = document.getElementById("taxFyDates");
    const taxTotal = document.getElementById("taxTotalExpenses");
    const taxPropertyTotal = document.getElementById("taxPropertyExpenses");
    const taxGeneralTotal = document.getElementById("taxGeneralExpenses");
    const taxShare = document.getElementById("taxOwnerShare");
    const taxTx = document.getElementById("taxTrackedTx");
    const taxCoverage = document.getElementById("taxCoverage");
    if (fyLabel) fyLabel.textContent = report.selectedFinancialYear || "--";
    if (fyDates) {
      const rangeText = report.dateRange.start ? `${formatDate(report.dateRange.start)} to ${formatDate(report.dateRange.end)}` : "--";
      fyDates.textContent = report.sourceReason ? `${rangeText} | ${report.sourceReason}` : rangeText;
    }
    if (taxTotal) taxTotal.textContent = currencyPrecise.format(report.totals.totalExpenses);
    if (taxPropertyTotal) taxPropertyTotal.textContent = currencyPrecise.format(report.totals.airbnbTotal);
    if (taxGeneralTotal) taxGeneralTotal.textContent = currencyPrecise.format(report.totals.generalTotal);
    if (taxShare) taxShare.textContent = currencyPrecise.format(report.totals.deductibleTotal);
    if (taxTx) taxTx.textContent = String(report.totals.transactionCount || 0);
    if (taxCoverage) {
      taxCoverage.textContent =
        report.unmatched.length > 0
          ? `${report.unmatched.length} expense(s) need category review`
          : "All tracked tax expenses are mapped to categories";
      taxCoverage.classList.toggle("variance-negative", report.unmatched.length > 0);
      taxCoverage.classList.toggle("variance-positive", report.unmatched.length === 0);
    }

    const streamView = normalizeTaxStreamView(AppState.tax.streamView);
    const renderCategoryRow = (row) => `
      <tr>
        <td>${escapeHtml(row.scopeLabel)}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.notes || "--")}</td>
        <td class="align-right">${escapeHtml(currencyPrecise.format(row.total))}</td>
        <td class="align-right">${escapeHtml(currencyPrecise.format(row.deductible))}</td>
        <td class="align-right">${escapeHtml(String(row.txCount || 0))}</td>
        <td>${escapeHtml(row.lastDate ? formatDate(row.lastDate) : "--")}</td>
        <td class="align-right">
          <button
            type="button"
            class="btn btn-ghost"
            data-tax-inspect="${escapeHtml(`${row.scope || "airbnb"}::${row.category || ""}`)}"
            ${toNumber(row.txCount, 0) > 0 ? "" : "disabled"}
          >
            Inspect
          </button>
        </td>
      </tr>
    `;
    const renderUnmappedRow = (row) => `
      <tr>
        <td>${escapeHtml(row.scope === "general" ? "General" : "Airbnb")}</td>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${escapeHtml(row.description || "--")}</td>
        <td>${escapeHtml(row.account || "--")}</td>
        <td class="align-right">${escapeHtml(currencyPrecise.format(row.amount))}</td>
        <td>${row.txId ? `<button class="btn btn-secondary" data-tax-map="${escapeHtml(row.txId)}">Map</button>` : "--"}</td>
      </tr>
    `;
    const renderManualRow = (row) => `
      <tr>
        <td>${escapeHtml(formatDate(row.date))}</td>
        <td>${escapeHtml(row.scope === "general" ? "General" : "Airbnb")}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.description || "--")}</td>
        <td class="align-right">${escapeHtml(currencyPrecise.format(row.amount))}</td>
        <td><button class="btn btn-ghost" data-tax-remove-id="${escapeHtml(row.id)}">Remove</button></td>
      </tr>
    `;

    const categoryBody = document.querySelector("#taxCategoryTable tbody");
    if (categoryBody) {
      categoryBody.innerHTML = buildTaxStreamScopedRows({
        rows: report.categories || [],
        streamView,
        colSpan: 8,
        renderRow: renderCategoryRow,
        emptyMessage: "No tax expenses detected for this financial year.",
        airbnbEmptyMessage: "No Airbnb tax expenses detected for this financial year.",
        generalEmptyMessage: "No General deduction expenses detected for this financial year.",
      });
    }

    this.renderCategoryInspectPanel(report);

    const unmatchedBody = document.querySelector("#taxUnmappedTable tbody");
    if (unmatchedBody) {
      unmatchedBody.innerHTML = buildTaxStreamScopedRows({
        rows: (report.unmatched || []).slice(0, 200),
        streamView,
        colSpan: 6,
        renderRow: renderUnmappedRow,
        emptyMessage: "No unmapped tax expenses.",
        airbnbEmptyMessage: "No unmapped Airbnb expenses.",
        generalEmptyMessage: "No unmapped general deduction expenses.",
      });
    }

    const manualBody = document.querySelector("#taxManualTable tbody");
    if (manualBody) {
      manualBody.innerHTML = buildTaxStreamScopedRows({
        rows: report.manualEntries || [],
        streamView,
        colSpan: 6,
        renderRow: renderManualRow,
        emptyMessage: "No manual expenses for this financial year.",
        airbnbEmptyMessage: "No manual Airbnb expenses for this financial year.",
        generalEmptyMessage: "No manual general deduction expenses for this financial year.",
      });
    }

    const preview = document.getElementById("taxFormPreview");
    if (preview) {
      preview.textContent = this.buildTaxFormPreview(report);
    }

    this.renderTaxRulesTable(report);
    this.bindManualTableActions();
  },
};

const PlanningController = {
  init() {
    document.querySelectorAll("#fortnightForm input").forEach((input) => {
      input.addEventListener("input", () => this.renderFortnight());
    });
    document.querySelectorAll("#savingsForm input").forEach((input) => {
      input.addEventListener("input", () => this.renderSavingsGoal());
    });
    document.querySelectorAll("#debtForm input").forEach((input) => {
      input.addEventListener("input", () => this.renderDebt());
    });
    document.querySelectorAll("#retirementForm input").forEach((input) => {
      input.addEventListener("input", () => this.renderRetirement());
    });

    document.getElementById("airbnbDrop")?.addEventListener("input", (event) => {
      document.getElementById("airbnbDropValue").textContent = `${event.target.value}%`;
      this.renderAirbnbBuffer();
    });

    document.getElementById("addScenario")?.addEventListener("click", () => this.addScenario());
    document.getElementById("scenarioList")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-remove-scenario]");
      if (!btn) return;
      const id = btn.getAttribute("data-remove-scenario");
      AppState.scenarios = AppState.scenarios.filter((item) => item.id !== id);
      saveStorage(STORAGE_KEYS.scenarios, AppState.scenarios);
      this.renderScenarios();
    });
  },

  seedDataDrivenDefaults() {
    const metrics = AppState.metrics;
    const months = AppState.monthlyCashflow.length || 0;
    if (!metrics || !months) return;

    const fortnightIncome = document.getElementById("fortnightIncome");
    const fortnightEssential = document.getElementById("fortnightEssential");
    const fortnightFlexible = document.getElementById("fortnightFlexible");
    const monthlyIncome = metrics.total_income / months;
    const monthlyEssential = metrics.essential_annual / months;
    const monthlyDiscretionary = metrics.discretionary_annual / months;

    const incomePerFortnight = (monthlyIncome * 12) / 26;
    const essentialPerFortnight = (monthlyEssential * 12) / 26;
    const flexiblePerFortnight = (monthlyDiscretionary * 12) / 26;

    if (fortnightIncome && !fortnightIncome.value) {
      fortnightIncome.value = incomePerFortnight.toFixed(0);
    }
    if (fortnightEssential && !fortnightEssential.value) {
      fortnightEssential.value = essentialPerFortnight.toFixed(0);
    }
    if (fortnightFlexible && !fortnightFlexible.value) {
      fortnightFlexible.value = flexiblePerFortnight.toFixed(0);
    }
  },

  toggleAirbnbPlannerCard() {
    const card = document.getElementById("airbnbPlannerCard");
    if (!card) return;
    const summary = AppState.airbnbSummary || {};
    const annualRevenue = toNumber(summary.total_revenue, toNumber(summary.income, 0));
    const annualExpenses = toNumber(summary.total_expenses, toNumber(summary.expenses, 0));
    const hasAirbnbData = annualRevenue > 0 || annualExpenses > 0;
    card.classList.toggle("is-hidden", !hasAirbnbData);
  },

  renderFortnight() {
    const income = toNumber(document.getElementById("fortnightIncome").value, 0);
    const essential = toNumber(document.getElementById("fortnightEssential").value, 0);
    const flexible = toNumber(document.getElementById("fortnightFlexible").value, 0);
    const surplus = income - essential - flexible;
    const savingsRate = income > 0 ? (surplus / income) * 100 : 0;
    const annualProjection = surplus * 26;

    const text =
      surplus >= 0
        ? `Surplus: <strong class="variance-positive">${currency.format(
            surplus
          )}</strong> per fortnight. Annualized potential: <strong>${currency.format(
            annualProjection
          )}</strong> (${formatPct(savingsRate)} savings rate).`
        : `Deficit: <strong class="variance-negative">${currency.format(
            Math.abs(surplus)
          )}</strong> per fortnight. Reduce flexible spend by ${currency.format(
            Math.abs(surplus)
          )} to break even.`;
    document.getElementById("fortnightResult").innerHTML = text;
  },

  renderSavingsGoal() {
    const goal = toNumber(document.getElementById("savingsGoal").value, 0);
    const current = toNumber(document.getElementById("savingsCurrent").value, 0);
    const monthly = toNumber(document.getElementById("savingsMonthly").value, 0);
    const annualRate = toNumber(document.getElementById("savingsInterest").value, 0) / 100;
    const monthlyRate = annualRate / 12;

    const resultEl = document.getElementById("savingsResult");
    if (goal <= 0) {
      resultEl.textContent = "Enter a goal amount to calculate timeline.";
      return;
    }
    if (current >= goal) {
      resultEl.innerHTML = `Goal already achieved with current balance of <strong>${currency.format(
        current
      )}</strong>.`;
      return;
    }
    if (monthly <= 0 && monthlyRate <= 0) {
      resultEl.textContent = "Add a monthly contribution or positive interest rate to reach the goal.";
      return;
    }

    let balance = current;
    let months = 0;
    while (balance < goal && months < 1200) {
      balance = balance * (1 + monthlyRate) + monthly;
      months += 1;
    }
    if (months >= 1200) {
      resultEl.textContent = "Goal is not reachable within 100 years at current settings.";
      return;
    }

    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const totalContributed = monthly * months;
    const interestGained = balance - current - totalContributed;
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    resultEl.innerHTML = `
      Time to goal: <strong>${years}y ${remMonths}m</strong> (target ${dateLong.format(targetDate)}).<br>
      Estimated final balance: <strong>${currency.format(balance)}</strong>.<br>
      Contributions: ${currency.format(totalContributed)}, growth: ${currency.format(interestGained)}.
    `;
  },

  simulateDebt(balance, monthlyRate, payment) {
    let months = 0;
    let interestTotal = 0;
    let remaining = balance;
    while (remaining > 0.01 && months < 2400) {
      const interest = remaining * monthlyRate;
      const principal = payment - interest;
      if (principal <= 0) return null;
      remaining -= principal;
      interestTotal += interest;
      months += 1;
    }
    if (months >= 2400) return null;
    return { months, interestTotal };
  },

  renderDebt() {
    const balance = toNumber(document.getElementById("debtBalance").value, 0);
    const annualRate = toNumber(document.getElementById("debtRate").value, 0) / 100;
    const minPayment = toNumber(document.getElementById("debtMinPayment").value, 0);
    const extraPayment = toNumber(document.getElementById("debtExtraPayment").value, 0);
    const monthlyRate = annualRate / 12;

    const resultEl = document.getElementById("debtResult");
    if (balance <= 0 || minPayment <= 0) {
      resultEl.textContent = "Enter debt balance and minimum payment.";
      return;
    }

    const base = this.simulateDebt(balance, monthlyRate, minPayment);
    const accelerated = this.simulateDebt(balance, monthlyRate, minPayment + extraPayment);
    if (!accelerated) {
      resultEl.textContent =
        "Payments are too low to reduce principal. Increase monthly payment to exceed interest.";
      return;
    }

    const monthsToPayoff = accelerated.months;
    const years = Math.floor(monthsToPayoff / 12);
    const rem = monthsToPayoff % 12;

    if (base) {
      const monthsSaved = base.months - accelerated.months;
      const interestSaved = base.interestTotal - accelerated.interestTotal;
      resultEl.innerHTML = `
        Payoff in <strong>${years}y ${rem}m</strong>.<br>
        Estimated interest: ${currency.format(accelerated.interestTotal)}.<br>
        Extra payments save <strong>${monthsSaved} months</strong> and ${currency.format(interestSaved)}.
      `;
    } else {
      resultEl.innerHTML = `
        Payoff in <strong>${years}y ${rem}m</strong> with monthly payment ${currency.format(
          minPayment + extraPayment
        )}.<br>
        Estimated interest: ${currency.format(accelerated.interestTotal)}.
      `;
    }
  },

  renderAirbnbBuffer() {
    const dropPercent = toNumber(document.getElementById("airbnbDrop").value, 10);
    const summary = AppState.airbnbSummary || {};
    const annualRevenue = toNumber(summary.total_revenue, toNumber(summary.income, 0));
    const annualExpenses = toNumber(summary.total_expenses, toNumber(summary.expenses, 0));
    if (annualRevenue <= 0 && annualExpenses <= 0) {
      document.getElementById("airbnbBuffer").textContent = "No Airbnb statement activity detected in this dataset.";
      return;
    }
    const monthlyRevenue = annualRevenue / 12;
    const monthlyShortfall = monthlyRevenue * (dropPercent / 100);
    const recommendedBuffer = monthlyShortfall * 4;

    document.getElementById("airbnbBuffer").innerHTML = `
      Estimated monthly revenue shortfall: <strong>${currency.format(monthlyShortfall)}</strong>.<br>
      Recommended reserve buffer (4 months): <strong>${currency.format(recommendedBuffer)}</strong>.
    `;
  },

  renderRetirement() {
    const current = toNumber(document.getElementById("retirementBalance").value, 0);
    const monthly = toNumber(document.getElementById("retirementContribution").value, 0);
    const years = Math.max(1, toNumber(document.getElementById("retirementYears").value, 0));
    const annualReturn = toNumber(document.getElementById("retirementReturn").value, 0) / 100;
    const monthlyRate = annualReturn / 12;
    const months = years * 12;

    let balance = current;
    for (let i = 0; i < months; i += 1) {
      balance = balance * (1 + monthlyRate) + monthly;
    }

    const contributed = current + monthly * months;
    const growth = balance - contributed;

    document.getElementById("retirementResult").innerHTML = `
      Projected retirement balance: <strong>${currency.format(balance)}</strong> in ${years} years.<br>
      Contributions: ${currency.format(contributed)}, growth contribution: ${currency.format(growth)}.
    `;
  },

  addScenario() {
    const name = document.getElementById("scenarioName").value.trim();
    const costChange = toNumber(document.getElementById("scenarioCostChange").value, NaN);
    const duration = toNumber(document.getElementById("scenarioDuration").value, NaN);
    if (!name) {
      UI.toast("Scenario Name Missing", "Provide a scenario name before adding.", "error");
      return;
    }
    if (!Number.isFinite(costChange) || !Number.isFinite(duration) || duration <= 0) {
      UI.toast("Invalid Scenario", "Cost change and duration must be valid numbers.", "error");
      return;
    }
    AppState.scenarios.push({
      id: createId("scenario"),
      name,
      costChange,
      duration: Math.round(duration),
    });
    saveStorage(STORAGE_KEYS.scenarios, AppState.scenarios);
    document.getElementById("scenarioName").value = "";
    document.getElementById("scenarioCostChange").value = "0";
    document.getElementById("scenarioDuration").value = "12";
    this.renderScenarios();
  },

  renderScenarios() {
    const list = document.getElementById("scenarioList");
    const result = document.getElementById("scenarioResult");
    if (!list || !result) return;

    if (!AppState.scenarios.length) {
      list.innerHTML = `<p class="helper">No saved scenarios yet.</p>`;
      result.textContent = "Add scenarios to compare long-term impact.";
      return;
    }

    list.innerHTML = AppState.scenarios
      .map((scenario) => {
        const totalImpact = scenario.costChange * scenario.duration;
        const impactClass = totalImpact <= 0 ? "variance-positive" : "variance-negative";
        return `
          <article class="scenario-item">
            <div>
              <strong>${escapeHtml(scenario.name)}</strong><br>
              <span class="${impactClass}">
                ${escapeHtml(currency.format(scenario.costChange))}/month for ${scenario.duration} months
                (${escapeHtml(currency.format(totalImpact))} total)
              </span>
            </div>
            <button class="btn btn-ghost" data-remove-scenario="${escapeHtml(scenario.id)}">Remove</button>
          </article>
        `;
      })
      .join("");

    const monthlyStack = sum(AppState.scenarios.map((scenario) => scenario.costChange));
    const firstYearImpact = sum(
      AppState.scenarios.map((scenario) => scenario.costChange * Math.min(12, scenario.duration))
    );
    const monthlyClass = monthlyStack <= 0 ? "variance-positive" : "variance-negative";
    result.innerHTML = `
      Combined monthly impact: <strong class="${monthlyClass}">${escapeHtml(
      currency.format(monthlyStack)
    )}</strong>.<br>
      First-year impact across active scenarios: <strong>${escapeHtml(
      currency.format(firstYearImpact)
    )}</strong>.
    `;
  },

  render() {
    this.seedDataDrivenDefaults();
    this.toggleAirbnbPlannerCard();
    this.renderFortnight();
    this.renderSavingsGoal();
    this.renderDebt();
    this.renderAirbnbBuffer();
    this.renderRetirement();
    this.renderScenarios();
  },
};

const CategoryController = {
  init() {
    ["categoryFilter", "categoryTypeFilter", "categoryPeriodFilter"].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", () => {
        this.syncFilters();
        this.render();
      });
    });

    document.getElementById("categorySummaryGrid")?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-category]");
      if (!card) return;
      const category = card.getAttribute("data-category");
      if (!category) return;
      AppState.categoryFilters.category = category;
      document.getElementById("categoryFilter").value = category;
      this.render();
    });

    document.querySelector("#categoryBreakdownTable tbody")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("[data-open-detail]");
      if (!button) return;
      const category = button.getAttribute("data-category");
      const subcategory = button.getAttribute("data-subcategory");
      this.openDetail(category, subcategory);
      document.getElementById("categoryDetailPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("closeCategoryDetail")?.addEventListener("click", () => {
      document.getElementById("categoryDetailPanel").classList.add("is-hidden");
      AppState.categoryDetail = null;
      AppState.selectedCategoryTransactions.clear();
    });

    document.getElementById("selectAllCategoryTx")?.addEventListener("change", (event) => {
      const checked = event.target.checked;
      document
        .querySelectorAll("#categoryTransactionsTable tbody input[type='checkbox'][data-tx-id]")
        .forEach((input) => {
          input.checked = checked;
          const txId = input.getAttribute("data-tx-id");
          if (checked) AppState.selectedCategoryTransactions.add(txId);
          else AppState.selectedCategoryTransactions.delete(txId);
        });
    });

    document.querySelector("#categoryTransactionsTable tbody")?.addEventListener("change", (event) => {
      const checkbox = event.target.closest("input[type='checkbox'][data-tx-id]");
      if (!checkbox) return;
      const txId = checkbox.getAttribute("data-tx-id");
      if (checkbox.checked) AppState.selectedCategoryTransactions.add(txId);
      else AppState.selectedCategoryTransactions.delete(txId);
    });

    document.getElementById("bulkMoveCategory")?.addEventListener("change", () => {
      this.populateBulkSubcategories();
    });

    document.getElementById("applyBulkMove")?.addEventListener("click", () => {
      this.applyBulkMove();
    });

    document.getElementById("exportCategories")?.addEventListener("click", () => {
      const exportPrep = prepareTransactionsForExport(this.getFilteredTransactions());
      const rows = this.buildBreakdownRows(exportPrep.transactions);
      const csvRows = [
        ["Category", "Subcategory", "Income", "Expense", "Net", "Transactions"],
        ...rows.map((row) => [
          row.category,
          row.subcategory,
          row.income,
          row.expense,
          row.net,
          row.transactions,
        ]),
      ];
      const csv = csvRows
        .map((line) =>
          line
            .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
            .join(",")
        )
        .join("\n");
      downloadBlob(csv, `category_breakdown_${fileDateStamp()}.csv`, "text/csv");
    });

    document.getElementById("uploadStatement")?.addEventListener("click", () => {
      document.getElementById("uploadStatementFile")?.click();
    });

    document.getElementById("uploadStatementFile")?.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || "");
          let imported = parseBankCsvTransactions(text, file.name.replace(/\.[^.]+$/, ""));
          if (!imported.length) {
            const rows = parseCsvText(text);
            imported = rows
              .map((row) => deriveTxFromCsvRow(row))
              .filter(Boolean)
              .map((tx) => normalizeTransaction(tx));
          }

          const uniqueTransactions = dedupeTransactions(imported);
          if (!uniqueTransactions.length) {
            UI.toast("Import Complete", "No valid transactions found in this CSV.", "error");
            return;
          }

          const dataset = buildDatasetFromCsvTransactions(uniqueTransactions);
          App.applyDataset(dataset);
          UI.toast(
            "CSV Imported",
            `${uniqueTransactions.length} transactions loaded. Existing data replaced.`,
            "success"
          );
        } catch (error) {
          UI.toast("Import Error", "Could not parse CSV file.", "error");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    });
  },

  syncFilters() {
    AppState.categoryFilters.category = document.getElementById("categoryFilter").value;
    AppState.categoryFilters.type = document.getElementById("categoryTypeFilter").value;
    AppState.categoryFilters.period = document.getElementById("categoryPeriodFilter").value;
  },

  updateCategoryFilterOptions() {
    const select = document.getElementById("categoryFilter");
    if (!select) return;
    const previous = select.value;
    const categories = getTaxonomyCategories();
    select.innerHTML = `
      <option value="all">All Categories</option>
      ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
    `;
    select.value = categories.includes(previous) ? previous : "all";

    const bulkMoveCategory = document.getElementById("bulkMoveCategory");
    if (bulkMoveCategory) {
      const prevBulk = bulkMoveCategory.value;
      const bulkCategories = [...getTaxonomyCategories()];
      bulkMoveCategory.innerHTML = bulkCategories
        .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
        .join("");
      bulkMoveCategory.value = bulkCategories.includes(prevBulk) ? prevBulk : bulkCategories[0] || "";
    }
    this.populateBulkSubcategories();
  },

  filterByPeriod(transactions) {
    const period = AppState.categoryFilters.period;
    if (period === "all") return transactions;
    if (!transactions.length) return transactions;

    const latestDate = transactions.reduce(
      (latest, tx) => (tx.date > latest ? tx.date : latest),
      transactions[0].date
    );
    const latest = new Date(`${latestDate}T00:00:00`);
    const cutoff = new Date(latest);

    if (period === "month") cutoff.setMonth(cutoff.getMonth() - 1);
    if (period === "quarter") cutoff.setMonth(cutoff.getMonth() - 3);
    if (period === "year") cutoff.setFullYear(cutoff.getFullYear() - 1);

    return transactions.filter((tx) => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate >= cutoff && txDate <= latest;
    });
  },

  getFilteredTransactions() {
    const { category, type } = AppState.categoryFilters;
    let rows = getGlobalScopedTransactions(AppState.transactions);
    rows = this.filterByPeriod(rows);
    rows = rows.filter((tx) => {
      if (category !== "all" && tx.category !== category) return false;
      if (type === "income" && tx.amount <= 0) return false;
      if (type === "expense" && tx.amount >= 0) return false;
      return true;
    });
    return rows;
  },

  buildBreakdownRows(transactions) {
    const grouped = buildSubcategorySummary(transactions);
    const totalExpense = sum(
      grouped
        .filter((row) => normalizeLabel(row.category) !== "transfers")
        .map((row) => row.expense)
    );
    return grouped.map((row) => ({
      ...row,
      percentExpense:
        totalExpense > 0 && normalizeLabel(row.category) !== "transfers"
          ? (row.expense / totalExpense) * 100
          : 0,
    }));
  },

  renderSummaryCards(filteredTransactions) {
    const container = document.getElementById("categorySummaryGrid");
    if (!container) return;

    const grouped = buildCategorySummary(filteredTransactions);
    if (!grouped.length) {
      container.innerHTML = `<p class="helper">No category data for selected filters.</p>`;
      return;
    }

    container.innerHTML = grouped
      .slice(0, 12)
      .map((row) => {
        const netClass = row.net >= 0 ? "variance-positive" : "variance-negative";
        return `
          <article class="category-summary-card" data-category="${escapeHtml(row.category)}">
            <h4>${escapeHtml(row.category)}</h4>
            <p class="amount">${escapeHtml(currency.format(row.expense))}</p>
            <p class="meta">
              Net: <span class="${netClass}">${escapeHtml(currency.format(row.net))}</span>
            </p>
          </article>
        `;
      })
      .join("");
  },

  renderBreakdownTable(filteredTransactions) {
    const tbody = document.querySelector("#categoryBreakdownTable tbody");
    if (!tbody) return;

    const rows = this.buildBreakdownRows(filteredTransactions).sort((a, b) => b.expense - a.expense);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8">No category breakdown data available.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((row) => {
        const netClass = row.net >= 0 ? "variance-positive" : "variance-negative";
        return `
          <tr>
            <td>${escapeHtml(row.category)}</td>
            <td>${escapeHtml(row.subcategory)}</td>
            <td class="align-right">${escapeHtml(currency.format(row.income))}</td>
            <td class="align-right">${escapeHtml(currency.format(row.expense))}</td>
            <td class="align-right ${netClass}">${escapeHtml(currency.format(row.net))}</td>
            <td class="align-right">${escapeHtml(formatPct(row.percentExpense))}</td>
            <td class="align-right">${escapeHtml(String(row.transactions))}</td>
            <td>
              <button
                type="button"
                class="btn btn-ghost"
                data-open-detail="1"
                data-category="${escapeHtml(row.category)}"
                data-subcategory="${escapeHtml(row.subcategory)}"
              >
                Inspect
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  },

  openDetail(category, subcategory) {
    AppState.categoryDetail = { category, subcategory };
    AppState.selectedCategoryTransactions.clear();
    const selectAll = document.getElementById("selectAllCategoryTx");
    if (selectAll) selectAll.checked = false;
    this.renderDetailPanel();
  },

  getDetailTransactions() {
    if (!AppState.categoryDetail) return [];
    const { category, subcategory } = AppState.categoryDetail;
    return getGlobalScopedTransactions(AppState.transactions).filter((tx) => {
      if (tx.category !== category) return false;
      if (subcategory && subcategory !== "all" && tx.subcategory !== subcategory) return false;
      return true;
    });
  },

  renderDetailPanel() {
    const panel = document.getElementById("categoryDetailPanel");
    const title = document.getElementById("categoryDetailTitle");
    const detailContent = document.getElementById("categoryDetailContent");
    const tbody = document.querySelector("#categoryTransactionsTable tbody");
    if (!panel || !title || !detailContent || !tbody) return;

    if (!AppState.categoryDetail) {
      panel.classList.add("is-hidden");
      return;
    }

    const txs = this.getDetailTransactions();
    const { category, subcategory } = AppState.categoryDetail;
    title.textContent = subcategory ? `${category} > ${subcategory}` : category;

    const income = sum(txs.filter((tx) => includeTransactionInIncome(tx)).map((tx) => tx.amount));
    const expense = sum(txs.filter((tx) => includeTransactionInSpending(tx)).map((tx) => Math.abs(tx.amount)));
    const net = income - expense;
    const netClass = net >= 0 ? "variance-positive" : "variance-negative";
    detailContent.innerHTML = `
      <article class="detail-pill"><strong>Transactions:</strong><br>${txs.length}</article>
      <article class="detail-pill"><strong>Income:</strong><br>${currency.format(income)}</article>
      <article class="detail-pill"><strong>Expenses:</strong><br>${currency.format(expense)}</article>
      <article class="detail-pill"><strong>Net:</strong><br><span class="${netClass}">${currency.format(
      net
    )}</span></article>
    `;

    tbody.innerHTML = txs
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((tx) => `
        <tr>
          <td><input type="checkbox" data-tx-id="${escapeHtml(tx.id)}"></td>
          <td>${escapeHtml(formatDate(tx.date))}</td>
          <td>${escapeHtml(tx.description)}</td>
          <td>${escapeHtml(tx.subcategory)}</td>
          <td class="align-right ${tx.amount >= 0 ? "variance-positive" : "variance-negative"}">
            ${escapeHtml(currencyPrecise.format(tx.amount))}
          </td>
        </tr>
      `)
      .join("");

    panel.classList.remove("is-hidden");
    const categorySelect = document.getElementById("bulkMoveCategory");
    if (categorySelect) categorySelect.value = category;
    this.populateBulkSubcategories();
  },

  populateBulkSubcategories() {
    const categorySelect = document.getElementById("bulkMoveCategory");
    const subSelect = document.getElementById("bulkMoveSubcategory");
    if (!categorySelect || !subSelect) return;

    const category = categorySelect.value;
    const taxonomySubcategories = getTaxonomySubcategories(category);
    const subcategories = [...taxonomySubcategories];
    if (!subcategories.length) subcategories.push("Other");

    subSelect.innerHTML = subcategories
      .map((sub) => `<option value="${escapeHtml(sub)}">${escapeHtml(sub)}</option>`)
      .join("");
  },

  applyBulkMove() {
    if (!AppState.selectedCategoryTransactions.size) {
      UI.toast("No Selection", "Select one or more transactions first.", "error");
      return;
    }

    const newCategory = document.getElementById("bulkMoveCategory").value;
    const newSubcategory = document.getElementById("bulkMoveSubcategory").value || "Other";
    AppState.transactions.forEach((tx) => {
      if (AppState.selectedCategoryTransactions.has(tx.id)) {
        tx.category = newCategory;
        tx.subcategory = newSubcategory;
        applyCategoryTaxonomy(tx);
      }
    });
    AppState.selectedCategoryTransactions.clear();
    App.recomputeDerived();
    App.renderAll();
    this.openDetail(newCategory, newSubcategory);
    UI.toast("Transactions Updated", "Selected transactions were recategorized.", "success");
  },

  render() {
    this.syncFilters();
    this.updateCategoryFilterOptions();
    const filtered = this.getFilteredTransactions();
    this.renderSummaryCards(filtered);
    this.renderBreakdownTable(filtered);
    this.renderDetailPanel();
  },
};

const AIController = {
  init() {
    document.getElementById("runAIAnalysis")?.addEventListener("click", () => {
      UI.showLoading("Rebuilding insights...");
      setTimeout(() => {
        this.render();
        UI.hideLoading();
        UI.toast("Insights Updated", "Financial signals refreshed.", "success");
      }, 250);
    });

    document.getElementById("showHighOnly")?.addEventListener("change", (event) => {
      if (event.target.checked) {
        document.getElementById("showAllAnomalies").checked = false;
      }
      this.renderAnomalies();
    });

    document.getElementById("showAllAnomalies")?.addEventListener("change", (event) => {
      if (event.target.checked) {
        document.getElementById("showHighOnly").checked = false;
      }
      this.renderAnomalies();
    });

    document.getElementById("ai-insights-view")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest("[data-ai-inspect-kind][data-ai-inspect-id]");
      if (!button) return;
      const kind = String(button.getAttribute("data-ai-inspect-kind") || "").trim();
      const id = String(button.getAttribute("data-ai-inspect-id") || "").trim();
      if (!kind || !id) return;
      this.toggleInspect(kind, id);
    });

    document.getElementById("closeAIInspect")?.addEventListener("click", () => {
      AppState.ai.inspectKind = "";
      AppState.ai.inspectId = "";
      this.renderInspectPanel();
      this.syncInspectButtons();
    });

    document.getElementById("trendCategorySelect")?.addEventListener("change", () => {
      this.renderCategoryTrend();
    });

    document.getElementById("addSubcategoryRule")?.addEventListener("click", () => {
      this.insertNewRuleRow();
    });

    document.querySelector("#subcategoryRulesTable tbody")?.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-rule-action]");
      if (!actionEl) return;
      const action = actionEl.getAttribute("data-rule-action");
      if (action === "delete") {
        const id = actionEl.getAttribute("data-rule-id");
        this.deleteRule(id);
      }
      if (action === "cancel-new") {
        document.getElementById("newRuleRow")?.remove();
      }
      if (action === "save-new") {
        this.saveRuleFromRow();
      }
    });

    document.querySelector("#merchantResolutionTable tbody")?.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-merchant-review-action]");
      if (!actionEl) return;
      const action = String(actionEl.getAttribute("data-merchant-review-action") || "").trim();
      const key = String(actionEl.getAttribute("data-merchant-review-key") || "").trim();
      if (action === "resolve") this.openMerchantResolveDialog(key);
      if (action === "view") this.viewMerchantTransactions(key);
      if (action === "hide") this.hideMerchantReviewItem(key);
    });

    document.getElementById("merchantResolveCategory")?.addEventListener("change", () => {
      this.populateMerchantResolveSubcategoryOptions();
    });
    document.getElementById("merchantResolveCancel")?.addEventListener("click", () => {
      this.closeMerchantResolveDialog();
    });
    document.getElementById("merchantResolveSave")?.addEventListener("click", () => {
      this.applyMerchantResolution();
    });
    document.getElementById("merchantResolveViewMatches")?.addEventListener("click", () => {
      const key = document.getElementById("merchantResolveDialog")?.dataset?.merchantReviewKey || "";
      this.viewMerchantTransactions(key);
    });
    document.getElementById("resetMerchantReviewHidden")?.addEventListener("click", () => {
      this.resetHiddenMerchantReviewItems();
    });
    document.getElementById("merchantReviewFilter")?.addEventListener("change", (event) => {
      AppState.merchantReviewControls.filter = String(event.target.value || "all").trim() || "all";
      this.renderMerchantResolutionQueue();
    });
    document.getElementById("merchantReviewSort")?.addEventListener("change", (event) => {
      AppState.merchantReviewControls.sort = String(event.target.value || "amount-desc").trim() || "amount-desc";
      this.renderMerchantResolutionQueue();
    });

    document.getElementById("exportInsights")?.addEventListener("click", () => {
      this.exportInsightsReport();
    });
  },

  priorityRank(priority) {
    if (priority === "high") return 3;
    if (priority === "medium") return 2;
    return 1;
  },

  getOpportunityImpact(item) {
    const impactType = String(item.impactType || "run_rate");
    if (impactType === "one_off") {
      const amount = Math.max(0, toNumber(item.annualSaving, 0));
      return {
        primaryText: `${currency.format(amount)} one-off`,
        secondaryText: "Single transaction flagged (not monthly)",
        actionText: `One-off amount flagged: ${currency.format(amount)}.`,
        reportText: `${currency.format(amount)} one-off flagged`,
      };
    }

    const monthly = Math.max(0, toNumber(item.monthlySaving, 0));
    const annual = Math.max(0, toNumber(item.annualSaving, monthly * 12));
    return {
      primaryText: `${currency.format(monthly)}/mo`,
      secondaryText: annual > 0 ? `${currency.format(annual)}/yr run-rate impact` : "Process improvement",
      actionText:
        monthly > 0
          ? `Run-rate spend pressure: ${currency.format(monthly)} / month.`
          : "No direct dollar estimate.",
      reportText: `${currency.format(monthly)}/mo run-rate impact`,
    };
  },

  isPlannedLoanPayment(tx) {
    const category = normalizeLabel(tx.category);
    const subcategory = normalizeLabel(tx.subcategory);
    const description = String(tx.description || "").toUpperCase();

    if (category === "airbnb" && subcategory === "loan payment") return true;
    if (category === "airbnb" && description.startsWith("TFR TO L")) return true;
    if (category === "housing" && subcategory === "mortgage loan") return true;

    return false;
  },

  isFixedHomeInsurance(tx) {
    // A supplier name does not establish a fixed or confirmed household payment.
    return false;
  },

  isExcludedFromAnomalyReview(tx) {
    return !includeTransactionInSpending(tx) || this.isPlannedLoanPayment(tx) || this.isFixedHomeInsurance(tx);
  },

  calculateAirbnbFinanceSplit(transactions) {
    const airbnbRows = transactions.filter(
      (tx) => normalizeLabel(tx.category) === "airbnb" || tx.property === "Airbnb"
    );
    const loanRepayments = sum(
      airbnbRows
        .filter((tx) => tx.amount < 0 && this.isPlannedLoanPayment(tx))
        .map((tx) => Math.abs(tx.amount))
    );
    const operatingExpense = sum(
      airbnbRows
        .filter((tx) => tx.amount < 0 && !this.isPlannedLoanPayment(tx))
        .map((tx) => Math.abs(tx.amount))
    );
    return {
      loanRepayments: Number(loanRepayments.toFixed(2)),
      operatingExpense: Number(operatingExpense.toFixed(2)),
    };
  },

  calculateCashWithdrawalPressure(transactions) {
    const expenses = transactions.filter((tx) => tx.amount < 0);
    const totalExpense = sum(expenses.map((tx) => Math.abs(tx.amount)));
    const cashRows = expenses.filter((tx) => {
      const sub = normalizeLabel(tx.subcategory);
      return sub.includes("cash withdrawal");
    });
    const cashExpense = sum(cashRows.map((tx) => Math.abs(tx.amount)));
    return {
      count: cashRows.length,
      expense: cashExpense,
      ratio: totalExpense > 0 ? cashExpense / totalExpense : 0,
      transactionIds: cashRows.map((tx) => tx.id),
    };
  },

  findCategorySpendDrift(transactions) {
    const expenses = transactions.filter(
      (tx) => includeTransactionInSpending(tx) && !this.isExcludedFromAnomalyReview(tx)
    );
    const months = [...new Set(expenses.map((tx) => tx.month).filter(Boolean))].sort();
    if (months.length < 4) return [];

    const recentMonths = months.slice(-3);
    const baselineMonths = months.slice(-6, -3);
    if (!baselineMonths.length) return [];

    const categories = [...new Set(expenses.map((tx) => tx.category))];
    const drift = [];

    categories.forEach((category) => {
      const monthTotals = new Map();
      const categoryRows = expenses.filter((tx) => tx.category === category);
      categoryRows.forEach((tx) => {
        monthTotals.set(tx.month, (monthTotals.get(tx.month) || 0) + Math.abs(tx.amount));
      });

      const recentAvg =
        sum(recentMonths.map((month) => monthTotals.get(month) || 0)) / recentMonths.length;
      const baselineAvg =
        sum(baselineMonths.map((month) => monthTotals.get(month) || 0)) / baselineMonths.length;
      if (recentAvg < 150 || baselineAvg <= 0) return;

      const delta = recentAvg - baselineAvg;
      const deltaPct = percentChange(recentAvg, baselineAvg);
      if (delta < 120 || deltaPct < 20) return;

      const recentMonthSet = new Set(recentMonths);
      const baselineMonthSet = new Set(baselineMonths);

      drift.push({
        category,
        recentAvg,
        baselineAvg,
        delta,
        deltaPct,
        recentMonths: [...recentMonths],
        baselineMonths: [...baselineMonths],
        transactionIds: categoryRows
          .filter((tx) => recentMonthSet.has(tx.month) || baselineMonthSet.has(tx.month))
          .map((tx) => tx.id),
      });
    });

    return drift.sort((a, b) => b.delta - a.delta).slice(0, 10);
  },

  findPotentialDuplicates(transactions) {
    const expenses = transactions
      .filter((tx) => tx.amount < 0 && !this.isExcludedFromAnomalyReview(tx))
      .sort((a, b) => a.date.localeCompare(b.date));
    const byMerchantAmount = groupBy(
      expenses,
      (tx) => `${normalizeMerchant(tx.description)}|${Math.abs(tx.amount).toFixed(2)}`
    );

    const duplicates = [];
    byMerchantAmount.forEach((rows) => {
      if (rows.length < 2) return;
      const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < sorted.length; i += 1) {
        const previous = sorted[i - 1];
        const current = sorted[i];
        const daysApart = Math.round(
          (new Date(`${current.date}T00:00:00`) - new Date(`${previous.date}T00:00:00`)) /
            (1000 * 60 * 60 * 24)
        );
        if (daysApart < 0 || daysApart > 3) continue;

        const amount = Math.abs(current.amount);
        duplicates.push({
          id: current.id,
          inspectId: current.id,
          date: current.date,
          merchant: normalizeMerchant(current.description),
          description: current.description,
          category: current.category,
          subcategory: current.subcategory,
          amount,
          transactionIds: [previous.id, current.id],
          zScore: 0,
          priority: amount >= 250 ? "high" : "medium",
          reason: `Possible duplicate: same merchant and amount ${daysApart} day${
            daysApart === 1 ? "" : "s"
          } apart.`,
        });
      }
    });

    return duplicates.sort((a, b) => b.amount - a.amount).slice(0, 12);
  },

  mergeAnomalySets(primary, secondary) {
    const merged = new Map();
    [...primary, ...secondary].forEach((item) => {
      const existing = merged.get(item.id);
      if (!existing) {
        merged.set(item.id, item);
        return;
      }
      if (this.priorityRank(item.priority) > this.priorityRank(existing.priority)) {
        merged.set(item.id, item);
        return;
      }
      if (existing.reason !== item.reason) {
        existing.reason = `${existing.reason} ${item.reason}`;
      }
      const transactionIds = new Set([
        ...(Array.isArray(existing.transactionIds) ? existing.transactionIds : []),
        ...(Array.isArray(item.transactionIds) ? item.transactionIds : []),
      ]);
      existing.transactionIds = [...transactionIds];
    });
    return [...merged.values()].sort((a, b) => b.amount - a.amount).slice(0, 30);
  },

  findRecurringSubscriptions(transactions) {
    const expenses = transactions
      .filter((tx) => tx.amount < 0 && !this.isExcludedFromAnomalyReview(tx))
      .sort((a, b) => a.date.localeCompare(b.date));
    const byMerchant = groupBy(expenses, (tx) => normalizeMerchant(tx.description));
    const latestDate = expenses.length ? expenses[expenses.length - 1].date : "";
    const latest = latestDate ? new Date(`${latestDate}T00:00:00`) : new Date();

    const results = [];
    byMerchant.forEach((items, merchant) => {
      if (items.length < 3) return;
      const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
      const intervals = [];
      for (let i = 1; i < sorted.length; i += 1) {
        const prev = new Date(`${sorted[i - 1].date}T00:00:00`);
        const curr = new Date(`${sorted[i].date}T00:00:00`);
        const days = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        if (days > 0 && days <= 120) intervals.push(days);
      }
      if (intervals.length < 2) return;

      const avgDays = sum(intervals) / intervals.length;
      let frequency = "Irregular";
      let multiplier = 12;
      let cadenceTarget = 30;
      let cadenceTolerance = 10;

      if (avgDays <= 9) {
        frequency = "Weekly";
        multiplier = 52;
        cadenceTarget = 7;
        cadenceTolerance = 3;
      } else if (avgDays <= 18) {
        frequency = "Fortnightly";
        multiplier = 26;
        cadenceTarget = 14;
        cadenceTolerance = 5;
      } else if (avgDays <= 40) {
        frequency = "Monthly";
        multiplier = 12;
        cadenceTarget = 30;
        cadenceTolerance = 9;
      } else if (avgDays <= 100) {
        frequency = "Quarterly";
        multiplier = 4;
        cadenceTarget = 91;
        cadenceTolerance = 15;
      } else {
        return;
      }

      const intervalStd = standardDeviation(intervals);
      const intervalCv = avgDays > 0 ? intervalStd / avgDays : 1;
      const cadenceMatchRatio =
        intervals.filter((days) => Math.abs(days - cadenceTarget) <= cadenceTolerance).length /
        intervals.length;

      const amounts = sorted.map((tx) => Math.abs(tx.amount));
      const avgAmount = sum(amounts) / amounts.length;
      const amountStd = standardDeviation(amounts);
      const amountCv = avgAmount > 0 ? amountStd / avgAmount : 1;

      const category = mode(sorted.map((tx) => tx.category)) || "Uncategorized";
      const subcategory = mode(sorted.map((tx) => tx.subcategory)) || "Other";
      const normalizedCategory = normalizeLabel(category);
      const normalizedSubcategory = normalizeLabel(subcategory);

      const hasKeywordSignal = sorted.some((tx) =>
        containsAny(String(tx.description || "").toUpperCase(), CSV_SUBSCRIPTION_KEYWORDS)
      );
      const explicitSubcategorySignal = [
        "subscriptions",
        "internet",
        "health insurance",
        "income protection",
        "home insurance",
        "bank fees",
      ].includes(normalizedSubcategory);
      const trustedCategorySignal = [
        "insurance",
        "housing",
        "financial",
        "lifestyle",
      ].includes(normalizedCategory);

      const hasSignal = hasKeywordSignal || explicitSubcategorySignal || trustedCategorySignal;
      const hasEnoughObservations = sorted.length >= 4 || (sorted.length >= 3 && hasSignal);
      if (!hasEnoughObservations) return;
      if (normalizedCategory === "uncategorized" && !hasKeywordSignal) return;

      const cadenceIsStable = cadenceMatchRatio >= 0.65 && intervalCv <= 0.5;
      if (!cadenceIsStable) return;

      const amountIsStable = amountCv <= 0.45;
      if (!amountIsStable && !hasKeywordSignal && !explicitSubcategorySignal) return;

      const annualCost = avgAmount * multiplier;
      if (annualCost < 180) return;

      const lastSeen = sorted[sorted.length - 1].date;
      const daysSinceLast = Math.round(
        (latest - new Date(`${lastSeen}T00:00:00`)) / (1000 * 60 * 60 * 24)
      );
      const recentHits = sorted.filter((tx) => {
        const daysSince = Math.round(
          (latest - new Date(`${tx.date}T00:00:00`)) / (1000 * 60 * 60 * 24)
        );
        return daysSince <= 120;
      }).length;
      if (recentHits < 2) return;

      const confidenceScore =
        cadenceMatchRatio * 0.6 +
        Math.max(0, 1 - intervalCv) * 0.25 +
        Math.max(0, 1 - amountCv) * 0.15;
      const confidence = confidenceScore >= 0.85 ? "High" : confidenceScore >= 0.7 ? "Medium" : "Low";
      const inspectId = normalizeRuleKeyword(merchant) || String(sorted[0]?.id || createId("subscription"));
      results.push({
        inspectId,
        merchant,
        category,
        subcategory,
        frequency,
        averageAmount: avgAmount,
        annualCost,
        lastSeen,
        status: daysSinceLast <= 60 ? "Active" : "Dormant",
        confidence,
        transactionIds: sorted.map((tx) => tx.id),
      });
    });

    return results.sort((a, b) => b.annualCost - a.annualCost).slice(0, 20);
  },

  findAnomalies(transactions) {
    const expenses = transactions.filter(
      (tx) =>
        tx.amount < 0 &&
        normalizeLabel(tx.category) !== "transfers" &&
        !this.isExcludedFromAnomalyReview(tx)
    );
    if (!expenses.length) return [];

    const grouped = groupBy(expenses, (tx) => tx.category);
    const categoryStats = new Map();
    grouped.forEach((rows, category) => {
      const values = rows.map((tx) => Math.abs(tx.amount));
      categoryStats.set(category, {
        sampleSize: values.length,
        mean: sum(values) / values.length,
        std: standardDeviation(values),
        median: median(values),
      });
    });

    const anomalies = [];
    expenses.forEach((tx) => {
      const amount = Math.abs(tx.amount);
      const stats = categoryStats.get(tx.category) || { sampleSize: 0, mean: 0, std: 0, median: 0 };
      if (stats.sampleSize < 4 && amount < 1200) return;
      const z = stats.std > 0 ? (amount - stats.mean) / stats.std : 0;
      const ratio = stats.mean > 0 ? amount / stats.mean : 0;
      const trigger = amount >= 120 && (z >= 1.8 || ratio >= 2.2 || amount - stats.median >= 400);
      if (!trigger) return;

      const priority = z >= 2.8 || amount >= 1200 ? "high" : "medium";
      anomalies.push({
        id: tx.id,
        inspectId: tx.id,
        date: tx.date,
        merchant: normalizeMerchant(tx.description),
        description: tx.description,
        category: tx.category,
        subcategory: tx.subcategory,
        amount,
        transactionIds: [tx.id],
        zScore: z,
        priority,
        reason:
          priority === "high"
            ? "Unusually high versus your normal spend pattern in this category."
            : "Noticeably above the normal pattern for this category.",
      });
    });

    return anomalies.sort((a, b) => b.amount - a.amount).slice(0, 24);
  },

  buildSavingsOpportunities(subscriptions, anomalies, transactions) {
    const opportunities = [];

    subscriptions
      .filter((sub) => sub.status === "Active")
      .slice(0, 6)
      .forEach((sub) => {
        const monthlyCost = sub.annualCost / 12;
        opportunities.push({
          inspectId: `subscription:${sub.inspectId}`,
          title: `Audit recurring charge: ${sub.merchant}`,
          category: sub.category,
          impactType: "run_rate",
          priority: monthlyCost > 200 ? "high" : monthlyCost > 90 ? "medium" : "low",
          monthlySaving: monthlyCost,
          annualSaving: sub.annualCost,
          transactionIds: Array.isArray(sub.transactionIds) ? [...sub.transactionIds] : [],
          inspectSource: {
            type: "subscription",
            merchant: sub.merchant,
            frequency: sub.frequency,
            averageAmount: sub.averageAmount,
            annualCost: sub.annualCost,
            lastSeen: sub.lastSeen,
          },
          description: `${sub.frequency} charge averaging ${currency.format(
            sub.averageAmount
          )}. Confirm usage and plan fit.`,
          actions: [
            "Confirm the service was used in the last 30 days.",
            "Downgrade plan or cancel if non-essential.",
          ],
        });
      });

    const drift = this.findCategorySpendDrift(transactions);
    drift.slice(0, 5).forEach((item) => {
      opportunities.push({
        inspectId: `drift:${normalizeLabel(item.category)}`,
        title: `Reduce spend drift: ${item.category}`,
        category: item.category,
        impactType: "run_rate",
        priority: item.delta > 500 ? "high" : "medium",
        monthlySaving: item.delta,
        annualSaving: item.delta * 12,
        transactionIds: Array.isArray(item.transactionIds) ? [...item.transactionIds] : [],
        inspectSource: {
          type: "drift",
          category: item.category,
          recentAvg: item.recentAvg,
          baselineAvg: item.baselineAvg,
          delta: item.delta,
          deltaPct: item.deltaPct,
          recentMonths: [...(item.recentMonths || [])],
          baselineMonths: [...(item.baselineMonths || [])],
        },
        description: `Last 3-month average ${currency.format(
          item.recentAvg
        )} vs prior baseline ${currency.format(item.baselineAvg)} (+${item.deltaPct.toFixed(1)}%).`,
        actions: [
          "Set a hard monthly cap equal to your prior baseline.",
          "Review top merchants in this category and cut lowest-value spend first.",
        ],
      });
    });

    anomalies
      .filter((item) => item.priority === "high")
      .slice(0, 5)
      .forEach((item) => {
        opportunities.push({
          inspectId: `anomaly:${item.inspectId || item.id}`,
          title: `Review one-off high-risk charge: ${item.merchant}`,
          category: item.category,
          impactType: "one_off",
          priority: "high",
          monthlySaving: 0,
          annualSaving: item.amount,
          transactionIds: Array.isArray(item.transactionIds) ? [...item.transactionIds] : [item.id],
          inspectSource: {
            type: "anomaly",
            merchant: item.merchant,
            amount: item.amount,
            date: item.date,
            reason: item.reason,
          },
          description: `${item.reason} Treated as one-off unless repeated with stable cadence.`,
          actions: [
            "Confirm statement legitimacy and merchant contact trail.",
            "If valid but avoidable, set a category-level threshold alert.",
          ],
        });
      });

    const uncategorized = calculateUncategorizedStats(transactions);
    if (uncategorized.expense > 0 && uncategorized.ratio >= 0.05) {
      opportunities.push({
        inspectId: "uncategorized-expense",
        title: "Fix uncategorized expense leakage",
        category: "Uncategorized",
        impactType: "run_rate",
        priority: uncategorized.ratio >= 0.1 ? "high" : "medium",
        monthlySaving: uncategorized.expense / Math.max(1, AppState.monthlyCashflow.length),
        annualSaving: uncategorized.expense,
        transactionIds: Array.isArray(uncategorized.transactionIds) ? [...uncategorized.transactionIds] : [],
        inspectSource: {
          type: "uncategorized",
          count: uncategorized.count,
          expense: uncategorized.expense,
          ratio: uncategorized.ratio,
        },
        description: `${currency.format(uncategorized.expense)} (${formatPct(
          uncategorized.ratio * 100
        )}) of total expenses are uncategorized.`,
        actions: [
          "Bulk recategorize top uncategorized merchants in Category Intelligence.",
          "Create keyword rules so future imports auto-classify these transactions.",
        ],
      });
    }

    const cashPressure = this.calculateCashWithdrawalPressure(transactions);
    if (cashPressure.expense >= 2500 || cashPressure.ratio >= 0.04) {
      opportunities.push({
        inspectId: "cash-withdrawal",
        title: "Reduce untracked cash withdrawals",
        category: "Cash & Card",
        impactType: "run_rate",
        priority: cashPressure.expense >= 5000 ? "high" : "medium",
        monthlySaving: cashPressure.expense / Math.max(1, AppState.monthlyCashflow.length),
        annualSaving: cashPressure.expense,
        transactionIds: Array.isArray(cashPressure.transactionIds) ? [...cashPressure.transactionIds] : [],
        inspectSource: {
          type: "cash-withdrawal",
          count: cashPressure.count,
          expense: cashPressure.expense,
          ratio: cashPressure.ratio,
        },
        description: `${currency.format(cashPressure.expense)} withdrawn across ${cashPressure.count} cash transactions.`,
        actions: [
          "Set a weekly cash cap and track every withdrawal purpose.",
          "Move routine spend to card where category visibility is retained.",
        ],
      });
    }

    return opportunities
      .sort((a, b) => {
        const priorityDiff = this.priorityRank(b.priority) - this.priorityRank(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return b.annualSaving - a.annualSaving;
      })
      .slice(0, 12);
  },

  rebuildInsights() {
    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions);
    const subscriptions = this.findRecurringSubscriptions(scopedTransactions);
    const statisticalAnomalies = this.findAnomalies(scopedTransactions);
    const duplicateAnomalies = this.findPotentialDuplicates(scopedTransactions);
    const anomalies = this.mergeAnomalySets(statisticalAnomalies, duplicateAnomalies);
    const opportunities = this.buildSavingsOpportunities(subscriptions, anomalies, scopedTransactions);
    const activeRecurring = subscriptions.filter((item) => item.status === "Active");
    const recurringRunRate = sum(activeRecurring.map((item) => item.annualCost));
    const flaggedAnnualSpend = sum(opportunities.map((item) => item.annualSaving));
    const airbnbFinance = this.calculateAirbnbFinanceSplit(scopedTransactions);
    const uncategorized = calculateUncategorizedStats(scopedTransactions);
    const inspectKind = String(AppState.ai?.inspectKind || "").trim();
    const inspectId = String(AppState.ai?.inspectId || "").trim();

    AppState.ai = {
      subscriptions,
      anomalies,
      opportunities,
      inspectKind,
      inspectId,
      recurringRunRate,
      flaggedAnnualSpend,
      airbnbLoanRepaymentsAnnual: airbnbFinance.loanRepayments,
      airbnbOperatingExpenseAnnual: airbnbFinance.operatingExpense,
      uncategorizedExpense: uncategorized.expense,
      uncategorizedExpenseCount: uncategorized.count,
      uncategorizedExpenseRatio: uncategorized.ratio,
      merchantReviewQueue: buildMerchantReviewQueue(scopedTransactions, {
        hiddenKeys: AppState.merchantReviewHidden,
      }),
    };
    applyDetectedSubscriptionFlags(scopedTransactions, subscriptions);
  },

  toggleInspect(kind, id) {
    const nextKind = String(kind || "").trim();
    const nextId = String(id || "").trim();
    if (!nextKind || !nextId) return;

    const currentKind = String(AppState.ai.inspectKind || "").trim();
    const currentId = String(AppState.ai.inspectId || "").trim();
    const isSame = currentKind === nextKind && currentId === nextId;

    AppState.ai.inspectKind = isSame ? "" : nextKind;
    AppState.ai.inspectId = isSame ? "" : nextId;
    this.renderInspectPanel();
    this.syncInspectButtons();

    if (!isSame) {
      document.getElementById("aiInspectPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  },

  syncInspectButtons() {
    const activeKind = String(AppState.ai.inspectKind || "").trim();
    const activeId = String(AppState.ai.inspectId || "").trim();
    document.querySelectorAll("[data-ai-inspect-kind][data-ai-inspect-id]").forEach((button) => {
      const kind = String(button.getAttribute("data-ai-inspect-kind") || "").trim();
      const id = String(button.getAttribute("data-ai-inspect-id") || "").trim();
      const isActive = Boolean(kind && id && kind === activeKind && id === activeId);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  },

  getTransactionsByIds(ids = []) {
    const idSet = new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean));
    if (!idSet.size) return [];
    return AppState.transactions.filter((tx) => idSet.has(String(tx.id || "").trim()));
  },

  getInspectModel() {
    const inspectKind = String(AppState.ai.inspectKind || "").trim();
    const inspectId = String(AppState.ai.inspectId || "").trim();
    if (!inspectKind || !inspectId) return null;

    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions);
    const sortTransactions = (items = []) =>
      items
        .slice()
        .sort(
          (a, b) =>
            String(b?.date || "").localeCompare(String(a?.date || "")) ||
            Math.abs(toNumber(b?.amount, 0)) - Math.abs(toNumber(a?.amount, 0))
        );
    const countDistinct = (items = [], selector) =>
      new Set((Array.isArray(items) ? items : []).map(selector).filter(Boolean)).size;
    const formatDateRange = (items = []) => {
      const dates = [...new Set((Array.isArray(items) ? items : []).map((tx) => String(tx?.date || "").trim()).filter(Boolean))].sort();
      if (!dates.length) return "--";
      if (dates[0] === dates[dates.length - 1]) return formatDate(dates[0]);
      return `${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])}`;
    };
    const capitalize = (value = "") => {
      const text = String(value || "").trim();
      return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "--";
    };
    const uniqueIds = (items = []) => [
      ...new Set((Array.isArray(items) ? items : []).map((id) => String(id || "").trim()).filter(Boolean)),
    ];

    if (inspectKind === "summary") {
      switch (inspectId) {
        case "flagged-spend": {
          const opportunities = Array.isArray(AppState.ai.opportunities) ? AppState.ai.opportunities : [];
          const transactionIds = uniqueIds(opportunities.flatMap((item) => item.transactionIds || []));
          const transactions = sortTransactions(this.getTransactionsByIds(transactionIds));
          return {
            title: "Flagged Spend Inspection",
            meta:
              "Union of transactions contributing to the current waste opportunities. Annual flagged spend is an estimate and some rows may contribute to multiple opportunities.",
            transactions,
            emptyMessage: "No transactions are currently attached to the flagged-spend opportunities in scope.",
            stats: [
              { label: "Flagged Spend", value: currency.format(AppState.ai.flaggedAnnualSpend) },
              { label: "Opportunities", value: String(opportunities.length) },
              { label: "Transactions", value: String(transactions.length) },
              {
                label: "Categories",
                value: String(countDistinct(transactions, (tx) => String(tx.category || "Uncategorized").trim() || "Uncategorized")),
              },
              { label: "Date Range", value: formatDateRange(transactions) },
            ],
          };
        }
        case "airbnb-loan-repayments": {
          const transactions = sortTransactions(
            scopedTransactions.filter(
              (tx) =>
                (normalizeLabel(tx.category) === "airbnb" || tx.property === "Airbnb") &&
                tx.amount < 0 &&
                this.isPlannedLoanPayment(tx)
            )
          );
          const total = sum(transactions.map((tx) => Math.abs(toNumber(tx.amount, 0))));
          return {
            title: "Airbnb Loan Repayments Inspection",
            meta: "Transactions treated as Airbnb loan repayments and excluded from flagged operational spend.",
            transactions,
            emptyMessage: "No Airbnb loan repayment transactions are in scope.",
            stats: [
              { label: "Loan Repayments", value: currency.format(total), className: "variance-negative" },
              { label: "Transactions", value: String(transactions.length) },
              { label: "Accounts", value: String(countDistinct(transactions, (tx) => String(tx.account || "--").trim() || "--")) },
              { label: "Date Range", value: formatDateRange(transactions) },
            ],
          };
        }
        case "recurring-run-rate": {
          const activeSubscriptions = (AppState.ai.subscriptions || []).filter((item) => item.status === "Active");
          const transactionIds = uniqueIds(activeSubscriptions.flatMap((item) => item.transactionIds || []));
          const transactions = sortTransactions(this.getTransactionsByIds(transactionIds));
          return {
            title: "Recurring Run Rate Inspection",
            meta: "Transactions contributing to active recurring subscription patterns in the current Waste & Insights scope.",
            transactions,
            emptyMessage: "No active recurring subscription transactions are in scope.",
            stats: [
              { label: "Recurring Run Rate", value: currency.format(AppState.ai.recurringRunRate) },
              { label: "Active Merchants", value: String(activeSubscriptions.length) },
              { label: "Transactions", value: String(transactions.length) },
              { label: "Date Range", value: formatDateRange(transactions) },
            ],
          };
        }
        case "anomaly-count": {
          const anomalies = Array.isArray(AppState.ai.anomalies) ? AppState.ai.anomalies : [];
          const transactionIds = uniqueIds(anomalies.flatMap((item) => item.transactionIds || [item.id]));
          const transactions = sortTransactions(this.getTransactionsByIds(transactionIds));
          const highCount = anomalies.filter((item) => item.priority === "high").length;
          const mediumCount = anomalies.filter((item) => item.priority === "medium").length;
          return {
            title: "Anomaly Count Inspection",
            meta: "Transactions currently flagged as anomalies in Waste & Insights, including duplicate-review cases.",
            transactions,
            emptyMessage: "No anomaly transactions are currently in scope.",
            stats: [
              { label: "Anomalies", value: String(anomalies.length) },
              { label: "High Priority", value: String(highCount) },
              { label: "Medium Priority", value: String(mediumCount) },
              { label: "Transactions", value: String(transactions.length) },
              {
                label: "Merchants",
                value: String(countDistinct(transactions, (tx) => normalizeMerchant(tx.description || ""))),
              },
            ],
          };
        }
        case "uncategorized-expense": {
          const transactions = sortTransactions(
            scopedTransactions.filter(
              (tx) => includeTransactionInSpending(tx) && normalizeLabel(tx.category) === "uncategorized"
            )
          );
          const total = sum(transactions.map((tx) => Math.abs(toNumber(tx.amount, 0))));
          return {
            title: "Uncategorized Expense Inspection",
            meta: "Expense transactions still left uncategorized in the current Waste & Insights scope.",
            transactions,
            emptyMessage: "No uncategorized expense transactions are in scope.",
            stats: [
              { label: "Uncategorized Spend", value: currency.format(total), className: "variance-negative" },
              { label: "Transactions", value: String(transactions.length) },
              { label: "Expense Ratio", value: formatPct(toNumber(AppState.ai.uncategorizedExpenseRatio, 0) * 100) },
              { label: "Date Range", value: formatDateRange(transactions) },
            ],
          };
        }
        default:
          return null;
      }
    }

    if (inspectKind === "subscription") {
      const item = (AppState.ai.subscriptions || []).find((row) => String(row.inspectId || "").trim() === inspectId);
      if (!item) return null;
      const transactions = sortTransactions(this.getTransactionsByIds(item.transactionIds));
      return {
        title: `Recurring Charge Inspection - ${item.merchant}`,
        meta: `${item.merchant} charges contributing to the recurring subscription signal in the current Waste & Insights scope.`,
        transactions,
        emptyMessage: "No recurring transactions match this subscription signal in the current scope.",
        stats: [
          { label: "Frequency", value: item.frequency || "--" },
          { label: "Status", value: item.status || "--" },
          { label: "Average Charge", value: currency.format(item.averageAmount) },
          { label: "Annual Cost", value: currency.format(item.annualCost) },
          { label: "Last Seen", value: formatDate(item.lastSeen) },
        ],
      };
    }

    if (inspectKind === "opportunity") {
      const item = (AppState.ai.opportunities || []).find((row) => String(row.inspectId || "").trim() === inspectId);
      if (!item) return null;
      const transactions = sortTransactions(this.getTransactionsByIds(item.transactionIds));
      const impact = this.getOpportunityImpact(item);
      const source = item.inspectSource || {};
      const stats = [
        { label: "Priority", value: capitalize(item.priority) },
        { label: "Category", value: item.category || "--" },
        { label: item.impactType === "one_off" ? "One-off Impact" : "Run-rate Impact", value: impact.primaryText },
        { label: "Transactions", value: String(transactions.length) },
      ];

      if (source.type === "subscription") {
        stats[2] = { label: "Average Charge", value: currency.format(source.averageAmount) };
        stats.push({ label: "Annual Cost", value: currency.format(source.annualCost) });
        stats.push({ label: "Frequency", value: source.frequency || "--" });
      } else if (source.type === "drift") {
        stats[2] = { label: "Baseline Avg", value: currency.format(source.baselineAvg) };
        stats.push({ label: "Recent Avg", value: currency.format(source.recentAvg) });
        stats.push({
          label: "Monthly Drift",
          value: currency.format(source.delta),
          className: source.delta >= 0 ? "variance-negative" : "variance-positive",
        });
      } else if (source.type === "anomaly") {
        stats[2] = { label: "Flagged Charge", value: currency.format(source.amount), className: "variance-negative" };
        stats.push({ label: "Transaction Date", value: formatDate(source.date) });
      } else if (source.type === "uncategorized") {
        stats[2] = { label: "Uncategorized Spend", value: currency.format(source.expense), className: "variance-negative" };
        stats.push({ label: "Expense Ratio", value: formatPct(toNumber(source.ratio, 0) * 100) });
      } else if (source.type === "cash-withdrawal") {
        stats[2] = { label: "Cash Withdrawn", value: currency.format(source.expense), className: "variance-negative" };
        stats.push({ label: "Expense Ratio", value: formatPct(toNumber(source.ratio, 0) * 100) });
      } else {
        stats.push({ label: "Date Range", value: formatDateRange(transactions) });
      }

      return {
        title: `Opportunity Inspection - ${item.title}`,
        meta: `${item.description} These are the transactions contributing to this opportunity.`,
        transactions,
        emptyMessage: "No transactions currently match this opportunity in the active scope.",
        stats,
      };
    }

    if (inspectKind === "anomaly") {
      const item = (AppState.ai.anomalies || []).find(
        (row) => String(row.inspectId || row.id || "").trim() === inspectId || String(row.id || "").trim() === inspectId
      );
      if (!item) return null;
      const transactions = sortTransactions(this.getTransactionsByIds(item.transactionIds || [item.id]));
      return {
        title: `Anomaly Inspection - ${item.merchant}`,
        meta: `${item.reason}${transactions.length > 1 ? " Related rows are shown for duplicate/anomaly context." : ""}`,
        transactions,
        emptyMessage: "No matching anomaly transactions are available in the current scope.",
        stats: [
          { label: "Priority", value: capitalize(item.priority) },
          { label: "Flagged Amount", value: currency.format(item.amount), className: "variance-negative" },
          { label: "Category", value: item.category || "Uncategorized" },
          { label: "Subcategory", value: item.subcategory || "Other" },
          { label: "Date", value: formatDate(item.date) },
        ],
      };
    }

    return null;
  },

  renderInspectPanel() {
    const panel = document.getElementById("aiInspectPanel");
    const title = document.getElementById("aiInspectTitle");
    const meta = document.getElementById("aiInspectMeta");
    const stats = document.getElementById("aiInspectStats");
    const tbody = document.querySelector("#aiInspectTable tbody");
    if (!(panel && title && meta && stats && tbody)) return;

    const model = this.getInspectModel();
    if (!model) {
      AppState.ai.inspectKind = "";
      AppState.ai.inspectId = "";
      panel.classList.add("is-hidden");
      title.textContent = "Insights Transaction Inspection";
      meta.textContent = "Select Inspect on a summary card, recurring charge, waste opportunity, or anomaly to review the contributing transactions.";
      stats.innerHTML = "";
      tbody.innerHTML = `<tr><td colspan="6">Select Inspect on a summary card, recurring charge, waste opportunity, or anomaly to review contributing transactions.</td></tr>`;
      return;
    }

    const visibleTransactions = model.transactions.slice(0, 200);
    const suffix =
      model.transactions.length > visibleTransactions.length
        ? ` Showing latest ${visibleTransactions.length} of ${model.transactions.length} matching transactions.`
        : ` ${model.transactions.length} matching transactions in scope.`;

    title.textContent = model.title;
    meta.textContent = `${model.meta}${suffix}`;
    stats.innerHTML = model.stats
      .map((stat) => {
        const valueClass = stat.className ? ` class="${escapeHtml(stat.className)}"` : "";
        return `
          <article class="detail-pill">
            <p class="helper">${escapeHtml(stat.label)}</p>
            <strong${valueClass}>${escapeHtml(stat.value)}</strong>
          </article>
        `;
      })
      .join("");

    tbody.innerHTML = visibleTransactions.length
      ? visibleTransactions
          .map((tx) => {
            const amount = toNumber(tx.amount, 0);
            const amountClass = amount >= 0 ? "variance-positive" : "variance-negative";
            return `
              <tr>
                <td>${escapeHtml(formatDate(tx.date))}</td>
                <td>${escapeHtml(tx.description || "")}</td>
                <td>${escapeHtml(tx.category || "Uncategorized")}</td>
                <td>${escapeHtml(tx.subcategory || "Other")}</td>
                <td>${escapeHtml(tx.account || "--")}</td>
                <td class="align-right ${amountClass}">${escapeHtml(currencyPrecise.format(amount))}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="6">${escapeHtml(model.emptyMessage || "No matching transactions in the current Waste & Insights scope.")}</td></tr>`;

    panel.classList.remove("is-hidden");
  },

  renderSummaryCards() {
    const activeRecurring = AppState.ai.subscriptions.filter((item) => item.status === "Active");
    document.getElementById("aiFlaggedSpend").textContent = currency.format(AppState.ai.flaggedAnnualSpend);
    document.getElementById("aiAirbnbLoanRepayments").textContent = currency.format(
      AppState.ai.airbnbLoanRepaymentsAnnual
    );
    document.getElementById("aiFlaggedMeta").textContent =
      AppState.ai.airbnbLoanRepaymentsAnnual > 0
        ? "Operational spend tagged for review (Airbnb loan repayments excluded)"
        : "Spend currently tagged for review actions";
    document.getElementById("aiRecurringRunRate").textContent = currency.format(AppState.ai.recurringRunRate);
    document.getElementById("aiRecurringMeta").textContent = `${activeRecurring.length} active recurring merchant${
      activeRecurring.length === 1 ? "" : "s"
    }`;
    document.getElementById("aiAnomalyCount").textContent = `${AppState.ai.anomalies.length}`;
    document.getElementById("aiUncategorizedSpend").textContent = currency.format(AppState.ai.uncategorizedExpense);
    document.getElementById(
      "aiUncategorizedMeta"
    ).textContent = `${AppState.ai.uncategorizedExpenseCount} uncategorized expense transactions (${formatPct(
      AppState.ai.uncategorizedExpenseRatio * 100
    )})`;
  },

  renderSubscriptions() {
    const banner = document.getElementById("subscriptionInsights");
    const tbody = document.querySelector("#subscriptionTable tbody");
    if (!banner || !tbody) return;

    const subscriptions = AppState.ai.subscriptions;
    if (!subscriptions.length) {
      banner.textContent = "No recurring payment pattern found across available transactions.";
      tbody.innerHTML = `<tr><td colspan="9">No recurring payments detected.</td></tr>`;
      return;
    }

    const activeCount = subscriptions.filter((item) => item.status === "Active").length;
    const annualRunRate = sum(
      subscriptions.filter((item) => item.status === "Active").map((item) => item.annualCost)
    );
    banner.innerHTML = `
      <strong>${activeCount}</strong> active recurring patterns detected. Estimated annual run rate:
      <strong>${currency.format(annualRunRate)}</strong>.
    `;

    tbody.innerHTML = subscriptions
      .map((item) => {
        const statusChip = item.status === "Active" ? "chip ok" : "chip warn";
        return `
          <tr>
            <td>${escapeHtml(item.merchant)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.subcategory)}</td>
            <td>${escapeHtml(item.frequency)} (${escapeHtml(item.confidence)})</td>
            <td class="align-right">${escapeHtml(currency.format(item.averageAmount))}</td>
            <td class="align-right">${escapeHtml(currency.format(item.annualCost))}</td>
            <td>${escapeHtml(formatDate(item.lastSeen))}</td>
            <td><span class="${statusChip}">${escapeHtml(item.status)}</span></td>
            <td class="subscription-inspect-cell">
              <button
                type="button"
                class="btn btn-ghost"
                data-ai-inspect-kind="subscription"
                data-ai-inspect-id="${escapeHtml(item.inspectId)}"
                aria-label="${escapeHtml(`Inspect recurring charges for ${item.merchant}`)}"
              >
                Inspect
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  },

  renderSavingsOpportunities() {
    const container = document.getElementById("savingsOpportunities");
    if (!container) return;
    const opportunities = AppState.ai.opportunities;
    if (!opportunities.length) {
      container.innerHTML = `<p class="helper">No strong opportunities detected from current data.</p>`;
      return;
    }

    container.innerHTML = opportunities
      .map((item) => {
        const priorityClass =
          item.priority === "high"
            ? "priority-high"
            : item.priority === "medium"
            ? "priority-medium"
            : "priority-low";
        const impact = this.getOpportunityImpact(item);
        return `
          <article class="savings-card ${priorityClass}">
            <div class="savings-card-header">
              <div>
                <span class="priority-badge ${priorityClass}">${escapeHtml(item.priority)}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p class="helper">${escapeHtml(item.category)}</p>
              </div>
              <div>
                <strong>${escapeHtml(impact.primaryText)}</strong><br>
                <span class="helper">${escapeHtml(impact.secondaryText)}</span>
              </div>
            </div>
            <p class="helper">${escapeHtml(item.description)}</p>
            <ul>
              ${item.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
            </ul>
            <div class="ai-inspect-actions">
              <button
                type="button"
                class="btn btn-ghost"
                data-ai-inspect-kind="opportunity"
                data-ai-inspect-id="${escapeHtml(item.inspectId)}"
                aria-label="${escapeHtml(`Inspect transactions for ${item.title}`)}"
              >
                Inspect
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  },

  renderAnomalies() {
    const container = document.getElementById("anomaliesList");
    if (!container) return;
    const showHighOnly = document.getElementById("showHighOnly")?.checked;
    const rows = showHighOnly
      ? AppState.ai.anomalies.filter((item) => item.priority === "high")
      : AppState.ai.anomalies;

    if (!rows.length) {
      container.innerHTML = `<p class="helper">No anomalies for the current filter. Planned loan repayments and fixed home insurance are excluded.</p>`;
      return;
    }

    container.innerHTML = rows
      .map((item) => {
        const cardClass = item.priority === "high" ? "priority-high" : "priority-medium";
        return `
          <article class="anomaly-card ${cardClass}">
            <p class="helper">${escapeHtml(formatDate(item.date))}</p>
            <h3>${escapeHtml(item.merchant)}</h3>
            <p class="variance-negative">${escapeHtml(currency.format(item.amount))}</p>
            <p class="helper">${escapeHtml(item.category)} > ${escapeHtml(item.subcategory)}</p>
            <p class="helper">${escapeHtml(item.reason)}</p>
            <div class="ai-inspect-actions">
              <button
                type="button"
                class="btn btn-ghost"
                data-ai-inspect-kind="anomaly"
                data-ai-inspect-id="${escapeHtml(item.inspectId || item.id)}"
                aria-label="${escapeHtml(`Inspect anomaly for ${item.merchant}`)}"
              >
                Inspect
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  },

  populateTrendCategoryOptions() {
    const select = document.getElementById("trendCategorySelect");
    if (!select) return;
    const previous = select.value;
    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions);
    const categories = [
      ...new Set(
        scopedTransactions
          .filter((tx) => includeTransactionInSpending(tx))
          .map((tx) => tx.category)
      ),
    ].sort();
    select.innerHTML = `
      <option value="">Select category...</option>
      ${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}
    `;
    select.value = categories.includes(previous) ? previous : "";
  },

  renderCategoryTrend() {
    const selectedCategory = document.getElementById("trendCategorySelect")?.value;
    const insights = document.getElementById("categoryTrendInsights");
    if (!selectedCategory) {
      ChartManager.remove("categoryTrendCanvas");
      insights.textContent = "Select a category to view trend trajectory and commentary.";
      return;
    }

    const filtered = getGlobalScopedTransactions(AppState.transactions).filter(
      (tx) => includeTransactionInSpending(tx) && tx.category === selectedCategory
    );
    const byMonth = new Map();
    filtered.forEach((tx) => {
      byMonth.set(tx.month, (byMonth.get(tx.month) || 0) + Math.abs(tx.amount));
    });
    const rows = [...byMonth.entries()]
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    ChartManager.set("categoryTrendCanvas", {
      type: "line",
      data: {
        labels: rows.map((row) => formatMonth(row.month)),
        datasets: [
          {
            label: selectedCategory,
            data: rows.map((row) => row.total),
            borderColor: "#d97706",
            backgroundColor: "rgba(217, 119, 6, 0.14)",
            pointRadius: 2,
            tension: 0.25,
          },
        ],
      },
    });

    if (rows.length < 2) {
      insights.textContent = "Not enough monthly points to derive trend insight.";
      return;
    }

    const first = rows[0].total;
    const last = rows[rows.length - 1].total;
    const delta = percentChange(last, first);
    const avg = sum(rows.map((row) => row.total)) / rows.length;
    insights.textContent = `${selectedCategory} moved ${
      delta >= 0 ? "up" : "down"
    } ${Math.abs(delta).toFixed(1)}% from ${formatMonth(rows[0].month)} to ${formatMonth(
      rows[rows.length - 1].month
    )}. Average monthly spend is ${currency.format(avg)}.`;
  },

  renderSubcategoryRules() {
    const tbody = document.querySelector("#subcategoryRulesTable tbody");
    if (!tbody) return;
    if (!AppState.subcategoryRules.length) {
      tbody.innerHTML = `<tr><td colspan="5">No rules added yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = AppState.subcategoryRules
      .map((rule) => {
        const matches = getGlobalScopedTransactions(AppState.transactions).filter((tx) =>
          transactionMatchesRuleKeyword(tx, rule.keyword)
        ).length;
        return `
          <tr>
            <td>${escapeHtml(rule.keyword)}</td>
            <td>${escapeHtml(rule.category)}</td>
            <td>${escapeHtml(rule.subcategory)}</td>
            <td class="align-right">${matches}</td>
            <td>
              <button
                class="btn btn-ghost"
                data-rule-action="delete"
                data-rule-id="${escapeHtml(rule.id)}"
              >
                Delete
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  },

  insertNewRuleRow() {
    const tbody = document.querySelector("#subcategoryRulesTable tbody");
    if (!tbody) return;
    if (document.getElementById("newRuleRow")) return;
    const row = document.createElement("tr");
    row.id = "newRuleRow";
    row.innerHTML = `
      <td><input class="control" id="newRuleKeyword" type="text" placeholder="e.g. NETFLIX"></td>
      <td><input class="control" id="newRuleCategory" type="text" placeholder="Category"></td>
      <td><input class="control" id="newRuleSubcategory" type="text" placeholder="Subcategory"></td>
      <td class="align-right">--</td>
      <td>
        <button class="btn btn-primary" data-rule-action="save-new">Save</button>
        <button class="btn btn-ghost" data-rule-action="cancel-new">Cancel</button>
      </td>
    `;
    tbody.prepend(row);
    document.getElementById("newRuleKeyword")?.focus();
  },

  saveRuleFromRow() {
    const keyword = document.getElementById("newRuleKeyword")?.value.trim();
    const rawCategory = document.getElementById("newRuleCategory")?.value.trim();
    const rawSubcategory = document.getElementById("newRuleSubcategory")?.value.trim();
    if (!keyword || !rawCategory || !rawSubcategory) {
      UI.toast("Rule Incomplete", "Keyword, category, and subcategory are required.", "error");
      return;
    }
    const normalizedTarget = canonicalizeCategorySubcategory(rawCategory, rawSubcategory, rawSubcategory, -1, null);
    AppState.subcategoryRules.push({
      id: createId("rule"),
      keyword,
      category: normalizedTarget.category,
      subcategory: normalizedTarget.subcategory,
    });
    saveStorage(STORAGE_KEYS.subcategoryRules, AppState.subcategoryRules);
    App.applySubcategoryRulesAndRefresh();
    UI.toast("Rule Added", "New subcategory rule is now active.", "success");
  },

  deleteRule(id) {
    AppState.subcategoryRules = AppState.subcategoryRules.filter((rule) => rule.id !== id);
    saveStorage(STORAGE_KEYS.subcategoryRules, AppState.subcategoryRules);
    App.applySubcategoryRulesAndRefresh();
    UI.toast("Rule Removed", "Subcategory rule deleted.", "success");
  },

  renderMerchantResolutionQueue() {
    const meta = document.getElementById("merchantResolutionMeta");
    const tbody = document.querySelector("#merchantResolutionTable tbody");
    const filterSelect = document.getElementById("merchantReviewFilter");
    const sortSelect = document.getElementById("merchantReviewSort");
    if (!(meta && tbody && filterSelect && sortSelect)) return;

    const queue = Array.isArray(AppState.ai.merchantReviewQueue) ? AppState.ai.merchantReviewQueue : [];
    const controls = AppState.merchantReviewControls || { filter: "all", sort: "amount-desc" };
    filterSelect.value = ["all", "suggested", "high-confidence"].includes(String(controls.filter || "all"))
      ? String(controls.filter || "all")
      : "all";
    sortSelect.value = ["amount-desc", "confidence-desc", "latest-desc", "transactions-desc"].includes(
      String(controls.sort || "amount-desc")
    )
      ? String(controls.sort || "amount-desc")
      : "amount-desc";
    const visibleQueue = getMerchantReviewQueueView(queue, controls);
    const hiddenCount = Array.isArray(AppState.merchantReviewHidden) ? AppState.merchantReviewHidden.length : 0;

    meta.textContent = queue.length
      ? `${visibleQueue.length} of ${queue.length} merchant ${
          queue.length === 1 ? "group needs" : "groups need"
        } review. Hidden: ${hiddenCount}.`
      : `No merchant groups need review right now. Hidden: ${hiddenCount}.`;

    if (!visibleQueue.length) {
      tbody.innerHTML = `<tr><td colspan="9">No unresolved or suspicious merchant groups in the current account scope.</td></tr>`;
      return;
    }

    tbody.innerHTML = visibleQueue
      .map(
        (item) => `
          <tr>
            <td>
              <strong>${escapeHtml(item.merchant || "Unknown")}</strong>
              <div class="helper">${escapeHtml(item.sampleDescriptions[0] || "")}</div>
            </td>
            <td>${escapeHtml(item.reasons.join(" | "))}</td>
            <td>${escapeHtml(item.currentCategory)} &gt; ${escapeHtml(item.currentSubcategory)}</td>
            <td>${item.suggestedCategory ? `${escapeHtml(item.suggestedCategory)} &gt; ${escapeHtml(item.suggestedSubcategory)}` : `<span class="helper">No safe suggestion</span>`}</td>
            <td>${item.suggestedCategory ? `${escapeHtml(String(Math.round(item.confidenceScore * 100)))}% ${escapeHtml(item.confidenceLabel)}` : `<span class="helper">--</span>`}</td>
            <td class="align-right">${escapeHtml(String(item.transactionCount))}</td>
            <td class="align-right">${escapeHtml(currency.format(item.totalAmount))}</td>
            <td>${escapeHtml(formatDate(item.latestDate))}</td>
            <td>
              <button class="btn btn-secondary" data-merchant-review-action="resolve" data-merchant-review-key="${escapeHtml(item.key)}">Resolve</button>
              <button class="btn btn-ghost" data-merchant-review-action="view" data-merchant-review-key="${escapeHtml(item.key)}">View</button>
              <button class="btn btn-ghost" data-merchant-review-action="hide" data-merchant-review-key="${escapeHtml(item.key)}">Hide</button>
            </td>
          </tr>
        `
      )
      .join("");
  },

  getMerchantReviewItem(key) {
    const needle = normalizeRuleKeyword(key);
    return (AppState.ai.merchantReviewQueue || []).find((item) => item.key === needle) || null;
  },

  openMerchantResolveDialog(key) {
    const item = this.getMerchantReviewItem(key);
    const dialog = document.getElementById("merchantResolveDialog");
    const meta = document.getElementById("merchantResolveMeta");
    const sample = document.getElementById("merchantResolveSample");
    const keywordInput = document.getElementById("merchantResolveKeyword");
    const categorySelect = document.getElementById("merchantResolveCategory");
    if (!(item && dialog && meta && sample && keywordInput && categorySelect)) return;

    const categories = getTaxonomyCategories();
    categorySelect.innerHTML = categories
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
    const preferredCategory =
      item.suggestedCategory && categories.includes(item.suggestedCategory) ? item.suggestedCategory : item.currentCategory;
    const preferredSubcategory = item.suggestedSubcategory || item.currentSubcategory || "Other";
    categorySelect.value = preferredCategory && categories.includes(preferredCategory) ? preferredCategory : "Uncategorized";
    this.populateMerchantResolveSubcategoryOptions(preferredSubcategory);

    meta.textContent = `${item.merchant} | ${item.transactionCount} tx | ${currency.format(item.totalAmount)} | ${item.reasons.join(", ")}`;
    sample.textContent = item.sampleDescriptions.length ? `Examples: ${item.sampleDescriptions.join(" | ")}` : "";
    if (item.suggestedCategory) {
      sample.textContent += `${sample.textContent ? " | " : ""}Suggested: ${item.suggestedCategory} > ${item.suggestedSubcategory} (${Math.round(
        item.confidenceScore * 100
      )}% ${item.confidenceLabel})`;
    }
    keywordInput.value = item.keyword || item.merchant || "";
    dialog.dataset.merchantReviewKey = item.key;
    dialog.hidden = false;
    keywordInput.focus({ preventScroll: true });
  },

  closeMerchantResolveDialog() {
    const dialog = document.getElementById("merchantResolveDialog");
    if (!dialog) return;
    dialog.hidden = true;
    delete dialog.dataset.merchantReviewKey;
  },

  populateMerchantResolveSubcategoryOptions(preferred = "") {
    const categorySelect = document.getElementById("merchantResolveCategory");
    const subSelect = document.getElementById("merchantResolveSubcategory");
    if (!(categorySelect && subSelect)) return;
    const category = String(categorySelect.value || "Uncategorized").trim() || "Uncategorized";
    const subcategories = getTaxonomySubcategories(category);
    if (!subcategories.length) subcategories.push("Other");
    subSelect.innerHTML = subcategories
      .map((subcategory) => `<option value="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</option>`)
      .join("");
    subSelect.value = subcategories.includes(preferred) ? preferred : subcategories[0];
  },

  applyMerchantResolution() {
    const dialog = document.getElementById("merchantResolveDialog");
    const keywordInput = document.getElementById("merchantResolveKeyword");
    const categorySelect = document.getElementById("merchantResolveCategory");
    const subSelect = document.getElementById("merchantResolveSubcategory");
    if (!(dialog && keywordInput && categorySelect && subSelect)) return;

    const keyword = String(keywordInput.value || "").trim();
    if (!normalizeRuleKeyword(keyword)) {
      UI.toast("Keyword Needed", "Enter a merchant phrase to match future rows.", "error");
      return;
    }

    const rawCategory = String(categorySelect.value || "Uncategorized").trim() || "Uncategorized";
    const rawSubcategory = String(subSelect.value || "Other").trim() || "Other";
    const normalizedTarget = canonicalizeCategorySubcategory(rawCategory, rawSubcategory, rawSubcategory, -1, null);
    const existing = (AppState.subcategoryRules || []).find(
      (rule) => normalizeRuleKeyword(rule.keyword) === normalizeRuleKeyword(keyword)
    );

    if (existing) {
      existing.category = normalizedTarget.category;
      existing.subcategory = normalizedTarget.subcategory;
    } else {
      AppState.subcategoryRules.push({
        id: createId("rule"),
        keyword,
        category: normalizedTarget.category,
        subcategory: normalizedTarget.subcategory,
      });
    }

    saveStorage(STORAGE_KEYS.subcategoryRules, AppState.subcategoryRules);

    const key = String(dialog.dataset.merchantReviewKey || "").trim();
    if (key) {
      AppState.merchantReviewHidden = (AppState.merchantReviewHidden || []).filter(
        (item) => normalizeRuleKeyword(item) !== normalizeRuleKeyword(key)
      );
      saveStorage(STORAGE_KEYS.merchantReviewHidden, AppState.merchantReviewHidden);
    }

    App.applySubcategoryRulesAndRefresh();
    this.closeMerchantResolveDialog();
    UI.toast(
      "Merchant Rule Saved",
      `${normalizedTarget.category} > ${normalizedTarget.subcategory} will now apply automatically.`,
      "success"
    );
  },

  hideMerchantReviewItem(key) {
    const normalized = normalizeRuleKeyword(key);
    if (!normalized) return;
    const current = new Set((AppState.merchantReviewHidden || []).map((item) => normalizeRuleKeyword(item)));
    current.add(normalized);
    AppState.merchantReviewHidden = [...current];
    saveStorage(STORAGE_KEYS.merchantReviewHidden, AppState.merchantReviewHidden);
    this.render();
    UI.toast("Merchant Hidden", "This merchant group is hidden from the review queue.", "info");
  },

  resetHiddenMerchantReviewItems() {
    AppState.merchantReviewHidden = [];
    saveStorage(STORAGE_KEYS.merchantReviewHidden, AppState.merchantReviewHidden);
    this.render();
    UI.toast("Hidden Queue Reset", "All hidden merchant groups are visible again.", "success");
  },

  viewMerchantTransactions(key) {
    const item = this.getMerchantReviewItem(key);
    if (!item) return;
    AppState.transactionFilters.search = item.keyword || item.merchant || "";
    AppState.transactionFilters.page = 1;
    App.navigate("transactions");
    TransactionsController.render();
    UI.toast("Filtered Transactions", `Showing transactions for ${item.merchant}.`, "info");
  },

  renderActionPlan() {
    const container = document.getElementById("actionPlan");
    if (!container) return;
    const opportunities = AppState.ai.opportunities.slice(0, 5);
    const anomalies = AppState.ai.anomalies.filter((item) => item.priority === "high").slice(0, 3);

    const actions = [];
    opportunities.forEach((item, idx) => {
      const impactText = this.getOpportunityImpact(item).actionText;
      actions.push({
        title: `${idx + 1}. ${item.title}`,
        body: `${impactText} ${item.actions[0]}`,
      });
    });
    anomalies.forEach((item) => {
      actions.push({
        title: `Review anomaly: ${item.merchant}`,
        body: `${currency.format(item.amount)} on ${formatDate(item.date)} (${item.category}).`,
      });
    });

    if (!actions.length) {
      container.innerHTML = `<p class="helper">No urgent actions. Continue monitoring trends weekly.</p>`;
      return;
    }

    container.innerHTML = actions
      .map(
        (action) => `
          <article class="action-item">
            <h4>${escapeHtml(action.title)}</h4>
            <p>${escapeHtml(action.body)}</p>
          </article>
        `
      )
      .join("");
  },

  exportInsightsReport() {
    const activeRecurring = AppState.ai.subscriptions.filter((item) => item.status === "Active");
    const lines = [
      "Finance Studio - Insights Report",
      `Generated: ${new Date().toLocaleString("en-AU")}`,
      "",
      `Flagged Spend (Annual): ${currency.format(AppState.ai.flaggedAnnualSpend)}`,
      `Airbnb Loan Repayments (Annual): ${currency.format(AppState.ai.airbnbLoanRepaymentsAnnual)}`,
      `Airbnb Operating Expense (Annual): ${currency.format(AppState.ai.airbnbOperatingExpenseAnnual)}`,
      `Recurring Run Rate: ${currency.format(AppState.ai.recurringRunRate)} (${activeRecurring.length} active merchants)`,
      `Uncategorized Expense: ${currency.format(AppState.ai.uncategorizedExpense)} (${AppState.ai.uncategorizedExpenseCount} transactions)`,
      `Recurring Patterns Detected: ${AppState.ai.subscriptions.length}`,
      `Anomalies Detected: ${AppState.ai.anomalies.length}`,
      "",
      "Top Opportunities:",
      ...AppState.ai.opportunities.slice(0, 5).map(
        (item, idx) => `${idx + 1}. ${item.title} - ${this.getOpportunityImpact(item).reportText} (${item.priority})`
      ),
      "",
      "High Priority Anomalies:",
      ...AppState.ai.anomalies
        .filter((item) => item.priority === "high")
        .slice(0, 5)
        .map(
          (item) =>
            `- ${item.merchant} ${currency.format(item.amount)} on ${formatDate(item.date)} (${item.category})`
        ),
    ];

    downloadBlob(lines.join("\n"), `insights_report_${fileDateStamp()}.txt`, "text/plain");
  },

  render() {
    this.rebuildInsights();
    this.renderSummaryCards();
    this.renderSubscriptions();
    this.renderSavingsOpportunities();
    this.renderAnomalies();
    this.renderInspectPanel();
    this.syncInspectButtons();
    this.populateTrendCategoryOptions();
    this.renderCategoryTrend();
    this.renderSubcategoryRules();
    this.renderMerchantResolutionQueue();
    this.renderActionPlan();
  },
};

const AssistantController = {
  MAX_MESSAGES: 40,
  MAX_UNDO_STACK: 30,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  MAX_DATA_FILE_BYTES: 10 * 1024 * 1024,
  DEFAULT_IMAGE_ONLY_QUESTION: "Tell me what this screenshot shows and any useful financial observations.",
  ALLOWED_IMAGE_TYPES: new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]),
  ALLOWED_DATA_EXTENSIONS: new Set(["csv", "txt", "docx", "pdf"]),
  dragDepth: 0,

  getAssistantDisplayName() {
    return ASSISTANT_BRAND_NAME;
  },

  getAssistantNickname() {
    return ASSISTANT_NICKNAME;
  },

  getAssistantMode() {
    return String(AppState.assistant.mode || "finance").toLowerCase() === "chat" ? "chat" : "finance";
  },

  isFinanceMode() {
    return this.getAssistantMode() === "finance";
  },

  isWebLookupEnabled() {
    return Boolean(AppState.assistant.webLookupEnabled);
  },

  setWebLookupEnabled(enabled, options = {}) {
    const normalized = false;
    const previous = this.isWebLookupEnabled();
    AppState.assistant.webLookupEnabled = normalized;
    if (options.persist !== false) {
      saveStorage(STORAGE_KEYS.assistantWebLookup, normalized ? "on" : "off");
    }
    this.renderWebLookupToggle();
    this.updateStatus();
    if (options.announce !== false && previous !== normalized) {
      this.pushMessage(
        "assistant",
        normalized
          ? OFFLINE_AI_MESSAGE
          : "Web lookup is unavailable. Local tools use only the loaded records."
      );
    }
  },

  renderWebLookupToggle() {
    const button = document.getElementById("assistantWebLookupToggle");
    if (!button) return;
    button.disabled = true;
    button.title = OFFLINE_AI_MESSAGE;
    const enabled = this.isWebLookupEnabled();
    button.classList.toggle("active", enabled);
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.textContent = enabled ? "Web Lookup: On" : "Web Lookup: Off";
  },

  isFinanceAnalysisRequest(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    const financeKeywords = [
      "budget",
      "spending",
      "spend",
      "expense",
      "expenses",
      "income",
      "cashflow",
      "transaction",
      "transactions",
      "subscription",
      "subscriptions",
      "recurring",
      "merchant",
      "category",
      "categories",
      "variance",
      "account",
      "accounts",
      "deposit",
      "deposits",
      "transfer",
      "transfers",
      "monthly",
      "annually",
      "annual",
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    return financeKeywords.some((keyword) => text.includes(keyword));
  },

  getModeAwareImageQuestion() {
    return this.isFinanceMode()
      ? this.DEFAULT_IMAGE_ONLY_QUESTION
      : "Tell me what you can see in this screenshot in plain language.";
  },

  setAssistantMode(mode, options = {}) {
    const normalized = String(mode || "").toLowerCase() === "chat" ? "chat" : "finance";
    const previous = this.getAssistantMode();
    AppState.assistant.mode = normalized;
    if (options.persist !== false) {
      saveStorage(STORAGE_KEYS.assistantMode, normalized);
    }
    AppState.assistant.pendingAction = null;
    AppState.assistant.lastStagedAction = null;
    AppState.assistant.lastFacts = null;
    AppState.assistant.lastQueryResult = null;
    this.renderModeToggle();
    this.updateComposeForMode();
    this.renderActionButtons();
    this.updateStatus();
    if (options.announce !== false && previous !== normalized) {
      const modeLabel = normalized === "finance" ? "Finance mode" : "Chat mode";
      const blurb =
        normalized === "finance"
          ? `${ASSISTANT_BRAND_NAME} is in Finance mode: data-grounded answers, plus in-app changes with confirmation/undo.`
          : `${ASSISTANT_BRAND_NAME} is in Chat mode: casual conversation and general questions.`;
      this.pushMessage("assistant", `${modeLabel} enabled.\n${blurb}`);
    }
  },

  renderModeToggle() {
    const mode = this.getAssistantMode();
    const financeBtn = document.getElementById("assistantModeFinance");
    const chatBtn = document.getElementById("assistantModeChat");
    const setState = (button, isActive) => {
      if (!button) return;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    };
    setState(financeBtn, mode === "finance");
    setState(chatBtn, mode === "chat");
  },

  updateComposeForMode() {
    const mode = this.getAssistantMode();
    const input = document.getElementById("assistantInput");
    if (input) {
      input.placeholder =
        mode === "finance"
          ? "Example: Why did my net cashflow drop in January? (You can also paste or drag in a screenshot)"
          : "Chat with BudgetBuddy (Buddy). Ask anything, or paste/drag a screenshot.";
    }
    const scopeField = document.getElementById("assistantAccountScopeField");
    if (scopeField) {
      scopeField.hidden = mode !== "finance";
    }
    const sendButton = document.getElementById("assistantSend");
    if (sendButton) {
      sendButton.textContent = mode === "finance" ? "Ask Assistant" : "Send to Buddy";
    }
    this.renderWebLookupToggle();
  },

  init() {
    document.getElementById("assistantSend")?.addEventListener("click", () => {
      this.ask();
    });

    document.getElementById("assistantClear")?.addEventListener("click", () => {
      AppState.assistant.messages = [];
      AppState.assistant.lastFacts = null;
      AppState.assistant.lastQueryResult = null;
      AppState.assistant.lastBudgetContext = null;
      AppState.assistant.pendingAction = null;
      AppState.assistant.lastStagedAction = null;
      AppState.assistant.uploadedDataContext = null;
      this.clearPendingImage();
      this.clearPendingDataFile();
      this.ensureWelcomeMessage();
      this.render();
    });

    document.getElementById("assistantConfirmAction")?.addEventListener("click", () => {
      this.confirmPendingAction();
    });

    document.getElementById("assistantUndoAction")?.addEventListener("click", () => {
      this.undoLastAssistantChange();
    });

    document.getElementById("assistantInput")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.ask();
      }
    });

    document.getElementById("assistantInput")?.addEventListener("paste", (event) => {
      const items = Array.from(event.clipboardData?.items || []);
      const imageItem = items.find((item) => this.ALLOWED_IMAGE_TYPES.has(String(item.type || "").toLowerCase()));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      event.preventDefault();
      this.handleImageFile(file);
    });

    document.getElementById("assistantAttachImage")?.addEventListener("click", () => {
      if (AppState.assistant.isLoading) return;
      document.getElementById("assistantImageInput")?.click();
    });

    document.getElementById("assistantAttachData")?.addEventListener("click", () => {
      if (AppState.assistant.isLoading) return;
      document.getElementById("assistantDataInput")?.click();
    });

    document.getElementById("assistantImageInput")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) {
        this.handleImageFile(file);
      }
      event.target.value = "";
    });

    document.getElementById("assistantDataInput")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) {
        this.handleDataFile(file);
      }
      event.target.value = "";
    });

    document.getElementById("assistantRemoveImage")?.addEventListener("click", () => {
      this.clearPendingImage();
    });

    document.getElementById("assistantRemoveData")?.addEventListener("click", () => {
      this.clearPendingDataFile();
      AppState.assistant.uploadedDataContext = null;
      UI.toast("Data File Removed", "Assistant uploaded file context cleared.", "success");
    });

    document.getElementById("assistantAccountFilter")?.addEventListener("change", (event) => {
      App.setGlobalAccountScope(String(event.target.value || "all"), { source: "assistant" });
    });

    document.getElementById("assistantModeToggle")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-assistant-mode]");
      if (!button) return;
      this.setAssistantMode(String(button.getAttribute("data-assistant-mode") || "finance"), { announce: true });
    });

    document.getElementById("assistantWebLookupToggle")?.addEventListener("click", () => {
      if (AppState.assistant.isLoading) return;
      this.setWebLookupEnabled(!this.isWebLookupEnabled(), { announce: true });
    });

    const compose = document.getElementById("assistantCompose");
    if (compose) {
      compose.addEventListener("dragenter", (event) => {
        if (!this.hasImageInDrag(event.dataTransfer)) return;
        event.preventDefault();
        this.dragDepth += 1;
        compose.classList.add("drag-active");
      });

      compose.addEventListener("dragover", (event) => {
        if (!this.hasImageInDrag(event.dataTransfer)) return;
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        compose.classList.add("drag-active");
      });

      compose.addEventListener("dragleave", (event) => {
        if (!this.hasImageInDrag(event.dataTransfer)) return;
        event.preventDefault();
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        if (!this.dragDepth) {
          compose.classList.remove("drag-active");
        }
      });

      compose.addEventListener("drop", (event) => {
        if (!this.hasImageInDrag(event.dataTransfer)) return;
        event.preventDefault();
        this.dragDepth = 0;
        compose.classList.remove("drag-active");
        const file = this.getImageFileFromDataTransfer(event.dataTransfer);
        if (file) {
          this.handleImageFile(file);
        } else {
          UI.toast("No Image Found", "Drop an image file onto the question box.", "error");
        }
      });
    }

    this.ensureWelcomeMessage();
    this.renderAccountOptions();
    this.renderModeToggle();
    this.renderWebLookupToggle();
    this.updateComposeForMode();
    this.render();
  },

  createMessage(role, content, options = {}) {
    return {
      id: createId("assistantMsg"),
      role,
      content: String(content || "").trim(),
      imageDataUrl: typeof options.imageDataUrl === "string" ? options.imageDataUrl : "",
      imageName: typeof options.imageName === "string" ? options.imageName : "",
      createdAt: new Date().toISOString(),
    };
  },

  isValidImageType(type = "") {
    return this.ALLOWED_IMAGE_TYPES.has(String(type || "").toLowerCase());
  },

  hasImageInDrag(dataTransfer) {
    if (!dataTransfer) return false;
    const files = Array.from(dataTransfer.files || []);
    if (files.some((file) => this.isValidImageType(file.type))) return true;
    const items = Array.from(dataTransfer.items || []);
    return items.some((item) => this.isValidImageType(item.type));
  },

  getImageFileFromDataTransfer(dataTransfer) {
    if (!dataTransfer) return null;
    const fileFromFiles = Array.from(dataTransfer.files || []).find((file) =>
      this.isValidImageType(file.type)
    );
    if (fileFromFiles) return fileFromFiles;
    const fileFromItems = Array.from(dataTransfer.items || [])
      .find((item) => this.isValidImageType(item.type))
      ?.getAsFile();
    return fileFromItems || null;
  },

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read the image file."));
      reader.readAsDataURL(file);
    });
  },

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read the data file."));
      reader.readAsText(file);
    });
  },

  getFileExtension(fileName = "") {
    const name = String(fileName || "").trim();
    const pos = name.lastIndexOf(".");
    if (pos < 0 || pos === name.length - 1) return "";
    return name.slice(pos + 1).toLowerCase();
  },

  isValidDataFile(file) {
    if (!file) return false;
    const ext = this.getFileExtension(file.name || "");
    return this.ALLOWED_DATA_EXTENSIONS.has(ext);
  },

  buildPayPalDataContext(rows = [], fileName = "") {
    const debits = rows
      .filter((row) => normalizeLabel(row.status) === "completed")
      .filter((row) => toNumber(String(row.gross || "").replace(/[^0-9.-]/g, ""), 0) < 0)
      .filter((row) => String(row.name || "").trim())
      .map((row) => {
        const amount = Math.abs(toNumber(String(row.gross || "").replace(/[^0-9.-]/g, ""), 0));
        return {
          date: parseFlexibleDate(row.date),
          supplier: String(row.name || "").trim(),
          amount: Number(amount.toFixed(2)),
          currency: String(row.currency || "").trim() || "AUD",
          type: String(row.type || "").trim(),
          item_title: String(row["item title"] || "").trim(),
          invoice_number: String(row["invoice number"] || "").trim(),
          transaction_id: String(row["transaction id"] || "").trim(),
          to_email: String(row["to email"] || "").trim(),
        };
      });

    const suppliers = {};
    debits.forEach((row) => {
      const key = row.supplier || "Unknown";
      suppliers[key] = Number((toNumber(suppliers[key], 0) + row.amount).toFixed(2));
    });

    const topSuppliers = Object.entries(suppliers)
      .map(([supplier, total]) => ({ supplier, total: Number(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    const dates = debits.map((row) => row.date).filter(Boolean).sort();
    const sample = debits
      .slice(-200)
      .map((row) => ({
        date: row.date,
        supplier: row.supplier,
        amount: row.amount,
        currency: row.currency,
        item_title: row.item_title,
        invoice_number: row.invoice_number,
        transaction_id: row.transaction_id,
      }))
      .slice(0, 80);

    return {
      source_type: "paypal_activity_csv",
      file_name: String(fileName || "uploaded.csv"),
      loaded_at: new Date().toISOString(),
      records_total: rows.length,
      records_completed_debits: debits.length,
      date_from: dates[0] || "",
      date_to: dates[dates.length - 1] || "",
      total_debit_amount: Number(sum(debits.map((row) => row.amount)).toFixed(2)),
      top_suppliers: topSuppliers,
      sample_transactions: sample,
    };
  },

  buildGenericDataContext(rows = [], fileName = "") {
    const headers = rows.length ? Object.keys(rows[0] || {}) : [];
    const sample = rows.slice(0, 80).map((row) => {
      const compact = {};
      headers.slice(0, 12).forEach((key) => {
        compact[key] = String(row[key] || "").trim();
      });
      return compact;
    });
    return {
      source_type: "generic_csv",
      file_name: String(fileName || "uploaded.csv"),
      loaded_at: new Date().toISOString(),
      records_total: rows.length,
      headers: headers.slice(0, 40),
      sample_rows: sample,
    };
  },

  buildTextDataContext(text = "", fileName = "", sourceType = "document_text") {
    const raw = String(text || "").trim();
    const normalized = raw.replace(/\r/g, "");
    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const excerpt = lines.slice(0, 120).join("\n").slice(0, 16000);
    const wordCount = normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
    return {
      source_type: sourceType,
      file_name: String(fileName || "uploaded.txt"),
      loaded_at: new Date().toISOString(),
      text_word_count: wordCount,
      text_line_count: lines.length,
      extracted_text_excerpt: excerpt,
    };
  },

  buildUploadedDataContext(fileName = "", text = "", fileType = "csv") {
    if (fileType === "docx") {
      return this.buildTextDataContext(text, fileName, "word_docx_text");
    }
    if (fileType === "pdf") {
      return this.buildTextDataContext(text, fileName, "pdf_text");
    }
    const rows = parseCsvText(String(text || ""));
    const isPayPalCsv =
      rows.length > 0 && ["date", "name", "type", "status", "gross", "transaction id"].every((key) => key in rows[0]);
    if (isPayPalCsv) return this.buildPayPalDataContext(rows, fileName);
    if (rows.length > 1) return this.buildGenericDataContext(rows, fileName);
    return this.buildTextDataContext(text, fileName, "plain_text");
  },

  async readDocxAsText(file) {
    if (!window.mammoth || typeof window.mammoth.extractRawText !== "function") {
      throw new Error("DOCX parser is unavailable in this build.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return String(result?.value || "").trim();
  },

  async readPdfAsText(file) {
    const pdfjs = window.pdfjsLib;
    if (!pdfjs || typeof pdfjs.getDocument !== "function") {
      throw new Error("PDF parser is unavailable in this build.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageCount = Math.min(pdf.numPages || 0, 25);
    const chunks = [];
    for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const line = (content.items || [])
        .map((item) => String(item?.str || "").trim())
        .filter(Boolean)
        .join(" ");
      if (line) chunks.push(line);
    }
    return chunks.join("\n").trim();
  },

  setPendingDataFile(context = null) {
    AppState.assistant.pendingDataFile = context || null;
    this.renderPendingDataFile();
  },

  clearPendingDataFile() {
    AppState.assistant.pendingDataFile = null;
    this.renderPendingDataFile();
  },

  renderPendingDataFile() {
    const wrapper = document.getElementById("assistantDataPreview");
    const nameEl = document.getElementById("assistantDataPreviewName");
    const metaEl = document.getElementById("assistantDataPreviewMeta");
    const pending = AppState.assistant.pendingDataFile;
    if (!wrapper || !nameEl || !metaEl) return;

    if (!pending?.file_name) {
      wrapper.hidden = true;
      nameEl.textContent = "Data file attached";
      metaEl.textContent = "Ready to send with your question.";
      return;
    }

    const source = String(pending.source_type || "uploaded_csv");
    nameEl.textContent = pending.file_name || "Data file attached";
    if (source.includes("text") || source.includes("docx") || source.includes("pdf")) {
      const words = toNumber(pending.text_word_count, 0);
      metaEl.textContent = `${words.toLocaleString("en-AU")} words extracted (${source}).`;
    } else {
      const rowCount = toNumber(pending.records_completed_debits ?? pending.records_total, 0);
      metaEl.textContent = `${rowCount.toLocaleString("en-AU")} rows detected (${source}).`;
    }
    wrapper.hidden = false;
  },

  async handleDataFile(file) {
    if (!file) return;
    if (!this.isValidDataFile(file)) {
      UI.toast("Unsupported File", "Use CSV, TXT, DOCX, or PDF files.", "error");
      return;
    }
    if (file.size > this.MAX_DATA_FILE_BYTES) {
      UI.toast("File Too Large", "Use a data file smaller than 10 MB.", "error");
      return;
    }
    try {
      const ext = this.getFileExtension(file.name || "");
      let text = "";
      if (ext === "docx") text = await this.readDocxAsText(file);
      else if (ext === "pdf") text = await this.readPdfAsText(file);
      else text = await this.readFileAsText(file);
      if (!String(text || "").trim()) {
        throw new Error("No readable text was extracted from this file.");
      }
      const context = this.buildUploadedDataContext(file.name || "uploaded.csv", text, ext || "csv");
      this.setPendingDataFile(context);
      UI.toast("Data File Attached", "Ask your question to use this file in assistant context.", "success");
    } catch (error) {
      UI.toast("Attach Failed", String(error?.message || error), "error");
    }
  },

  setPendingImage(imageDataUrl = "", imageName = "Screenshot") {
    AppState.assistant.pendingImage = {
      dataUrl: String(imageDataUrl || ""),
      name: String(imageName || "Screenshot"),
    };
    this.renderPendingImage();
  },

  clearPendingImage() {
    AppState.assistant.pendingImage = null;
    this.renderPendingImage();
  },

  renderPendingImage() {
    const wrapper = document.getElementById("assistantImagePreview");
    const nameEl = document.getElementById("assistantImagePreviewName");
    const metaEl = document.getElementById("assistantImagePreviewMeta");
    const pending = AppState.assistant.pendingImage;
    if (!wrapper || !nameEl || !metaEl) return;

    if (!pending?.dataUrl) {
      wrapper.hidden = true;
      nameEl.textContent = "Image attached";
      metaEl.textContent = "Ready to send with your question.";
      return;
    }

    nameEl.textContent = pending.name || "Image attached";
    metaEl.textContent = "Attached and ready to send.";
    wrapper.hidden = false;
  },

  async handleImageFile(file) {
    if (!file) return;
    if (!this.isValidImageType(file.type)) {
      UI.toast("Unsupported Image", "Use PNG, JPG, WEBP, or GIF.", "error");
      return;
    }
    if (file.size > this.MAX_IMAGE_BYTES) {
      UI.toast("Image Too Large", "Use an image smaller than 5 MB.", "error");
      return;
    }
    try {
      const dataUrl = await this.readFileAsDataUrl(file);
      if (!/^data:image\//i.test(dataUrl)) {
        throw new Error("Image data could not be read.");
      }
      this.setPendingImage(dataUrl, file.name || "Screenshot");
      UI.toast("Image Attached", "Screenshot is ready. Ask your question now.", "success");
    } catch (error) {
      UI.toast("Attach Failed", String(error?.message || error), "error");
    }
  },

  ensureWelcomeMessage() {
    if (AppState.assistant.messages.length) return;
    const financeMessage = `${this.getAssistantDisplayName()} here. In Finance mode I answer questions using your loaded data and can apply budget/category changes with confirmation and undo.`;
    const chatMessage = `${this.getAssistantDisplayName()} here (you can call me ${this.getAssistantNickname()}). In Chat mode we can talk naturally about anything, and I can still comment on screenshots.`;
    AppState.assistant.messages.push(
      this.createMessage(
        "assistant",
        this.isFinanceMode() ? financeMessage : chatMessage
      )
    );
  },

  getBaseTransactions() {
    return getGlobalScopedTransactions(AppState.transactions);
  },

  renderAccountOptions() {
    const select = document.getElementById("assistantAccountFilter");
    if (!select) return;
    const previous = normalizeAccountScope(
      AppState.globalAccountScope || AppState.assistant.account || select.value || "all",
      AppState.transactions
    );
    const accounts = getAvailableAccounts();
    select.innerHTML = `
      <option value="all">All Accounts (Combined)</option>
      ${accounts.map((account) => `<option value="${escapeHtml(account)}">${escapeHtml(account)}</option>`).join("")}
    `;
    const next = accounts.includes(previous) ? previous : "all";
    select.value = next;
    AppState.assistant.account = next;
    AppState.globalAccountScope = next;
  },

  updateStatus(customText = "") {
    const statusEl = document.getElementById("assistantStatus");
    if (!statusEl) return;
    const webLookupSuffix = this.isWebLookupEnabled() ? " + Web Lookup" : "";
    if (customText) {
      statusEl.textContent = customText;
      return;
    }
    if (AppState.assistant.isLoading) {
      statusEl.textContent = "Status: Thinking...";
      return;
    }
    if (!this.isFinanceMode()) {
      statusEl.textContent = `Status: Chat mode${webLookupSuffix} (${this.getAssistantDisplayName()} / ${this.getAssistantNickname()})`;
      return;
    }
    const accountRows = this.getBaseTransactions();
    if (!accountRows.length) {
      statusEl.textContent =
        AppState.transactions.length && AppState.globalAccountScope !== "all"
          ? "Status: No transactions in selected assistant account"
          : "Status: Load data to start Q&A";
      return;
    }
    const accountLabel =
      AppState.globalAccountScope === "all"
        ? "all accounts"
        : `account: ${AppState.globalAccountScope}`;
    statusEl.textContent = `Status: Ready${webLookupSuffix} (${accountRows.length.toLocaleString("en-AU")} transactions, ${accountLabel})`;
  },

  formatMessageTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  },

  renderMessageText(value) {
    return escapeHtml(String(value || "")).replace(/\n/g, "<br>");
  },

  renderMessageImage(message) {
    const imageDataUrl = String(message?.imageDataUrl || "");
    if (!/^data:image\//i.test(imageDataUrl)) return "";
    if (!imageDataUrl) return "";
    const name = escapeHtml(String(message?.imageName || "Attached screenshot"));
    return `<img class="assistant-inline-image" src="${imageDataUrl}" alt="${name}">`;
  },

  renderMessages() {
    const container = document.getElementById("assistantMessages");
    if (!container) return;

    if (!AppState.assistant.messages.length) {
      container.innerHTML = `<p class="assistant-empty">Ask a question to start.</p>`;
      return;
    }

    container.innerHTML = AppState.assistant.messages
      .map((message) => {
        const roleLabel = message.role === "user" ? "You" : this.getAssistantDisplayName();
        const timeLabel = this.formatMessageTime(message.createdAt);
        const roleClass = message.role === "user" ? "user" : "assistant";
        return `
          <article class="assistant-message ${roleClass}">
            <div class="assistant-message-header">
              <strong>${roleLabel}</strong>
              <span>${escapeHtml(timeLabel)}</span>
            </div>
            <div class="assistant-message-content">${this.renderMessageText(message.content)}</div>
            ${this.renderMessageImage(message)}
          </article>
        `;
      })
      .join("");

    container.scrollTop = container.scrollHeight;
  },

  render() {
    this.ensureWelcomeMessage();
    this.renderAccountOptions();
    this.renderModeToggle();
    this.updateComposeForMode();
    this.renderPendingImage();
    this.renderPendingDataFile();
    this.renderMessages();
    this.renderActionButtons();
    this.updateStatus();
  },

  pushMessage(role, content, options = {}) {
    AppState.assistant.messages.push(this.createMessage(role, content, options));
    if (AppState.assistant.messages.length > this.MAX_MESSAGES) {
      AppState.assistant.messages = AppState.assistant.messages.slice(-this.MAX_MESSAGES);
    }
    this.renderMessages();
  },

  renderActionButtons() {
    const confirmButton = document.getElementById("assistantConfirmAction");
    const undoButton = document.getElementById("assistantUndoAction");
    const financeMode = this.isFinanceMode();
    const hasPending = financeMode && Boolean(AppState.assistant.pendingAction);
    const undoCount = Array.isArray(AppState.assistant.undoStack) ? AppState.assistant.undoStack.length : 0;

    if (confirmButton) {
      confirmButton.hidden = !hasPending;
      confirmButton.disabled = AppState.assistant.isLoading || !hasPending;
      if (hasPending) {
        confirmButton.textContent = "Apply Pending Change";
        confirmButton.title = this.describeAssistantAction(AppState.assistant.pendingAction);
      } else {
        confirmButton.title = "";
      }
    }

    if (undoButton) {
      undoButton.hidden = !financeMode;
      undoButton.disabled = AppState.assistant.isLoading || undoCount === 0 || !financeMode;
      undoButton.textContent = undoCount > 0 ? `Undo Last Change (${undoCount})` : "Undo Last Change";
    }
  },

  persistBudgetState() {
    AppState.budgetItems = normalizeBudgetItems(AppState.budgetItems);
    saveStorage(STORAGE_KEYS.budgetItems, AppState.budgetItems);
    saveStorage(STORAGE_KEYS.budgetMeta, {
      version: BUDGET_BASELINE_VERSION,
      signature: buildBudgetDataSignature(AppState.transactions),
    });
  },

  pushUndoSnapshot(reasonText) {
    if (!Array.isArray(AppState.assistant.undoStack)) {
      AppState.assistant.undoStack = [];
    }
    AppState.assistant.undoStack.push({
      id: createId("assistantUndo"),
      createdAt: new Date().toISOString(),
      reason: String(reasonText || "Assistant change"),
      budgetItems: JSON.parse(JSON.stringify(AppState.budgetItems)),
      budgetDetail: AppState.budgetDetail ? { ...AppState.budgetDetail } : null,
      transactions: JSON.parse(JSON.stringify(AppState.transactions || [])),
      subcategoryRules: JSON.parse(JSON.stringify(AppState.subcategoryRules || [])),
      categoryDetail: AppState.categoryDetail ? { ...AppState.categoryDetail } : null,
    });
    if (AppState.assistant.undoStack.length > this.MAX_UNDO_STACK) {
      AppState.assistant.undoStack = AppState.assistant.undoStack.slice(-this.MAX_UNDO_STACK);
    }
  },

  setBudgetContextFromRow(row) {
    if (!row?.id) return;
    AppState.assistant.lastBudgetContext = {
      rowId: row.id,
      category: String(row.category || ""),
      item: String(row.item || ""),
      updatedAt: new Date().toISOString(),
    };
  },

  clearBudgetContext() {
    AppState.assistant.lastBudgetContext = null;
  },

  getBudgetContextRow() {
    const context = AppState.assistant.lastBudgetContext;
    if (!context?.rowId) return null;
    const row = (AppState.budgetItems || []).find((item) => item.id === context.rowId);
    if (row) return row;
    this.clearBudgetContext();
    return null;
  },

  inferBudgetLineFromText(text = "") {
    const normalizedText = this.normalizeActionReference(text);
    if (!normalizedText) return null;

    let best = null;
    let bestScore = 0;
    (AppState.budgetItems || []).forEach((row) => {
      const category = this.normalizeActionReference(row.category);
      const item = this.normalizeActionReference(row.item);
      const singularItem = singularizeLabel(item);
      const singularCategory = singularizeLabel(category);
      const combo = `${category} ${item}`.trim();

      let score = 0;
      if (combo && normalizedText.includes(combo)) score += 10;
      if (item && normalizedText.includes(item)) score += 7;
      if (singularItem && singularItem !== item && normalizedText.includes(singularItem)) score += 5;
      if (category && normalizedText.includes(category)) score += 4;
      if (singularCategory && singularCategory !== category && normalizedText.includes(singularCategory)) score += 2;

      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    });

    return bestScore >= 6 ? best : null;
  },

  inferBudgetLineFromRecentMessages() {
    const recent = (AppState.assistant.messages || []).slice(-10).reverse();
    for (const msg of recent) {
      const row = this.inferBudgetLineFromText(msg?.content || "");
      if (row) return row;
    }
    return null;
  },

  resolveBudgetReference(referenceText = "", questionText = "") {
    const normalized = this.normalizeActionReference(referenceText);
    const pronounRefs = new Set([
      "",
      "this",
      "that",
      "it",
      "this one",
      "that one",
      "this budget",
      "that budget",
      "this line",
      "that line",
      "this item",
      "that item",
    ]);

    if (!pronounRefs.has(normalized)) {
      return referenceText;
    }

    const contextRow = this.getBudgetContextRow() || this.inferBudgetLineFromRecentMessages();
    if (!contextRow) return referenceText;
    this.setBudgetContextFromRow(contextRow);
    return `${contextRow.category} > ${contextRow.item}`;
  },

  normalizeActionReference(value = "") {
    return normalizeLabel(value)
      .replace(/\band\b/g, " ")
      .replace(/\bthe\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  findBudgetLine(referenceText = "") {
    const reference = this.normalizeActionReference(referenceText);
    if (!reference) {
      return { status: "missing", row: null, matches: [] };
    }

    const rows = AppState.budgetItems || [];
    const comboExact = rows.filter((row) => {
      const combo = this.normalizeActionReference(`${row.category} ${row.item}`);
      const comboArrow = this.normalizeActionReference(`${row.category} > ${row.item}`);
      const comboColon = this.normalizeActionReference(`${row.category}: ${row.item}`);
      return reference === combo || reference === comboArrow || reference === comboColon;
    });
    if (comboExact.length === 1) return { status: "ok", row: comboExact[0], matches: comboExact };
    if (comboExact.length > 1) return { status: "ambiguous", row: null, matches: comboExact };

    const itemExact = rows.filter((row) => this.normalizeActionReference(row.item) === reference);
    if (itemExact.length === 1) return { status: "ok", row: itemExact[0], matches: itemExact };
    if (itemExact.length > 1) return { status: "ambiguous", row: null, matches: itemExact };

    const categoryExact = rows.filter(
      (row) => this.normalizeActionReference(row.category) === reference
    );
    if (categoryExact.length === 1) return { status: "ok", row: categoryExact[0], matches: categoryExact };
    if (categoryExact.length > 1) return { status: "ambiguous", row: null, matches: categoryExact };

    const fuzzy = rows.filter((row) => {
      const category = this.normalizeActionReference(row.category);
      const item = this.normalizeActionReference(row.item);
      const combo = `${category} ${item}`.trim();
      return (
        combo.includes(reference) ||
        reference.includes(combo) ||
        category.includes(reference) ||
        reference.includes(category) ||
        item.includes(reference) ||
        reference.includes(item)
      );
    });
    if (fuzzy.length === 1) return { status: "ok", row: fuzzy[0], matches: fuzzy };
    if (fuzzy.length > 1) return { status: "ambiguous", row: null, matches: fuzzy };

    return { status: "not_found", row: null, matches: [] };
  },

  getBudgetRowsByCategory(referenceText = "") {
    const categoryRef = this.normalizeActionReference(referenceText);
    if (!categoryRef) return [];
    return (AppState.budgetItems || []).filter(
      (row) => this.normalizeActionReference(row.category) === categoryRef
    );
  },

  selectPrimaryBudgetLineForCategory(referenceText = "", preferredItemHint = "") {
    const rows = this.getBudgetRowsByCategory(referenceText);
    if (!rows.length) return null;

    const categoryNorm = this.normalizeActionReference(referenceText);
    const singularCategory = singularizeLabel(categoryNorm);
    const preferredItemNorm = this.normalizeActionReference(preferredItemHint);

    const scored = rows
      .map((row) => {
        const itemNorm = this.normalizeActionReference(row.item);
        const singularItem = singularizeLabel(itemNorm);
        let score = 0;

        if (
          preferredItemNorm &&
          (itemNorm === preferredItemNorm ||
            itemNorm.includes(preferredItemNorm) ||
            preferredItemNorm.includes(itemNorm))
        ) {
          score += 24;
        }

        if (
          itemNorm &&
          (itemNorm === categoryNorm ||
            itemNorm === singularCategory ||
            singularItem === singularCategory)
        ) {
          score += 16;
        }

        if (/\b(general|other|main|core|default|primary)\b/.test(itemNorm)) {
          score += 8;
        }

        score += Math.min(6, Math.round(toNumber(row.seeded_actual, 0) / 1000));
        score += Math.min(5, Math.round(toNumber(row.annual_budget, 0) / 5000));

        return {
          row,
          score,
          annualBudget: toNumber(row.annual_budget, 0),
        };
      })
      .sort((a, b) => b.score - a.score || b.annualBudget - a.annualBudget);

    return scored[0]?.row || rows[0];
  },

  findBudgetLineWithCategoryFallback(referenceText = "", options = {}) {
    const direct = this.findBudgetLine(referenceText);
    if (direct.status === "ok") return direct;

    const allowCategoryFallback = Boolean(options?.allowCategoryFallback);
    if (!allowCategoryFallback) return direct;

    const fallbackRow = this.selectPrimaryBudgetLineForCategory(
      referenceText,
      String(options?.preferredItemHint || "")
    );
    if (!fallbackRow) return direct;

    return {
      status: "ok",
      row: fallbackRow,
      matches: [fallbackRow],
      fallback: "category_primary",
    };
  },

  parseBatchReferenceList(referenceText = "") {
    const cleaned = String(referenceText || "")
      .replace(/^[\-*]\s*/, "")
      .replace(
        /\b(?:set|update|change|adjust|allocate|distribute|spread|split|divide|rebalance)\b/gi,
        " "
      )
      .replace(/\bbudget(?:\s+for)?\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return [];

    const parts = cleaned
      .split(/\s*(?:,|;|\band\b|\n)\s*/i)
      .map((part) => part.replace(/^[\-*]\s*/, "").trim().replace(/[.?!]$/, ""))
      .filter(Boolean);

    return Array.from(new Set(parts));
  },

  buildBudgetUpdateFromReference(referenceRaw = "", amount = NaN, sourceText = "") {
    const numericAmount = Number(toNumber(amount, NaN));
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return { update: null, unresolved: "" };
    }

    const cleanedReference = String(referenceRaw || "")
      .replace(
        /^(?:set\s+budget\s+for|set\s+budget|budget\s+for|set|update|change|adjust)\s+/i,
        ""
      )
      .replace(/\s+(?:annual|annually|per\s+year)\b/gi, "")
      .trim()
      .replace(/[.?!]$/, "");

    if (!cleanedReference) {
      return { update: null, unresolved: "" };
    }

    const reference = this.resolveBudgetReference(cleanedReference, sourceText);
    const allowCategoryFallback = !/[>:]/.test(String(reference || ""));
    const match = this.findBudgetLineWithCategoryFallback(reference, {
      allowCategoryFallback,
      preferredItemHint: cleanedReference,
    });

    if (match.status !== "ok" || !match.row) {
      return { update: null, unresolved: cleanedReference };
    }

    return {
      update: {
        rowId: match.row.id,
        category: match.row.category,
        item: match.row.item,
        annual_budget: Number(numericAmount.toFixed(2)),
      },
      unresolved: "",
    };
  },

  parseBudgetPath(referenceText = "") {
    const cleaned = String(referenceText || "").trim().replace(/\s+/g, " ");
    if (!cleaned) return null;

    const arrowMatch = cleaned.match(/^(.+?)\s*(?:>|:)\s*(.+)$/);
    if (arrowMatch) {
      const category = arrowMatch[1].trim();
      const item = arrowMatch[2].trim();
      if (category && item) {
        return { category, item };
      }
    }

    const underMatch = cleaned.match(/^(.+?)\s+(?:under|in)\s+(.+)$/i);
    if (underMatch) {
      const item = underMatch[1].trim();
      const category = underMatch[2].trim();
      if (category && item) {
        return { category, item };
      }
    }

    return null;
  },

  parseCategoryTargetPath(referenceText = "") {
    const parsed = this.parseBudgetPath(referenceText);
    if (parsed) {
      const category = String(parsed.category || "").trim();
      const subcategory = String(parsed.item || "").trim();
      if (category && subcategory) return { category, subcategory };
    }

    // Category-only fallback: choose best-fit existing subcategory.
    const raw = String(referenceText || "").trim();
    if (!raw) return null;
    const normalizedTarget = normalizeLabel(raw);
    if (!normalizedTarget) return null;
    const rows = this.getBaseTransactions();
    const byCategory = new Map();
    rows.forEach((tx) => {
      const category = String(tx.category || "").trim();
      const subcategory = String(tx.subcategory || "").trim();
      if (!category || !subcategory) return;
      const key = normalizeLabel(category);
      if (!byCategory.has(key)) byCategory.set(key, { category, counts: new Map() });
      const bucket = byCategory.get(key);
      bucket.counts.set(subcategory, (bucket.counts.get(subcategory) || 0) + 1);
    });

    let match = null;
    for (const [key, bucket] of byCategory.entries()) {
      if (
        key === normalizedTarget ||
        key.includes(normalizedTarget) ||
        normalizedTarget.includes(key)
      ) {
        match = bucket;
        break;
      }
    }
    if (!match) return null;

    const subcategoryCandidates = [...match.counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((entry) => String(entry[0] || "").trim())
      .filter(Boolean);
    if (!subcategoryCandidates.length) return null;

    const insuranceHint = normalizeLabel(raw).includes("insur");
    const hintedSubcategory =
      insuranceHint &&
      subcategoryCandidates.find((name) => normalizeLabel(name).includes("insur"));
    const subcategory = hintedSubcategory || subcategoryCandidates[0];
    return { category: match.category, subcategory };
  },

  normalizeKeywordValue(value = "") {
    return String(value || "")
      .replace(/^["']+|["']+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  },

  findRulesByKeyword(keyword = "") {
    const needle = normalizeLabel(keyword);
    if (!needle) return [];
    return (AppState.subcategoryRules || []).filter(
      (rule) => normalizeLabel(rule.keyword || "") === needle
    );
  },

  inferRecentTransactionKeyword() {
    const recentAssistantMessages = (AppState.assistant.messages || [])
      .filter((msg) => msg?.role === "assistant" && String(msg?.content || "").trim())
      .slice(-14)
      .reverse();

    for (const msg of recentAssistantMessages) {
      const content = String(msg.content || "");
      const descriptionMatch = content.match(/description:\s*([^\n\r]+)/i);
      if (descriptionMatch?.[1]) {
        const keyword = this.normalizeKeywordValue(descriptionMatch[1]);
        if (keyword) return keyword;
      }
      const merchantMatch = content.match(/\bat\s+["']?([^"\n\r]+?)["']?\s+for\b/i);
      if (merchantMatch?.[1]) {
        const keyword = this.normalizeKeywordValue(merchantMatch[1]);
        if (keyword) return keyword;
      }
    }
    return "";
  },

  parseCategoryRuleAddAction(questionText = "") {
    const raw = String(questionText || "").trim();
    const text = normalizeLabel(raw);
    if (!text) return null;
    if (!/\b(rule|keyword)\b/.test(text)) return null;
    if (!/\b(add|create|set|update|change)\b/.test(text)) return null;

    const patterns = [
      /(?:add|create|set|update|change)\s+(?:a\s+)?(?:subcategory\s+)?rule(?:\s+for|\s+keyword)?\s+["']?(.+?)["']?\s+(?:to|as|into|for)\s+(.+)/i,
      /(?:always|when|if).*(?:description|text)?\s*(?:contains|matches)\s+["']?(.+?)["']?\s+(?:categori[sz]e|set)\s+(?:to|as)\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (!match?.[1] || !match?.[2]) continue;
      const keyword = this.normalizeKeywordValue(match[1]);
      const target = this.parseCategoryTargetPath(match[2]);
      if (!keyword) {
        return {
          type: "invalid",
          message: "Rule keyword is missing. Example: `Add rule keyword supermarket to Groceries > Groceries`.",
        };
      }
      if (!target) {
        return {
          type: "invalid",
          message:
            "I need target category and subcategory as `Category > Subcategory` (example: `Groceries > Groceries`).",
        };
      }
      return {
        type: "rule_add",
        keyword,
        category: target.category,
        subcategory: target.subcategory,
      };
    }

    return null;
  },

  parseCategoryRuleRemoveAction(questionText = "") {
    const raw = String(questionText || "").trim();
    const text = normalizeLabel(raw);
    if (!text) return null;
    if (!/\b(remove|delete)\b/.test(text) || !/\b(rule|keyword)\b/.test(text)) return null;

    const patterns = [
      /(?:remove|delete)\s+(?:a\s+)?(?:subcategory\s+)?rule(?:\s+for|\s+keyword)?\s+["']?(.+?)["']?$/i,
      /(?:remove|delete)\s+rule\s+["']?(.+?)["']?\s*$/i,
    ];
    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (!match?.[1]) continue;
      const keyword = this.normalizeKeywordValue(match[1]);
      if (!keyword) break;
      const existing = this.findRulesByKeyword(keyword);
      if (!existing.length) {
        return {
          type: "invalid",
          message: `I could not find a rule with keyword "${keyword}".`,
        };
      }
      return {
        type: "rule_remove",
        keyword,
        ruleIds: existing.map((rule) => rule.id),
      };
    }

  return {
    type: "invalid",
    message: "Tell me the exact rule keyword to remove. Example: `Remove rule keyword supermarket`.",
  };
  },

  parseRecategorizeByKeywordAction(questionText = "") {
    const raw = String(questionText || "").trim();
    const text = normalizeLabel(raw);
    if (!text) return null;
    const hasVerb = /\b(move|recategori[sz]e|categori[sz]e|change|set)\b/.test(text);
    const hasTransactions = /\b(transaction|transactions|description|merchant)\b/.test(text);
    const hasPronounReference = /\b(it|this(?:\s+item|\s+transaction)?)\b/.test(text);
    if (!hasVerb || (!hasTransactions && !hasPronounReference)) return null;

    const patterns = [
      /(?:move|recategori[sz]e|categori[sz]e|change)\s+(?:all\s+)?(?:transactions?\s+)?(?:containing|matching|with|for)\s+["']?(.+?)["']?\s+(?:to|as|into)\s+(.+)/i,
      /set\s+category\s+for\s+["']?(.+?)["']?\s+(?:to|as)\s+(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (!match?.[1] || !match?.[2]) continue;
      const keyword = this.normalizeKeywordValue(match[1]);
      const target = this.parseCategoryTargetPath(match[2]);
      if (!keyword) {
        return {
          type: "invalid",
          message: "I need a keyword/merchant phrase to match transactions.",
        };
      }
      if (!target) {
        return {
          type: "invalid",
          message:
            "I need target category and subcategory as `Category > Subcategory` (example: `Groceries > Groceries`).",
        };
      }
      const keywordLower = keyword.toLowerCase();
      const matchCount = AppState.transactions.filter((tx) =>
        String(tx.description || "").toLowerCase().includes(keywordLower)
      ).length;
      if (!matchCount) {
        return {
          type: "invalid",
          message: `No transactions matched keyword "${keyword}".`,
        };
      }
      const persistRule =
        text.includes("always") ||
        text.includes("future") ||
        text.includes("rule");
      return {
        type: "tx_recategorize_keyword",
        keyword,
        category: target.category,
        subcategory: target.subcategory,
        matchCount,
        persistRule,
      };
    }

    const pronounPattern =
      /(?:move|recategori[sz]e|categori[sz]e|change|set)\s+(?:it|this(?:\s+item|\s+transaction)?)\s+(?:to|as|into)\s+(.+)/i;
    const pronounMatch = raw.match(pronounPattern);
    if (pronounMatch?.[1]) {
      const target = this.parseCategoryTargetPath(pronounMatch[1]);
      if (!target) {
        return {
          type: "invalid",
          message:
            "I need target category and subcategory as `Category > Subcategory` (example: `Insurance > Other Insurance`).",
        };
      }
      const keyword = this.inferRecentTransactionKeyword();
      if (!keyword) {
        return {
          type: "invalid",
          message:
            "I could not infer which transaction you mean. Include a keyword, for example: `Move transactions containing INSURANCE to Insurance > Other Insurance`.",
        };
      }
      const keywordLower = keyword.toLowerCase();
      const matchCount = AppState.transactions.filter((tx) =>
        String(tx.description || "").toLowerCase().includes(keywordLower)
      ).length;
      if (!matchCount) {
        return {
          type: "invalid",
          message: `No transactions matched keyword "${keyword}".`,
        };
      }
      return {
        type: "tx_recategorize_keyword",
        keyword,
        category: target.category,
        subcategory: target.subcategory,
        matchCount,
        persistRule: text.includes("always") || text.includes("future") || text.includes("rule"),
      };
    }

    return null;
  },

  extractBudgetAmount(questionText = "") {
    const text = String(questionText || "");
    const directedMatch = text.match(
      /(?:to|at|=|amount(?:\s+of)?|budget(?:ed)?\s+at)\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i
    );
    if (directedMatch) {
      return toNumber(directedMatch[1].replaceAll(",", ""), NaN);
    }

    const moneyMatch = text.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
    if (moneyMatch) {
      return toNumber(moneyMatch[1].replaceAll(",", ""), NaN);
    }
    return NaN;
  },

  getBudgetAmountScale(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return { multiplier: 1, period: "annual" };
    if (
      text.includes("fortnight") ||
      text.includes("fortnightly") ||
      text.includes("per fortnight")
    ) {
      return { multiplier: 26, period: "fortnightly" };
    }
    if (text.includes("monthly") || text.includes("per month")) {
      return { multiplier: 12, period: "monthly" };
    }
    if (text.includes("weekly") || text.includes("per week")) {
      return { multiplier: 52, period: "weekly" };
    }
    return { multiplier: 1, period: "annual" };
  },

  extractBudgetReferenceForUpdate(questionText = "") {
    const text = String(questionText || "").trim();
    const amountPattern = String.raw`\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?`;
    const patterns = [
      new RegExp(
        String.raw`budget(?:\s+line|\s+item)?(?:\s+for)?\s+(.+?)\s+(?:to|at|=)\s*${amountPattern}`,
        "i"
      ),
      new RegExp(
        String.raw`(?:set|update|change|adjust)\s+budget(?:\s+for)?\s+(.+?)\s+(?:to|at|=)\s*${amountPattern}`,
        "i"
      ),
      new RegExp(
        String.raw`(?:set|update|change|adjust)\s+(.+?)\s+budget(?:\s+amount)?\s+(?:to|at|=)\s*${amountPattern}`,
        "i"
      ),
      new RegExp(
        String.raw`(?:set|update|change|adjust|add|create)\s+(.+?)\s+(?:to|at|=)\s*${amountPattern}`,
        "i"
      ),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim().replace(/[.?!]$/, "");
    }
    return "";
  },

  extractBudgetReferenceForRemove(questionText = "") {
    const text = String(questionText || "").trim();
    const patterns = [
      /(?:remove|delete)\s+(?:the\s+)?budget(?:\s+line|\s+item)?(?:\s+for)?\s+(.+)/i,
      /(?:remove|delete)\s+(.+?)\s+from\s+budget/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].trim().replace(/[.?!]$/, "");
    }
    return "";
  },

  extractBudgetReferenceForLookup(questionText = "") {
    const text = String(questionText || "").trim();
    const patterns = [
      /(?:what(?:'s| is)|how much is|show|tell me|check)\s+(?:the\s+)?(?:current\s+)?(?:annual\s+)?budget(?:\s+for)?\s+(.+?)(?:\?|$)/i,
      /budget(?:\s+for)?\s+(.+?)(?:\?|$)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1]
          .trim()
          .replace(/\b(now|currently|please)\b/gi, "")
          .replace(/\s+/g, " ")
          .replace(/[.?!]$/, "")
          .trim();
      }
    }
    return "";
  },

  parseBudgetLookupAction(questionText = "") {
    const raw = String(questionText || "").trim();
    const text = normalizeLabel(raw);
    if (!text) return null;

    const hasBudgetWord = text.includes("budget");
    const asksLookup =
      /\b(what|how much|current|show|tell me|check|view)\b/.test(text) &&
      !/\b(set|update|change|adjust|add|create|remove|delete|rebuild|reset)\b/.test(text);

    if (!hasBudgetWord || !asksLookup) return null;

    const referenceRaw = this.extractBudgetReferenceForLookup(raw);
    const reference = this.resolveBudgetReference(referenceRaw, raw);
    const match = this.findBudgetLineWithCategoryFallback(reference, {
      allowCategoryFallback: !/[>:]/.test(String(reference || "")),
      preferredItemHint: referenceRaw,
    });

    if (match.status === "ok") {
      return { type: "budget_lookup", row: match.row };
    }
    if (match.status === "ambiguous") {
      const options = match.matches
        .slice(0, 6)
        .map((row) => `- ${row.category} > ${row.item}`)
        .join("\n");
      return {
        type: "invalid",
        message: `I found multiple budget lines. Please be specific with \`Category > Item\`:\n${options}`,
      };
    }
    return {
      type: "invalid",
      message: "I could not identify the budget line. Try `Category > Item`, for example `Groceries > Groceries`.",
    };
  },

  isConfirmationRequest(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    const direct = ["confirm", "yes", "yes please", "go ahead", "apply", "apply it", "do it", "proceed"];
    if (direct.includes(text)) return true;
    if (/^(yes|yep|sure|ok|okay)\b/.test(text) && /\b(apply|do it|go ahead|change|changes|update|updates|all)\b/.test(text)) {
      return true;
    }
    return (
      text.includes("confirm") ||
      text.includes("apply this") ||
      text.includes("apply change") ||
      text.includes("go ahead")
    );
  },

  isCancelRequest(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    return (
      text.includes("cancel") ||
      text.includes("never mind") ||
      text.includes("dont apply") ||
      text.includes("do not apply")
    );
  },

  isUndoRequest(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    return text === "undo" || text.includes("undo last") || text.includes("revert last");
  },

  isActionLikeCommand(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    const analysisIntent =
      (text.includes("subscription") || text.includes("recurring") || text.includes("auto pay") || text.includes("direct debit")) &&
      !text.includes("budget") &&
      !text.includes("category") &&
      !text.includes("subcategory") &&
      !text.includes("rule");
    if (analysisIntent) return false;

    const hasMutationVerb = /\b(set|update|change|adjust|add|create|remove|delete|rebuild|reset|move|recategori[sz]e|categori[sz]e|split|spread|allocate|distribute|divide|rebalance)\b/.test(
      text
    );
    if (!hasMutationVerb) return false;
    const looksLikeStateDescription = /\b(set up|set for)\b/.test(text) && !/\b(set budget|set category|set subcategory|set rule)\b/.test(text);
    if (looksLikeStateDescription && !/(>|:|\$?\s*[0-9])/.test(questionText)) return false;
    const startsDirectlyWithMutation = /^(set|update|change|adjust|add|create|remove|delete|rebuild|reset|move|recategori[sz]e|categori[sz]e|split|spread|allocate|distribute|divide|rebalance)\b/.test(
      text
    );
    const politePrefix = /^(please|can you|could you|would you)\b/.test(text);
    if (!startsDirectlyWithMutation && !politePrefix) return false;
    const hasAmount = /(?:\$?\s*[0-9][0-9,]*(?:\.[0-9]+)?)/.test(questionText);
    const mentionsCoreActionDomain =
      text.includes("budget") ||
      text.includes("category") ||
      text.includes("subcategory") ||
      text.includes("rule") ||
      text.includes("line") ||
      text.includes("under") ||
      questionText.includes(">") ||
      questionText.includes(":");
    const mentionsTxRecategorize =
      (text.includes("transaction") || text.includes("transactions")) &&
      /\b(move|recategori[sz]e|categori[sz]e)\b/.test(text);
    return mentionsCoreActionDomain || mentionsTxRecategorize || (hasAmount && hasMutationVerb);
  },

  isDirectBudgetCommand(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    if (/^(set|update|change|adjust|add|create|remove|delete|rebuild|reset|move|recategori[sz]e|categori[sz]e|split|spread|allocate|distribute|divide|rebalance)\b/.test(text)) {
      return true;
    }
    const politePrefix = /^(please|can you|could you|would you)\b/.test(text);
    const hasActionVerb = /\b(set|update|change|adjust|add|create|remove|delete|rebuild|reset|move|recategori[sz]e|categori[sz]e|split|spread|allocate|distribute|divide|rebalance)\b/.test(
      text
    );
    return politePrefix && hasActionVerb;
  },

  isAssistantChangeCapabilityQuestion(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    const capabilityPrefix = /^(can|could|do|does|is|are|am|will|would|should)\b/.test(text);
    const asksCapability = capabilityPrefix || /\b(ability|capability|able to|permissions?)\b/.test(text);
    const mentionsAssistant = /\b(assistant|you|app|platform|tool)\b/.test(text);
    const mentionsBudget = text.includes("budget");
    const mentionsCategory = text.includes("category") || text.includes("subcategory") || text.includes("rule");
    const mentionsTransactions = text.includes("transaction") || text.includes("transactions");
    const mentionsChange =
      text.includes("change") ||
      text.includes("edit") ||
      text.includes("update") ||
      text.includes("modify") ||
      text.includes("apply") ||
      text.includes("direct") ||
      text.includes("auto-edit");
    const mentionsSuggestionOnly = text.includes("only suggest") || text.includes("only make suggestion");
    const analyticIntent = /\b(list|show|tell|find|how much|what|which|top|spend|expense|income|deposit|subscription|merchant|trend|analy[sz]e|compare|summar[yz]e)\b/.test(
      text
    );
    if (analyticIntent && !mentionsChange) return false;
    const genericCanYouChange = asksCapability && mentionsChange && mentionsAssistant;
    return (
      (asksCapability && mentionsAssistant && mentionsChange && (mentionsBudget || mentionsTransactions || mentionsCategory)) ||
      genericCanYouChange ||
      (mentionsBudget && mentionsChange && mentionsSuggestionOnly) ||
      text.includes("can you make changes") ||
      text.includes("what changes can you make") ||
      text.includes("can you update budget") ||
      text.includes("can you edit budget") ||
      text.includes("can you recategorize") ||
      text.includes("can you add a rule") ||
      text.includes("do you have direct access") ||
      text.includes("make direct changes") ||
      ((text.includes("working now") || text.includes("is it working")) &&
        this.recentMessagesMentionBudgetCapability())
    );
  },

  recentMessagesMentionBudgetCapability() {
    const recent = (AppState.assistant.messages || []).slice(-8);
    if (!recent.length) return false;
    return recent.some((msg) => {
      const text = normalizeLabel(msg?.content || "");
      return (
        (text.includes("direct changes") || text.includes("make changes")) &&
        (text.includes("budget") || text.includes("transaction"))
      );
    });
  },

  parseBudgetAction(questionText = "") {
    const raw = String(questionText || "").trim();
    const text = normalizeLabel(raw);
    if (!text) return null;
    const hasBudgetWord = /\bbudget\b/.test(text);
    const looksLikeLinePath = raw.includes(">") || raw.includes(":");
    const hasPeriodHint = /\b(annual|annually|monthly|per month|fortnight|fortnightly|weekly|per week)\b/.test(
      text
    );
    const hasAmount = Number.isFinite(this.extractBudgetAmount(raw));
    const hasActionVerb = /\b(set|update|change|adjust|add|create|remove|delete|rebuild|reset)\b/.test(
      text
    );
    if (!hasActionVerb) {
      return null;
    }
    if (!hasBudgetWord && !looksLikeLinePath && !hasPeriodHint && !hasAmount) return null;

    if (
      /\b(rebuild|reset)\b/.test(text) &&
      (/\bbudget\b/.test(text) || text.includes("loaded data") || text.includes("from data"))
    ) {
      return { type: "budget_rebuild" };
    }

    const isRemove =
      /\b(remove|delete)\b/.test(text) &&
      (/\bbudget\b/.test(text) || looksLikeLinePath || /\bline\b/.test(text));
    if (isRemove) {
      const extractedReference = this.extractBudgetReferenceForRemove(raw);
      const reference = this.resolveBudgetReference(extractedReference, raw);
      if (!reference) {
        return {
          type: "invalid",
          message:
            "Tell me which budget line to remove using `Category > Item` (example: `Remove budget line Groceries > Groceries`).",
        };
      }
      const match = this.findBudgetLine(reference);
      if (match.status === "ok") {
        return {
          type: "budget_remove_line",
          rowId: match.row.id,
          category: match.row.category,
          item: match.row.item,
        };
      }
      if (match.status === "ambiguous") {
        return {
          type: "invalid",
          message:
            "I found multiple matching budget lines. Please specify `Category > Item` (example: `Groceries > Groceries`).",
        };
      }
      return {
        type: "invalid",
        message:
          "I could not find that budget line. Try `Category > Item` so I can match it exactly.",
      };
    }

    const isSetOrAdd =
      /\b(set|update|change|adjust|add|create)\b/.test(text);
    if (!isSetOrAdd) return null;

    const amount = this.extractBudgetAmount(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      return {
        type: "invalid",
        message:
          "I can apply this, but I need a valid annual amount. Example: `Set budget for Groceries > Groceries to 12000`.",
      };
    }
    const scale = this.getBudgetAmountScale(raw);
    const annualBudget = Number((amount * scale.multiplier).toFixed(2));

    const extractedReference = this.extractBudgetReferenceForUpdate(raw);
    const reference = this.resolveBudgetReference(extractedReference, raw);
    const match = this.findBudgetLineWithCategoryFallback(reference, {
      allowCategoryFallback: !/[>:]/.test(String(reference || "")),
      preferredItemHint: extractedReference,
    });
    if (match.status === "ok") {
      return {
        type: "budget_set_amount",
        rowId: match.row.id,
        category: match.row.category,
        item: match.row.item,
        annual_budget: annualBudget,
        input_amount: Number(amount.toFixed(2)),
        input_period: scale.period,
      };
    }
    if (match.status === "ambiguous") {
      return {
        type: "invalid",
        message:
          "I found multiple matching budget lines. Please specify `Category > Item` (example: `Groceries > Groceries`).",
      };
    }

    const parsedPath = this.parseBudgetPath(reference);
    if (!parsedPath) {
      return {
        type: "invalid",
        message:
          "I could not identify the budget line. Use `Category > Item` so I can add or update it accurately.",
      };
    }

    return {
      type: "budget_add_line",
      category: parsedPath.category,
      item: parsedPath.item,
      annual_budget: annualBudget,
      input_amount: Number(amount.toFixed(2)),
      input_period: scale.period,
    };
  },

  parseBudgetBatchAction(questionText = "") {
    const raw = String(questionText || "").trim();
    const text = normalizeLabel(raw);
    if (!text) return null;

    const hasBatchVerb = /\b(set|update|change|adjust|allocate|distribute|spread|split|divide|rebalance)\b/.test(
      text
    );
    const hasReferenceListDelimiters = raw.includes(",") || /\band\b/i.test(raw) || raw.includes("\n") || raw.includes(";");
    const toAmountMentions = raw.match(/\bto\s*\$?\s*[0-9]/gi) || [];
    const sharedAmountPattern = /(?:set|update|change|adjust|allocate|distribute|spread|split|divide|rebalance)\s+(.+?)\s+to\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i;
    const hasSharedAmountList = (() => {
      const match = raw.match(sharedAmountPattern);
      if (!match?.[1]) return false;
      return this.parseBatchReferenceList(match[1]).length >= 2;
    })();

    const isConfirmStyle =
      (text.includes("confirm") || text.includes("apply")) &&
      (text.includes("change") || text.includes("changes") || text.includes("update") || text.includes("updates"));
    const looksLikeMultiSetCommand =
      hasBatchVerb &&
      hasReferenceListDelimiters &&
      (toAmountMentions.length >= 2 || hasSharedAmountList);

    if (!isConfirmStyle && !looksLikeMultiSetCommand) return null;

    const updates = [];
    const unresolved = [];

    const resolveReferenceToUpdate = (referenceRaw, amount) => {
      const resolved = this.buildBudgetUpdateFromReference(referenceRaw, amount, raw);
      if (!resolved) return;
      if (resolved.update) {
        updates.push(resolved.update);
        return;
      }
      if (resolved.unresolved) {
        unresolved.push(resolved.unresolved);
      }
    };

    // Mode 1: confirm-list style: "Category: old + x = y"
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    lines.forEach((rawLine) => {
      const line = rawLine.replace(/^[-*]\s*/, "").trim();
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) return;
      const referenceRaw = line.slice(0, separatorIndex).trim();
      const amountSection = line.slice(separatorIndex + 1);
      if (!referenceRaw || !amountSection) return;
      const amountMatches = Array.from(
        amountSection.matchAll(/\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g)
      );
      if (!amountMatches.length) return;
      const amount = Number(String(amountMatches[amountMatches.length - 1][1] || "").replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount < 0) return;
      resolveReferenceToUpdate(referenceRaw, amount);
    });

    // Mode 2: plain-English multi update: "A to 100, B to 200 and C to 300"
    const inlinePattern =
      /(?:^|[,\n]|(?:\band\b))\s*(?:set\s+budget\s+for\s+|set\s+|update\s+|change\s+|adjust\s+)?(.+?)\s+to\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/gi;
    const inlineMatches = Array.from(raw.matchAll(inlinePattern));
    inlineMatches.forEach((match) => {
      const referenceRaw = String(match[1] || "").trim();
      const amount = Number(String(match[2] || "").replace(/,/g, ""));
      if (!referenceRaw || !Number.isFinite(amount) || amount < 0) return;
      resolveReferenceToUpdate(referenceRaw, amount);
    });

    // Mode 3: shared amount list: "Set A, B, C to 6250"
    const sharedMatch = raw.match(sharedAmountPattern);
    if (sharedMatch?.[1] && sharedMatch?.[2]) {
      const sharedAmount = Number(String(sharedMatch[2] || "").replace(/,/g, ""));
      if (Number.isFinite(sharedAmount) && sharedAmount >= 0) {
        const references = this.parseBatchReferenceList(sharedMatch[1]).filter(
          (value) => !/^(all|main|major)\s+categories?$/i.test(value)
        );
        if (references.length >= 2) {
          references.forEach((referenceRaw) => {
            resolveReferenceToUpdate(referenceRaw, sharedAmount);
          });
        }
      }
    }

    if (!updates.length) {
      return this.parseBudgetBatchAction(raw);
    }

    const dedupedUpdates = Array.from(
      new Map(
        updates.map((update) => [update.rowId || `${normalizeLabel(update.category)}|${normalizeLabel(update.item)}`, update])
      ).values()
    );

    if (!isConfirmStyle && !looksLikeMultiSetCommand && dedupedUpdates.length < 2) {
      return null;
    }

    return {
      type: "budget_batch_set",
      updates: dedupedUpdates,
      unresolved: Array.from(new Set(unresolved)),
    };
  },

  parseBatchFromAssistantConfirmText(text = "") {
    const raw = String(text || "");
    if (!raw.trim()) return null;

    const updates = [];
    const unresolved = [];
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.replace(/[`*_]/g, "").trim())
      .filter(Boolean);

    const appendResolvedUpdate = (referenceRaw, amountRaw) => {
      const amount = Number(String(amountRaw || "").replace(/,/g, ""));
      if (!referenceRaw || !Number.isFinite(amount) || amount < 0) return;
      const resolved = this.buildBudgetUpdateFromReference(referenceRaw, amount, raw);
      if (resolved?.update) {
        updates.push(resolved.update);
      } else if (resolved?.unresolved) {
        unresolved.push(resolved.unresolved);
      }
    };

    lines.forEach((line) => {
      const normalizedLine = line.replace(/^[-*]\s*/, "").trim();
      const directMatch = normalizedLine.match(
        /(?:confirm\s+)?(?:set|update|change|adjust)\s+budget(?:\s+for)?\s+(.+?)\s+to\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i
      );
      if (directMatch?.[1] && directMatch?.[2]) {
        appendResolvedUpdate(
          String(directMatch[1] || "").trim().replace(/[.?!]$/, ""),
          String(directMatch[2] || "")
        );
        return;
      }

      const genericSetMatch = normalizedLine.match(
        /(?:confirm\s+)?(?:set|update|change|adjust)\s+(.+?)\s+to\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i
      );
      if (genericSetMatch?.[1] && genericSetMatch?.[2]) {
        appendResolvedUpdate(
          String(genericSetMatch[1] || "").trim().replace(/[.?!]$/, ""),
          String(genericSetMatch[2] || "")
        );
        return;
      }

      const colonIndex = normalizedLine.indexOf(":");
      if (colonIndex > 0) {
        const referenceRaw = normalizedLine.slice(0, colonIndex).trim();
        const amountSection = normalizedLine.slice(colonIndex + 1);
        const amountMatches = Array.from(
          amountSection.matchAll(/\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g)
        );
        if (referenceRaw && amountMatches.length) {
          appendResolvedUpdate(referenceRaw, String(amountMatches[amountMatches.length - 1][1] || ""));
          return;
        }
      }

      const simpleAmountMatch = normalizedLine.match(
        /^(.+?)\s*(?:=|to)\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\b|$)/i
      );
      if (simpleAmountMatch?.[1] && simpleAmountMatch?.[2]) {
        appendResolvedUpdate(
          String(simpleAmountMatch[1] || "").trim().replace(/[.?!]$/, ""),
          String(simpleAmountMatch[2] || "")
        );
      }
    });

    if (!updates.length) return null;
    const deduped = Array.from(
      new Map(updates.map((update) => [update.rowId || `${update.category}|${update.item}`, update])).values()
    );
    return {
      type: "budget_batch_set",
      updates: deduped,
      unresolved: Array.from(new Set(unresolved)),
    };
  },

  recoverActionFromRecentAssistantMessages() {
    const recentAssistantMessages = (AppState.assistant.messages || [])
      .filter((msg) => msg?.role === "assistant" && String(msg?.content || "").trim())
      .slice(-12)
      .reverse();

    for (const msg of recentAssistantMessages) {
      const parsed = this.parseBatchFromAssistantConfirmText(msg.content || "");
      if (parsed) return parsed;
      const parsedInline = this.parseBudgetBatchAction(msg.content || "");
      if (parsedInline) return parsedInline;
    }
    return null;
  },

  getPreviousUserActionMessage(currentQuestionText = "") {
    const current = normalizeLabel(currentQuestionText);
    const userMessages = (AppState.assistant.messages || [])
      .filter((msg) => msg?.role === "user" && String(msg?.content || "").trim())
      .map((msg) => String(msg.content || "").trim());

    // Current question is already pushed into message history before action handling.
    for (let i = userMessages.length - 1; i >= 0; i -= 1) {
      const candidate = userMessages[i];
      const normalized = normalizeLabel(candidate);
      if (!normalized || normalized === current) continue;
      if (this.isConfirmationRequest(candidate)) continue;
      if (this.isCancelRequest(candidate) || this.isUndoRequest(candidate)) continue;
      if (this.isActionLikeCommand(candidate)) return candidate;
    }
    return "";
  },

  parseCategoryAction(questionText = "") {
    const addRule = this.parseCategoryRuleAddAction(questionText);
    if (addRule) return addRule;

    const removeRule = this.parseCategoryRuleRemoveAction(questionText);
    if (removeRule) return removeRule;

    const recategorize = this.parseRecategorizeByKeywordAction(questionText);
    if (recategorize) return recategorize;

    return null;
  },

  describeAssistantAction(action) {
    const conversionNote =
      action?.input_period && action.input_period !== "annual"
        ? ` (converted from ${currencyPrecise.format(toNumber(action.input_amount, 0))} ${action.input_period})`
        : "";
    if (!action?.type) return "pending change";
    if (action.type === "budget_set_amount") {
      return `Set annual budget for ${action.category} > ${action.item} to ${currencyPrecise.format(
        toNumber(action.annual_budget, 0)
      )}.${conversionNote}`;
    }
    if (action.type === "budget_batch_set") {
      const updates = Array.isArray(action.updates) ? action.updates : [];
      if (!updates.length) return "Apply multiple budget updates.";
      const preview = updates
        .slice(0, 3)
        .map(
          (update) =>
            `${update.category} > ${update.item} = ${currencyPrecise.format(toNumber(update.annual_budget, 0))}`
        )
        .join("; ");
      const extra = updates.length > 3 ? ` (+${updates.length - 3} more)` : "";
      return `Apply ${updates.length} budget update(s): ${preview}${extra}.`;
    }
    if (action.type === "budget_add_line") {
      return `Add budget line ${action.category} > ${action.item} at ${currencyPrecise.format(
        toNumber(action.annual_budget, 0)
      )}.${conversionNote}`;
    }
    if (action.type === "budget_remove_line") {
      return `Remove budget line ${action.category} > ${action.item}.`;
    }
    if (action.type === "budget_rebuild") {
      return "Rebuild budget lines from currently loaded transaction data.";
    }
    if (action.type === "rule_add") {
      return `Add/update rule: keyword "${action.keyword}" -> ${action.category} > ${action.subcategory}.`;
    }
    if (action.type === "rule_remove") {
      return `Remove rule(s) for keyword "${action.keyword}".`;
    }
    if (action.type === "tx_recategorize_keyword") {
      const persistNote = action.persistRule
        ? " and save as a rule for future imports"
        : "";
      return `Recategorize ${toNumber(action.matchCount, 0)} transaction(s) matching "${action.keyword}" to ${action.category} > ${action.subcategory}${persistNote}.`;
    }
    return "pending change";
  },

  setPendingAction(action) {
    AppState.assistant.pendingAction = action || null;
    if (action) {
      AppState.assistant.lastStagedAction = {
        createdAt: new Date().toISOString(),
        action: JSON.parse(JSON.stringify(action)),
      };
    }
    this.renderActionButtons();
  },

  applyAssistantAction(action) {
    if (!action?.type) {
      return { ok: false, message: "No action to apply." };
    }

    const summary = this.describeAssistantAction(action);

    if (action.type === "budget_batch_set") {
      const updates = Array.isArray(action.updates) ? action.updates : [];
      if (!updates.length) {
        return { ok: false, message: "I could not find any valid budget updates in that confirmation." };
      }

      const dedupedUpdates = Array.from(
        new Map(
          updates.map((update) => {
            const key = update?.rowId
              ? `id:${update.rowId}`
              : `line:${normalizeLabel(update?.category)}|${normalizeLabel(update?.item)}`;
            return [key, update];
          })
        ).values()
      );

      const rowsById = new Map((AppState.budgetItems || []).map((row) => [row.id, row]));
      const prepared = dedupedUpdates
        .map((update) => {
          const fallbackCategory = String(update?.category || "").trim();
          const fallbackItem = String(update?.item || "").trim();

          let row = null;
          if (update?.rowId) {
            row = rowsById.get(update.rowId) || null;
          }
          if (!row && fallbackCategory && fallbackItem) {
            const match = this.findBudgetLine(`${fallbackCategory} > ${fallbackItem}`);
            if (match.status === "ok") row = match.row;
          }

          const rowCategory = row ? row.category : fallbackCategory;
          const rowItem = row ? row.item : fallbackItem;
          if (!rowCategory || !rowItem) return null;
          const normalizedLine = normalizeBudgetCategoryItem(rowCategory, rowItem);
          if (normalizeLabel(normalizedLine.category) === "transfers") return null;

          const baseAmount = row ? row.annual_budget : 0;
          const newAmount = Math.max(0, toNumber(update?.annual_budget, baseAmount));
          const changed = row ? Math.abs(toNumber(row.annual_budget, 0) - newAmount) >= 0.005 : true;
          return {
            row,
            category: normalizedLine.category,
            item: normalizedLine.item,
            newAmount: Number(newAmount.toFixed(2)),
            changed,
            create: !row,
          };
        })
        .filter(Boolean);

      const changedRows = prepared.filter((entry) => entry.changed);
      if (!changedRows.length) {
        return { ok: true, message: "No change needed. Those budget values are already set." };
      }

      this.pushUndoSnapshot(summary);
      let createdCount = 0;
      let updatedCount = 0;
      changedRows.forEach((entry) => {
        if (entry.create) {
          const newLine = {
            id: createId("budget"),
            category: entry.category,
            item: entry.item,
            annual_budget: entry.newAmount,
            notes: "Added by assistant action",
            seeded_actual: 0,
          };
          AppState.budgetItems.push(newLine);
          entry.row = newLine;
          createdCount += 1;
          return;
        }
        entry.row.annual_budget = entry.newAmount;
        updatedCount += 1;
      });

      const lastChanged = changedRows[changedRows.length - 1];
      if (lastChanged?.row?.id) {
        AppState.budgetDetail = { id: lastChanged.row.id };
        this.setBudgetContextFromRow(lastChanged.row);
      }

      this.persistBudgetState();
      AppState.assistant.lastFacts = null;
      App.renderAll();

      const unresolved = Array.isArray(action.unresolved) ? action.unresolved : [];
      const unresolvedNote = unresolved.length
        ? `\n\nNot updated (not found): ${unresolved.join(", ")}.`
        : "";
      return {
        ok: true,
        message: `Applied ${changedRows.length} budget update(s) (${updatedCount} updated, ${createdCount} added).\n\nUse "Undo Last Change" if you want to revert them.${unresolvedNote}`,
      };
    }

    if (action.type === "budget_set_amount") {
      const row = AppState.budgetItems.find((item) => item.id === action.rowId);
      if (!row) {
        return { ok: false, message: "I could not find that budget line anymore. Please try again." };
      }
      const newAmount = Math.max(0, toNumber(action.annual_budget, row.annual_budget));
      if (Math.abs(toNumber(row.annual_budget, 0) - newAmount) < 0.005) {
        this.setBudgetContextFromRow(row);
        return { ok: true, message: `No change needed. ${row.category} > ${row.item} is already ${currencyPrecise.format(newAmount)}.` };
      }
      this.pushUndoSnapshot(summary);
      row.annual_budget = Number(newAmount.toFixed(2));
      AppState.budgetDetail = { id: row.id };
      this.setBudgetContextFromRow(row);
      this.persistBudgetState();
      AppState.assistant.lastFacts = null;
      App.renderAll();
      return {
        ok: true,
        message: `Applied: ${summary}\n\nUse "Undo Last Change" if you want to revert it.`,
      };
    }

    if (action.type === "budget_add_line") {
      const normalizedLine = normalizeBudgetCategoryItem(action.category, action.item);
      if (normalizeLabel(normalizedLine.category) === "transfers") {
        return { ok: false, message: "Transfers are excluded from budget spend lines." };
      }
      const duplicate = AppState.budgetItems.find(
        (row) =>
          normalizeLabel(row.category) === normalizeLabel(normalizedLine.category) &&
          normalizeLabel(row.item) === normalizeLabel(normalizedLine.item)
      );
      if (duplicate) {
        const setAction = {
          type: "budget_set_amount",
          rowId: duplicate.id,
          category: duplicate.category,
          item: duplicate.item,
          annual_budget: Number(toNumber(action.annual_budget, 0).toFixed(2)),
        };
        return this.applyAssistantAction(setAction);
      }

      this.pushUndoSnapshot(summary);
      const newLine = {
        id: createId("budget"),
        category: normalizedLine.category,
        item: normalizedLine.item,
        annual_budget: Number(Math.max(0, toNumber(action.annual_budget, 0)).toFixed(2)),
        notes: "Added by assistant action",
        seeded_actual: 0,
      };
      AppState.budgetItems.push(newLine);
      AppState.budgetDetail = { id: newLine.id };
      this.setBudgetContextFromRow(newLine);
      this.persistBudgetState();
      AppState.assistant.lastFacts = null;
      App.renderAll();
      return {
        ok: true,
        message: `Applied: ${summary}\n\nUse "Undo Last Change" if you want to revert it.`,
      };
    }

    if (action.type === "budget_remove_line") {
      const row = AppState.budgetItems.find((item) => item.id === action.rowId);
      if (!row) {
        return { ok: false, message: "That budget line is already removed." };
      }
      this.pushUndoSnapshot(summary);
      AppState.budgetItems = AppState.budgetItems.filter((item) => item.id !== action.rowId);
      if (AppState.assistant.lastBudgetContext?.rowId === action.rowId) {
        this.clearBudgetContext();
      }
      if (AppState.budgetDetail?.id === action.rowId) {
        AppState.budgetDetail = null;
      }
      this.persistBudgetState();
      AppState.assistant.lastFacts = null;
      App.renderAll();
      return {
        ok: true,
        message: `Applied: ${summary}\n\nUse "Undo Last Change" if you want to revert it.`,
      };
    }

    if (action.type === "budget_rebuild") {
      this.pushUndoSnapshot(summary);
      normalizeAirbnbFinancingForSet(AppState.transactions);
      AppState.budgetDefaults = generateBaselineBudgetFromActuals(AppState.transactions);
      AppState.budgetItems = normalizeBudgetItems(JSON.parse(JSON.stringify(AppState.budgetDefaults)));
      AppState.budgetDetail = null;
      this.clearBudgetContext();
      this.persistBudgetState();
      AppState.assistant.lastFacts = null;
      App.renderAll();
      return {
        ok: true,
        message: `Applied: ${summary}\n\nUse "Undo Last Change" if you want to revert it.`,
      };
    }

    if (action.type === "rule_add") {
      const keyword = this.normalizeKeywordValue(action.keyword);
      if (!keyword) {
        return { ok: false, message: "Rule keyword is missing." };
      }
      const normalizedTarget = canonicalizeCategorySubcategory(
        action.category,
        action.subcategory,
        action.subcategory,
        -1,
        null
      );
      this.pushUndoSnapshot(summary);
      const existing = this.findRulesByKeyword(keyword);
      if (existing.length) {
        existing.forEach((rule) => {
          rule.category = normalizedTarget.category;
          rule.subcategory = normalizedTarget.subcategory;
        });
      } else {
        AppState.subcategoryRules.push({
          id: createId("rule"),
          keyword,
          category: normalizedTarget.category,
          subcategory: normalizedTarget.subcategory,
        });
      }
      saveStorage(STORAGE_KEYS.subcategoryRules, AppState.subcategoryRules);
      App.applySubcategoryRulesAndRefresh();
      return {
        ok: true,
        message: `Applied: ${summary}\n\nUse "Undo Last Change" if you want to revert it.`,
      };
    }

    if (action.type === "rule_remove") {
      const ruleIds = Array.isArray(action.ruleIds) ? action.ruleIds : [];
      if (!ruleIds.length) {
        return { ok: false, message: "No matching rules to remove." };
      }
      this.pushUndoSnapshot(summary);
      AppState.subcategoryRules = AppState.subcategoryRules.filter(
        (rule) => !ruleIds.includes(rule.id)
      );
      saveStorage(STORAGE_KEYS.subcategoryRules, AppState.subcategoryRules);
      App.applySubcategoryRulesAndRefresh();
      return {
        ok: true,
        message: `Applied: ${summary}\n\nUse "Undo Last Change" if you want to revert it.`,
      };
    }

    if (action.type === "tx_recategorize_keyword") {
      const keywordLower = String(action.keyword || "").toLowerCase();
      if (!keywordLower) {
        return { ok: false, message: "Keyword is missing for recategorization." };
      }
      const normalizedTarget = canonicalizeCategorySubcategory(
        action.category,
        action.subcategory,
        action.subcategory,
        -1,
        null
      );

      const matchingRows = AppState.transactions.filter((tx) =>
        String(tx.description || "").toLowerCase().includes(keywordLower)
      );
      if (!matchingRows.length) {
        return { ok: false, message: `No transactions matched "${action.keyword}".` };
      }

      this.pushUndoSnapshot(summary);
      matchingRows.forEach((tx) => {
        tx.category = normalizedTarget.category;
        tx.subcategory = normalizedTarget.subcategory;
        applyCategoryTaxonomy(tx);
      });

      if (action.persistRule) {
        const existing = this.findRulesByKeyword(action.keyword);
        if (existing.length) {
          existing.forEach((rule) => {
            rule.category = normalizedTarget.category;
            rule.subcategory = normalizedTarget.subcategory;
          });
        } else {
          AppState.subcategoryRules.push({
            id: createId("rule"),
            keyword: action.keyword,
            category: normalizedTarget.category,
            subcategory: normalizedTarget.subcategory,
          });
        }
        saveStorage(STORAGE_KEYS.subcategoryRules, AppState.subcategoryRules);
      }

      App.recomputeDerived();
      App.renderAll();
      return {
        ok: true,
        message: `Applied: ${summary}\n\nUse "Undo Last Change" if you want to revert it.`,
      };
    }

    return { ok: false, message: "I recognized the request but could not apply that action yet." };
  },

  confirmPendingAction() {
    const pending = AppState.assistant.pendingAction;
    if (!pending) {
      const staged = AppState.assistant.lastStagedAction;
      if (staged?.action) {
        const stagedAt = new Date(String(staged.createdAt || ""));
        const ageMs = Number.isNaN(stagedAt.getTime()) ? Infinity : Date.now() - stagedAt.getTime();
        if (ageMs <= 30 * 60 * 1000) {
          AppState.assistant.lastStagedAction = null;
          const recovered = this.applyAssistantAction(staged.action);
          this.pushMessage("assistant", recovered.message);
          this.renderActionButtons();
          return;
        }
      }
      this.pushMessage("assistant", "There is no pending change to apply.");
      this.renderActionButtons();
      return;
    }
    AppState.assistant.pendingAction = null;
    AppState.assistant.lastStagedAction = null;
    const result = this.applyAssistantAction(pending);
    this.pushMessage("assistant", result.message);
    this.renderActionButtons();
  },

  undoLastAssistantChange() {
    const stack = Array.isArray(AppState.assistant.undoStack) ? AppState.assistant.undoStack : [];
    const snapshot = stack.pop();
    if (!snapshot) {
      this.pushMessage("assistant", "There is no assistant-applied change to undo.");
      this.renderActionButtons();
      return;
    }

    AppState.assistant.undoStack = stack;
    AppState.budgetItems = JSON.parse(JSON.stringify(snapshot.budgetItems || []));
    AppState.budgetDetail = snapshot.budgetDetail ? { ...snapshot.budgetDetail } : null;
    AppState.transactions = JSON.parse(JSON.stringify(snapshot.transactions || []));
    AppState.subcategoryRules = JSON.parse(JSON.stringify(snapshot.subcategoryRules || []));
    AppState.categoryDetail = snapshot.categoryDetail ? { ...snapshot.categoryDetail } : null;
    AppState.selectedCategoryTransactions = new Set();
    AppState.assistant.pendingAction = null;
    AppState.assistant.lastStagedAction = null;
    this.clearBudgetContext();
    this.persistBudgetState();
    saveStorage(STORAGE_KEYS.subcategoryRules, AppState.subcategoryRules);
    App.recomputeDerived();
    AppState.assistant.lastFacts = null;
    App.renderAll();
    this.pushMessage("assistant", `Undid last change: ${snapshot.reason || "assistant action"}.`);
    this.renderActionButtons();
  },

  handleLocalAssistantAction(questionText = "") {
    if (this.isCancelRequest(questionText) && AppState.assistant.pendingAction) {
      const cancelled = this.describeAssistantAction(AppState.assistant.pendingAction);
      AppState.assistant.pendingAction = null;
      AppState.assistant.lastStagedAction = null;
      this.pushMessage("assistant", `Cancelled pending change: ${cancelled}`);
      this.renderActionButtons();
      return true;
    }

    if (this.isUndoRequest(questionText)) {
      this.undoLastAssistantChange();
      return true;
    }

    const parsedBatch = this.parseBudgetBatchAction(questionText);
    if (parsedBatch) {
      AppState.assistant.pendingAction = null;
      AppState.assistant.lastStagedAction = null;
      const result = this.applyAssistantAction(parsedBatch);
      this.pushMessage("assistant", result.message);
      this.renderActionButtons();
      return true;
    }

    if (this.isConfirmationRequest(questionText) && !AppState.assistant.pendingAction) {
      const recoveredFromAssistant = this.recoverActionFromRecentAssistantMessages();
      if (recoveredFromAssistant) {
        AppState.assistant.lastStagedAction = null;
        const result = this.applyAssistantAction(recoveredFromAssistant);
        this.pushMessage("assistant", result.message);
        this.renderActionButtons();
        return true;
      }
      const previousActionQuestion = this.getPreviousUserActionMessage(questionText);
      if (previousActionQuestion) {
        const recoveredFromUser = this.parseBudgetBatchAction(previousActionQuestion);
        if (recoveredFromUser) {
          AppState.assistant.lastStagedAction = null;
          const result = this.applyAssistantAction(recoveredFromUser);
          this.pushMessage("assistant", result.message);
          this.renderActionButtons();
          return true;
        }
      }
      this.pushMessage(
        "assistant",
        'There is no pending change to confirm. Ask for the change first, then reply "confirm".'
      );
      this.renderActionButtons();
      return true;
    }

    const parsedLookup = this.parseBudgetLookupAction(questionText);
    if (parsedLookup) {
      if (parsedLookup.type === "invalid") {
        this.pushMessage("assistant", parsedLookup.message);
        this.renderActionButtons();
        return true;
      }
      if (parsedLookup.type === "budget_lookup" && parsedLookup.row) {
        const row = parsedLookup.row;
        this.setBudgetContextFromRow(row);
        this.pushMessage(
          "assistant",
          [
            `Current annual budget for ${row.category} > ${row.item}: ${currencyPrecise.format(toNumber(row.annual_budget, 0))}.`,
            "You can now say: `change this to 3000`.",
          ].join("\n")
        );
        this.renderActionButtons();
        return true;
      }
    }

    const parsedCategory = this.parseCategoryAction(questionText);
    if (parsedCategory) {
      if (parsedCategory.type === "invalid") {
        this.pushMessage("assistant", parsedCategory.message);
        this.renderActionButtons();
        return true;
      }

      if (this.isDirectBudgetCommand(questionText) || this.isConfirmationRequest(questionText)) {
        AppState.assistant.pendingAction = null;
        AppState.assistant.lastStagedAction = null;
        const result = this.applyAssistantAction(parsedCategory);
        this.pushMessage("assistant", result.message);
        this.renderActionButtons();
        return true;
      }

      this.setPendingAction(parsedCategory);
      this.pushMessage(
        "assistant",
        `I can apply this change:\n${this.describeAssistantAction(parsedCategory)}\n\nReply "confirm" or click "Apply Pending Change".`
      );
      return true;
    }

    const parsed = this.parseBudgetAction(questionText);
    if (parsed) {
      if (parsed.type === "invalid") {
        this.pushMessage("assistant", parsed.message);
        this.renderActionButtons();
        return true;
      }

      if (this.isDirectBudgetCommand(questionText) || this.isConfirmationRequest(questionText)) {
        AppState.assistant.pendingAction = null;
        AppState.assistant.lastStagedAction = null;
        const result = this.applyAssistantAction(parsed);
        this.pushMessage("assistant", result.message);
        this.renderActionButtons();
        return true;
      }

      this.setPendingAction(parsed);
      this.pushMessage(
        "assistant",
        `I can apply this change:\n${this.describeAssistantAction(parsed)}\n\nReply "confirm" or click "Apply Pending Change".`
      );
      return true;
    }

    if (this.isConfirmationRequest(questionText) && AppState.assistant.pendingAction) {
      this.confirmPendingAction();
      this.renderActionButtons();
      return true;
    }

    if (this.isAssistantChangeCapabilityQuestion(questionText)) {
      this.pushMessage(
        "assistant",
        [
          "Yes. I can apply in-app budget/category changes with confirmation and undo.",
          "",
          "Use plain English. I'll ask for clarification only if something is ambiguous.",
          "Example: `Set Groceries > Groceries to 12000`",
        ].join("\n")
      );
      this.renderActionButtons();
      return true;
    }

    return false;
  },

  correctCapabilityMisstatement(answerText = "", originalQuestion = "") {
    const raw = String(answerText || "");
    if (!this.isAssistantChangeCapabilityQuestion(originalQuestion)) {
      return raw;
    }
    const normalized = raw
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    const mentionsCannot =
      /\bi\s+(?:cannot|can ?not|can't|still cannot|still can't)\b/.test(normalized) ||
      /\bi\s+(?:do not|don't)\s+have(?:\s+the\s+ability)?\b/.test(normalized) ||
      /\bi\s+am\s+unable\b/.test(normalized) ||
      normalized.includes("no direct access") ||
      normalized.includes("can't directly") ||
      normalized.includes("cannot directly");
    const mentionsEditing =
      normalized.includes("direct changes") ||
      normalized.includes("make changes") ||
      normalized.includes("modify") ||
      normalized.includes("edit") ||
      normalized.includes("update") ||
      normalized.includes("apply") ||
      normalized.includes("save");
    const mentionsBudgetOrTx =
      normalized.includes("budget") ||
      normalized.includes("transaction") ||
      normalized.includes("transactions");

    if (!(mentionsCannot && mentionsEditing && mentionsBudgetOrTx)) {
      return raw;
    }

    return [
      "Yes, I can apply in-app changes with confirmation and undo.",
      "",
      "What I can do now:",
      "- Add/update/remove budget lines",
      "- Add/remove subcategory rules by keyword",
      "- Recategorize transactions by keyword phrase",
      "- Rebuild budget from loaded data",
      "- Undo the last assistant-applied change",
      "",
      "What I cannot auto-edit yet:",
      "- Edit imported source CSV files directly (changes are in-app state)",
      "",
      "Try this now:",
      "`Move transactions containing netflix to Subscriptions > Streaming`",
    ].join("\n");
  },

  isLikelyGenericNonAnswer(answerText = "", questionText = "") {
    const answer = normalizeLabel(answerText);
    if (!answer) return true;
    if (this.isAssistantChangeCapabilityQuestion(questionText)) return false;

    const cannedCapability =
      answer.includes("yes i can apply changes in this app with confirmation and undo") ||
      answer.includes("yes i can apply in app changes with confirmation and undo") ||
      answer.includes("what i can do now") ||
      answer.includes("what i cannot auto edit yet");
    if (cannedCapability) return true;

    const genericFailurePhrases = [
      "i can analyze and provide insights",
      "i can help you draft budget adjustments",
      "i can guide you step by step",
      "i dont have direct access to modify",
      "i do not have direct access to modify",
      "i still dont have the ability to make direct changes",
      "i still do not have the ability to make direct changes",
      "if you want i can help",
      "would you like me to help",
    ];
    if (genericFailurePhrases.some((phrase) => answer.includes(phrase))) {
      return true;
    }

    const questionTokens = this.extractSearchTokens(questionText);
    if (!questionTokens.length) return false;
    const overlap = questionTokens.filter((token) => answer.includes(token)).length;
    const mostlyOfferText =
      answer.includes("if you want") ||
      answer.includes("would you like") ||
      answer.includes("let me know if youd like");
    return overlap === 0 && mostlyOfferText;
  },

  buildClarificationHint(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) {
      return "Please clarify the exact scope (account, month/year, and target item).";
    }
    if (text.includes("subscription") || text.includes("recurring")) {
      return "Please specify: names only, auto-pay only, or amounts for a listed set of names.";
    }
    if (this.isReferenceFollowUp(questionText)) {
      return "Please paste the exact names/list you want me to use.";
    }
    if (text.includes("amount") || text.includes("total") || text.includes("sum") || text.includes("cost")) {
      return "Please specify which merchant(s), category, or date range to total.";
    }
    if (text.includes("transaction")) {
      return "Please specify what transaction filter to apply (merchant, category, month/year, or amount threshold).";
    }
    return "Please clarify the exact scope (account, month/year, and target item).";
  },

  enforceNonGenericAnswer(answerText = "", questionText = "", deterministicFacts = null) {
    const answer = String(answerText || "").trim();
    if (!answer) return answer;
    if (!this.isLikelyGenericNonAnswer(answer, questionText)) return answer;

    const deterministicFallback = this.buildDeterministicAnswer(questionText, deterministicFacts);
    if (deterministicFallback && !this.isLikelyGenericNonAnswer(deterministicFallback, questionText)) {
      return deterministicFallback;
    }

    return [
      "I couldn't answer that reliably from the current data context.",
      `${this.buildClarificationHint(questionText)} I'll answer directly.`,
      "Or ask: `Give me the exact prompt for this query.`",
    ].join("\n");
  },

  guardRemoteMutationClaims(answerText = "", originalQuestion = "") {
    const answer = String(answerText || "").trim();
    if (!answer) return answer;
    if (!this.isActionLikeCommand(originalQuestion)) return answer;

    const lower = normalizeLabel(answer);
    const claimsMutation =
      lower.includes("has been set") ||
      lower.includes("is now set") ||
      lower.includes("i have set") ||
      lower.includes("i ve set") ||
      lower.includes("i have updated") ||
      lower.includes("i ve updated") ||
      lower.includes("has been updated") ||
      lower.includes("has been changed") ||
      lower.includes("has been removed") ||
      lower.includes("has been added");

    if (!claimsMutation) return answer;

    return [
      "I did not apply a change yet.",
      "",
      "To make a real in-app change, use one of these formats:",
      "- `Set budget for Category > Item to 12000`",
      "- `Add budget line Category > Item to 2400`",
      "- `Remove budget line Category > Item`",
      "",
      'Then reply "confirm" or click "Apply Pending Change".',
    ].join("\n");
  },

  trimText(value, max = 80) {
    const text = String(value || "");
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3))}...`;
  },

  extractQuestionYear(questionText = "") {
    const text = String(questionText || "");
    const yearMatch = text.match(/\b(20\d{2})\b/);
    return yearMatch ? yearMatch[1] : "";
  },

  extractRequestedTransactionLimit(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return 0;

    if (/\ball(?:\s+of)?\s+(?:the\s+)?transactions?\b/.test(text)) {
      return 200;
    }

    const patterns = [
      /\b(?:first|top|last)\s+(\d{1,3})\b/,
      /\bshow\s+(?:me\s+)?(\d{1,3})\b/,
      /\blist\s+(?:the\s+)?(\d{1,3})\b/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return clamp(toNumber(match[1], 0), 1, 200);
    }
    return 0;
  },

  extractSearchTokens(questionText = "") {
    const stopWords = new Set([
      "what",
      "which",
      "when",
      "where",
      "why",
      "how",
      "can",
      "could",
      "would",
      "should",
      "the",
      "for",
      "with",
      "from",
      "this",
      "that",
      "about",
      "please",
      "show",
      "tell",
      "give",
      "month",
      "year",
      "data",
      "my",
      "our",
      "and",
      "are",
      "was",
      "were",
      "have",
      "had",
      "does",
      "did",
      "into",
      "over",
      "under",
      "than",
    ]);

    return normalizeLabel(questionText)
      .split(" ")
      .filter((token) => token.length >= 4 && !stopWords.has(token))
      .slice(0, 8);
  },

  extractSubjectTokens(questionText = "") {
    const stopWords = new Set([
      "what",
      "which",
      "when",
      "where",
      "why",
      "how",
      "can",
      "could",
      "would",
      "should",
      "the",
      "for",
      "with",
      "from",
      "this",
      "that",
      "about",
      "please",
      "show",
      "tell",
      "give",
      "month",
      "year",
      "data",
      "my",
      "our",
      "and",
      "are",
      "was",
      "were",
      "have",
      "had",
      "does",
      "did",
      "into",
      "over",
      "under",
      "than",
      "during",
      "much",
      "me",
      "you",
      "your",
      "these",
      "those",
      "them",
      "their",
      "same",
      "only",
      "just",
      "deposit",
      "deposits",
      "deposited",
      "income",
      "inflow",
      "amount",
      "total",
      "accounts",
      "account",
      "transfer",
      "transfers",
    ]);

    return normalizeLabel(questionText)
      .split(" ")
      .filter((token) => /^[a-z]+$/.test(token) && token.length >= 3 && !stopWords.has(token))
      .slice(0, 4);
  },

  isReferenceFollowUp(questionText = "") {
    const text = normalizeLabel(questionText);
    return ["these", "those", "them", "that", "same"].some((token) => text.includes(token));
  },

  isTransactionListFollowUp(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    if (/\b(show|list)\s+(?:me\s+)?(?:first|next|last)?\s*\d+\b/.test(text)) return true;
    if (/\b(show|list)\s+(them|those|these|the rest)\b/.test(text)) return true;
    return false;
  },

  getSubjectNeedles(subjectTokens = []) {
    const needles = new Set();
    subjectTokens.forEach((token) => {
      const normalized = normalizeLabel(token);
      if (!normalized) return;
      needles.add(normalized);

    });
    return [...needles];
  },

  detectMentionedCategory(questionText = "") {
    const normalizedQuestion = normalizeLabel(questionText);
    if (!normalizedQuestion) return "";

    const categories = [...new Set(this.getBaseTransactions().map((tx) => tx.category).filter(Boolean))];
    let bestCategory = "";
    let bestScore = 0;

    categories.forEach((category) => {
      const normalizedCategory = normalizeLabel(category);
      if (!normalizedCategory) return;

      if (normalizedQuestion.includes(normalizedCategory)) {
        const score = 100 + normalizedCategory.length;
        if (score > bestScore) {
          bestCategory = category;
          bestScore = score;
        }
        return;
      }

      const tokens = normalizedCategory.split(" ").filter((part) => part.length >= 4);
      if (!tokens.length) return;
      const matched = tokens.filter((token) => normalizedQuestion.includes(token)).length;
      const minHits = Math.max(1, Math.ceil(tokens.length * 0.67));
      if (matched >= minHits) {
        const score = matched * 10 + normalizedCategory.length;
        if (score > bestScore) {
          bestCategory = category;
          bestScore = score;
        }
      }
    });

    return bestCategory;
  },

  parseQuestionProfile(questionText = "") {
    const text = normalizeLabel(questionText);
    const month = this.extractQuestionMonthKey(questionText);
    const year = this.extractQuestionYear(questionText);
    const category = this.detectMentionedCategory(questionText);
    const subjectTokens = this.extractSubjectTokens(questionText);
    const transactionListLimit = this.extractRequestedTransactionLimit(questionText);

    const has = (patterns = []) => patterns.some((pattern) => text.includes(pattern));
    const intents = {
      expense: has(["expense", "expenses", "spend", "spent", "outflow", "outflows"]),
      income: has(["income", "inflow", "inflows", "earned", "salary", "deposit", "deposited", "deposits"]),
      deposit: has([
        "deposit",
        "deposited",
        "deposits",
        "paid in",
        "partner transfer",
        "transfer from outside coming in",
        "transfer from loan account",
      ]),
      showTransactions: has(["show", "list", "which transactions", "what transactions", "display"]),
      amountBreakdown: has(["amount", "amounts", "cost", "costs", "price", "prices", "how much", "total", "totals", "sum"]),
      net: has(["net", "cashflow", "cash flow", "surplus", "deficit"]),
      topCategories: has(["top categories", "largest categories", "biggest categories", "top 5 categories"]),
      topMerchants: has(["top merchants", "largest merchants", "biggest merchants"]),
      transactionCount: has(["how many", "number of transactions", "transaction count", "count"]),
      subscriptions: has(["subscription", "subscriptions", "subsription", "subsriptions", "recurring"]),
      autoPay: has(["autopay", "auto pay", "automatic payment", "direct debit"]),
      savings: has(["save", "saving", "savings", "cut", "reduce"]),
    };

    const wantsNumeric =
      has([
        "how much",
        "total",
        "totals",
        "sum",
        "amount",
        "spend",
        "spent",
        "expense",
        "expenses",
        "income",
        "net",
        "cashflow",
        "count",
        "top",
        "largest",
        "biggest",
      ]) || intents.expense || intents.income || intents.net || intents.topCategories || intents.topMerchants;

    const requiresReasoning = has([
      "why",
      "how can",
      "how do",
      "recommend",
      "advice",
      "improve",
      "strategy",
      "plan",
      "forecast",
      "predict",
      "should",
      "compare",
      "versus",
      "vs ",
      "opportunity",
    ]);

    return {
      month,
      year,
      category,
      intents,
      wantsNumeric,
      requiresReasoning,
      tokens: this.extractSearchTokens(questionText),
      subjectTokens,
      transactionListLimit,
    };
  },

  getDataCoverage() {
    const baseRows = this.getBaseTransactions();
    if (!baseRows.length) {
      return {
        from_date: "",
        to_date: "",
        months_available: 0,
        transaction_count: 0,
      };
    }
    const sortedByDate = [...baseRows].sort((a, b) => a.date.localeCompare(b.date));
    return {
      from_date: sortedByDate[0]?.date || "",
      to_date: sortedByDate[sortedByDate.length - 1]?.date || "",
      months_available: new Set(baseRows.map((tx) => tx.month).filter(Boolean)).size,
      transaction_count: baseRows.length,
    };
  },

  getScopedTransactions(profile) {
    let rows = this.getBaseTransactions();

    if (profile.month) {
      rows = rows.filter((tx) => tx.month === profile.month);
    } else if (profile.year) {
      rows = rows.filter((tx) => tx.date.startsWith(`${profile.year}-`));
    }

    if (profile.category) {
      const targetCategory = normalizeLabel(profile.category);
      rows = rows.filter((tx) => normalizeLabel(tx.category) === targetCategory);
    }

    if (profile.intents?.deposit) {
      rows = rows.filter((tx) => tx.amount > 0);
      const needles = this.getSubjectNeedles(profile.subjectTokens || []);
      if (needles.length) {
        rows = rows.filter((tx) => {
          const haystack = normalizeLabel(
            `${tx.description || ""} ${tx.category || ""} ${tx.subcategory || ""} ${tx.account || ""}`
          );
          return needles.some((needle) => haystack.includes(needle));
        });
      }
    }

    return rows;
  },

  summarizeTransactions(rows = []) {
    const incomeRows = rows.filter((tx) => includeTransactionInIncome(tx));
    const expenseRows = rows.filter((tx) => includeTransactionInSpending(tx));
    const income = sum(incomeRows.map((tx) => tx.amount));
    const expenses = sum(expenseRows.map((tx) => Math.abs(tx.amount)));
    const net = income - expenses;

    const categoryExpenseMap = new Map();
    expenseRows.forEach((tx) => {
      categoryExpenseMap.set(tx.category, (categoryExpenseMap.get(tx.category) || 0) + Math.abs(tx.amount));
    });

    const merchantExpenseMap = new Map();
    expenseRows.forEach((tx) => {
      const merchant = normalizeMerchant(tx.description);
      merchantExpenseMap.set(merchant, (merchantExpenseMap.get(merchant) || 0) + Math.abs(tx.amount));
    });

    const topExpenseCategories = [...categoryExpenseMap.entries()]
      .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const topExpenseMerchants = [...merchantExpenseMap.entries()]
      .map(([merchant, total]) => ({ merchant, total: Number(total.toFixed(2)) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const largestExpense = [...expenseRows]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .map((tx) => ({
        date: tx.date,
        description: this.trimText(tx.description, 120),
        category: tx.category,
        subcategory: tx.subcategory,
        amount: Number(Math.abs(tx.amount).toFixed(2)),
      }))[0] || null;

    const largestIncome = [...incomeRows]
      .sort((a, b) => b.amount - a.amount)
      .map((tx) => ({
        date: tx.date,
        description: this.trimText(tx.description, 120),
        category: tx.category,
        subcategory: tx.subcategory,
        amount: Number(tx.amount.toFixed(2)),
      }))[0] || null;

    return {
      transaction_count: rows.length,
      income_count: incomeRows.length,
      expense_count: expenseRows.length,
      income_total: Number(income.toFixed(2)),
      expense_total: Number(expenses.toFixed(2)),
      net_total: Number(net.toFixed(2)),
      top_expense_categories: topExpenseCategories,
      top_expense_merchants: topExpenseMerchants,
      largest_expense: largestExpense,
      largest_income: largestIncome,
    };
  },

  getRelevantTransactionSample(profile, scopedRows = []) {
    const baseRows = scopedRows.length ? scopedRows : this.getBaseTransactions();
    if (!baseRows.length) return [];

    const tokens = profile.tokens || [];
    let relevant = baseRows;
    if (tokens.length) {
      relevant = baseRows.filter((tx) => {
        const haystack = normalizeLabel(
          `${tx.description || ""} ${tx.category || ""} ${tx.subcategory || ""} ${tx.account || ""}`
        );
        return tokens.some((token) => haystack.includes(token));
      });
    }

    if (!relevant.length) {
      relevant = baseRows;
    }

    return relevant.slice(0, 120).map((tx) => ({
      date: tx.date,
      description: this.trimText(tx.description, 110),
      category: tx.category,
      subcategory: tx.subcategory,
      account: tx.account || "",
      amount: Number(tx.amount.toFixed(2)),
    }));
  },

  buildDeterministicFacts(questionText = "") {
    let profile = this.parseQuestionProfile(questionText);
    const previousProfile = AppState.assistant.lastFacts?.profile || null;
    const hasSpecificScope =
      Boolean(profile.month) ||
      Boolean(profile.year) ||
      Boolean(profile.category) ||
      (Array.isArray(profile.subjectTokens) && profile.subjectTokens.length > 0);
    const shouldCarryScope =
      Boolean(previousProfile) &&
      !hasSpecificScope &&
      (this.isReferenceFollowUp(questionText) || this.isTransactionListFollowUp(questionText));
    if (shouldCarryScope) {
      const previousIntents = previousProfile.intents || {};
      profile = {
        ...profile,
        month: profile.month || previousProfile.month || "",
        year: profile.year || previousProfile.year || "",
        category: profile.category || previousProfile.category || "",
        subjectTokens:
          (Array.isArray(previousProfile.subject_tokens) && previousProfile.subject_tokens.length
            ? previousProfile.subject_tokens
            : profile.subjectTokens) || [],
        intents: {
          ...profile.intents,
          income: Boolean(profile.intents?.income || previousIntents.income),
          expense: Boolean(profile.intents?.expense || previousIntents.expense),
          deposit: Boolean(profile.intents?.deposit || previousIntents.deposit),
          showTransactions: Boolean(profile.intents?.showTransactions || previousIntents.showTransactions),
        },
        wantsNumeric: Boolean(
          profile.wantsNumeric ||
            previousProfile.wants_numeric ||
            profile.intents?.income ||
            profile.intents?.expense ||
            profile.intents?.deposit
        ),
        transactionListLimit:
          toNumber(profile.transactionListLimit, 0) > 0
            ? toNumber(profile.transactionListLimit, 0)
            : toNumber(previousProfile.transaction_list_limit, 0),
      };
    }

    const scopedRows = this.getScopedTransactions(profile);
    const scopedSummary = this.summarizeTransactions(scopedRows);
    const accountRows = this.getBaseTransactions();
    const accountMonthlyCashflow = buildMonthlyCashflow(accountRows);
    const monthlyRow = profile.month
      ? accountMonthlyCashflow.find((row) => row.month === profile.month) || null
      : null;
    const filteredRows = filterTransactionsByAccount(
      TransactionsController.getFilteredTransactions(),
      AppState.assistant.account
    );

    return {
      generated_at: new Date().toISOString(),
      profile: {
        month: profile.month || null,
        year: profile.year || null,
        category: profile.category || null,
        account: AppState.assistant.account || "all",
        subject_tokens: profile.subjectTokens || [],
        transaction_list_limit: toNumber(profile.transactionListLimit, 0) || null,
        wants_numeric: profile.wantsNumeric,
        requires_reasoning: profile.requiresReasoning,
        intents: profile.intents,
      },
      coverage: this.getDataCoverage(),
      scoped_summary: scopedSummary,
      monthly_cashflow_row: monthlyRow
        ? {
            month: monthlyRow.month,
            income: Number(monthlyRow.income.toFixed(2)),
            expenses: Number(monthlyRow.expenses.toFixed(2)),
            net: Number(monthlyRow.net.toFixed(2)),
            savings_rate_pct:
              monthlyRow.income > 0
                ? Number(((monthlyRow.net / monthlyRow.income) * 100).toFixed(2))
                : 0,
          }
        : null,
      filtered_scope_summary: this.summarizeTransactions(filteredRows),
      relevant_transactions_sample: this.getRelevantTransactionSample(profile, scopedRows),
    };
  },

  describeScopeLabel(profile) {
    const accountLabel =
      profile.account && profile.account !== "all" ? ` (${profile.account})` : "";
    const subjectLabel = Array.isArray(profile.subject_tokens) && profile.subject_tokens.length
      ? ` for ${profile.subject_tokens.join(" ")}`
      : "";
    if (profile.month && profile.category) return `${profile.category} in ${formatMonth(profile.month)}${subjectLabel}${accountLabel}`;
    if (profile.month) return `${formatMonth(profile.month)}${subjectLabel}${accountLabel}`;
    if (profile.year && profile.category) return `${profile.category} in ${profile.year}${subjectLabel}${accountLabel}`;
    if (profile.year) return `${profile.year}${subjectLabel}${accountLabel}`;
    if (profile.category) return `${profile.category}${subjectLabel}${accountLabel}`;
    return `the selected dataset${subjectLabel}${accountLabel}`;
  },

  rememberQueryResult(result = null) {
    if (!result || typeof result !== "object") {
      AppState.assistant.lastQueryResult = null;
      return;
    }
    AppState.assistant.lastQueryResult = {
      ...result,
      createdAt: new Date().toISOString(),
      account: AppState.assistant.account || "all",
    };
  },

  extractNamedListFromQuestion(questionText = "") {
    const raw = String(questionText || "");
    if (!raw.trim()) return [];

    const blockedPrefixes = ["please", "can you", "could you", "would you", "show", "list", "give", "tell"];
    const sanitize = (value) =>
      String(value || "")
        .replace(/^[\-*\u2022]\s*/, "")
        .trim()
        .replace(/[.?!,;:]$/, "")
        .trim();

    const rawLines = raw.split(/\r?\n/);
    const explicitBullets = rawLines
      .map((line) => {
        const match = line.match(/^\s*[-*\u2022]\s+(.+?)\s*$/);
        return match ? sanitize(match[1]) : "";
      })
      .filter((line) => line.length >= 3);
    if (explicitBullets.length >= 2) {
      return [...new Set(explicitBullets)].slice(0, 60);
    }

    const lines = raw.split(/\r?\n/).map((line) => sanitize(line)).filter(Boolean);
    const bulletRows = lines.filter((line) => /^[A-Za-z0-9]/.test(line) && !blockedPrefixes.some((prefix) => normalizeLabel(line).startsWith(prefix)));
    const explicitBulletList = bulletRows.filter((line) => line.length >= 3);
    if (explicitBulletList.length >= 2) {
      return [...new Set(explicitBulletList)].slice(0, 60);
    }

    if (!raw.includes(":")) return [];
    const afterColon = raw.split(":").slice(1).join(":");
    const commaItems = afterColon
      .split(/[,\n]/)
      .map((entry) => sanitize(entry))
      .filter((entry) => entry.length >= 3 && !blockedPrefixes.some((prefix) => normalizeLabel(entry).startsWith(prefix)));
    return [...new Set(commaItems)].slice(0, 60);
  },

  resolveNamedListForFollowUp(questionText = "") {
    const explicit = this.extractNamedListFromQuestion(questionText);
    if (explicit.length) return explicit;

    if (!this.isReferenceFollowUp(questionText)) return [];
    const cached = AppState.assistant.lastQueryResult;
    if (
      cached &&
      Array.isArray(cached.names) &&
      cached.names.length &&
      String(cached.account || "all") === String(AppState.assistant.account || "all")
    ) {
      return cached.names.slice(0, 60);
    }
    return this.extractNamesFromRecentAssistantMessage();
  },

  extractNamesFromRecentAssistantMessage() {
    const recentAssistantMessages = (AppState.assistant.messages || [])
      .filter((msg) => msg?.role === "assistant" && String(msg?.content || "").trim())
      .slice(-6)
      .reverse();

    for (const msg of recentAssistantMessages) {
      const content = String(msg.content || "");
      const normalized = normalizeLabel(content);
      const listLikelyDomain =
        normalized.includes("subscription") ||
        normalized.includes("merchant") ||
        normalized.includes("auto pay") ||
        normalized.includes("direct debit") ||
        normalized.includes("recurring");
      if (!listLikelyDomain) continue;
      const parsed = this.extractNamedListFromQuestion(content);
      if (parsed.length >= 2) return parsed.slice(0, 60);
    }
    return [];
  },

  captureNamedListFromAssistantAnswer(questionText = "", answerText = "") {
    const question = normalizeLabel(questionText);
    if (!question) return;
    const likelyListQuery =
      /\b(list|names|subscriptions|subscription|recurring|auto ?pay|direct debit|which ones|for these|for those)\b/.test(
        question
      );
    if (!likelyListQuery) return;
    const names = this.extractNamedListFromQuestion(answerText);
    if (names.length < 2) return;
    this.rememberQueryResult({
      type: "merchant_names",
      names: names.slice(0, 60),
      mode: "assistant_list_capture",
      scope: {},
    });
  },

  matchesMerchantNeedle(tx, needle) {
    const normalizedNeedle = normalizeLabel(needle);
    if (!normalizedNeedle) return false;
    const merchant = normalizeLabel(normalizeMerchant(tx.description));
    const description = normalizeLabel(tx.description || "");
    if (!merchant && !description) return false;
    return (
      merchant.includes(normalizedNeedle) ||
      normalizedNeedle.includes(merchant) ||
      description.includes(normalizedNeedle)
    );
  },

  getScopedExpenseRows(profile = {}) {
    let rows = this.getBaseTransactions().filter((tx) => toNumber(tx.amount, 0) < 0);
    if (profile?.month) {
      rows = rows.filter((tx) => String(tx.month || "") === String(profile.month || ""));
    } else if (profile?.year) {
      rows = rows.filter((tx) => String(tx.date || "").startsWith(`${profile.year}-`));
    }
    return rows;
  },

  getSubscriptionQueryOptions(questionText = "") {
    const text = normalizeLabel(questionText);
    const strictMode = /\b(subscription|subscriptions)\s+only\b/.test(text) || /\bonly\s+(subscription|subscriptions)\b/.test(text);
    const includeTransfers = /\b(include|with)\s+transfers?\b/.test(text);
    const includeUtilities = /\b(include|with)\s+utilit(?:y|ies)\b/.test(text);
    const includeGroceries = /\b(include|with)\s+grocer(?:y|ies)\b/.test(text);
    const excludeTransfersExplicit = /\b(exclude|without|no)\s+transfers?\b/.test(text);
    const excludeUtilitiesExplicit = /\b(exclude|without|no)\s+utilit(?:y|ies)\b/.test(text);
    const excludeGroceriesExplicit = /\b(exclude|without|no)\s+grocer(?:y|ies)\b/.test(text);
    const identicalOnly =
      /\b(identical|same amount|exact same amount|fixed amount|equal amount)\b/.test(text) ||
      (/\bregular\b/.test(text) && /\bidentical\b/.test(text));
    return {
      strictMode,
      excludeTransfers: excludeTransfersExplicit || !includeTransfers,
      excludeUtilities: excludeUtilitiesExplicit || !includeUtilities,
      excludeGroceries: excludeGroceriesExplicit || !includeGroceries,
      identicalOnly,
    };
  },

  computeCadenceStats(rows = []) {
    const sortedDates = rows
      .map((tx) => String(tx.date || ""))
      .filter(Boolean)
      .sort();
    const intervals = [];
    for (let i = 1; i < sortedDates.length; i += 1) {
      const prev = new Date(`${sortedDates[i - 1]}T00:00:00`);
      const curr = new Date(`${sortedDates[i]}T00:00:00`);
      const days = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (days > 0 && days <= 120) intervals.push(days);
    }
    if (intervals.length < 2) {
      return {
        stable: false,
        avg_days: 0,
        frequency: "Irregular",
        multiplier: 12,
        match_ratio: 0,
      };
    }

    const avgDays = sum(intervals) / intervals.length;
    const intervalStd = standardDeviation(intervals);
    const intervalCv = avgDays > 0 ? intervalStd / avgDays : 1;

    let frequency = "Irregular";
    let multiplier = 12;
    let target = 30;
    let tolerance = 9;
    if (avgDays <= 9) {
      frequency = "Weekly";
      multiplier = 52;
      target = 7;
      tolerance = 3;
    } else if (avgDays <= 18) {
      frequency = "Fortnightly";
      multiplier = 26;
      target = 14;
      tolerance = 5;
    } else if (avgDays <= 40) {
      frequency = "Monthly";
      multiplier = 12;
      target = 30;
      tolerance = 9;
    } else if (avgDays <= 100) {
      frequency = "Quarterly";
      multiplier = 4;
      target = 91;
      tolerance = 15;
    }

    const matchRatio = intervals.filter((days) => Math.abs(days - target) <= tolerance).length / intervals.length;
    const stable = matchRatio >= 0.6 && intervalCv <= 0.65;
    return {
      stable,
      avg_days: Number(avgDays.toFixed(1)),
      frequency,
      multiplier,
      match_ratio: Number(matchRatio.toFixed(2)),
    };
  },

  computeAmountStats(rows = []) {
    const values = rows.map((tx) => Math.abs(toNumber(tx.amount, 0))).filter((value) => value > 0);
    if (!values.length) {
      return { average: 0, cv: 1, stable: false };
    }
    const average = sum(values) / values.length;
    const amountStd = standardDeviation(values);
    const cv = average > 0 ? amountStd / average : 1;
    return {
      average: Number(average.toFixed(2)),
      cv: Number(cv.toFixed(3)),
      stable: values.length < 2 ? true : cv <= 0.45,
    };
  },

  isTransferLikeMerchant(merchant = "", descriptions = []) {
    const transferPattern = /\b(tfr|transfer|auth ref|loan repayment|loan payment|sinking fund)\b/i;
    if (transferPattern.test(String(merchant || ""))) return true;
    return descriptions.some((desc) => transferPattern.test(String(desc || "")));
  },

  isUtilitiesLikeSignal(category = "", subcategory = "", descriptionUpper = "") {
    const normalizedCategory = normalizeLabel(category);
    const normalizedSubcategory = normalizeLabel(subcategory);
    const categorySignal =
      normalizedCategory.includes("housing") ||
      normalizedCategory.includes("airbnb");
    const subcategorySignal =
      normalizedSubcategory.includes("rates") ||
      normalizedSubcategory.includes("water") ||
      normalizedSubcategory.includes("electricity") ||
      normalizedSubcategory.includes("gas") ||
      normalizedSubcategory.includes("internet") ||
      normalizedSubcategory.includes("home insurance");
    const descriptionSignal = /\b(utility|rates|electricity|water)\b/i.test(descriptionUpper);
    return categorySignal || subcategorySignal || descriptionSignal;
  },

  isGroceriesLikeSignal(category = "", subcategory = "", descriptionUpper = "") {
    const normalizedCategory = normalizeLabel(category);
    const normalizedSubcategory = normalizeLabel(subcategory);
    const categorySignal =
      normalizedCategory.includes("groceries") ||
      normalizedCategory.includes("dining");
    const subcategorySignal =
      normalizedSubcategory.includes("groceries") ||
      normalizedSubcategory.includes("dining") ||
      normalizedSubcategory.includes("takeaway");
    const descriptionSignal = /\b(woolworths|coles|aldi|iga|costco|foodworks|butcher|restaurant|cafe)\b/i.test(
      descriptionUpper
    );
    return categorySignal || subcategorySignal || descriptionSignal;
  },

  getSubscriptionCandidatesDetailed(profile = {}, questionText = "") {
    const options = this.getSubscriptionQueryOptions(questionText);
    const rows = this.getScopedExpenseRows(profile);
    if (!rows.length) return [];

    const recurringByEngine = typeof AIController.findRecurringSubscriptions === "function"
      ? AIController.findRecurringSubscriptions(this.getBaseTransactions())
      : [];
    const recurringEngineMap = new Map(
      recurringByEngine.map((row) => [normalizeLabel(String(row?.merchant || "")), row])
    );

    const byMerchant = groupBy(rows, (tx) => normalizeMerchant(tx.description));
    const candidates = [];
    byMerchant.forEach((merchantRows, merchantName) => {
      const name = String(merchantName || "").trim();
      if (!name || name === "Unknown") return;

      const descriptions = merchantRows.map((tx) => String(tx.description || ""));
      const descriptionUpper = descriptions.join(" | ").toUpperCase();
      const category = mode(merchantRows.map((tx) => tx.category)) || "Uncategorized";
      const subcategory = mode(merchantRows.map((tx) => tx.subcategory)) || "Other";

      const keywordSignal = containsAny(descriptionUpper, CSV_SUBSCRIPTION_KEYWORDS);
      const normalizedCategory = normalizeLabel(category);
      const normalizedSubcategory = normalizeLabel(subcategory);
      const labelSignal =
        normalizedCategory.includes("subscription") ||
        normalizedSubcategory.includes("subscription") ||
        normalizedCategory === "lifestyle";

      const cadence = this.computeCadenceStats(merchantRows);
      const amount = this.computeAmountStats(merchantRows);
      const transferLike = this.isTransferLikeMerchant(name, descriptions);
      const utilitiesLike = this.isUtilitiesLikeSignal(category, subcategory, descriptionUpper);
      const groceriesLike = this.isGroceriesLikeSignal(category, subcategory, descriptionUpper);
      const engineSignal = recurringEngineMap.has(normalizeLabel(name));

      let score = 0;
      if (keywordSignal) score += 3;
      if (labelSignal) score += 2;
      if (engineSignal) score += 2;
      if (cadence.stable) score += 2;
      if (amount.stable) score += 1;
      if (merchantRows.length >= 3) score += 1;
      if (transferLike) score -= 4;
      if (utilitiesLike) score -= 3;
      if (groceriesLike) score -= 3;

      const confidence = score >= 7 ? "High" : score >= 5 ? "Medium" : "Low";
      const monthsSeen = new Set(merchantRows.map((tx) => String(tx.month || "")).filter(Boolean)).size || 1;
      const total = sum(merchantRows.map((tx) => Math.abs(toNumber(tx.amount, 0))));
      const monthlyAvg = total / Math.max(1, monthsSeen);
      const annualizedEstimate = cadence.stable
        ? amount.average * cadence.multiplier
        : monthlyAvg * 12;

      const blockedByFilters =
        (options.excludeTransfers && transferLike) ||
        (options.excludeUtilities && utilitiesLike) ||
        (options.excludeGroceries && groceriesLike);
      const isIdenticalPattern = cadence.stable && amount.stable && amount.cv <= 0.08;
      const minScore = options.strictMode ? 5 : 4;
      if (blockedByFilters || score < minScore) return;
      if (options.identicalOnly && !isIdenticalPattern) return;

      candidates.push({
        name,
        category,
        subcategory,
        score,
        confidence,
        transaction_count: merchantRows.length,
        monthly_average: Number(monthlyAvg.toFixed(2)),
        annualized_estimate: Number(annualizedEstimate.toFixed(2)),
        cadence_frequency: cadence.frequency,
        signals: {
          keyword: keywordSignal,
          label: labelSignal,
          recurring_engine: engineSignal,
          recurring_cadence: cadence.stable,
          amount_stable: amount.stable,
          amount_identical: isIdenticalPattern,
          transfer_like: transferLike,
          utilities_like: utilitiesLike,
          groceries_like: groceriesLike,
        },
      });
    });

    return candidates
      .sort((a, b) => b.score - a.score || b.annualized_estimate - a.annualized_estimate)
      .slice(0, 30);
  },

  summarizeExpensesForNamedList(names = [], profile = {}) {
    if (!Array.isArray(names) || !names.length) return [];
    const rows = this.getScopedExpenseRows(profile);
    return names
      .map((name) => {
        const matched = rows.filter((tx) => this.matchesMerchantNeedle(tx, name));
        if (!matched.length) return null;
        const total = sum(matched.map((tx) => Math.abs(toNumber(tx.amount, 0))));
        const monthsSeen = new Set(matched.map((tx) => String(tx.month || "")).filter(Boolean)).size || 1;
        const monthlyAverage = total / Math.max(1, monthsSeen);
        return {
          name,
          transaction_count: matched.length,
          total: Number(total.toFixed(2)),
          months_seen: monthsSeen,
          monthly_average: Number(monthlyAverage.toFixed(2)),
          annualized_estimate: Number((monthlyAverage * 12).toFixed(2)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.total - a.total);
  },

  assessAutoPayForNamedList(names = [], profile = {}) {
    if (!Array.isArray(names) || !names.length) return [];
    const rows = this.getScopedExpenseRows(profile);
    return names
      .map((name) => {
        const matched = rows.filter((tx) => this.matchesMerchantNeedle(tx, name));
        if (!matched.length) return null;
        const descriptions = matched.map((tx) => String(tx.description || ""));
        const descriptionUpper = descriptions.join(" | ").toUpperCase();
        const category = mode(matched.map((tx) => tx.category)) || "";
        const subcategory = mode(matched.map((tx) => tx.subcategory)) || "";
        const hasDirectDebitText = /\b(direct debit|auto ?pay|autopay|membership|subscr|subscription|apple\.com\/bill|paypal|netflix|stan\.com|amznprime|wix\.com)\b/i.test(
          descriptionUpper
        );
        const keywordSignal = containsAny(descriptionUpper, CSV_SUBSCRIPTION_KEYWORDS);
        const cadence = this.computeCadenceStats(matched);
        const amount = this.computeAmountStats(matched);
        const transferLike = this.isTransferLikeMerchant(name, descriptions);
        const utilitiesLike = this.isUtilitiesLikeSignal(category, subcategory, descriptionUpper);

        let score = 0;
        if (hasDirectDebitText) score += 4;
        if (keywordSignal) score += 1;
        if (cadence.stable) score += 2;
        if (amount.stable) score += 1;
        if (matched.length >= 3) score += 1;
        if (transferLike) score -= 4;
        if (utilitiesLike) score -= 2;

        const likelyAutoPay = score >= 4 && !transferLike;
        const confidence = score >= 7 ? "High" : score >= 5 ? "Medium" : "Low";
        const reasons = [];
        if (hasDirectDebitText) reasons.push("direct-debit/subscription text");
        if (cadence.stable) reasons.push(`${cadence.frequency.toLowerCase()} cadence`);
        if (amount.stable) reasons.push("consistent amount");
        if (!reasons.length) reasons.push("weak recurring signal");

        const total = sum(matched.map((tx) => Math.abs(toNumber(tx.amount, 0))));
        const monthsSeen = new Set(matched.map((tx) => String(tx.month || "")).filter(Boolean)).size || 1;
        const monthlyAverage = total / Math.max(1, monthsSeen);
        return {
          name,
          transaction_count: matched.length,
          likely_auto_pay: likelyAutoPay,
          confidence,
          score,
          reason: reasons.join(", "),
          has_direct_debit_text: hasDirectDebitText,
          has_recurring_cadence: cadence.stable,
          monthly_average: Number(monthlyAverage.toFixed(2)),
          annualized_estimate: Number((monthlyAverage * 12).toFixed(2)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.likely_auto_pay) - Number(a.likely_auto_pay) || b.score - a.score);
  },

  getSubscriptionCandidates(profile = {}, questionText = "") {
    return this.getSubscriptionCandidatesDetailed(profile, questionText).map((row) => row.name);
  },

  buildDeterministicAnswer(questionText = "", deterministicFacts = null) {
    const facts = deterministicFacts || this.buildDeterministicFacts(questionText);
    const profile = facts.profile || {};
    const intents = profile.intents || {};
    const summary = facts.scoped_summary || {};
    const txCount = toNumber(summary.transaction_count, 0);
    const normalizedQuestion = normalizeLabel(questionText);
    if (normalizedQuestion.includes("give me the exact prompt for this query")) {
      const last = AppState.assistant.lastQueryResult;
      if (last?.type === "transaction_query" && String(last.prompt || "").trim()) {
        return `Use this exact prompt: \`${String(last.prompt).trim()}\``;
      }
      if (last?.type === "merchant_names" && Array.isArray(last.names) && last.names.length) {
        if (last.mode === "subscriptions") {
          return 'Use this exact prompt: `List possible subscriptions only (exclude transfers and utilities), names only, across all accounts and dates.`';
        }
        if (last.mode === "auto_pay_candidates") {
          return 'Use this exact prompt: `Give me the expense totals for these auto-pay names, including monthly average and annualized estimate.`';
        }
        return 'Use this exact prompt: `Give me the expense totals for these names, including monthly average and annualized estimate.`';
      }
      return 'Use this exact prompt: `List possible subscriptions only (exclude transfers and utilities), names only, across all accounts and dates.`';
    }

    if (
      /\b(do you understand|did you understand|are you following|what am i trying to do)\b/.test(
        normalizedQuestion
      )
    ) {
      const last = AppState.assistant.lastQueryResult;
      if (last?.type === "merchant_names" && Array.isArray(last.names) && last.names.length) {
        return [
          "Yes. You want a clean recurring merchant list first, then filtered amounts from that exact list.",
          `I currently have ${last.names.length} names in context.`,
        ].join("\n");
      }
      return "Yes. You want accurate answers from your loaded data without generic filler, and clear follow-up handling.";
    }

    if (/\b(narrow|narrow down|refine|filter these|tighten)\b/.test(normalizedQuestion)) {
      const last = AppState.assistant.lastQueryResult;
      if (last?.type === "merchant_names" && Array.isArray(last.names) && last.names.length) {
        const details = this
          .getSubscriptionCandidatesDetailed(profile, "subscriptions only exclude transfers exclude utilities exclude groceries")
          .filter((row) => last.names.some((name) => normalizeLabel(name) === normalizeLabel(row.name)))
          .filter((row) => row.confidence === "High");
        if (details.length) {
          this.rememberQueryResult({
            type: "merchant_names",
            names: details.map((row) => row.name).slice(0, 60),
            mode: "subscriptions",
            scope: { month: profile.month || "", year: profile.year || "" },
          });
          return [
            "Narrowed list (high-confidence subscriptions only):",
            ...details.map((row) => `- ${row.name}`),
          ].join("\n");
        }
      }
    }

    const namedList = this.resolveNamedListForFollowUp(questionText);
    const autoPayTargets =
      intents.autoPay && namedList.length
        ? namedList
        : intents.autoPay && intents.subscriptions
          ? this.getSubscriptionCandidates(profile, questionText)
          : [];

    if (intents.autoPay && autoPayTargets.length && !profile.requires_reasoning && !this.isActionLikeCommand(questionText)) {
      const scopeLabel = this.describeScopeLabel(profile);
      const assessed = this.assessAutoPayForNamedList(autoPayTargets, profile);
      if (!assessed.length) {
        return `I couldn't find matching transactions to assess auto-pay status for ${scopeLabel}.`;
      }
      const likely = assessed.filter((row) => row.likely_auto_pay);
      if (!likely.length) {
        return `I couldn't identify clear auto-pay signals for those names in ${scopeLabel}.`;
      }
      this.rememberQueryResult({
        type: "merchant_names",
        names: likely.map((row) => row.name).slice(0, 60),
        mode: "auto_pay_candidates",
        scope: { month: profile.month || "", year: profile.year || "" },
      });
      const namesOnly = /\b(names only|name only|just names|only names)\b/i.test(String(questionText || ""));
      if (namesOnly) {
        return likely.map((row) => `- ${row.name}`).join("\n");
      }
      return [
        `Likely auto-pay subscriptions (${scopeLabel}):`,
        ...likely.map(
          (row) =>
            `- ${row.name} (${row.confidence}) | ${currencyPrecise.format(row.monthly_average)}/month | est annual ${currencyPrecise.format(row.annualized_estimate)} | ${row.reason}`
        ),
      ].join("\n");
    }

    const asksAmountsForNamedList =
      namedList.length > 0 &&
      !this.isActionLikeCommand(questionText) &&
      (intents.amountBreakdown || intents.expense || /\b(amount|amounts|total|totals|sum|cost|costs|for these|for those|for the following)\b/.test(normalizedQuestion));

    if (asksAmountsForNamedList && !profile.requires_reasoning) {
      const scopeLabel = this.describeScopeLabel(profile);
      const totals = this.summarizeExpensesForNamedList(namedList, profile);
      if (!totals.length) {
        return `I couldn't match those names to expense transactions for ${scopeLabel}.`;
      }

      const matchedSet = new Set(totals.map((item) => normalizeLabel(item.name)));
      const unmatched = namedList.filter((name) => !matchedSet.has(normalizeLabel(name)));
      this.rememberQueryResult({
        type: "merchant_names",
        names: namedList.slice(0, 60),
        mode: "named_list_amounts",
        scope: { month: profile.month || "", year: profile.year || "" },
      });

      const lines = [
        `Expenses for requested names (${scopeLabel}):`,
        ...totals.map(
          (item) =>
            `- ${item.name}: ${currencyPrecise.format(item.total)} total | ${currencyPrecise.format(item.monthly_average)}/month avg | est annual ${currencyPrecise.format(item.annualized_estimate)} | ${item.transaction_count} transaction${item.transaction_count === 1 ? "" : "s"}`
        ),
      ];
      if (unmatched.length) {
        lines.push("");
        lines.push(`No matches found for: ${unmatched.slice(0, 8).join(", ")}`);
      }
      return lines.join("\n");
    }

    if (intents.subscriptions && !profile.requires_reasoning) {
      const scopeLabel = this.describeScopeLabel(profile);
      const subscriptionOptions = this.getSubscriptionQueryOptions(questionText);
      const details = this.getSubscriptionCandidatesDetailed(profile, questionText);
      const names = details.map((row) => row.name);
      if (!details.length) {
        if (subscriptionOptions.identicalOnly) {
          return `I couldn't find subscriptions with identical regular payment amounts for ${scopeLabel}.`;
        }
        return `I couldn't find clear recurring subscription names for ${scopeLabel}.`;
      }
      this.rememberQueryResult({
        type: "merchant_names",
        names: names.slice(0, 60),
        mode: "subscriptions",
        scope: { month: profile.month || "", year: profile.year || "" },
      });
      const namesOnly = /\b(names only|name only|just names|only names)\b/i.test(String(questionText || ""));
      if (namesOnly) {
        return names.map((name) => `- ${name}`).join("\n");
      }
      return [
        `Possible subscriptions for ${scopeLabel}:`,
        ...details.map(
          (row) =>
            `- ${row.name} (${row.confidence}) | ${currencyPrecise.format(row.monthly_average)}/month | est annual ${currencyPrecise.format(row.annualized_estimate)}`
        ),
      ].join("\n");
    }

    if (!profile.wants_numeric || profile.requires_reasoning) return "";
    if (!txCount) {
      const scopeLabel = this.describeScopeLabel(profile);
      return `I could not find transactions for ${scopeLabel}. Try a different month, year, or category.`;
    }

    const scopeLabel = this.describeScopeLabel(profile);
    const lines = [];

    if (intents.showTransactions && !this.isActionLikeCommand(questionText)) {
      let listRows = this.getScopedTransactions({
        month: profile.month || "",
        year: profile.year || "",
        category: profile.category || "",
        subjectTokens: profile.subject_tokens || [],
        intents: {
          ...(profile.intents || {}),
          deposit: Boolean(intents.deposit),
        },
      });
      if (intents.income && !intents.expense) {
        listRows = listRows.filter((tx) => toNumber(tx.amount, 0) > 0);
      } else if (intents.expense && !intents.income) {
        listRows = listRows.filter((tx) => toNumber(tx.amount, 0) < 0);
      }

      if (!listRows.length) {
        return `I couldn't find matching transactions to list for ${scopeLabel}.`;
      }

      const requestedLimit =
        toNumber(profile.transaction_list_limit, 0) || this.extractRequestedTransactionLimit(questionText) || 30;
      const limit = clamp(Math.round(requestedLimit), 1, 120);
      const shownRows = listRows.slice(0, Math.min(limit, listRows.length));
      const listLines = [
        `Showing ${shownRows.length} of ${listRows.length} matching transactions for ${scopeLabel}:`,
      ];

      shownRows.forEach((tx, index) => {
        listLines.push(
          `${index + 1}. ${formatDate(tx.date)} | ${currencyPrecise.format(toNumber(tx.amount, 0))} | ${this.trimText(
            tx.description,
            72
          )} | ${tx.account || "Unknown account"} | ${tx.category} > ${tx.subcategory}`
        );
      });

      if (listRows.length > shownRows.length) {
        listLines.push("");
        listLines.push(
          `Showing first ${shownRows.length} only. Ask for a higher limit (example: "show first ${Math.min(
            listRows.length,
            shownRows.length + 20
          )}").`
        );
      }

      this.rememberQueryResult({
        type: "transaction_query",
        mode: "transactions_list",
        prompt: String(questionText || "").trim(),
      });
      return listLines.join("\n");
    }

    if (intents.topCategories) {
      const top = (summary.top_expense_categories || []).slice(0, 5);
      lines.push(`Top expense categories for ${scopeLabel}:`);
      top.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.category}: ${currencyPrecise.format(item.total)}`);
      });
      lines.push(`Based on ${txCount} transactions.`);
      return lines.join("\n");
    }

    if (intents.topMerchants) {
      const top = (summary.top_expense_merchants || []).slice(0, 5);
      lines.push(`Top expense merchants for ${scopeLabel}:`);
      top.forEach((item, index) => {
        lines.push(`${index + 1}. ${item.merchant}: ${currencyPrecise.format(item.total)}`);
      });
      lines.push(`Based on ${txCount} transactions.`);
      return lines.join("\n");
    }

    if (intents.transactionCount && !intents.expense && !intents.income && !intents.net) {
      return `There are ${txCount.toLocaleString("en-AU")} transactions in ${scopeLabel}.`;
    }

    if (intents.deposit) {
      const subjectText =
        Array.isArray(profile.subject_tokens) && profile.subject_tokens.length
          ? ` matching ${profile.subject_tokens.join(" ")}`
          : "";
      const lines = [
        `Deposits${subjectText} for ${scopeLabel} total ${currencyPrecise.format(
          toNumber(summary.income_total, 0)
        )} across ${toNumber(summary.income_count, 0)} deposit transactions.`,
      ];

      if (intents.showTransactions) {
        const sample = (facts.relevant_transactions_sample || [])
          .filter((tx) => toNumber(tx.amount, 0) > 0)
          .slice(0, 12);
        if (!sample.length) {
          lines.push("I could not find matching deposit transactions to list.");
          return lines.join("\n");
        }
        lines.push("");
        lines.push("Sample matching deposits:");
        sample.forEach((tx) => {
          lines.push(
            `- ${formatDate(tx.date)}: ${currencyPrecise.format(toNumber(tx.amount, 0))} | ${this.trimText(tx.description, 70)} (${tx.account || "Unknown account"})`
          );
        });
      }

      return lines.join("\n");
    }

    if (intents.income && !intents.expense && !intents.net) {
      return `Income for ${scopeLabel} is ${currencyPrecise.format(
        toNumber(summary.income_total, 0)
      )} across ${toNumber(summary.income_count, 0)} income transactions.`;
    }

    if (intents.net && !intents.expense && !intents.income) {
      return `Net result for ${scopeLabel} is ${currencyPrecise.format(
        toNumber(summary.net_total, 0)
      )} (income ${currencyPrecise.format(toNumber(summary.income_total, 0))}, expenses ${currencyPrecise.format(
        toNumber(summary.expense_total, 0)
      )}).`;
    }

    const topCategory = (summary.top_expense_categories || [])[0];
    lines.push(
      `Expenses for ${scopeLabel} total ${currencyPrecise.format(
        toNumber(summary.expense_total, 0)
      )} across ${toNumber(summary.expense_count, 0)} expense transactions.`
    );
    if (topCategory) {
      lines.push(`Largest category: ${topCategory.category} (${currencyPrecise.format(topCategory.total)}).`);
    }
    lines.push(`Total transactions in scope: ${txCount.toLocaleString("en-AU")}.`);
    return lines.join("\n");
  },

  shouldUseDeterministicFirst(deterministicFacts = null) {
    const facts = deterministicFacts || {};
    const profile = facts.profile || {};
    const intents = profile.intents || {};
    return Boolean(
      (profile.wants_numeric || intents.subscriptions || intents.showTransactions) &&
      !profile.requires_reasoning &&
      (intents.deposit || intents.subscriptions || intents.showTransactions || intents.income || intents.expense || intents.net)
    );
  },

  extractQuestionMonthKey(questionText = "") {
    const text = String(questionText || "").toLowerCase();
    const monthMap = {
      january: "01",
      jan: "01",
      february: "02",
      feb: "02",
      march: "03",
      mar: "03",
      april: "04",
      apr: "04",
      may: "05",
      june: "06",
      jun: "06",
      july: "07",
      jul: "07",
      august: "08",
      aug: "08",
      september: "09",
      sep: "09",
      sept: "09",
      october: "10",
      oct: "10",
      november: "11",
      nov: "11",
      december: "12",
      dec: "12",
    };

    const monthPattern =
      /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{4})\b/i;
    const monthMatch = text.match(monthPattern);
    if (monthMatch) {
      const monthNum = monthMap[monthMatch[1].toLowerCase()];
      const year = monthMatch[2];
      if (monthNum) return `${year}-${monthNum}`;
    }

    // Support month-only prompts (e.g. "How much in January?")
    // by selecting the latest matching month available in current account scope.
    const monthOnlyPattern =
      /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/i;
    const monthOnlyMatch = text.match(monthOnlyPattern);
    if (monthOnlyMatch) {
      const monthNum = monthMap[monthOnlyMatch[1].toLowerCase()];
      const availableMonths = [...new Set(this.getBaseTransactions().map((tx) => tx.month).filter(Boolean))].sort();
      const matchingMonths = availableMonths.filter((monthKey) => monthKey.endsWith(`-${monthNum}`));
      if (matchingMonths.length) {
        return matchingMonths[matchingMonths.length - 1];
      }
    }

    const isoMonthMatch = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
    if (isoMonthMatch) return `${isoMonthMatch[1]}-${isoMonthMatch[2]}`;

    return "";
  },

  getUploadedDataContext() {
    return AppState.assistant.pendingDataFile || AppState.assistant.uploadedDataContext || null;
  },

  getChatContextPayload(questionText = "") {
    const coverage = this.getDataCoverage();
    const payload = {
      generated_at: new Date().toISOString(),
      assistant_mode: "general_chat",
      assistant_name: this.getAssistantDisplayName(),
      assistant_nickname: this.getAssistantNickname(),
      conversation_style: "natural",
      finance_data_loaded: Array.isArray(AppState.transactions) && AppState.transactions.length > 0,
      account_scope: AppState.assistant.account || "all",
      data_coverage: coverage,
      web_lookup_enabled: this.isWebLookupEnabled(),
      user_question: String(questionText || "").trim(),
    };
    const uploadedData = this.getUploadedDataContext();
    if (uploadedData) payload.uploaded_data = uploadedData;
    return payload;
  },

  getContextPayload(questionText = "", deterministicFacts = null) {
    const facts = deterministicFacts || this.buildDeterministicFacts(questionText);
    const targetMonth = facts?.profile?.month || this.extractQuestionMonthKey(questionText);
    const profile = facts?.profile || {};
    const accountRows = this.getBaseTransactions();
    const accountMonthlyCashflow = buildMonthlyCashflow(accountRows);
    const accountCategorySummary = buildCategorySummary(accountRows);
    const accountMetrics = buildMetrics(accountMonthlyCashflow, accountCategorySummary);
    const monthlyAll = [...accountMonthlyCashflow]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        month: row.month,
        income: Number(row.income.toFixed(2)),
        expenses: Number(row.expenses.toFixed(2)),
        net: Number(row.net.toFixed(2)),
        savings_rate_pct: row.income > 0 ? Number(((row.net / row.income) * 100).toFixed(2)) : 0,
      }));
    const monthlyRecent = monthlyAll.slice(-6);

    const categories = accountCategorySummary
      .filter((row) => row.expense > 0)
      .slice(0, 12)
      .map((row) => ({
        category: row.category,
        expense: Number(row.expense.toFixed(2)),
        income: Number(row.income.toFixed(2)),
        net: Number(row.net.toFixed(2)),
      }));

    const merchants = buildTopMerchants(accountRows).slice(0, 12).map((item) => ({
      merchant: item.merchant,
      total: Number(item.total.toFixed(2)),
    }));

    const incomeSources = buildTopIncomeSources(accountRows).slice(0, 10).map((item) => ({
      source: item.source,
      total: Number(item.total.toFixed(2)),
    }));

    const filteredTx = filterTransactionsByAccount(
      TransactionsController.getFilteredTransactions(),
      AppState.assistant.account
    );
    const filteredTotals = {
      count: filteredTx.length,
      income: Number(
        sum(filteredTx.filter((tx) => includeTransactionInIncome(tx)).map((tx) => tx.amount)).toFixed(2)
      ),
      expenses: Number(
        sum(filteredTx.filter((tx) => includeTransactionInSpending(tx)).map((tx) => Math.abs(tx.amount))).toFixed(2)
      ),
      net: Number(
        (
          sum(filteredTx.filter((tx) => includeTransactionInIncome(tx)).map((tx) => tx.amount)) -
          sum(filteredTx.filter((tx) => includeTransactionInSpending(tx)).map((tx) => Math.abs(tx.amount)))
        ).toFixed(2)
      ),
    };

    const monthSpecificRows = targetMonth
      ? accountRows.filter((tx) => tx.month === targetMonth)
      : [];
    const monthSpecificSample = monthSpecificRows.slice(0, 120).map((tx) => ({
      date: tx.date,
      description: this.trimText(tx.description, 110),
      category: tx.category,
      subcategory: tx.subcategory,
      account: tx.account || "",
      amount: Number(tx.amount.toFixed(2)),
    }));

    const profileForSample = this.parseQuestionProfile(questionText);
    const filteredSample = this.getRelevantTransactionSample(profileForSample, filteredTx);

    const budgetRows = BudgetController.getRowsWithActuals
      ? BudgetController.getRowsWithActuals()
      : [];
    const budgetPressure = budgetRows
      .filter((row) => !row.isIncome && row.variance < 0)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 10)
      .map((row) => ({
        category: row.category,
        item: row.item,
        annual_budget: Number(row.annual_budget.toFixed(2)),
        actual: Number(row.actual.toFixed(2)),
        variance: Number(row.variance.toFixed(2)),
        percent_used: Number.isFinite(row.percentUsed) ? Number(row.percentUsed.toFixed(2)) : null,
      }));

    const payload = {
      generated_at: new Date().toISOString(),
      assistant_mode: "finance_assistant",
      assistant_name: this.getAssistantDisplayName(),
      assistant_nickname: this.getAssistantNickname(),
      assistant_account_scope: AppState.assistant.account || "all",
      web_lookup_enabled: this.isWebLookupEnabled(),
      assistant_contract: {
        objective: "high-utility, natural-language answers grounded in provided facts",
        numeric_claims_must_use_deterministic_facts: true,
        include_scope_for_numeric_answers: true,
        include_transaction_count_for_numeric_answers: true,
      },
      active_view: AppState.activeView,
      question_profile: profile,
      transaction_filters: { ...AppState.transactionFilters },
      overview_filters: { ...AppState.overviewFilters },
      metrics: {
        total_income: Number(toNumber(accountMetrics.total_income, 0).toFixed(2)),
        total_expense: Number(toNumber(accountMetrics.total_expense, 0).toFixed(2)),
        net_position: Number(toNumber(accountMetrics.net_position, 0).toFixed(2)),
        savings_rate: Number(toNumber(accountMetrics.savings_rate, 0).toFixed(2)),
        average_monthly_net: Number(toNumber(accountMetrics.average_monthly_net, 0).toFixed(2)),
        essential_annual: Number(toNumber(accountMetrics.essential_annual, 0).toFixed(2)),
        discretionary_annual: Number(toNumber(accountMetrics.discretionary_annual, 0).toFixed(2)),
      },
      recent_monthly_cashflow: monthlyRecent,
      all_monthly_cashflow: monthlyAll,
      top_expense_categories: categories,
      top_merchants: merchants,
      top_income_sources: incomeSources,
      filtered_transactions: {
        summary: filteredTotals,
        sample: filteredSample,
      },
      requested_month: targetMonth || null,
      requested_month_transactions: {
        count: monthSpecificRows.length,
        sample: monthSpecificSample,
      },
      deterministic_facts: facts,
      budget_pressure: budgetPressure,
      ai_signals: {
        recurring_run_rate: Number(toNumber(AppState.ai.recurringRunRate, 0).toFixed(2)),
        flagged_annual_spend: Number(toNumber(AppState.ai.flaggedAnnualSpend, 0).toFixed(2)),
        airbnb_loan_repayments_annual: Number(
          toNumber(AppState.ai.airbnbLoanRepaymentsAnnual, 0).toFixed(2)
        ),
        airbnb_operating_expense_annual: Number(
          toNumber(AppState.ai.airbnbOperatingExpenseAnnual, 0).toFixed(2)
        ),
        uncategorized_expense: Number(toNumber(AppState.ai.uncategorizedExpense, 0).toFixed(2)),
        uncategorized_count: toNumber(AppState.ai.uncategorizedExpenseCount, 0),
      },
    };
    const uploadedData = this.getUploadedDataContext();
    if (uploadedData) payload.uploaded_data = uploadedData;
    return payload;
  },

  getActionContextPayload() {
    const baseRows = this.getBaseTransactions();
    const budgetLines = (AppState.budgetItems || []).map((row) => ({
      category: String(row.category || "").trim(),
      item: String(row.item || "").trim(),
      annual_budget: Number(toNumber(row.annual_budget, 0).toFixed(2)),
    }));

    const grouped = new Map();
    budgetLines.forEach((line) => {
      if (!line.category || !line.item) return;
      if (!grouped.has(line.category)) grouped.set(line.category, []);
      grouped.get(line.category).push(line);
    });

    const categoryPrimaryItems = [...grouped.entries()].map(([category, lines]) => {
      const sorted = [...lines].sort((a, b) => b.annual_budget - a.annual_budget);
      const top = sorted[0] || { item: "General" };
      return { category, item: top.item };
    });

    const mainExpenseCategories = buildCategorySummary(baseRows)
      .filter((row) => row.expense > 0)
      .sort((a, b) => b.expense - a.expense)
      .slice(0, 12)
      .map((row) => row.category);

    const categoryNames = [...new Set(baseRows.map((tx) => tx.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 80);

    const subcategoriesByCategory = categoryNames.map((category) => ({
      category,
      subcategories: [
        ...new Set(
          baseRows
            .filter((tx) => normalizeLabel(tx.category) === normalizeLabel(category))
            .map((tx) => tx.subcategory)
            .filter(Boolean)
        ),
      ]
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 40),
    }));

    return {
      generated_at: new Date().toISOString(),
      account_scope: AppState.assistant.account || "all",
      budget_lines: budgetLines.slice(0, 320),
      category_primary_items: categoryPrimaryItems.slice(0, 80),
      main_expense_categories: mainExpenseCategories,
      categories: categoryNames,
      subcategories_by_category: subcategoriesByCategory,
    };
  },

  normalizeAiAction(rawAction = {}) {
    if (!rawAction || typeof rawAction !== "object") {
      return { status: "none", action: null, message: "" };
    }

    const actionType = normalizeLabel(rawAction.type || "none");
    if (!actionType || actionType === "none") {
      return { status: "none", action: null, message: String(rawAction.reason || "").trim() };
    }

    if (actionType === "budget_set_amount") {
      let category = String(rawAction.category || "").trim();
      let item = String(rawAction.item || "").trim();
      const annualBudget = Math.max(0, toNumber(rawAction.annual_budget, NaN));
      if (category && !item) {
        const fallbackRow = this.selectPrimaryBudgetLineForCategory(category, category);
        if (fallbackRow) {
          category = fallbackRow.category;
          item = fallbackRow.item;
        }
      }
      if (!category || !item || !Number.isFinite(annualBudget)) {
        return {
          status: "invalid",
          action: null,
          message: "I understood an update request but the target budget line or amount was missing.",
        };
      }
      const match = this.findBudgetLine(`${category} > ${item}`);
      if (match.status === "ok") {
        return {
          status: "ok",
          action: {
            type: "budget_set_amount",
            rowId: match.row.id,
            category: match.row.category,
            item: match.row.item,
            annual_budget: Number(annualBudget.toFixed(2)),
          },
        };
      }
      return {
        status: "ok",
        action: {
          type: "budget_add_line",
          category,
          item,
          annual_budget: Number(annualBudget.toFixed(2)),
        },
      };
    }

    if (actionType === "budget_add_line") {
      const category = String(rawAction.category || "").trim();
      const item = String(rawAction.item || "").trim();
      const annualBudget = Math.max(0, toNumber(rawAction.annual_budget, NaN));
      if (!category || !item || !Number.isFinite(annualBudget)) {
        return {
          status: "invalid",
          action: null,
          message: "I need category, item, and amount to add a budget line.",
        };
      }
      return {
        status: "ok",
        action: {
          type: "budget_add_line",
          category,
          item,
          annual_budget: Number(annualBudget.toFixed(2)),
        },
      };
    }

    if (actionType === "budget_remove_line") {
      const category = String(rawAction.category || "").trim();
      const item = String(rawAction.item || "").trim();
      if (!category || !item) {
        return {
          status: "invalid",
          action: null,
          message: "I need `Category > Item` to remove a budget line.",
        };
      }
      const match = this.findBudgetLine(`${category} > ${item}`);
      if (match.status !== "ok") {
        return {
          status: "invalid",
          action: null,
          message: `I could not find \`${category} > ${item}\` in the current budget.`,
        };
      }
      return {
        status: "ok",
        action: {
          type: "budget_remove_line",
          rowId: match.row.id,
          category: match.row.category,
          item: match.row.item,
        },
      };
    }

    if (actionType === "budget_rebuild") {
      return { status: "ok", action: { type: "budget_rebuild" } };
    }

    if (actionType === "budget_batch_set") {
      const updatesRaw = Array.isArray(rawAction.updates) ? rawAction.updates : [];
      const updates = updatesRaw
        .map((entry) => {
          let category = String(entry?.category || "").trim();
          let item = String(entry?.item || "").trim();
          const annualBudget = Math.max(0, toNumber(entry?.annual_budget, NaN));
          if (category && !item) {
            const fallbackRow = this.selectPrimaryBudgetLineForCategory(category, category);
            if (fallbackRow) {
              category = fallbackRow.category;
              item = fallbackRow.item;
            }
          }
          if (!category || !item || !Number.isFinite(annualBudget)) return null;
          const match = this.findBudgetLine(`${category} > ${item}`);
          return {
            rowId: match.status === "ok" ? match.row.id : null,
            category: match.status === "ok" ? match.row.category : category,
            item: match.status === "ok" ? match.row.item : item,
            annual_budget: Number(annualBudget.toFixed(2)),
          };
        })
        .filter(Boolean);
      if (!updates.length) {
        return {
          status: "invalid",
          action: null,
          message: "I could not map any valid budget updates from that request.",
        };
      }
      return { status: "ok", action: { type: "budget_batch_set", updates, unresolved: [] } };
    }

    if (actionType === "rule_add") {
      const keyword = this.normalizeKeywordValue(String(rawAction.keyword || ""));
      const category = String(rawAction.category || "").trim();
      const subcategory = String(rawAction.subcategory || "").trim();
      if (!keyword || !category || !subcategory) {
        return { status: "invalid", action: null, message: "I need keyword, category, and subcategory for a rule." };
      }
      return {
        status: "ok",
        action: { type: "rule_add", keyword, category, subcategory },
      };
    }

    if (actionType === "rule_remove") {
      const keyword = this.normalizeKeywordValue(String(rawAction.keyword || ""));
      if (!keyword) {
        return { status: "invalid", action: null, message: "I need a keyword to remove a rule." };
      }
      const matches = this.findRulesByKeyword(keyword);
      if (!matches.length) {
        return { status: "invalid", action: null, message: `No rules found for keyword "${keyword}".` };
      }
      return {
        status: "ok",
        action: {
          type: "rule_remove",
          keyword,
          ruleIds: matches.map((rule) => rule.id),
        },
      };
    }

    if (actionType === "tx_recategorize_keyword") {
      const keyword = this.normalizeKeywordValue(String(rawAction.keyword || ""));
      const category = String(rawAction.category || "").trim();
      const subcategory = String(rawAction.subcategory || "").trim();
      const persistRule = Boolean(rawAction.persist_rule);
      if (!keyword || !category || !subcategory) {
        return {
          status: "invalid",
          action: null,
          message: "I need keyword, category, and subcategory to recategorize transactions.",
        };
      }
      const matchCount = (AppState.transactions || []).filter((tx) =>
        String(tx.description || "").toLowerCase().includes(keyword)
      ).length;
      return {
        status: "ok",
        action: {
          type: "tx_recategorize_keyword",
          keyword,
          category,
          subcategory,
          persistRule,
          matchCount,
        },
      };
    }

    return { status: "none", action: null, message: "" };
  },

  async inferActionFromAI(questionText = "") {
    if (!String(questionText || "").trim()) return null;
    throw new Error(OFFLINE_AI_MESSAGE);
  },
  shouldAutoApplyAiAction(questionText = "") {
    const text = normalizeLabel(questionText);
    if (!text) return false;
    if (this.isConfirmationRequest(questionText)) return true;
    const analysisIntent =
      (text.includes("subscription") || text.includes("recurring") || text.includes("auto pay") || text.includes("direct debit")) &&
      !text.includes("budget") &&
      !text.includes("category") &&
      !text.includes("subcategory") &&
      !text.includes("rule");
    if (analysisIntent) return false;

    const looksLikeStateDescription = /\b(set up|set for)\b/.test(text) && !/\b(set budget|set category|set subcategory|set rule)\b/.test(text);
    if (looksLikeStateDescription && !/(>|:|\$?\s*[0-9])/.test(questionText)) return false;

    const startsDirectlyWithMutation = /^(set|update|change|adjust|add|create|remove|delete|rebuild|reset|move|recategori[sz]e|categori[sz]e|split|spread|allocate|distribute|divide|rebalance)\b/.test(
      text
    );
    const politePrefix = /^(please|can you|could you|would you)\b/.test(text);
    const hasMutationVerb = /\b(set|update|change|adjust|add|create|remove|delete|rebuild|reset|move|recategori[sz]e|categori[sz]e|split|spread|allocate|distribute|divide|rebalance)\b/.test(
      text
    );
    return startsDirectlyWithMutation || (politePrefix && hasMutationVerb);
  },

  async tryHandleAiAction(questionText = "") {
    let inferred = null;
    try {
      inferred = await this.inferActionFromAI(questionText);
    } catch (error) {
      return false;
    }

    if (!inferred) return false;
    const normalized = this.normalizeAiAction(inferred);
    if (normalized.status === "none") return false;
    if (normalized.status === "invalid" || !normalized.action) {
      if (normalized.message) {
        this.pushMessage("assistant", normalized.message);
        this.renderActionButtons();
        return true;
      }
      return false;
    }

    if (this.shouldAutoApplyAiAction(questionText)) {
      AppState.assistant.pendingAction = null;
      AppState.assistant.lastStagedAction = null;
      const result = this.applyAssistantAction(normalized.action);
      this.pushMessage("assistant", result.message);
      this.renderActionButtons();
      return true;
    }

    this.setPendingAction(normalized.action);
    this.pushMessage(
      "assistant",
      `I can apply this change:\n${this.describeAssistantAction(normalized.action)}\n\nReply "confirm" or click "Apply Pending Change".`
    );
    return true;
  },

  async tryRecoverConfirmationIntent(questionText = "") {
    if (!this.isConfirmationRequest(questionText) || AppState.assistant.pendingAction) {
      return false;
    }

    const recoveredBatch = this.recoverActionFromRecentAssistantMessages();
    if (recoveredBatch) {
      AppState.assistant.lastStagedAction = null;
      const result = this.applyAssistantAction(recoveredBatch);
      this.pushMessage("assistant", result.message);
      this.renderActionButtons();
      return true;
    }

    const staged = AppState.assistant.lastStagedAction;
    if (staged?.action) {
      const stagedAt = new Date(String(staged.createdAt || ""));
      const ageMs = Number.isNaN(stagedAt.getTime()) ? Infinity : Date.now() - stagedAt.getTime();
      if (ageMs <= 30 * 60 * 1000) {
        AppState.assistant.lastStagedAction = null;
        const result = this.applyAssistantAction(staged.action);
        this.pushMessage("assistant", result.message);
        this.renderActionButtons();
        return true;
      }
    }

    const previousActionQuestion = this.getPreviousUserActionMessage(questionText);
    if (!previousActionQuestion) {
      return false;
    }

    const parsedBatch = this.parseBudgetBatchAction(previousActionQuestion);
    if (parsedBatch) {
      AppState.assistant.lastStagedAction = null;
      const result = this.applyAssistantAction(parsedBatch);
      this.pushMessage("assistant", result.message);
      this.renderActionButtons();
      return true;
    }

    const parsedCategory = this.parseCategoryAction(previousActionQuestion);
    if (parsedCategory && parsedCategory.type !== "invalid") {
      AppState.assistant.lastStagedAction = null;
      const result = this.applyAssistantAction(parsedCategory);
      this.pushMessage("assistant", result.message);
      this.renderActionButtons();
      return true;
    }

    const parsedBudget = this.parseBudgetAction(previousActionQuestion);
    if (parsedBudget && parsedBudget.type !== "invalid") {
      AppState.assistant.lastStagedAction = null;
      const result = this.applyAssistantAction(parsedBudget);
      this.pushMessage("assistant", result.message);
      this.renderActionButtons();
      return true;
    }

    const handledByAiAction = await this.tryHandleAiAction(previousActionQuestion);
    if (!handledByAiAction) {
      return false;
    }

    if (AppState.assistant.pendingAction) {
      this.confirmPendingAction();
    }
    return true;
  },

  getHistoryPayload() {
    return AppState.assistant.messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-12)
      .map((message) => ({
        role: message.role,
        content: message.imageDataUrl
          ? `${message.content}\n[Image was attached by the user.]`
          : message.content,
      }));
  },

  setLoading(isLoading) {
    AppState.assistant.isLoading = Boolean(isLoading);
    const sendButton = document.getElementById("assistantSend");
    if (sendButton) sendButton.disabled = AppState.assistant.isLoading;
    const attachButton = document.getElementById("assistantAttachImage");
    if (attachButton) attachButton.disabled = AppState.assistant.isLoading;
    const attachDataButton = document.getElementById("assistantAttachData");
    if (attachDataButton) attachDataButton.disabled = AppState.assistant.isLoading;
    const webToggleButton = document.getElementById("assistantWebLookupToggle");
    if (webToggleButton) webToggleButton.disabled = AppState.assistant.isLoading;
    const input = document.getElementById("assistantInput");
    if (input) input.disabled = AppState.assistant.isLoading;
    const imageInput = document.getElementById("assistantImageInput");
    if (imageInput) imageInput.disabled = AppState.assistant.isLoading;
    const dataInput = document.getElementById("assistantDataInput");
    if (dataInput) dataInput.disabled = AppState.assistant.isLoading;
    this.renderActionButtons();
    this.updateStatus();
  },

  async ask(prefilledQuestion = "") {
    const input = document.getElementById("assistantInput");
    const typedQuestion = input ? input.value.trim() : "";
    const pendingImage = AppState.assistant.pendingImage;
    const pendingDataFile = AppState.assistant.pendingDataFile;
    const isImageTurn = Boolean(pendingImage?.dataUrl);
    const financeMode = this.isFinanceMode();
    let question = String(prefilledQuestion || typedQuestion).trim();
    if (!question && pendingImage?.dataUrl) {
      question = this.getModeAwareImageQuestion();
    }
    if (!question && pendingDataFile?.file_name) {
      question = `Please summarize the attached file (${pendingDataFile.file_name}) and map key suppliers/payments I should know about.`;
    }
    if (!question && !pendingImage?.dataUrl && !pendingDataFile?.file_name) {
      UI.toast("Missing Question", "Type a question or attach a screenshot or CSV file.", "error");
      return;
    }
    if (financeMode && !AppState.transactions.length) {
      UI.toast("Data Required", "Import JSON or CSV data before asking questions.", "error");
      this.updateStatus();
      return;
    }
    if (financeMode && !this.getBaseTransactions().length) {
      UI.toast("No Account Data", "No transactions found for the selected assistant account scope.", "error");
      this.updateStatus();
      return;
    }
    if (AppState.assistant.isLoading) return;

    const userMessage = pendingDataFile?.file_name
      ? `${question}\n[Data file attached: ${pendingDataFile.file_name}]`
      : question;
    this.pushMessage("user", userMessage, {
      imageDataUrl: pendingImage?.dataUrl || "",
      imageName: pendingImage?.name || "",
    });
    if (input && !prefilledQuestion) input.value = "";
    if (input && prefilledQuestion) input.value = "";
    this.clearPendingImage();
    if (pendingDataFile) {
      AppState.assistant.uploadedDataContext = pendingDataFile;
      this.clearPendingDataFile();
    }

    if (!financeMode && this.isFinanceAnalysisRequest(question)) {
      this.pushMessage(
        "assistant",
        [
          `I'm in Chat mode, so I won't run finance analysis here to avoid guesswork.`,
          "Switch to Finance mode beside the question box, then ask again.",
        ].join("\n")
      );
      return;
    }

    if (financeMode) {
      if (await this.tryRecoverConfirmationIntent(question)) {
        return;
      }

      if (this.handleLocalAssistantAction(question)) {
        return;
      }

      if (this.isActionLikeCommand(question)) {
        const handledByAiAction = await this.tryHandleAiAction(question);
        if (handledByAiAction) return;
        this.pushMessage(
          "assistant",
          [
            "I could not safely map that request to an in-app change.",
            "",
            "Try clearer plain-English intent, for example:",
            "- `Please set Groceries > Groceries to 12000`",
            "- `Split 50000 across 8 main categories`",
            "",
            "You can also use exact formats:",
            "- `Set budget for Category > Item to 12000`",
            "- `Add budget line Category > Item to 2400`",
            "- `Remove budget line Category > Item`",
            "- `Add rule keyword supermarket to Groceries > Groceries`",
            "- `Move transactions containing netflix to Subscriptions > Streaming`",
            "",
            'After I stage it, reply "confirm" or click "Apply Pending Change".',
          ].join("\n")
        );
        this.renderActionButtons();
        return;
      }
    }

    let deterministicFacts = null;
    if (financeMode) {
      deterministicFacts = this.buildDeterministicFacts(question);
      AppState.assistant.lastFacts = deterministicFacts;
      const deterministicFirst = this.buildDeterministicAnswer(question, deterministicFacts);
      if (!isImageTurn && this.shouldUseDeterministicFirst(deterministicFacts) && deterministicFirst) {
        this.captureNamedListFromAssistantAnswer(question, deterministicFirst);
        this.pushMessage("assistant", deterministicFirst);
        return;
      }
    } else {
      AppState.assistant.lastFacts = null;
      AppState.assistant.lastQueryResult = null;
    }

    const localAnswer = financeMode && !isImageTurn
      ? this.buildDeterministicAnswer(question, deterministicFacts) : "";
    if (localAnswer) {
      this.captureNamedListFromAssistantAnswer(question, localAnswer);
      this.pushMessage("assistant", `${localAnswer}\n\nCalculated locally from the loaded records.`);
    } else {
      this.pushMessage("assistant", OFFLINE_AI_MESSAGE);
    }
    this.setLoading(false);
  },
};

const App = {
  desktopBridgeBound: false,

  initControllers() {
    OverviewController.init();
    TransactionsController.init();
    BudgetController.init();
    StatementsController.init();
    TaxController.init();
    PlanningController.init();
    CategoryController.init();
    AIController.init();
    AssistantController.init();
  },

  syncGlobalAccountSelectors(account = "all") {
    const normalized = normalizeAccountScope(account, AppState.transactions);
    const controls = ["overviewAccountFilter", "transactionAccount", "assistantAccountFilter"];
    controls.forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;
      const hasOption = Array.from(select.options || []).some((option) => option.value === normalized);
      select.value = hasOption ? normalized : "all";
    });
  },

  setGlobalAccountScope(account = "all", options = {}) {
    const {
      persist = true,
      recompute = true,
      render = true,
    } = options;
    const normalized = normalizeAccountScope(account, AppState.transactions);
    AppState.globalAccountScope = normalized;
    AppState.overviewFilters.account = normalized;
    AppState.transactionFilters.account = normalized;
    AppState.assistant.account = normalized;
    AppState.assistant.lastFacts = null;
    AppState.assistant.lastQueryResult = null;
    AppState.assistant.pendingAction = null;
    AppState.assistant.lastStagedAction = null;
    if (persist) {
      saveStorage(STORAGE_KEYS.globalAccountScope, normalized);
    }
    this.syncGlobalAccountSelectors(normalized);
    if (recompute) this.recomputeDerived();
    if (render) this.renderAll();
    return normalized;
  },

  parseCsvTextToTransactions(text, fileName = "Imported CSV") {
    let parsed = parseBankCsvTransactions(text, fileName.replace(/\.[^.]+$/, ""));
    if (!parsed.length) {
      const genericRows = parseCsvText(text);
      parsed = genericRows
        .map((row) => deriveTxFromCsvRow(row))
        .filter(Boolean)
        .map((row) => normalizeTransaction(row));
    }
    return parsed;
  },

  async promptCsvImportMode() {
    const dialog = document.getElementById("csvImportChoiceDialog");
    const cancelBtn = document.getElementById("csvImportCancel");
    const replaceBtn = document.getElementById("csvImportReplace");
    const appendBtn = document.getElementById("csvImportAppend");

    if (!(dialog && cancelBtn && replaceBtn && appendBtn)) {
      return window.confirm("Add these CSV transactions to the current dataset?\n\nOK = combine accounts/data\nCancel = leave current data unchanged")
        ? "append" : "cancel";
    }

    return new Promise((resolve) => {
      let settled = false;

      const closeWith = (mode) => {
        if (settled) return;
        settled = true;
        dialog.hidden = true;
        dialog.removeEventListener("click", onBackdropClick);
        document.removeEventListener("keydown", onKeyDown, true);
        cancelBtn.removeEventListener("click", onCancel);
        replaceBtn.removeEventListener("click", onReplace);
        appendBtn.removeEventListener("click", onAppend);
        resolve(mode);
      };

      const onCancel = () => closeWith("cancel");
      const onReplace = () => closeWith("replace");
      const onAppend = () => closeWith("append");
      const onKeyDown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      };
      const onBackdropClick = (event) => {
        if (event.target === dialog) onCancel();
      };

      cancelBtn.addEventListener("click", onCancel);
      replaceBtn.addEventListener("click", onReplace);
      appendBtn.addEventListener("click", onAppend);
      document.addEventListener("keydown", onKeyDown, true);
      dialog.addEventListener("click", onBackdropClick);
      dialog.hidden = false;
      cancelBtn.focus({ preventScroll: true });
    });
  },

  async importCsvEntries(entries, options = {}) {
    const promptAppend = options.promptAppend !== false;
    const sourceLabel = String(options.sourceLabel || "CSV");
    const forcedAppend = options.appendToExisting;

    if (!Array.isArray(entries) || !entries.length) return false;
    UI.showLoading("Converting CSV data...");
    try {
      if (entries.length > MAX_IMPORT_FILES) throw new Error(`Import no more than ${MAX_IMPORT_FILES} CSV files at once.`);
      let inputBytes = 0;
      for (const entry of entries) {
        inputBytes += importTextBytes(String(entry?.text || ""));
        if (inputBytes > MAX_IMPORT_BYTES) throw new Error("Choose CSV files totalling no more than 8 MB.");
      }
      const imported = [];
      entries.forEach((entry, index) => {
        const name = String(entry?.name || `Imported CSV ${index + 1}`);
        const text = String(entry?.text || "");
        if (!text.trim()) return;
        imported.push(...this.parseCsvTextToTransactions(text, name));
      });

      const uniqueTransactions = dedupeTransactions(imported);
      if (!uniqueTransactions.length) {
        throw new Error("No transactions were found. Check CSV format and try again.");
      }

      let mergedTransactions = uniqueTransactions;
      let appended = false;
      if (AppState.transactions.length) {
        let importMode = "replace";
        if (typeof forcedAppend === "boolean") {
          importMode = forcedAppend ? "append" : "replace";
        } else if (promptAppend) {
          // The user must be able to reach the choice dialog above the app content.
          UI.hideLoading();
          importMode = await this.promptCsvImportMode();
          if (importMode !== "cancel") UI.showLoading("Combining CSV data...");
        }

        if (importMode === "cancel") {
          UI.toast("Import Cancelled", "No data was imported.", "warning");
          return false;
        }

        if (importMode === "append") {
          appended = true;
          mergedTransactions = dedupeTransactions([...AppState.transactions, ...uniqueTransactions]);
        }
      }

      const dataset = buildDatasetFromCsvTransactions(mergedTransactions);
      this.applyDataset(dataset);
      document.getElementById("welcome-overlay")?.remove();
      UI.toast(
        `${sourceLabel} Converted`,
        appended
          ? `${uniqueTransactions.length} transactions added from ${entries.length} file(s). Combined dataset now has ${mergedTransactions.length} transactions.`
          : `${mergedTransactions.length} transactions loaded from ${entries.length} file(s). Existing data replaced.`,
        "success"
      );
      return true;
    } catch (error) {
      UI.toast(`${sourceLabel} Import Failed`, String(error?.message || error), "error");
      return false;
    } finally {
      UI.hideLoading();
      this.restorePostImportFocus();
    }
  },

  async importJsonText(jsonText, fileName = "Imported JSON") {
    UI.showLoading("Importing finance data...");
    try {
      importTextBytes(String(jsonText || "{}"));
      const parsed = JSON.parse(String(jsonText || "{}"));
      if (isFinanceStudioBackupPayload(parsed)) {
        UI.showLoading("Restoring Finance Studio backup...");
        return await this.restoreBackupPayload(parsed, {
          fileName,
          requireBackupMarker: false,
          showLoading: false,
          confirmReplace: true,
        });
      }
      this.applyDataset(parsed);
      document.getElementById("welcome-overlay")?.remove();
      UI.toast("Data Imported", `${fileName} loaded successfully.`, "success");
      return true;
    } catch (error) {
      UI.toast("Import Failed", String(error?.message || "Invalid JSON file format."), "error");
      return false;
    } finally {
      UI.hideLoading();
      this.restorePostImportFocus();
    }
  },

  async restoreBackupPayload(rawPayload, options = {}) {
    const {
      fileName = "Finance Studio Backup",
      requireBackupMarker = true,
      showLoading = true,
      confirmReplace = true,
    } = options;

    if (showLoading) {
      UI.showLoading("Restoring Finance Studio backup...");
    }

    try {
      importTextBytes(JSON.stringify(rawPayload), MAX_READABLE_BACKUP_BYTES);
      const normalized = normalizeFinanceStudioBackupPayload(rawPayload);
      if (!normalized || (requireBackupMarker && !isFinanceStudioBackupPayload(rawPayload))) {
        throw new Error("Selected file is not a Finance Studio full backup.");
      }

      const txCount = Array.isArray(normalized.dataset.recent_transactions)
        ? normalized.dataset.recent_transactions.length
        : 0;
      if (
        confirmReplace &&
        !window.confirm(
          `Restore full Finance Studio backup from ${fileName}?\n\nThis will replace the current dataset, budgets, rules, and saved local settings on this device.\n\nTransactions in backup: ${txCount}`
        )
      ) {
        UI.toast("Restore Cancelled", "Backup restore was cancelled.", "warning");
        return false;
      }

      this.ensureValidDataset(normalized.dataset);

      atomicFinanceMutation(() => {
      const restoredScopeRaw =
        String(normalized.localState.globalAccountScope || "all").trim() || "all";
      AppState.globalAccountScope = restoredScopeRaw;
      saveStorage(STORAGE_KEYS.globalAccountScope, restoredScopeRaw);
      saveStorage(STORAGE_KEYS.theme, normalized.localState.theme);
      saveStorage(STORAGE_KEYS.assistantMode, normalized.localState.assistantMode);
      saveStorage(STORAGE_KEYS.assistantWebLookup, normalized.localState.assistantWebLookup);
      saveStorage(STORAGE_KEYS.subcategoryRules, normalized.localState.subcategoryRules);
      saveStorage(STORAGE_KEYS.merchantReviewHidden, normalized.localState.merchantReviewHidden);
      saveStorage(STORAGE_KEYS.scenarios, normalized.localState.scenarios);
      saveStorage(STORAGE_KEYS.budgetItems, normalized.localState.budgetItems);
      saveStorage(STORAGE_KEYS.budgetMeta, normalized.localState.budgetMeta);
      saveStorage(STORAGE_KEYS.budgetPlan, normalized.localState.budgetPlan);
      saveStorage(STORAGE_KEYS.taxSettings, normalized.localState.taxSnapshot.settings);
      saveStorage(STORAGE_KEYS.taxManualExpenses, normalized.localState.taxSnapshot.manual_expenses);
      saveStorage(STORAGE_KEYS.taxRules, normalized.localState.taxSnapshot.rules);
      saveStorage(STORAGE_KEYS.taxOverrides, normalized.localState.taxSnapshot.overrides);

      AppState.assistant.mode = normalized.localState.assistantMode;
      AppState.assistant.webLookupEnabled = normalized.localState.assistantWebLookup === "on";
      ThemeController.applyTheme(normalized.localState.theme, { persist: true, rerender: false });

      const datasetToApply = {
        ...normalized.dataset,
        tax_data: normalized.localState.taxSnapshot,
      };
      this.applyDataset(datasetToApply, { persistSnapshot: true });
      ThemeController.applyTheme(normalized.localState.theme, { persist: true, rerender: false });
      AssistantController.setAssistantMode(normalized.localState.assistantMode, {
        persist: true,
        announce: false,
      });
      AssistantController.setWebLookupEnabled(normalized.localState.assistantWebLookup === "on", {
        persist: true,
        announce: false,
      });
      this.setGlobalAccountScope(normalized.localState.globalAccountScope, {
        persist: true,
        recompute: true,
        render: true,
      });
      });
      document.getElementById("welcome-overlay")?.remove();
      UI.toast(
        "Backup Restored",
        `${fileName} restored. Dataset, budgets, rules, and settings were replaced.`,
        "success"
      );
      return true;
    } catch (error) {
      UI.toast("Restore Failed", String(error?.message || error), "error");
      return false;
    } finally {
      if (showLoading) {
        UI.hideLoading();
        this.restorePostImportFocus();
      }
    }
  },

  restorePostImportFocus() {
    window.setTimeout(() => {
      const activeEl = document.activeElement;
      if (activeEl && typeof activeEl.blur === "function" && (activeEl.id === "csvImportFile" || activeEl.id === "importFile")) {
        activeEl.blur();
      }

      const assistantInput = document.getElementById("assistantInput");
      if (!assistantInput) return;
      assistantInput.disabled = false;
      assistantInput.readOnly = false;
      if (AppState.activeView === "assistant") {
        assistantInput.focus({ preventScroll: true });
        const length = assistantInput.value.length;
        if (typeof assistantInput.setSelectionRange === "function") {
          assistantInput.setSelectionRange(length, length);
        }
      }
    }, 0);
  },

  bindDesktopBridge() {
    if (this.desktopBridgeBound) return;
    if (!window.desktopApp) return;
    this.desktopBridgeBound = true;

    if (typeof window.desktopApp.onImportCsvFiles === "function") {
      window.desktopApp.onImportCsvFiles((entries) => {
        const normalized = Array.isArray(entries)
          ? entries.map((entry) => ({
              name: String(entry?.name || "Imported CSV"),
              text: String(entry?.text || ""),
            }))
          : [];
        if (!normalized.length) {
          UI.toast("CSV Import", "No files were selected.", "error");
          return;
        }
        this.importCsvEntries(normalized, { promptAppend: true, sourceLabel: "CSV" });
      });
    }

    if (typeof window.desktopApp.onImportJsonFile === "function") {
      window.desktopApp.onImportJsonFile((entry) => {
        if (!entry || typeof entry.text !== "string") {
          UI.toast("JSON Import", "Selected file could not be read.", "error");
          return;
        }
        this.importJsonText(entry.text, String(entry.name || "Imported JSON"));
      });
    }
  },

  bindGlobalUI() {
    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.addEventListener("click", () => {
        this.navigate(button.dataset.view);
      });
    });

    document.getElementById("importData")?.addEventListener("click", () => {
      document.getElementById("importFile")?.click();
    });

    document.getElementById("importCsv")?.addEventListener("click", () => {
      document.getElementById("csvImportFile")?.click();
    });

    document.getElementById("restoreBackup")?.addEventListener("click", () => {
      document.getElementById("restoreBackupFile")?.click();
    });

    document.getElementById("openAssistant")?.addEventListener("click", () => {
      this.openAssistantWithPrompt("", { replace: false });
    });

    document.getElementById("importFile")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        assertImportFiles([file]);
        const text = await file.text();
        await this.importJsonText(text, file.name || "Imported JSON");
      } catch (error) {
        UI.toast("Import Failed", String(error?.message || error), "error");
      } finally {
        event.target.value = "";
      }
    });

    document.getElementById("csvImportFile")?.addEventListener("change", async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      try {
        assertImportFiles(files);
        const entries = [];
        for (const file of files) {
          entries.push({
            name: file.name || "Imported CSV",
            text: await file.text(),
          });
        }
        await this.importCsvEntries(entries, { promptAppend: true, sourceLabel: "CSV" });
      } catch (error) {
        UI.toast("Import Failed", String(error?.message || error), "error");
      } finally {
        event.target.value = "";
      }
    });

    document.getElementById("restoreBackupFile")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        assertImportFiles([file], MAX_READABLE_BACKUP_BYTES);
        const text = await file.text();
        importTextBytes(text, MAX_READABLE_BACKUP_BYTES);
        const parsed = JSON.parse(String(text || "{}"));
        await this.restoreBackupPayload(parsed, {
          fileName: file.name || "Finance Studio Backup",
          requireBackupMarker: true,
          showLoading: true,
          confirmReplace: true,
        });
      } catch (error) {
        UI.toast("Restore Failed", String(error?.message || "Invalid backup file."), "error");
      } finally {
        event.target.value = "";
      }
    });

    document.getElementById("exportData")?.addEventListener("click", () => {
      exportSnapshotData();
      UI.toast("Download started", "Check Files or Downloads for the readable snapshot. It is not password protected.", "info");
    });

    document.getElementById("backupApp")?.addEventListener("click", () => {
      exportFinanceStudioBackup();
      UI.toast(
        "Download started",
        "Check Files or Downloads for the readable legacy backup. Use Save backup for a complete encrypted copy.",
        "info"
      );
    });
  },

  openAssistantWithPrompt(prompt = "", options = {}) {
    const topics = {
      overview: "spending", transactions: "categories", budget: "budget", statements: "statements",
      tax: "tax", planning: "savings", categories: "categories", "ai-insights": "subscriptions",
    };
    const permitted = new Set([...Object.values(topics), "debt", "retirement", "property"]);
    const topic = permitted.has(options.topic) ? options.topic : topics[AppState.activeView] || "spending";
    // Do not forward the legacy prefilled text: it may contain account or transaction details.
    window.dispatchEvent(new CustomEvent("finance-ai-help", { detail: { topic } }));
  },

  navigate(view) {
    AppState.activeView = view;
    document.querySelectorAll(".nav-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `${view}-view`);
    });
  },

  async loadDefaultData() {
    const storedDataset = loadStorage(STORAGE_KEYS.datasetSnapshot, null);
    // Invalid saved data is an error, never a reason to substitute sample figures.
    this.applyDataset(storedDataset === null ? createEmptyDataset() : storedDataset, { persistSnapshot: false });
    return true;
  },
  showWelcomeOverlay() {
    if (document.getElementById("welcome-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "welcome-overlay";
    overlay.innerHTML = `
      <section class="welcome-card">
        <p class="eyebrow">Finance Studio</p>
        <h2>Import JSON or CSV to begin</h2>
        <p class="helper" style="margin-top:0.5rem;">
          Browser security blocks automatic local file access in some environments.
          You can load <strong>financial_overview.json</strong> or import raw bank <strong>.csv</strong> files directly.
        </p>
        <div class="inline-actions" style="justify-content:center; margin-top:1rem;">
          <button class="btn btn-primary" id="welcomeImportBtn">Select Data File</button>
          <button class="btn btn-secondary" id="welcomeImportCsvBtn">Select CSV File(s)</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#welcomeImportBtn")?.addEventListener("click", () => {
      document.getElementById("importFile")?.click();
    });
    overlay.querySelector("#welcomeImportCsvBtn")?.addEventListener("click", () => {
      document.getElementById("csvImportFile")?.click();
    });
  },

  ensureValidDataset(json) {
    if (!json || typeof json !== "object") throw new Error("JSON root is invalid.");
    if (!Array.isArray(json.recent_transactions)) throw new Error("Missing recent_transactions array.");
    if (!Array.isArray(json.monthly_cashflow) && !json.recent_transactions.length) {
      throw new Error("Missing monthly cashflow data.");
    }
  },

  persistNormalizedDatasetSnapshot() {
    if (!Array.isArray(AppState.transactions)) return;
    const snapshot = buildDatasetFromCsvTransactions(AppState.transactions);
    snapshot.tax_data = TaxController.getSnapshot();
    saveStorage(STORAGE_KEYS.datasetSnapshot, snapshot);
  },

  reportTaxonomySanity(sourceLegacyCategories = []) {
    const sanity = collectTaxonomySanity(AppState.transactions);
    const preview = sanity.previewCategories.length
      ? sanity.previewCategories.join(", ")
      : "None";

    const combinedLegacy = [...new Set([...(sourceLegacyCategories || []), ...sanity.legacyCategories])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    if (combinedLegacy.length) {
      UI.toast(
        "Taxonomy Warning",
        `Legacy categories detected: ${combinedLegacy.join(", ")}`,
        "warning"
      );
    }
  },

  forceFullTaxonomyMigration() {
    const migrated = (Array.isArray(AppState.transactions) ? AppState.transactions : []).map((tx) => ({ ...tx }));
    normalizeTransactionSetToOfficialTaxonomy(migrated);
    AppState.transactions = migrated.sort((a, b) => b.date.localeCompare(a.date));
    this.setGlobalAccountScope(AppState.globalAccountScope, { persist: false, recompute: false, render: false });
    AppState.budgetDefaults = generateBaselineBudgetFromActuals(AppState.transactions);
    this.recomputeDerived();
  },
  applyDataset(json, options = {}) {
    const suppressWrites = options.persistSnapshot === false;
    if (suppressWrites) storageWritesSuppressed += 1;
    try {
      return atomicFinanceMutation(() => this.applyDatasetContents(json, options));
    } finally {
      if (suppressWrites) storageWritesSuppressed -= 1;
    }
  },

  applyDatasetContents(json, options = {}) {
    this.ensureValidDataset(json);

    AppState.rawData = json;
    AppState.classificationAudit = [];
    AppState.assistant.lastFacts = null;
    AppState.assistant.lastQueryResult = null;
    AppState.assistant.lastBudgetContext = null;
    AppState.assistant.pendingAction = null;
    AppState.assistant.lastStagedAction = null;
    AppState.airbnbSummary = json.airbnb_summary || null;
    TaxController.loadFromDataset(json.tax_data || {});
    AppState.subcategoryRules = loadStorage(STORAGE_KEYS.subcategoryRules, []) || [];
    AppState.merchantReviewHidden = loadStorage(STORAGE_KEYS.merchantReviewHidden, []) || [];
    AppState.scenarios = loadStorage(STORAGE_KEYS.scenarios, []) || [];

    const officialCategories = new Set(getTaxonomyCategories());
    const sourceLegacyCategories = [...new Set(
      json.recent_transactions
        .map((row) => String(row?.category || "").trim())
        .filter((category) => category && !officialCategories.has(category))
    )].sort((a, b) => a.localeCompare(b));

    const normalizedTx = json.recent_transactions.map((row, index) =>
      normalizeTransaction(row, index)
    );
    applyRulesToTransactions(normalizedTx, AppState.subcategoryRules);
    normalizeTransactionSetToOfficialTaxonomy(normalizedTx);
    AppState.transactions = normalizedTx.sort((a, b) => b.date.localeCompare(a.date));
    this.setGlobalAccountScope(AppState.globalAccountScope, { persist: true, recompute: false, render: false });
    this.forceFullTaxonomyMigration();

    AppState.budgetDefaults = generateBaselineBudgetFromActuals(AppState.transactions);
    const budgetSeedMap = new Map(
      AppState.budgetDefaults.map((item) => [
        buildBudgetItemKey(item.category, item.item),
        toNumber(item.seeded_actual, 0),
      ])
    );
    const currentSignature = buildBudgetDataSignature(AppState.transactions);
    const savedBudget = loadStorage(STORAGE_KEYS.budgetItems, null);
    // A changed transaction range must not replace deliberate user budget edits.
    // An explicitly empty saved budget also means empty, not "rebuild automatically".
    const canReuseSavedBudget = Array.isArray(savedBudget);

    if (canReuseSavedBudget) {
      const mappedStoredBudget = savedBudget.map((item, index) => {
        const category = String(item.category || "Uncategorized");
        const lineItem = String(item.item || "General");
        const normalized = normalizeBudgetCategoryItem(category, lineItem);
        const key = buildBudgetItemKey(normalized.category, normalized.item);
        const defaultSeed = budgetSeedMap.get(key);
        return {
          id: item.id || createId(`budgetStored${index}`),
          category: normalized.category,
          item: normalized.item,
          annual_budget: Math.max(0, toNumber(item.annual_budget, 0)),
          notes: String(item.notes || ""),
          seeded_actual: defaultSeed !== undefined ? toNumber(defaultSeed, 0) : 0,
        };
      });
      AppState.budgetItems = normalizeBudgetItems(mappedStoredBudget);
      // Keep metadata current after loading persisted budget values.
      saveStorage(STORAGE_KEYS.budgetMeta, {
        version: BUDGET_BASELINE_VERSION,
        signature: currentSignature,
      });
    } else {
      AppState.budgetItems = normalizeBudgetItems(JSON.parse(JSON.stringify(AppState.budgetDefaults)));
      saveStorage(STORAGE_KEYS.budgetItems, AppState.budgetItems);
      saveStorage(STORAGE_KEYS.budgetMeta, {
        version: BUDGET_BASELINE_VERSION,
        signature: currentSignature,
      });
    }

    this.recomputeDerived();
    if (options.persistSnapshot !== false) {
      this.persistNormalizedDatasetSnapshot();
    }
    this.reportTaxonomySanity(sourceLegacyCategories);
    this.renderAll();
  },

  recomputeDerived() {
    normalizeTransactionSetToOfficialTaxonomy(AppState.transactions);
    const suggestionPack = buildAnnualBudgetSuggestions(
      AppState.transactions,
      AppState.tax?.fyStartMonth || TAX_DEFAULT_FY_START_MONTH
    );
    AppState.classificationDiagnostics = buildClassificationDiagnostics(AppState.transactions);
    AppState.budgetSuggestions = suggestionPack.suggestions || [];
    AppState.budgetFinancialYear = suggestionPack.financialYear || null;
    const normalizedScope = normalizeAccountScope(AppState.globalAccountScope, AppState.transactions);
    AppState.globalAccountScope = normalizedScope;
    AppState.overviewFilters.account = normalizedScope;
    AppState.transactionFilters.account = normalizedScope;
    AppState.assistant.account = normalizedScope;
    const scopedTransactions = getGlobalScopedTransactions(AppState.transactions);
    AppState.monthlyCashflow = buildMonthlyCashflow(scopedTransactions);
    AppState.categorySummary = buildCategorySummary(scopedTransactions);
    AppState.subcategorySummary = buildSubcategorySummary(scopedTransactions);
    AppState.topMerchants = buildTopMerchants(scopedTransactions);
    AppState.topIncomeSources = buildTopIncomeSources(scopedTransactions);
    AppState.metrics = buildMetrics(AppState.monthlyCashflow, AppState.categorySummary);
  },

  applySubcategoryRulesAndRefresh() {
    applyRulesToTransactions(AppState.transactions, AppState.subcategoryRules);
    normalizeTransactionSetToOfficialTaxonomy(AppState.transactions);
    this.recomputeDerived();
    this.persistNormalizedDatasetSnapshot();
    this.renderAll();
  },

  renderAll() {
    OverviewController.render();
    TransactionsController.render();
    BudgetController.render();
    StatementsController.render();
    TaxController.render();
    PlanningController.render();
    CategoryController.render();
    AIController.render();
    AssistantController.render();
  },

  applyBuildStamp() {
    const text = `Build: ${BUILD_STAMP}`;
    document.title = "Finance Studio";
    const stampEl = document.getElementById("buildStamp");
    if (stampEl) stampEl.textContent = text;
  },

  async start(options = {}) {
    const storage = getFinanceStorage();
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
      throw new Error("Unlock your Finance workspace before starting.");
    }
    AppState.globalAccountScope = String(loadStorage(STORAGE_KEYS.globalAccountScope, "all") || "all");
    AppState.assistant.mode = normalizeAssistantModeValue(loadStorage(STORAGE_KEYS.assistantMode, "finance"));
    AppState.assistant.webLookupEnabled = false;
    if (!this.started) {
      ThemeController.init();
      UI.init();
      this.applyBuildStamp();
      this.bindGlobalUI();
      this.initControllers();
      this.started = true;
    }
    if (options.backup) {
      return this.restoreBackupPayload(options.backup, { showLoading: false, confirmReplace: false });
    }
    if (options.dataset) {
      this.applyDataset(options.dataset);
      return true;
    }
    return this.loadDefaultData();
  },
};

function createEmptyDataset() {
  return {
    generated_at: new Date().toISOString(),
    recent_transactions: [],
    monthly_cashflow: [],
    tax_data: { manual_expenses: [], rules: [], overrides: [] },
  };
}

const FinanceEngine = Object.freeze({
  App,
  AppState,
  storageKeys: Object.freeze({ ...STORAGE_KEYS }),
  start: (options) => App.start(options),
  createEmptyDataset,
  buildBackup: buildFinanceStudioBackupPayload,
  restoreBackup: (payload, options) => App.restoreBackupPayload(payload, options),
  applyDataset: (dataset, options) => App.applyDataset(dataset, options),
  previewBudgetImport,
  importBudgetOnly,
  // Controller hooks support the new shell without duplicating financial logic.
  ThemeController,
  BudgetController,
  TaxController,
  PlanningController,
  AssistantController,
});

if (typeof module === "object" && module.exports) {
  module.exports = {
    FinanceEngine,
    loadStorage,
    saveStorage,
    assertImportFiles,
    importTextBytes,
    inferTaxAirbnbCategory,
    resolveTaxMappingForTransaction,
    generateBaselineBudgetFromActuals,
    parseBankCsvTransactions,
    dedupeTransactions,
    previewBudgetImport,
    importBudgetOnly,
    normalizeTransactionSetToOfficialTaxonomy,
    buildClassificationDiagnostics,
    buildAnnualBudgetSuggestions,
    buildTaxAirbnbTrackingReport,
    getFinancialYearScope,
    buildDatasetFromCsvTransactions,
    resolvePeriodBounds,
    filterTransactionsByOverviewPeriod,
    buildTransactionExplorerInspectModel,
    buildMerchantReviewQueue,
    getMerchantReviewQueueView,
    transactionMatchesRuleKeyword,
    FULL_BACKUP_TYPE,
    isFinanceStudioBackupPayload,
    normalizeFinanceStudioBackupPayload,
  };
}

if (typeof window !== "undefined") {
  window.FinanceEngine = FinanceEngine;
}





