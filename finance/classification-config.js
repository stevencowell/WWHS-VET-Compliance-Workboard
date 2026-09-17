"use strict";

// Public defaults contain generic banking language only. Personal rules belong in the user's vault.
(function (root, factory) {
  if (typeof module === "object" && module.exports) { module.exports = factory(); return; }
  root.FinanceStudioClassificationConfig = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  return Object.freeze({
    payeeAliases: [],
    payeeCategoryRules: [],
    knownIncomeRules: [],
    sinkingTransferRules: [],
    transferKeywords: ["tfr", "transfer", "osko", "payment to", "payment from", "online to", "online from", "mob to", "mob from"],
    incomeKeywords: ["payroll", "salary", "wages", "reimbursement"],
    loanKeywords: ["loan", "mortgage", "homeloan", "home loan"],
    targetBudgetDiscountPct: 5,
  });
});
