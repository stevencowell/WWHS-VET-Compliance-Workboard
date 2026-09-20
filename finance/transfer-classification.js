"use strict";

(function transferClassificationModule(root, factory) {
  if (typeof module === "object" && module.exports) {
    let config = {};
    try {
      config = require("./classification-config.js");
    } catch {
      config = {};
    }
    module.exports = factory(config);
    return;
  }
  root.TransferClassification = factory(root.FinanceStudioClassificationConfig || {});
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function buildTransferClassificationApi(externalConfig) {
    const EPSILON = 0.01;
    const INTERNAL_TRANSFER_DAY_WINDOW = 2;
    const LOAN_COUNTERPART_DAY_WINDOW = 2;
    const DEFAULT_TARGET_BUDGET_DISCOUNT_PCT = 5;
    const MIN_ACTIVE_BUDGET_SCOPE_DAYS = 28;
    const MIN_ACTIVE_BUDGET_SCOPE_FRACTION = 0.08;
    const MIN_ACTIVE_BUDGET_SCOPE_TX_COUNT = 10;
    const ROLLING_TWELVE_MONTH_DAYS = 365;
    const RECENT_TREND_WINDOW_DAYS = 90;
    const FIXED_RECURRING_SAMPLE_SIZE = 6;
    const PERIODIC_BILL_SAMPLE_SIZE = 4;
    const LINK_FIELD_NAMES = [
      "transfer_pair_id",
      "transferPairId",
      "linked_transfer_id",
      "linkedTransferId",
      "matched_transfer",
      "matchedTransfer",
      "transfer_match_id",
      "transferMatchId",
      "pair_id",
      "pairId",
    ];
    const TRANSFER_REGEXES = [
      /^\s*tfr\b/i,
      /\btransfer\b/i,
      /\bosko\b/i,
      /\bpayment\s+(?:to|from)\b/i,
      /\bonline\s+(?:to|from)\b/i,
      /\bmob\s+(?:to|from)\b/i,
      /\bfrom-[a-z0-9]/i,
      /\bto-[a-z0-9]/i,
    ];
    const SALARY_REGEXES = [
      /\bpayroll\b/i,
      /\bsalary\b/i,
      /\bwages?\b/i,
    ];
    const REFERENCE_JUNK_REGEX =
      /\b(?:ref|reference|auth|trace|receipt|confirmation|confirm|code|id|txn|transaction|direct|credit|debit|payment|transfer|tfr|online|internet|banking|mob|bpay|eft|osko|from|to|for|acct|account|a\/c)\b/g;
    const LOAN_ACCOUNT_REGEXES = [/\bloan account\b/i, /\b\d+l\d+\b/i, /\bl\d+\b/i];
    const BUDGET_FIXED_CADENCE_MAP = Object.freeze({
      weekly: 52,
      fortnightly: 26,
      monthly: 12,
      quarterly: 4,
      annually: 1,
    });
    const RULE_CONFIDENCE = Object.freeze({
      payee_exact: 0.99,
      payee_contains: 0.96,
      payee_regex: 0.95,
      recurring_bill: 0.98,
      internal_pair: 0.99,
      internal_inferred: 0.88,
      sinking_transfer: 0.97,
      loan_payment_strong: 0.98,
      loan_payment_medium: 0.93,
      loan_credit_counterpart: 0.9,
      known_income: 0.93,
      keyword_income: 0.82,
      external_transfer: 0.78,
      fallback_specific: 0.78,
      fallback_broad: 0.74,
      passthrough: 0.5,
    });
    const FALLBACK_CLASSIFICATION_RULES = Object.freeze([
      {
        id: "fallback_cash_atm_withdrawal",
        category: "Cash",
        subcategory: "ATM Withdrawal",
        confidence: RULE_CONFIDENCE.fallback_specific,
        direction: "debit",
        family: "cash",
        regexes: [/\bcash\s+withdrawal\b/i],
        excludeFromSpending: true,
        excludeFromIncome: true,
        excludeFromBudget: true,
        reason: "Cash withdrawal keywords matched; no more specific payee rule matched.",
      },
      {
        id: "fallback_dining_out_venue",
        category: "Dining & Takeaway",
        subcategory: "Dining Out",
        confidence: 0.76,
        direction: "debit",
        family: "dining",
        regexes: [/\bhotel\b/i, /\btavern\b/i, /\bwinery\b/i, /\brestauran(?:t)?\b/i, /\bbistro\b/i, /\bcafe\b/i],
        rejectRegexes: [/\bmotor\s+inn\b/i, /\bmotel\b/i, /\bresort\b/i, /\blodge\b/i, /\baccommodation\b/i, /\bbooking\b/i],
        reason: "Food and drink terms matched; no more specific payee rule matched.",
      },
      {
        id: "fallback_health_other_provider",
        category: "Health",
        subcategory: "Other",
        confidence: RULE_CONFIDENCE.fallback_broad,
        direction: "debit",
        family: "health",
        regexes: [
          /\bfamily\s+practice\b/i,
          /\bmedical\s+cent(?:re|er)\b/i,
          /\bclinic\b/i,
          /\bphysio\b/i,
          /\bchiro\b/i,
          /\bdental\b/i,
          /\bdentist\b/i,
          /\bpatholog(?:y|ical)?\b/i,
        ],
        reason: "Health provider terms matched; no more specific payee rule matched.",
      },
      {
        id: "fallback_transport_other_vehicle",
        category: "Transport",
        subcategory: "Other",
        confidence: RULE_CONFIDENCE.fallback_broad,
        direction: "debit",
        family: "transport",
        regexes: [/\btyres?\b/i, /\bmechanic\b/i, /\brego\b/i, /\bregistration\b/i, /\bctp\b/i],
        reason: "Vehicle cost terms matched; no more specific payee rule matched.",
      },
      {
        id: "fallback_work_other",
        category: "Work",
        subcategory: "Other",
        confidence: 0.73,
        direction: "debit",
        family: "work",
        regexes: [/\bunion\b/i, /\bprofessional\s+membership\b/i],
        reason: "Work membership terms matched; no more specific payee rule matched.",
      },
      {
        id: "fallback_pets_other",
        category: "Pets",
        subcategory: "Other",
        confidence: 0.74,
        direction: "debit",
        family: "pets",
        regexes: [/\bveterinary\b/i, /\banimal\s+hospital\b/i, /\bpet\s+clinic\b/i],
        reason: "Pet care terms matched; no more specific payee rule matched.",
      },
      {
        id: "fallback_lifestyle_other",
        category: "Lifestyle",
        subcategory: "Other",
        confidence: 0.73,
        direction: "debit",
        family: "lifestyle",
        regexes: [/\bhomewares?\b/i, /\bfurnitur(?:e|ings?)\b/i, /\bapparel\b/i, /\bclothing\b/i],
        reason: "Lifestyle shopping terms matched; no more specific payee rule matched.",
      },
    ]);

    const config = normalizeConfig(externalConfig);

    function toNumber(value, fallback = 0) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizeLabel(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function normalizeLooseText(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[&+/]/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function canonicalizeDescription(value) {
      return normalizeLooseText(String(value || "").replace(/[_-]+/g, " "));
    }

    function deriveCanonicalPayeeKey(value) {
      const canonical = canonicalizeDescription(value)
        .replace(/\d{4,}/g, " ")
        .replace(REFERENCE_JUNK_REGEX, " ")
        .replace(/\s+/g, " ")
        .trim();
      const loanAccountMatch = canonical.match(/\bl\d+\b/);
      if (loanAccountMatch) return loanAccountMatch[0];
      return canonical || canonicalizeDescription(value);
    }

    function parseDateEpochDay(value) {
      const raw = String(value || "").trim();
      if (!raw) return NaN;
      const parsed = Date.parse(raw);
      if (Number.isNaN(parsed)) return NaN;
      return Math.floor(parsed / 86400000);
    }

    function dateDiffDays(dateA, dateB) {
      const dayA = parseDateEpochDay(dateA);
      const dayB = parseDateEpochDay(dateB);
      if (Number.isNaN(dayA) || Number.isNaN(dayB)) return Number.POSITIVE_INFINITY;
      return Math.abs(dayA - dayB);
    }

    function approxEqual(a, b, epsilon = EPSILON) {
      return Math.abs(toNumber(a, 0) - toNumber(b, 0)) <= toNumber(epsilon, EPSILON);
    }

    function amountBucket(value) {
      return Math.round(Math.abs(toNumber(value, 0)) * 100);
    }

    function getTxId(tx, index) {
      const explicit = String(tx?.id || "").trim();
      return explicit || `idx_${index}`;
    }

    function getExistingTransferLinkId(tx) {
      for (const field of LINK_FIELD_NAMES) {
        const value = tx && tx[field];
        if (value === undefined || value === null) continue;
        const text = String(value).trim();
        if (!text) continue;
        return text;
      }
      return "";
    }

    function collectText(tx) {
      return [
        tx?.description,
        tx?.payee,
        tx?.memo,
        tx?.reference,
        tx?.counterparty,
        tx?.notes,
        tx?.narrative,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ");
    }

    function median(values = []) {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
      return sorted[mid];
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function compileRegex(pattern, flags = "i") {
      try {
        return new RegExp(String(pattern || ""), flags);
      } catch {
        return null;
      }
    }

    function normalizeWordList(values = []) {
      return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeLabel(value)).filter(Boolean))];
    }

    function normalizeMatcherRules(rules = []) {
      return (Array.isArray(rules) ? rules : [])
        .map((rule, index) => {
          const id = String(rule?.id || `matcher_${index}`).trim();
          const type = String(rule?.type || "contains").trim().toLowerCase();
          const pattern = String(rule?.pattern || rule?.label || "").trim();
          if (!id || !pattern) return null;
          return {
            id,
            type,
            pattern,
            normalizedPattern: normalizeLabel(pattern),
            regex: type === "regex" ? compileRegex(pattern, "i") : null,
            label: String(rule?.label || "").trim() || null,
          };
        })
        .filter(Boolean);
    }

    function normalizeCategoryRules(rules = []) {
      return (Array.isArray(rules) ? rules : [])
        .map((rule, index) => {
          const id = String(rule?.id || `category_rule_${index}`).trim();
          const type = String(rule?.type || "contains").trim().toLowerCase();
          const pattern = String(rule?.pattern || "").trim();
          const category = String(rule?.category || "").trim();
          const subcategory = String(rule?.subcategory || "").trim();
          if (!id || !type || !category || !subcategory) return null;
          const rawDirection = String(rule?.direction || "any").trim().toLowerCase();
          const direction = rawDirection === "debit" || rawDirection === "credit" ? rawDirection : "any";
          const confidenceRaw = toNumber(rule?.confidence, NaN);
          return {
            id,
            type,
            pattern,
            normalizedPattern: normalizeLabel(pattern),
            regex: type === "regex" ? compileRegex(pattern, "i") : null,
            category,
            subcategory,
            direction,
            confidence: Number.isFinite(confidenceRaw) ? clamp(confidenceRaw, 0, 1) : null,
            reason: String(rule?.reason || "").trim(),
            excludeFromSpending:
              rule?.excludeFromSpending === undefined ? undefined : Boolean(rule.excludeFromSpending),
            excludeFromIncome:
              rule?.excludeFromIncome === undefined ? undefined : Boolean(rule.excludeFromIncome),
            excludeFromBudget:
              rule?.excludeFromBudget === undefined ? undefined : Boolean(rule.excludeFromBudget),
            overrideExisting:
              rule?.overrideExisting === undefined ? true : Boolean(rule.overrideExisting),
          };
        })
        .filter(Boolean);
    }

    function normalizeSinkingRules(rules = []) {
      return (Array.isArray(rules) ? rules : [])
        .map((rule, index) => {
          const id = String(rule?.id || `sinking_rule_${index}`).trim();
          const keywords = normalizeWordList(rule?.keywords || []);
          const subcategory = String(rule?.subcategory || "").trim();
          if (!id || !keywords.length || !subcategory) return null;
          return { id, keywords, subcategory };
        })
        .filter(Boolean);
    }

    function normalizeConfig(raw = {}) {
      return {
        payeeAliases: normalizeMatcherRules(raw.payeeAliases || []),
        payeeCategoryRules: normalizeCategoryRules(raw.payeeCategoryRules || []),
        knownIncomeRules: normalizeCategoryRules(raw.knownIncomeRules || []),
        sinkingTransferRules: normalizeSinkingRules(raw.sinkingTransferRules || []),
        transferKeywords: normalizeWordList(raw.transferKeywords || []),
        incomeKeywords: normalizeWordList(raw.incomeKeywords || []),
        loanKeywords: normalizeWordList(raw.loanKeywords || []),
        targetBudgetDiscountPct: clamp(
          Math.round(toNumber(raw.targetBudgetDiscountPct, DEFAULT_TARGET_BUDGET_DISCOUNT_PCT)),
          0,
          50
        ),
      };
    }

    function matchTextRule(rule, value) {
      const text = normalizeLabel(value);
      if (!text) return false;
      if (rule.type === "exact" || rule.type === "exact_label") return text === rule.normalizedPattern;
      if (rule.type === "contains") return rule.normalizedPattern && text.includes(rule.normalizedPattern);
      if (rule.type === "regex") return Boolean(rule.regex && rule.regex.test(String(value || "")));
      return false;
    }

    function matchAliasForText(value, rules = []) {
      const candidates = [];
      for (const rule of rules) {
        if (!matchTextRule(rule, value)) continue;
        const score =
          rule.type === "exact" || rule.type === "exact_label"
            ? 3
            : rule.type === "contains"
            ? 2
            : 1;
        candidates.push({ rule, score });
      }
      if (!candidates.length) return null;
      candidates.sort((a, b) => b.score - a.score || a.rule.id.localeCompare(b.rule.id));
      return candidates[0].rule;
    }

    function getCategoryRuleConfidence(rule) {
      if (Number.isFinite(rule?.confidence)) return clamp(toNumber(rule.confidence, 0), 0, 1);
      if (rule?.type === "exact" || rule?.type === "exact_label") return RULE_CONFIDENCE.payee_exact;
      if (rule?.type === "contains") return RULE_CONFIDENCE.payee_contains;
      if (rule?.type === "regex") return RULE_CONFIDENCE.payee_regex;
      return RULE_CONFIDENCE.recurring_bill;
    }

    function getCategoryRuleDirection(rule) {
      const value = String(rule?.direction || "any").trim().toLowerCase();
      return value === "debit" || value === "credit" ? value : "any";
    }

    function doesRuleDirectionMatch(rule, amount) {
      const direction = getCategoryRuleDirection(rule);
      if (direction === "any") return true;
      if (direction === "debit") return toNumber(amount, 0) < 0;
      if (direction === "credit") return toNumber(amount, 0) > 0;
      return true;
    }

    function getCategoryRuleSpecificity(rule) {
      if (rule?.type === "exact" || rule?.type === "exact_label") return 3;
      if (rule?.type === "contains") return 2;
      if (rule?.type === "regex") return 1;
      return 0;
    }

    function canRuleOverrideExisting(rule) {
      return rule?.overrideExisting !== false;
    }

    function resolvePayeeAlias(tx) {
      const labelCandidate = normalizeLabel(tx?.payee_label || tx?.payee || "");
      const searchTexts = [
        tx?.canonical_payee_key,
        tx?.canonical_description,
        tx?.description,
        labelCandidate,
      ].filter(Boolean);
      for (const text of searchTexts) {
        const rule = matchAliasForText(text, config.payeeAliases);
        if (rule) return rule;
      }
      return null;
    }

    function normalizeTxDerivedFields(tx) {
      tx.canonical_description = canonicalizeDescription(tx?.description || tx?.payee || tx?.memo || "");
      tx.canonical_payee_key = deriveCanonicalPayeeKey(tx?.description || tx?.payee || tx?.memo || "");
      const alias = resolvePayeeAlias(tx);
      const existingLabel = String(tx?.payee_label || tx?.payeeLabel || tx?.payee || "").trim();
      const baselineCategory =
        String(
          tx?.raw_category ||
            tx?.rawCategory ||
            tx?.pre_cleanup_category ||
            tx?.preCleanupCategory ||
            tx?.category ||
            "Uncategorized"
        ).trim() || "Uncategorized";
      const baselineSubcategory =
        String(
          tx?.raw_subcategory ||
            tx?.rawSubcategory ||
            tx?.pre_cleanup_subcategory ||
            tx?.preCleanupSubcategory ||
            tx?.subcategory ||
            "Other"
        ).trim() || "Other";
      tx.payee_label = alias?.label || existingLabel || null;
      tx.payee_alias_rule_id = alias?.id || "";
      tx.pre_cleanup_category = baselineCategory;
      tx.pre_cleanup_subcategory = baselineSubcategory;
      tx.classification_rule_id = "";
      tx.classification_confidence = 0;
      tx.classification_reason = "";
      tx.is_internal_transfer = false;
      tx.is_sinking_transfer = false;
      tx.is_loan_payment = false;
      tx.is_loan_payment_counterpart = false;
      tx.exclude_from_spending = false;
      tx.exclude_from_income = false;
      tx.exclude_from_budget = false;
      tx.internal_transfer_matched = false;
      if (!tx.transfer_pair_id) tx.transfer_pair_id = "";
      return tx;
    }

    function hasSalarySignal(tx, textUpper) {
      const normalizedCategory = normalizeLabel(tx?.category);
      const normalizedSubcategory = normalizeLabel(tx?.subcategory);
      if (normalizedCategory === "income" && normalizedSubcategory === "salary") return true;
      return SALARY_REGEXES.some((regex) => regex.test(textUpper));
    }

    function hasLoanKeywordSignal(text) {
      const normalized = normalizeLabel(text);
      return config.loanKeywords.some((keyword) => normalized.includes(keyword));
    }

    function hasGenericLoanAccountSignal(text) {
      return LOAN_ACCOUNT_REGEXES.some((regex) => regex.test(String(text || "")));
    }

    function hasLoanFacilityPayeeSignal(tx) {
      const payeeKey = normalizeLabel(tx?.canonical_payee_key || "");
      const payeeLabel = normalizeLabel(tx?.payee_label || "");
      return /\bl\d+\b/.test(payeeKey) || payeeLabel.includes("loan");
    }

    function isExplicitNonLoanPayeeRule(rule) {
      if (!rule) return false;
      const category = normalizeLabel(rule.category);
      const subcategory = normalizeLabel(rule.subcategory);
      const isHousingLoanRule = category === "housing" && subcategory.startsWith("mortgage");
      const isAirbnbLoanRule = category === "airbnb" && subcategory === "loan payment";
      return !(isHousingLoanRule || isAirbnbLoanRule);
    }

    function isLoanFundingTransfer(tx) {
      const text = String(collectText(tx) || "").toUpperCase();
      return (
        toNumber(tx?.amount, 0) < 0 &&
        (text.includes("LOAN TO A/C") || text.includes("LOAN TO ACCOUNT")) &&
        text.includes("SWIFT PAYMENTS")
      );
    }

    function hasAirbnbSignal(tx) {
      const text = String(collectText(tx) || "").toUpperCase();
      const property = normalizeLabel(tx?.property || "");
      return property === "airbnb" || text.includes("AIRBNB") || text.includes("AIR BNB");
    }

    function isTransferLike(tx) {
      const text = String(collectText(tx) || "");
      const normalizedCategory = normalizeLabel(tx?.category);
      const normalizedSubcategory = normalizeLabel(tx?.subcategory);
      if (normalizedCategory === "transfers") return true;
      if (normalizedSubcategory.includes("transfer")) return true;
      return (
        TRANSFER_REGEXES.some((regex) => regex.test(text)) ||
        config.transferKeywords.some((keyword) => normalizeLabel(text).includes(keyword))
      );
    }

    function isManualLocked(tx) {
      return Boolean(String(tx?.manual_category_override || tx?.manualCategoryOverride || "").trim());
    }

    function canAutoRecategorize(tx) {
      if (isManualLocked(tx)) return false;
      const normalizedCategory = normalizeLabel(tx?.category);
      const normalizedSubcategory = normalizeLabel(tx?.subcategory);
      return (
        normalizedCategory === "transfers" ||
        normalizedCategory === "uncategorized" ||
        normalizedCategory === "unknown" ||
        normalizedCategory === "" ||
        normalizedSubcategory === "other" ||
        normalizedSubcategory.includes("transfer")
      );
    }

    function findSinkingTransferRule(tx) {
      const amount = toNumber(tx?.amount, 0);
      if (!(amount < 0)) return null;
      if (!isTransferLike(tx) && normalizeLabel(tx?.category) !== "transfers") return null;
      const text = `${tx?.canonical_description || ""} ${tx?.canonical_payee_key || ""}`;
      for (const rule of config.sinkingTransferRules) {
        const matchedKeyword = rule.keywords.find((keyword) => text.includes(keyword));
        if (!matchedKeyword) continue;
        return { ...rule, matchedKeyword };
      }
      return null;
    }

    function findCategoryRule(tx, rules = []) {
      const amount = toNumber(tx?.amount, 0);
      const searchTexts = [
        { source: "payee_label", text: String(tx?.payee_label || "").trim() },
        { source: "canonical_payee_key", text: String(tx?.canonical_payee_key || "").trim() },
        { source: "canonical_description", text: String(tx?.canonical_description || "").trim() },
        { source: "description", text: String(tx?.description || "").trim() },
      ].filter((entry) => entry.text);
      const candidates = [];

      rules.forEach((rule) => {
        if (!doesRuleDirectionMatch(rule, amount)) return;
        searchTexts.forEach((entry) => {
          if (!matchTextRule(rule, entry.text)) return;
          const specificity = getCategoryRuleSpecificity(rule);
          const sourceScore =
            entry.source === "payee_label"
              ? 40
              : entry.source === "canonical_payee_key"
              ? 30
              : entry.source === "canonical_description"
              ? 20
              : 10;
          candidates.push({
            rule,
            score: specificity * 100 + sourceScore + Math.round(getCategoryRuleConfidence(rule) * 100),
            patternLength: Math.max(rule.normalizedPattern.length, String(rule.pattern || "").length),
          });
        });
      });

      if (!candidates.length) return null;
      candidates.sort(
        (a, b) =>
          b.score - a.score ||
          b.patternLength - a.patternLength ||
          a.rule.id.localeCompare(b.rule.id)
      );
      return candidates[0].rule;
    }

    function countFallbackHits(rule, texts = []) {
      const matches = [];
      const regexes = Array.isArray(rule?.regexes) ? rule.regexes : [];
      regexes.forEach((regex) => {
        const hit = texts.some((text) => regex.test(String(text || "")));
        if (hit) matches.push(regex.source);
      });
      return matches;
    }

    function findFallbackClassification(tx) {
      const amount = toNumber(tx?.amount, 0);
      if (!(amount < 0)) return null;
      if (!canAutoRecategorize(tx)) return null;
      if (normalizeLabel(tx?.category) !== "uncategorized") return null;
      if (normalizeLabel(tx?.subcategory) !== "other") return null;

      const texts = [
        String(tx?.canonical_description || "").trim(),
        String(tx?.canonical_payee_key || "").trim(),
        String(tx?.payee_label || "").trim(),
        String(tx?.description || "").trim(),
      ].filter(Boolean);
      const candidates = [];

      FALLBACK_CLASSIFICATION_RULES.forEach((rule) => {
        if (!doesRuleDirectionMatch(rule, amount)) return;
        if ((rule.rejectRegexes || []).some((regex) => texts.some((text) => regex.test(String(text || ""))))) return;
        const matchedPatterns = countFallbackHits(rule, texts);
        if (!matchedPatterns.length) return;
        candidates.push({
          rule,
          matchedPatterns,
          score: Math.round(toNumber(rule.confidence, RULE_CONFIDENCE.fallback_broad) * 100) + matchedPatterns.length * 5,
        });
      });

      if (!candidates.length) return null;
      candidates.sort((a, b) => b.score - a.score || a.rule.id.localeCompare(b.rule.id));
      if (candidates.length > 1) {
        const top = candidates[0];
        const runnerUp = candidates[1];
        if (top.rule.family !== runnerUp.rule.family && top.score - runnerUp.score <= 4) return null;
      }

      const winner = candidates[0].rule;
      return {
        category: winner.category,
        subcategory: winner.subcategory,
        ruleId: winner.id,
        confidence: toNumber(winner.confidence, RULE_CONFIDENCE.fallback_broad),
        reason: winner.reason,
        excludeFromSpending: winner.excludeFromSpending,
        excludeFromIncome: winner.excludeFromIncome,
        excludeFromBudget: winner.excludeFromBudget,
      };
    }

    function looksLikeRealTransferOut(tx) {
      const text = normalizeLabel(collectText(tx));
      if (!text) return false;
      return (
        /\b(?:savings|offset|bucket|reserve|envelope|account)\b/.test(text) ||
        /\b\d{4,}\b/.test(String(collectText(tx) || "")) ||
        hasGenericLoanAccountSignal(text)
      );
    }

    function getClusterTolerance(amount) {
      const absolute = Math.abs(toNumber(amount, 0));
      return Math.max(5, absolute * 0.03);
    }

    function clusterAmounts(amounts = []) {
      const clusters = [];
      amounts.forEach((amount) => {
        const value = Math.abs(toNumber(amount, 0));
        if (!Number.isFinite(value) || value <= EPSILON) return;
        let target = null;
        for (const cluster of clusters) {
          if (Math.abs(cluster.center - value) <= Math.max(cluster.tolerance, getClusterTolerance(value))) {
            target = cluster;
            break;
          }
        }
        if (!target) {
          target = {
            center: value,
            count: 0,
            total: 0,
            tolerance: getClusterTolerance(value),
          };
          clusters.push(target);
        }
        target.count += 1;
        target.total += value;
        target.center = target.total / target.count;
        target.tolerance = Math.max(target.tolerance, getClusterTolerance(target.center));
      });
      return clusters.sort((a, b) => b.count - a.count || b.center - a.center);
    }

    function getRecurringLoanClusters(profile) {
      return (Array.isArray(profile?.amountClusters) ? profile.amountClusters : []).filter((cluster) => cluster.count >= 2);
    }

    function getLoanBaseFamilyMinCenter(recurringClusters = []) {
      if (!recurringClusters.length) return 0;
      const maxCenter = Math.max(...recurringClusters.map((cluster) => cluster.center));
      return Math.max(maxCenter * 0.7, maxCenter - 350);
    }

    function inferCadence(dates = []) {
      if (dates.length < 2) {
        return {
          name: "irregular",
          periodsPerYear: 0,
          medianGapDays: 0,
          isRecurring: false,
        };
      }
      const epochDays = dates
        .map((date) => parseDateEpochDay(date))
        .filter((day) => Number.isFinite(day))
        .sort((a, b) => a - b);
      if (epochDays.length < 2) {
        return {
          name: "irregular",
          periodsPerYear: 0,
          medianGapDays: 0,
          isRecurring: false,
        };
      }
      const gaps = [];
      for (let index = 1; index < epochDays.length; index += 1) {
        gaps.push(epochDays[index] - epochDays[index - 1]);
      }
      const medianGapDays = median(gaps);
      const candidates = [
        { name: "weekly", gap: 7, tolerance: 2, periodsPerYear: 52 },
        { name: "fortnightly", gap: 14, tolerance: 3, periodsPerYear: 26 },
        { name: "monthly", gap: 30, tolerance: 5, periodsPerYear: 12 },
        { name: "quarterly", gap: 91, tolerance: 10, periodsPerYear: 4 },
        { name: "annually", gap: 365, tolerance: 20, periodsPerYear: 1 },
      ];
      const matched = candidates.find((candidate) => Math.abs(medianGapDays - candidate.gap) <= candidate.tolerance);
      if (!matched) {
        return {
          name: "irregular",
          periodsPerYear: 0,
          medianGapDays,
          isRecurring: false,
        };
      }
      const matchingGapCount = gaps.filter((gap) => Math.abs(gap - matched.gap) <= matched.tolerance).length;
      return {
        name: matched.name,
        periodsPerYear: matched.periodsPerYear,
        medianGapDays,
        isRecurring: gaps.length >= 2 && matchingGapCount / gaps.length >= 0.6,
      };
    }

    function buildPayeeProfiles(transactions = []) {
      const groups = new Map();
      (Array.isArray(transactions) ? transactions : []).forEach((tx, index) => {
        const amount = toNumber(tx?.amount, 0);
        if (!(amount < 0)) return;
        const key =
          String(tx?.payee_label || "").trim() ||
          String(tx?.canonical_payee_key || "").trim() ||
          String(tx?.canonical_description || "").trim() ||
          getTxId(tx, index);
        if (!groups.has(key)) {
          groups.set(key, { key, rows: [] });
        }
        groups.get(key).rows.push(tx);
      });

      const profiles = new Map();
      groups.forEach((entry, key) => {
        const rows = entry.rows
          .slice()
          .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));
        const cadence = inferCadence(rows.map((row) => row?.date));
        const clusters = clusterAmounts(rows.map((row) => row?.amount));
        profiles.set(key, {
          key,
          rows,
          cadence,
          amountClusters: clusters,
          primaryCluster: clusters[0] || null,
        });
      });
      return profiles;
    }

    function findClusterForAmount(profile, amount) {
      if (!profile?.amountClusters?.length) return null;
      const absolute = Math.abs(toNumber(amount, 0));
      return (
        profile.amountClusters.find(
          (cluster) => Math.abs(cluster.center - absolute) <= Math.max(cluster.tolerance, getClusterTolerance(absolute))
        ) || null
      );
    }

    function buildLoanPaymentMap(transactions = [], profiles = new Map()) {
      const debitMap = new Map();
      const candidateDebits = [];
      (Array.isArray(transactions) ? transactions : []).forEach((tx, index) => {
        const amount = toNumber(tx?.amount, 0);
        if (!(amount < 0)) return;
        if (isLoanFundingTransfer(tx)) return;
        if (hasAirbnbSignal(tx)) return;
        const text = String(collectText(tx) || "");
        const explicitPayeeRule = findCategoryRule(tx, config.payeeCategoryRules);
        if (isExplicitNonLoanPayeeRule(explicitPayeeRule)) return;
        const strongKeyword = hasLoanKeywordSignal(text);
        const genericLoanSignal = hasGenericLoanAccountSignal(text);
        const profileKey =
          String(tx?.payee_label || "").trim() ||
          String(tx?.canonical_payee_key || "").trim() ||
          String(tx?.canonical_description || "").trim();
        const profile = profiles.get(profileKey) || null;
        const hasLearnedAmountPattern = Boolean(profile?.amountClusters?.some((entry) => entry.count >= 2));
        const cluster = findClusterForAmount(profile, amount);
        const recurringClusters = getRecurringLoanClusters(profile);
        const baseFamilyMinCenter = getLoanBaseFamilyMinCenter(recurringClusters);
        const aliasLooksLoan = normalizeLabel(tx?.payee_label || "").includes("loan");
        const payeeLooksLoan = hasLoanFacilityPayeeSignal(tx);
        const qualifies =
          strongKeyword ||
          genericLoanSignal ||
          aliasLooksLoan ||
          payeeLooksLoan;
        if (!qualifies) return;

        let subcategory = "Mortgage / Loan";
        if (recurringClusters.length) {
          if (cluster && cluster.count >= 2 && cluster.center >= baseFamilyMinCenter) {
            subcategory = "Mortgage (Base)";
          } else if (cluster && cluster.count >= 2) {
            subcategory = "Mortgage (Extra)";
          } else if (Math.abs(amount) >= baseFamilyMinCenter) {
            subcategory = "Mortgage (Additional Lump)";
          } else if (profile?.cadence?.isRecurring && Math.abs(amount) >= baseFamilyMinCenter * 0.7) {
            subcategory = "Mortgage (Base)";
          }
        } else if (strongKeyword) {
          subcategory = "Mortgage / Loan";
        }

        const ruleId = strongKeyword
          ? "loan_payment_detected_keyword_or_profile"
          : genericLoanSignal || payeeLooksLoan
          ? "loan_payment_detected_loan_facility"
          : "loan_payment_detected_profile";
        const confidence =
          strongKeyword || hasLearnedAmountPattern
            ? RULE_CONFIDENCE.loan_payment_strong
            : RULE_CONFIDENCE.loan_payment_medium;
        const txId = getTxId(tx, index);
        candidateDebits.push({ tx, txId, amount, confidence });
        debitMap.set(txId, {
          ruleId,
          confidence,
          category: "Housing",
          subcategory,
        });
      });

      const creditMap = new Map();
      const usedCreditIds = new Set();
      const candidateCredits = (Array.isArray(transactions) ? transactions : [])
        .map((tx, index) => ({ tx, txId: getTxId(tx, index), amount: toNumber(tx?.amount, 0) }))
        .filter((entry) => entry.amount > 0)
        .filter((entry) => isTransferLike(entry.tx));

      candidateDebits.forEach((debit) => {
        let best = null;
        let bestScore = Number.POSITIVE_INFINITY;
        candidateCredits.forEach((credit) => {
          if (usedCreditIds.has(credit.txId)) return;
          if (!approxEqual(Math.abs(debit.amount), Math.abs(credit.amount), EPSILON)) return;
          const diff = dateDiffDays(debit.tx?.date, credit.tx?.date);
          if (diff > LOAN_COUNTERPART_DAY_WINDOW) return;
          if (diff < bestScore) {
            best = credit;
            bestScore = diff;
          }
        });
        if (!best) return;
        usedCreditIds.add(best.txId);
        creditMap.set(best.txId, {
          ruleId: "loan_payment_counterpart_credit",
          confidence: RULE_CONFIDENCE.loan_credit_counterpart,
          category: "Transfers",
          subcategory: "Loan Account Credit",
        });
      });

      return { debitMap, creditMap };
    }

    function isKnownInternalAccount(account, knownSet) {
      const value = String(account || "").trim();
      if (!value) return false;
      if (!knownSet || !knownSet.size) return true;
      return knownSet.has(value);
    }

    function accountFamilyKey(account) {
      const value = String(account || "").trim().toUpperCase();
      const match = value.match(/^(\d+)[A-Z]\d+$/);
      return match ? match[1] : "";
    }

    function extractReferencedAccounts(text = "") {
      const matches = String(text || "").toUpperCase().match(/\b\d+[A-Z]\d+\b/g);
      return [...new Set(matches || [])];
    }

    function hasInferredInternalAccountReference(tx, knownSet) {
      const text = String(collectText(tx) || "").toUpperCase();
      if (!text) return false;
      const currentAccount = String(tx?.account || "").trim().toUpperCase();
      const currentFamily = accountFamilyKey(currentAccount);
      const knownFamilies = new Set();
      if (knownSet && knownSet.size) {
        knownSet.forEach((account) => {
          const family = accountFamilyKey(account);
          if (family) knownFamilies.add(family);
        });
      }
      return extractReferencedAccounts(text).some((account) => {
        if (account === currentAccount) return false;
        if (knownSet && knownSet.has(account)) return true;
        const family = accountFamilyKey(account);
        if (!family) return false;
        return (currentFamily && family === currentFamily) || knownFamilies.has(family);
      });
    }

    function defaultMatchedTransferSubcategory(amount) {
      return toNumber(amount, 0) >= 0 ? "Internal Transfers In" : "Internal Transfers Out";
    }

    function shouldPreserveMatchedTransferSubcategory(tx) {
      const normalized = normalizeLabel(tx?.subcategory || "");
      if (!normalized) return false;
      return ![
        "internal transfers in",
        "internal transfers out",
        "external transfer in",
        "external transfer out",
        "transfer from outside coming in",
        "transfer from inside going out",
        "other",
      ].includes(normalized);
    }

    function descriptionSimilarity(a, b) {
      const left = new Set(normalizeLabel(a).split(" ").filter(Boolean));
      const right = new Set(normalizeLabel(b).split(" ").filter(Boolean));
      if (!left.size || !right.size) return 0;
      let overlap = 0;
      left.forEach((token) => {
        if (right.has(token)) overlap += 1;
      });
      return overlap / Math.max(left.size, right.size);
    }

    function findInternalTransferPairs(transactions = [], options = {}) {
      const rows = Array.isArray(transactions) ? transactions : [];
      const knownInternalAccounts = new Set(
        (Array.isArray(options.knownInternalAccounts) ? options.knownInternalAccounts : [])
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      );
      const excludeIds = new Set(
        (Array.isArray(options.excludeTxIds) ? options.excludeTxIds : []).map((item) => String(item || "").trim()).filter(Boolean)
      );
      const matchedIds = new Set();
      const pairByTxId = new Map();
      const pairList = [];
      const usedCandidates = new Set();
      const txById = new Map();

      rows.forEach((tx, index) => {
        txById.set(getTxId(tx, index), tx);
      });

      const byExistingLink = new Map();
      rows.forEach((tx, index) => {
        const txId = getTxId(tx, index);
        const linkId = getExistingTransferLinkId(tx);
        if (!linkId) return;
        if (!byExistingLink.has(linkId)) byExistingLink.set(linkId, []);
        byExistingLink.get(linkId).push(txId);
      });

      byExistingLink.forEach((txIds, linkId) => {
        if (txIds.length < 2) return;
        const linkedRows = txIds
          .map((txId) => ({
            txId,
            amount: toNumber(txById.get(txId)?.amount, 0),
          }))
          .filter((item) => Number.isFinite(item.amount) && Math.abs(item.amount) > EPSILON);
        if (linkedRows.length < 2) return;
        const hasIncoming = linkedRows.some((item) => item.amount > 0);
        const hasOutgoing = linkedRows.some((item) => item.amount < 0);
        if (!hasIncoming || !hasOutgoing) return;
        linkedRows.forEach((item) => {
          const txId = item.txId;
          matchedIds.add(txId);
          pairByTxId.set(txId, linkId);
        });
      });

      const positiveCandidates = [];
      const negativeCandidatesByAmount = new Map();
      rows.forEach((tx, index) => {
        const txId = getTxId(tx, index);
        if (matchedIds.has(txId) || excludeIds.has(txId)) return;
        if (!isTransferLike(tx)) return;
        if (!isKnownInternalAccount(tx?.account, knownInternalAccounts)) return;
        const amount = toNumber(tx?.amount, 0);
        if (!Number.isFinite(amount) || Math.abs(amount) <= EPSILON) return;
        const item = {
          txId,
          index,
          amount,
          absAmountBucket: amountBucket(amount),
          date: String(tx?.date || "").trim(),
          account: String(tx?.account || "").trim(),
          description: String(tx?.canonical_description || tx?.description || "").trim(),
          payeeKey: String(tx?.canonical_payee_key || "").trim(),
        };
        if (amount > 0) {
          positiveCandidates.push(item);
          return;
        }
        if (!negativeCandidatesByAmount.has(item.absAmountBucket)) {
          negativeCandidatesByAmount.set(item.absAmountBucket, []);
        }
        negativeCandidatesByAmount.get(item.absAmountBucket).push(item);
      });

      positiveCandidates.sort((a, b) => {
        if (a.date === b.date) return a.index - b.index;
        return a.date.localeCompare(b.date);
      });
      negativeCandidatesByAmount.forEach((list) => {
        list.sort((a, b) => {
          if (a.date === b.date) return a.index - b.index;
          return a.date.localeCompare(b.date);
        });
      });

      positiveCandidates.forEach((incoming) => {
        if (usedCandidates.has(incoming.txId)) return;
        const outgoingList = negativeCandidatesByAmount.get(incoming.absAmountBucket) || [];
        let best = null;
        let bestScore = Number.POSITIVE_INFINITY;
        outgoingList.forEach((outgoing) => {
          if (usedCandidates.has(outgoing.txId)) return;
          if (!outgoing.account || !incoming.account) return;
          if (incoming.account === outgoing.account) return;
          if (!approxEqual(Math.abs(incoming.amount), Math.abs(outgoing.amount), EPSILON)) return;
          const dayDiff = dateDiffDays(incoming.date, outgoing.date);
          if (dayDiff > INTERNAL_TRANSFER_DAY_WINDOW) return;
          const similarityPenalty =
            descriptionSimilarity(incoming.description || incoming.payeeKey, outgoing.description || outgoing.payeeKey) > 0.4
              ? 0
              : 0.4;
          const score = dayDiff + similarityPenalty;
          if (score < bestScore) {
            bestScore = score;
            best = outgoing;
          }
        });
        if (!best) return;

        usedCandidates.add(incoming.txId);
        usedCandidates.add(best.txId);
        const pairId = `pair_${incoming.txId}_${best.txId}`;
        matchedIds.add(incoming.txId);
        matchedIds.add(best.txId);
        pairByTxId.set(incoming.txId, pairId);
        pairByTxId.set(best.txId, pairId);
        pairList.push({
          pair_id: pairId,
          in_tx_id: incoming.txId,
          out_tx_id: best.txId,
          amount: Number(Math.abs(incoming.amount).toFixed(2)),
        });
      });

      return { matchedIds, pairByTxId, pairList };
    }

    function applyClassification(tx, change, auditLog, metadata = {}) {
      const oldCategory = String(tx?.category || "Uncategorized").trim() || "Uncategorized";
      const oldSubcategory = String(tx?.subcategory || "Other").trim() || "Other";
      const nextCategory = String(change?.category || oldCategory).trim() || oldCategory;
      const nextSubcategory = String(change?.subcategory || oldSubcategory).trim() || oldSubcategory;
      const ruleId = String(change?.ruleId || metadata?.ruleId || "unknown_rule").trim() || "unknown_rule";
      const confidence = Number(toNumber(change?.confidence, metadata?.confidence || 0));
      const reason = String(change?.reason || metadata?.reason || "").trim();

      if (!isManualLocked(tx)) {
        tx.category = nextCategory;
        tx.subcategory = nextSubcategory;
      }
      tx.classification_rule_id = ruleId;
      tx.classification_confidence = Number(confidence.toFixed(2));
      tx.classification_reason = reason;
      if (change?.payeeLabel) tx.payee_label = change.payeeLabel;
      if (change?.transferPairId !== undefined) tx.transfer_pair_id = String(change.transferPairId || "");
      if (change?.isInternalTransfer !== undefined) tx.is_internal_transfer = Boolean(change.isInternalTransfer);
      if (change?.isSinkingTransfer !== undefined) tx.is_sinking_transfer = Boolean(change.isSinkingTransfer);
      if (change?.isLoanPayment !== undefined) tx.is_loan_payment = Boolean(change.isLoanPayment);
      if (change?.isLoanPaymentCounterpart !== undefined) {
        tx.is_loan_payment_counterpart = Boolean(change.isLoanPaymentCounterpart);
      }
      if (change?.excludeFromSpending !== undefined) tx.exclude_from_spending = Boolean(change.excludeFromSpending);
      if (change?.excludeFromIncome !== undefined) tx.exclude_from_income = Boolean(change.excludeFromIncome);
      if (change?.excludeFromBudget !== undefined) tx.exclude_from_budget = Boolean(change.excludeFromBudget);
      if (change?.internalTransferMatched !== undefined) tx.internal_transfer_matched = Boolean(change.internalTransferMatched);

      const changed =
        oldCategory !== nextCategory ||
        oldSubcategory !== nextSubcategory ||
        ruleId !== "passthrough_existing_classification" ||
        Boolean(change?.isInternalTransfer) ||
        Boolean(change?.isSinkingTransfer) ||
        Boolean(change?.isLoanPayment);
      if (!changed) return;

      auditLog.push({
        tx_id: String(tx?.id || "").trim() || "--",
        matched_rule_name: ruleId,
        confidence: Number(confidence.toFixed(2)),
        payee_label: tx?.payee_label || "",
        canonical_payee_key: tx?.canonical_payee_key || "",
        old_category: oldCategory,
        old_subcategory: oldSubcategory,
        new_category: String(tx?.category || nextCategory || "Uncategorized").trim() || "Uncategorized",
        new_subcategory: String(tx?.subcategory || nextSubcategory || "Other").trim() || "Other",
      });
    }

    function classifyTransactions(transactions = [], options = {}) {
      const rows = Array.isArray(transactions) ? transactions : [];
      const auditLog = [];
      const knownInternalAccounts = new Set(
        (Array.isArray(options.knownInternalAccounts) ? options.knownInternalAccounts : [])
          .map((item) => String(item || "").trim().toUpperCase())
          .filter(Boolean)
      );
      rows.forEach((tx) => normalizeTxDerivedFields(tx));

      const profiles = buildPayeeProfiles(rows);
      const loanMaps = buildLoanPaymentMap(rows, profiles);
      const loanRelatedIds = new Set([
        ...loanMaps.debitMap.keys(),
        ...loanMaps.creditMap.keys(),
      ]);
      const pairMatch = findInternalTransferPairs(rows, {
        knownInternalAccounts: options.knownInternalAccounts,
        excludeTxIds: [...loanRelatedIds],
      });
      const sinkingMap = new Map();

      rows.forEach((tx, index) => {
        const txId = getTxId(tx, index);
        const amount = toNumber(tx?.amount, 0);
        const text = String(collectText(tx) || "");
        const textUpper = text.toUpperCase();
        const pairedInternal = pairMatch.matchedIds.has(txId);
        const pairId = pairMatch.pairByTxId.get(txId) || "";
        const inferredInternalReference = hasInferredInternalAccountReference(tx, knownInternalAccounts);
        if (!pairedInternal && String(tx?.transfer_pair_id || "").startsWith("pair_")) {
          tx.transfer_pair_id = "";
        }
        const payeeRule = findCategoryRule(tx, config.payeeCategoryRules);
        const sinkingRule = findSinkingTransferRule(tx);
        const knownIncomeRule = findCategoryRule(tx, config.knownIncomeRules);

        if (loanMaps.debitMap.has(txId)) {
          const loanChange = loanMaps.debitMap.get(txId);
          applyClassification(
            tx,
            {
              category: loanChange.category,
              subcategory: loanChange.subcategory,
              ruleId: loanChange.ruleId,
              confidence: loanChange.confidence,
              reason: "A regular loan repayment was identified from its timing and similar amounts.",
              isLoanPayment: true,
              excludeFromSpending: false,
              excludeFromIncome: true,
              excludeFromBudget: false,
            },
            auditLog
          );
          return;
        }

        if (loanMaps.creditMap.has(txId)) {
          const creditChange = loanMaps.creditMap.get(txId);
          applyClassification(
            tx,
            {
              category: creditChange.category,
              subcategory: creditChange.subcategory,
              ruleId: creditChange.ruleId,
              confidence: creditChange.confidence,
              reason: "The matching loan-account entry was linked to a mortgage repayment.",
              isLoanPaymentCounterpart: true,
              excludeFromSpending: true,
              excludeFromIncome: true,
              excludeFromBudget: true,
            },
            auditLog
          );
          return;
        }

        if (payeeRule && (canRuleOverrideExisting(payeeRule) || canAutoRecategorize(tx))) {
          applyClassification(
            tx,
            {
              category: payeeRule.category,
              subcategory: payeeRule.subcategory,
              ruleId: payeeRule.id,
              confidence: getCategoryRuleConfidence(payeeRule),
              reason: payeeRule.reason || "A saved payee rule matched the standardised payee name.",
              excludeFromSpending: payeeRule.excludeFromSpending,
              excludeFromIncome: payeeRule.excludeFromIncome,
              excludeFromBudget: payeeRule.excludeFromBudget,
            },
            auditLog
          );
          return;
        }

        if (pairedInternal) {
          const change = {
            category: "Transfers",
            subcategory: defaultMatchedTransferSubcategory(amount),
            ruleId: "internal_transfer_match_pair",
            confidence: RULE_CONFIDENCE.internal_pair,
            reason: "A debit and credit between tracked accounts matched by amount and nearby dates.",
            transferPairId: pairId,
            isInternalTransfer: true,
            excludeFromSpending: true,
            excludeFromIncome: true,
            excludeFromBudget: true,
            internalTransferMatched: true,
          };
          if (shouldPreserveMatchedTransferSubcategory(tx)) {
            change.subcategory = String(tx?.subcategory || "").trim() || change.subcategory;
            change.ruleId = "internal_transfer_match_preserve_specific";
            change.reason = "A debit and credit between tracked accounts matched. The more specific transfer type was kept.";
          }
          if (sinkingRule && amount < 0) {
            change.subcategory = sinkingRule.subcategory;
            change.ruleId = sinkingRule.id;
            change.confidence = RULE_CONFIDENCE.sinking_transfer;
            change.reason = "This matched transfer names a fund set aside for future costs.";
            change.isSinkingTransfer = true;
            sinkingMap.set(pairId, sinkingRule.subcategory);
          } else if (sinkingMap.has(pairId) && amount > 0) {
            change.isSinkingTransfer = true;
            change.ruleId = "sinking_transfer_internal_counterpart";
            change.confidence = RULE_CONFIDENCE.sinking_transfer;
            change.reason = "The matching entry for a transfer to a named fund set aside.";
          }
          applyClassification(tx, change, auditLog);
          return;
        }

        if (sinkingRule) {
          applyClassification(
            tx,
            {
              category: "Transfers",
              subcategory: sinkingRule.subcategory,
              ruleId: sinkingRule.id,
              confidence: RULE_CONFIDENCE.sinking_transfer,
              reason: "The description matched a rule for transfers to a fund set aside.",
              isInternalTransfer: inferredInternalReference,
              isSinkingTransfer: true,
              excludeFromSpending: true,
              excludeFromIncome: true,
              excludeFromBudget: true,
            },
            auditLog
          );
          return;
        }

        if (amount > 0 && !hasSalarySignal(tx, textUpper)) {
          const hasIncomeKeyword = config.incomeKeywords.some((keyword) => tx.canonical_description.includes(keyword));
          if (knownIncomeRule) {
            applyClassification(
              tx,
              {
                category: knownIncomeRule.category,
                subcategory: knownIncomeRule.subcategory,
                ruleId: knownIncomeRule.id,
                confidence: getCategoryRuleConfidence(knownIncomeRule) || RULE_CONFIDENCE.known_income,
                reason: knownIncomeRule.reason || "A known payee name matched an incoming transfer rule.",
                payeeLabel: tx.payee_label,
                excludeFromSpending:
                  knownIncomeRule.excludeFromSpending === undefined ? true : knownIncomeRule.excludeFromSpending,
                excludeFromIncome:
                  knownIncomeRule.excludeFromIncome === undefined ? false : knownIncomeRule.excludeFromIncome,
                excludeFromBudget:
                  knownIncomeRule.excludeFromBudget === undefined ? true : knownIncomeRule.excludeFromBudget,
              },
              auditLog
            );
            return;
          }
          if (hasIncomeKeyword && canAutoRecategorize(tx)) {
            applyClassification(
              tx,
              {
                category: "Income",
                subcategory: "Other Income",
                ruleId: "incoming_transfer_keyword_income",
                confidence: RULE_CONFIDENCE.keyword_income,
                reason: "The incoming transfer description matched an approved income keyword.",
                excludeFromSpending: true,
                excludeFromIncome: false,
                excludeFromBudget: true,
              },
              auditLog
            );
            return;
          }
          if (inferredInternalReference && isTransferLike(tx) && canAutoRecategorize(tx)) {
            applyClassification(
              tx,
              {
                category: "Transfers",
                subcategory: defaultMatchedTransferSubcategory(amount),
                ruleId: "internal_transfer_family_inferred",
                confidence: RULE_CONFIDENCE.internal_inferred,
                reason: "The description refers to another tracked, related account.",
                isInternalTransfer: true,
                excludeFromSpending: true,
                excludeFromIncome: true,
                excludeFromBudget: true,
              },
              auditLog
            );
            return;
          }
          if (isTransferLike(tx) && canAutoRecategorize(tx)) {
            applyClassification(
              tx,
              {
                category: "Transfers",
                subcategory: "External Transfer In",
                ruleId: "incoming_transfer_external_default",
                confidence: RULE_CONFIDENCE.external_transfer,
                reason: "This incoming transfer stays out of income totals until marked as income.",
                excludeFromSpending: true,
                excludeFromIncome: true,
                excludeFromBudget: true,
              },
              auditLog
            );
            return;
          }
        }

        if (amount < 0 && isTransferLike(tx) && canAutoRecategorize(tx) && looksLikeRealTransferOut(tx)) {
          if (inferredInternalReference) {
            applyClassification(
              tx,
              {
                category: "Transfers",
                subcategory: defaultMatchedTransferSubcategory(amount),
                ruleId: "internal_transfer_family_inferred",
                confidence: RULE_CONFIDENCE.internal_inferred,
                reason: "The description refers to another tracked, related account.",
                isInternalTransfer: true,
                excludeFromSpending: true,
                excludeFromIncome: true,
                excludeFromBudget: true,
              },
              auditLog
            );
            return;
          }
          applyClassification(
            tx,
            {
              category: "Transfers",
              subcategory: "External Transfer Out",
              ruleId: "outgoing_transfer_external_default",
              confidence: RULE_CONFIDENCE.external_transfer,
              reason: "This likely outgoing transfer stays out of spending until matched to an expense category.",
              excludeFromSpending: true,
              excludeFromIncome: true,
              excludeFromBudget: true,
            },
            auditLog
          );
          return;
        }

        const fallbackChange = findFallbackClassification(tx);
        if (fallbackChange) {
          applyClassification(tx, fallbackChange, auditLog);
          return;
        }

        tx.exclude_from_spending = shouldExcludeFromSpending(tx);
        tx.exclude_from_income = shouldExcludeFromIncome(tx);
        tx.exclude_from_budget = shouldExcludeFromBudget(tx);
        tx.classification_rule_id = tx.classification_rule_id || "passthrough_existing_classification";
        tx.classification_confidence = tx.classification_confidence || RULE_CONFIDENCE.passthrough;
      });

      const beforeAfterSummary = buildBeforeAfterReport(rows);
      return {
        auditLog,
        matchedInternalCount: pairMatch.matchedIds.size,
        pairCount: pairMatch.pairList.length,
        beforeAfterSummary,
      };
    }

    function shouldExcludeFromSpending(tx) {
      if (!tx) return true;
      if (Boolean(tx.exclude_from_spending)) return true;
      if (Boolean(tx.is_internal_transfer) || Boolean(tx.is_sinking_transfer) || Boolean(tx.is_loan_payment_counterpart)) return true;
      return normalizeLabel(tx.category) === "transfers";
    }

    function shouldExcludeFromIncome(tx) {
      if (!tx) return true;
      if (Boolean(tx.exclude_from_income)) return true;
      if (Boolean(tx.is_internal_transfer) || Boolean(tx.is_sinking_transfer) || Boolean(tx.is_loan_payment_counterpart)) return true;
      if (normalizeLabel(tx.category) === "transfers") return true;
      return false;
    }

    function shouldExcludeFromBudget(tx) {
      if (!tx) return true;
      if (Boolean(tx.exclude_from_budget)) return true;
      if (Boolean(tx.is_internal_transfer) || Boolean(tx.is_sinking_transfer) || Boolean(tx.is_loan_payment_counterpart)) return true;
      return normalizeLabel(tx.category) === "transfers";
    }

    function getTransactionFinancialPolicy(tx) {
      return {
        includeInSpending: toNumber(tx?.amount, 0) < 0 && !shouldExcludeFromSpending(tx),
        includeInIncome: toNumber(tx?.amount, 0) > 0 && !shouldExcludeFromIncome(tx),
        includeInBudget: !shouldExcludeFromBudget(tx),
      };
    }

    function buildBeforeAfterReport(transactions = []) {
      const rows = Array.isArray(transactions) ? transactions : [];
      let movedOutCount = 0;
      let movedOutAmount = 0;
      let mortgageAmount = 0;
      let internalTransferAmount = 0;
      let sinkingTransferAmount = 0;

      const beforeUncategorized = rows
        .filter((tx) => toNumber(tx?.amount, 0) < 0)
        .filter((tx) => normalizeLabel(tx?.pre_cleanup_category) === "uncategorized")
        .filter((tx) => normalizeLabel(tx?.pre_cleanup_subcategory) === "other");
      const remainingUncategorized = rows
        .filter((tx) => toNumber(tx?.amount, 0) < 0)
        .filter((tx) => normalizeLabel(tx?.category) === "uncategorized")
        .filter((tx) => normalizeLabel(tx?.subcategory) === "other");

      rows.forEach((tx) => {
        const amount = Math.abs(toNumber(tx?.amount, 0));
        const beforeCategory = normalizeLabel(tx?.pre_cleanup_category || "");
        const beforeSubcategory = normalizeLabel(tx?.pre_cleanup_subcategory || "");
        const afterCategory = normalizeLabel(tx?.category || "");
        const afterSubcategory = normalizeLabel(tx?.subcategory || "");
        const isExpense = toNumber(tx?.amount, 0) < 0;
        if (
          isExpense &&
          beforeCategory === "uncategorized" &&
          beforeSubcategory === "other" &&
          !(afterCategory === "uncategorized" && afterSubcategory === "other")
        ) {
          movedOutCount += 1;
          movedOutAmount += amount;
        }
        if (
          isExpense &&
          afterCategory === "housing" &&
          (afterSubcategory === "mortgage loan" ||
            afterSubcategory === "mortgage base" ||
            afterSubcategory === "mortgage extra" ||
            afterSubcategory === "mortgage additional lump")
        ) {
          mortgageAmount += amount;
        }
        if (isExpense && Boolean(tx?.is_internal_transfer)) {
          internalTransferAmount += amount;
        }
        if (isExpense && Boolean(tx?.is_sinking_transfer)) {
          sinkingTransferAmount += amount;
        }
      });

      const uncategorizedGroups = new Map();
      remainingUncategorized.forEach((tx) => {
        const key = String(tx?.canonical_description || tx?.description || "--").trim() || "--";
        if (!uncategorizedGroups.has(key)) {
          uncategorizedGroups.set(key, { canonical_description: key, amount: 0, count: 0 });
        }
        const row = uncategorizedGroups.get(key);
        row.amount += Math.abs(toNumber(tx?.amount, 0));
        row.count += 1;
      });

      const remainingUncategorizedTop = [...uncategorizedGroups.values()]
        .sort((a, b) => b.amount - a.amount || b.count - a.count || a.canonical_description.localeCompare(b.canonical_description))
        .slice(0, 30)
        .map((item) => ({
          canonical_description: item.canonical_description,
          amount: Number(item.amount.toFixed(2)),
          count: item.count,
        }));

      const remainingUncategorizedTotal = Number(
        remainingUncategorized.reduce((sum, tx) => sum + Math.abs(toNumber(tx?.amount, 0)), 0).toFixed(2)
      );
      const beforeUncategorizedTotal = Number(
        beforeUncategorized.reduce((sum, tx) => sum + Math.abs(toNumber(tx?.amount, 0)), 0).toFixed(2)
      );
      const fy = getFinancialYearContext(rows, 7);
      const fyRows =
        fy.start && fy.latestDate
          ? rows.filter((tx) => String(tx?.date || "") >= fy.start && String(tx?.date || "") <= fy.latestDate)
          : rows;
      const atmWithdrawalRows = fyRows
        .filter((tx) => toNumber(tx?.amount, 0) < 0)
        .filter((tx) => normalizeLabel(tx?.category) === "cash")
        .filter((tx) => normalizeLabel(tx?.subcategory) === "atm withdrawal");

      return {
        beforeUncategorized: {
          amount: beforeUncategorizedTotal,
          count: beforeUncategorized.length,
        },
        afterUncategorized: {
          amount: remainingUncategorizedTotal,
          count: remainingUncategorized.length,
        },
        movedOutOfUncategorized: {
          amount: Number(movedOutAmount.toFixed(2)),
          count: movedOutCount,
        },
        reclassifiedIntoMortgage: Number(mortgageAmount.toFixed(2)),
        markedInternalTransfers: Number(internalTransferAmount.toFixed(2)),
        markedSinkingTransfers: Number(sinkingTransferAmount.toFixed(2)),
        remainingUncategorizedTotal,
        remainingUncategorizedCount: remainingUncategorized.length,
        atmWithdrawalsFy: {
          amount: Number(
            atmWithdrawalRows.reduce((sum, tx) => sum + Math.abs(toNumber(tx?.amount, 0)), 0).toFixed(2)
          ),
          count: atmWithdrawalRows.length,
        },
        remainingUncategorizedTop,
      };
    }

    function getFinancialYearBounds(dateValue, fyStartMonth = 7) {
      const parsed = new Date(String(dateValue || ""));
      if (Number.isNaN(parsed.getTime())) return null;
      const year = parsed.getUTCMonth() + 1 >= fyStartMonth ? parsed.getUTCFullYear() : parsed.getUTCFullYear() - 1;
      const start = new Date(Date.UTC(year, fyStartMonth - 1, 1));
      const end = new Date(Date.UTC(year + 1, fyStartMonth - 1, 1));
      return { start, end, label: `FY${String(year + 1).slice(-2)}` };
    }

    function buildFinancialYearContextFromDate(anchorDate = "", fyStartMonth = 7, latestDateOverride = "") {
      const anchor = String(anchorDate || "").trim();
      const latestDate = String(latestDateOverride || anchorDate || "").trim();
      if (!anchor || !latestDate) {
        return {
          label: "",
          start: "",
          end: "",
          latestDate: latestDate || "",
          daysElapsed: 0,
          totalDays: 0,
          fractionElapsed: 0,
        };
      }
      const bounds = getFinancialYearBounds(anchor, fyStartMonth);
      if (!bounds) {
        return {
          label: "",
          start: "",
          end: "",
        latestDate,
        daysElapsed: 0,
        totalDays: 0,
        fractionElapsed: 0,
      };
      }
      const latest = new Date(`${latestDate}T00:00:00Z`);
      const daysElapsed = Math.max(1, Math.floor((latest - bounds.start) / 86400000) + 1);
      const totalDays = Math.max(1, Math.floor((bounds.end - bounds.start) / 86400000));
      return {
        label: bounds.label,
        start: bounds.start.toISOString().slice(0, 10),
        end: new Date(bounds.end.getTime() - 86400000).toISOString().slice(0, 10),
        latestDate,
        daysElapsed,
        totalDays,
        fractionElapsed: Math.min(1, daysElapsed / totalDays),
      };
    }

    function getFinancialYearContext(transactions = [], fyStartMonth = 7) {
      const dates = (Array.isArray(transactions) ? transactions : [])
        .map((tx) => String(tx?.date || "").trim())
        .filter(Boolean)
        .sort();
      if (!dates.length) {
        return {
          label: "",
          start: "",
          end: "",
          latestDate: "",
          daysElapsed: 0,
          totalDays: 0,
          fractionElapsed: 0,
        };
      }
      const latestDate = dates[dates.length - 1];
      return buildFinancialYearContextFromDate(latestDate, fyStartMonth, latestDate);
    }

    function getRowsInDateRange(transactions = [], start = "", end = "") {
      const minDate = String(start || "").trim();
      const maxDate = String(end || "").trim();
      return (Array.isArray(transactions) ? transactions : []).filter((tx) => {
        const date = String(tx?.date || "").trim();
        if (!date) return false;
        if (minDate && date < minDate) return false;
        if (maxDate && date > maxDate) return false;
        return true;
      });
    }

    function buildRollingTwelveMonthContext(latestDate = "") {
      const latest = String(latestDate || "").trim();
      if (!latest) {
        return {
          label: "",
          start: "",
          end: "",
          latestDate: "",
          daysElapsed: 0,
          totalDays: 0,
          fractionElapsed: 0,
          scopeMode: "",
          sourceReason: "",
        };
      }
      const latestDateValue = new Date(`${latest}T00:00:00Z`);
      const startDateValue = new Date(latestDateValue.getTime() - 86400000 * (ROLLING_TWELVE_MONTH_DAYS - 1));
      return {
        label: "Rolling 12M",
        start: startDateValue.toISOString().slice(0, 10),
        end: latest,
        latestDate: latest,
        daysElapsed: ROLLING_TWELVE_MONTH_DAYS,
        totalDays: ROLLING_TWELVE_MONTH_DAYS,
        fractionElapsed: 1,
        scopeMode: "rolling_12m",
        sourceReason: "There is too little data for this financial year. Suggestions use the last 12 months instead.",
      };
    }

    function selectBudgetSuggestionScope(transactions = [], fyStartMonth = 7) {
      const rows = Array.isArray(transactions) ? transactions : [];
      const activeFy = getFinancialYearContext(rows, fyStartMonth);
      const activeRows = getRowsInDateRange(rows, activeFy.start, activeFy.latestDate);
      const activeIsMature =
        activeFy.daysElapsed >= MIN_ACTIVE_BUDGET_SCOPE_DAYS ||
        activeFy.fractionElapsed >= MIN_ACTIVE_BUDGET_SCOPE_FRACTION ||
        activeRows.length >= MIN_ACTIVE_BUDGET_SCOPE_TX_COUNT;

      if (!rows.length || activeIsMature) {
        return {
          financialYear: {
            ...activeFy,
            scopeMode: "active_fy",
            sourceReason: "",
          },
          scopeRows: activeRows,
        };
      }

      if (activeFy.start) {
        const currentFyStart = new Date(`${activeFy.start}T00:00:00Z`);
        const previousLatestDate = new Date(currentFyStart.getTime() - 86400000).toISOString().slice(0, 10);
        const previousFy = buildFinancialYearContextFromDate(previousLatestDate, fyStartMonth, previousLatestDate);
        const previousRows = getRowsInDateRange(rows, previousFy.start, previousFy.latestDate);
        if (previousRows.length >= Math.max(6, activeRows.length)) {
          const dayLabel = activeFy.daysElapsed === 1 ? "day" : "days";
          return {
            financialYear: {
              ...previousFy,
              scopeMode: "previous_full_fy",
              sourceReason: `${activeFy.label || "This financial year"} has only ${activeFy.daysElapsed} ${dayLabel} of data. Suggestions use the previous full financial year.`,
            },
            scopeRows: previousRows,
          };
        }
      }

      const rolling = buildRollingTwelveMonthContext(activeFy.latestDate);
      const rollingRows = getRowsInDateRange(rows, rolling.start, rolling.latestDate);
      return {
        financialYear: rollingRows.length
          ? rolling
          : {
              ...activeFy,
              scopeMode: "active_fy",
              sourceReason: "",
            },
        scopeRows: rollingRows.length ? rollingRows : activeRows,
      };
    }

    function sortRowsByDate(rows = []) {
      return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));
    }

    function averageAbsoluteAmount(rows = []) {
      const safeRows = Array.isArray(rows) ? rows : [];
      if (!safeRows.length) return 0;
      return safeRows.reduce((sum, tx) => sum + Math.abs(toNumber(tx?.amount, 0)), 0) / safeRows.length;
    }

    function getDistinctMonthCount(rows = []) {
      return new Set(
        (Array.isArray(rows) ? rows : [])
          .map((tx) => String(tx?.date || "").trim().slice(0, 7))
          .filter(Boolean)
      ).size;
    }

    function getMostRecentRows(rows = [], limit = 1) {
      const sorted = sortRowsByDate(rows);
      return sorted.slice(-Math.max(1, Math.round(toNumber(limit, 1))));
    }

    function buildRecentTrendMetrics(rows = [], scope = {}) {
      const latestDate = String(scope?.latestDate || "").trim();
      if (!latestDate) {
        return {
          rows: [],
          total: 0,
          annualized: 0,
          distinctMonths: 0,
          canBlend: false,
        };
      }
      const latest = new Date(`${latestDate}T00:00:00Z`);
      const rawStart = new Date(latest.getTime() - 86400000 * (RECENT_TREND_WINDOW_DAYS - 1));
      const scopeStart = String(scope?.start || "").trim();
      const scopeStartDate = scopeStart ? new Date(`${scopeStart}T00:00:00Z`) : rawStart;
      const effectiveStart = rawStart < scopeStartDate ? scopeStartDate : rawStart;
      const effectiveStartIso = effectiveStart.toISOString().slice(0, 10);
      const recentRows = getRowsInDateRange(rows, effectiveStartIso, latestDate);
      const total = recentRows.reduce((sum, tx) => sum + Math.abs(toNumber(tx?.amount, 0)), 0);
      const windowDays = Math.max(1, Math.floor((latest - effectiveStart) / 86400000) + 1);
      const distinctMonths = getDistinctMonthCount(recentRows);
      return {
        rows: recentRows,
        total,
        annualized: total * 365 / windowDays,
        distinctMonths,
        canBlend: recentRows.length >= 2 && distinctMonths >= 2,
      };
    }

    function getBudgetForecastProfile(category = "", item = "", isIncome = false) {
      const normalizedCategory = normalizeLabel(category);
      const normalizedItem = normalizeLabel(item);
      const defaultDiscount = clamp(toNumber(config.targetBudgetDiscountPct, DEFAULT_TARGET_BUDGET_DISCOUNT_PCT), 0, 50);

      if (isIncome) {
        if (normalizedItem === "salary") {
          return { id: "income_salary_fixed", strategy: "fixed_recurring", targetDiscountPct: 0 };
        }
        return { id: "income_variable", strategy: "income_variable", targetDiscountPct: 0 };
      }

      if (normalizedCategory === "housing" && ["mortgage base", "mortgage extra", "mortgage loan"].includes(normalizedItem)) {
        return { id: "housing_mortgage_recurring", strategy: "fixed_recurring", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "housing" && normalizedItem === "mortgage additional lump") {
        return { id: "housing_mortgage_lump", strategy: "planned_lumpy", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "housing" && normalizedItem === "internet") {
        return { id: "housing_internet_fixed", strategy: "fixed_recurring", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "housing" && ["electricity", "water", "rates"].includes(normalizedItem)) {
        return { id: "housing_utilities_periodic", strategy: "periodic_bill", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "insurance") {
        if (["health insurance", "home insurance"].includes(normalizedItem)) {
          return { id: "insurance_fixed", strategy: "fixed_recurring", targetDiscountPct: 0 };
        }
        return { id: "insurance_periodic", strategy: "periodic_bill", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "work" && normalizedItem === "union fees") {
        return { id: "work_union_fixed", strategy: "fixed_recurring", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "lifestyle" && normalizedItem === "subscriptions") {
        return { id: "lifestyle_subscriptions_fixed", strategy: "fixed_recurring", targetDiscountPct: Math.min(5, defaultDiscount) };
      }
      if (normalizedCategory === "groceries") {
        return { id: "groceries_trend", strategy: "essential_variable", targetDiscountPct: Math.min(5, defaultDiscount), recentTrendWeight: 0.55 };
      }
      if (normalizedCategory === "transport" && normalizedItem === "fuel") {
        return { id: "transport_fuel_trend", strategy: "essential_variable", targetDiscountPct: Math.min(5, defaultDiscount), recentTrendWeight: 0.55 };
      }
      if (normalizedCategory === "health" && normalizedItem === "pharmacy") {
        return { id: "health_pharmacy_trend", strategy: "essential_variable", targetDiscountPct: Math.min(2, defaultDiscount), recentTrendWeight: 0.5 };
      }
      if (normalizedCategory === "health" && normalizedItem === "medical") {
        return { id: "health_medical_trend", strategy: "essential_variable", targetDiscountPct: 0, recentTrendWeight: 0.45 };
      }
      if (normalizedCategory === "transport" && normalizedItem === "vehicle costs") {
        return { id: "transport_vehicle_periodic", strategy: "periodic_bill", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "dining takeaway") {
        return { id: "dining_discretionary_trend", strategy: "discretionary_variable", targetDiscountPct: Math.max(10, defaultDiscount), recentTrendWeight: 0.65 };
      }
      if (normalizedCategory === "lifestyle" && ["retail", "other"].includes(normalizedItem)) {
        return { id: "lifestyle_discretionary_trend", strategy: "discretionary_variable", targetDiscountPct: Math.max(10, defaultDiscount), recentTrendWeight: 0.65 };
      }
      if (normalizedCategory === "pets") {
        return { id: "pets_lumpy", strategy: "planned_lumpy", targetDiscountPct: 0 };
      }
      if (normalizedCategory === "uncategorized") {
        return { id: "uncategorized_hold", strategy: "hold_actual", targetDiscountPct: 0 };
      }
      return { id: "default_general", strategy: "default", targetDiscountPct: defaultDiscount };
    }

    function buildBudgetSuggestions(transactions = [], options = {}) {
      const rows = (Array.isArray(transactions) ? transactions : []).filter((tx) => {
        const policy = getTransactionFinancialPolicy(tx);
        if (toNumber(tx?.amount, 0) > 0) return policy.includeInIncome;
        if (toNumber(tx?.amount, 0) < 0) return policy.includeInSpending;
        return false;
      });
      const fyStartMonth = clamp(Math.round(toNumber(options.fyStartMonth, 7)), 1, 12);
      const scope = selectBudgetSuggestionScope(rows, fyStartMonth);
      const fy = scope.financialYear;
      const inScope = scope.scopeRows;
      if (!rows.length || !inScope.length || fy.fractionElapsed <= 0) {
        return {
          financialYear: fy,
          suggestions: [],
        };
      }
      const grouped = new Map();
      inScope.forEach((tx) => {
        const category = String(tx?.category || "Uncategorized").trim() || "Uncategorized";
        const item = String(tx?.subcategory || "Other").trim() || "Other";
        const key = `${category}||${item}`;
        if (!grouped.has(key)) {
          grouped.set(key, { category, item, rows: [] });
        }
        grouped.get(key).rows.push(tx);
      });

      const suggestions = [...grouped.values()]
        .map((entry) => {
          const expenseRows = entry.rows.filter((tx) => toNumber(tx?.amount, 0) < 0);
          const incomeRows = entry.rows.filter((tx) => toNumber(tx?.amount, 0) > 0);
          const magnitudeRows = sortRowsByDate(expenseRows.length ? expenseRows : incomeRows);
          const totalActual = magnitudeRows.reduce((sum, tx) => sum + Math.abs(toNumber(tx?.amount, 0)), 0);
          if (totalActual <= 0) return null;

          const isIncome = incomeRows.length > 0 && !expenseRows.length;
          const profile = getBudgetForecastProfile(entry.category, entry.item, isIncome);
          const cadence = inferCadence(magnitudeRows.map((tx) => tx?.date));
          const periodsPerYear = BUDGET_FIXED_CADENCE_MAP[cadence.name] || 0;
          const usingFullYearActual = fy.scopeMode === "previous_full_fy" || fy.scopeMode === "rolling_12m";
          const annualEquivalent = usingFullYearActual
            ? totalActual
            : totalActual / Math.max(fy.fractionElapsed, 1 / 365);
          const recentTrend = buildRecentTrendMetrics(magnitudeRows, fy);
          let realityBudget = annualEquivalent;
          let basis = usingFullYearActual
            ? fy.scopeMode === "rolling_12m"
              ? "rolling-12m-actual"
              : "full-year-actual"
            : "fy-run-rate";
          let cadenceLabel = cadence.isRecurring ? cadence.name : basis === "fy-run-rate" ? "run-rate" : "observed";

          switch (profile.strategy) {
            case "fixed_recurring": {
              if (cadence.isRecurring && periodsPerYear > 0 && magnitudeRows.length >= 2) {
                const sample = getMostRecentRows(magnitudeRows, FIXED_RECURRING_SAMPLE_SIZE);
                realityBudget = averageAbsoluteAmount(sample) * periodsPerYear;
                basis = "fixed-recurring";
                cadenceLabel = cadence.name;
              }
              break;
            }
            case "periodic_bill": {
              if (cadence.isRecurring && periodsPerYear > 0 && magnitudeRows.length >= 2) {
                const sample = getMostRecentRows(magnitudeRows, PERIODIC_BILL_SAMPLE_SIZE);
                realityBudget = averageAbsoluteAmount(sample) * periodsPerYear;
                basis = "bill-cycle";
                cadenceLabel = cadence.name;
              }
              break;
            }
            case "essential_variable":
            case "discretionary_variable":
            case "income_variable": {
              if (recentTrend.canBlend) {
                const weight = clamp(toNumber(profile.recentTrendWeight, 0.55), 0.2, 0.8);
                realityBudget = annualEquivalent * (1 - weight) + recentTrend.annualized * weight;
                basis = "recent-trend-blend";
                cadenceLabel = "recent-trend";
              }
              break;
            }
            case "planned_lumpy":
              realityBudget = totalActual;
              basis = "planned-lumpy";
              cadenceLabel = "observed";
              break;
            case "hold_actual":
              realityBudget = totalActual;
              basis = "hold-actual";
              cadenceLabel = "observed";
              break;
            default: {
              const clusters = clusterAmounts(magnitudeRows.map((tx) => tx?.amount));
              const fixedLike = cadence.isRecurring && clusters.length > 0 && clusters[0].count >= 2;
              if (fixedLike && periodsPerYear > 0) {
                const sample = getMostRecentRows(magnitudeRows, FIXED_RECURRING_SAMPLE_SIZE);
                realityBudget = averageAbsoluteAmount(sample) * periodsPerYear;
                basis = "fixed-recurring";
                cadenceLabel = cadence.name;
              }
              break;
            }
          }

          const discountPct = isIncome ? 0 : clamp(toNumber(profile.targetDiscountPct, 0), 0, 50);
          const targetBudget = realityBudget * (1 - discountPct / 100);
          return {
            category: entry.category,
            item: entry.item,
            actual_to_date: Number(totalActual.toFixed(2)),
            cadence: cadenceLabel,
            basis,
            reality_budget: Number(Math.max(0, realityBudget).toFixed(2)),
            target_budget: Number(targetBudget.toFixed(2)),
            transaction_count: magnitudeRows.length,
            scope_mode: fy.scopeMode || "active_fy",
            scope_reason: fy.sourceReason || "",
            forecast_policy: profile.id,
            target_discount_pct: discountPct,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.reality_budget - a.reality_budget || a.category.localeCompare(b.category) || a.item.localeCompare(b.item));

      return {
        financialYear: fy,
        suggestions,
      };
    }

    return {
      classifyTransactions,
      findInternalTransferPairs,
      buildBeforeAfterReport,
      buildBudgetSuggestions,
      selectBudgetSuggestionScope,
      buildPayeeProfiles,
      getFinancialYearContext,
      getTransactionFinancialPolicy,
      canonicalizeDescription,
      deriveCanonicalPayeeKey,
      constants: {
        EPSILON,
        INTERNAL_TRANSFER_DAY_WINDOW,
        LOAN_COUNTERPART_DAY_WINDOW,
      },
    };
  }
);
