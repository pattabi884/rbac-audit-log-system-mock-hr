export enum RuleCondition {
  SAME_DEPARTMENT = 'SAME_DEPARTMENT',
  BUSINESS_HOURS = 'BUSINESS_HOURS',
  MFA_REQUIRED = 'MFA_REQUIRED',
  TRUSTED_IP = 'TRUSTED_IP',
  RESOURCE_OWNER = 'RESOURCE_OWNER',
  MAX_SESSION_AGE = 'MAX_SESSION_AGE',
  WEEKDAY_ONLY = 'WEEKDAY_ONLY',
}

export interface AttributeRule {
  condition: RuleCondition;
  params?: Record<string, any>;
  errorMessage: string;
}

// Define rules for specific permissions
export const PERMISSION_RULES: Record<string, AttributeRule[]> = {
  'users:delete': [
    {
      condition: RuleCondition.SAME_DEPARTMENT,
      errorMessage: 'Can only delete users from your department',
    },
    {
      condition: RuleCondition.BUSINESS_HOURS,
      params: { start: 9, end: 18 },
      errorMessage: 'User deletion only allowed during business hours (9 AM - 6 PM)',
    },
    {
      condition: RuleCondition.MFA_REQUIRED,
      errorMessage: 'MFA verification required for user deletion',
    },
  ],
  
  'users:update': [
    {
      condition: RuleCondition.BUSINESS_HOURS,
      params: { start: 9, end: 18 },
      errorMessage: 'User updates only allowed during business hours',
    },
  ],
  
  'invoices:approve': [
    {
      condition: RuleCondition.MFA_REQUIRED,
      errorMessage: 'MFA required for invoice approval',
    },
    {
      condition: RuleCondition.WEEKDAY_ONLY,
      errorMessage: 'Invoice approval only allowed on weekdays',
    },
    {
      condition: RuleCondition.MAX_SESSION_AGE,
      params: { maxMinutes: 30 },
      errorMessage: 'Session too old. Please re-login to approve invoices',
    },
  ],
  
  'reports:export': [
    {
      condition: RuleCondition.TRUSTED_IP,
      params: { allowedRanges: ['192.168.1.0/24', '10.0.0.0/8'] },
      errorMessage: 'Report export only allowed from company network',
    },
  ],
};