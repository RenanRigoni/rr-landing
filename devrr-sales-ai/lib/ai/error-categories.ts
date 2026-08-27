export const ERROR_CATEGORIES = [
  'icp_classification',
  'company_size',
  'need_interpretation',
  'timing',
  'budget',
  'contact_role',
  'hallucinated_information',
  'missing_context',
  'wrong_recommendation',
  'other',
] as const

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number]
