export type PrivacyPolicyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string; level: 2 | 3 }
  | { type: 'bullets'; items: string[] };

export type PrivacyPolicySection = {
  id: string;
  blocks: PrivacyPolicyBlock[];
};

type PrivacyPolicyMeta = {
  title: string;
  effectiveDateLabel: string;
  effectiveDate: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
};

type PrivacyPolicyData = {
  sections: PrivacyPolicySection[];
  meta: PrivacyPolicyMeta;
};

// Shared with scripts/generate-privacy-policy-html.cjs and docs/privacy/index.html
// eslint-disable-next-line @typescript-eslint/no-require-imports
const policyData = require('../../../../legal/privacy-policy-data.cjs') as PrivacyPolicyData;

/** Бүрэн нууцлалын бодлогын текст — нийтэлсэн хуулийн хувилбартай нийцүүлнэ. */
export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] =
  policyData.sections;

export const PRIVACY_POLICY_META: PrivacyPolicyMeta = policyData.meta;
