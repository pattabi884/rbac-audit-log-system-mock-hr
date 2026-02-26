import { Injectable } from '@nestjs/common';
//import { PermissionContext, PermissionDecision } from './permission-context.interface';
import { PERMISSION_RULES, RuleCondition, AttributeRule } from './attribute-rules';
import { PermissionDecision, PermissionContext } from './permission-context.interface';

@Injectable()
export class ContextEvaluatorService {
  
  /**
   * Evaluate if permission is granted based on context
   */
  evaluatePermission(
    permission: string,
    context: PermissionContext,
  ): PermissionDecision {
    // Get rules for this permission
    const rules = PERMISSION_RULES[permission] || [];
    
    if (rules.length === 0) {
      // No special rules, just grant if they have the permission
      return {
        granted: true,
        reason: 'No attribute rules defined',
        evaluatedRules: [],
      };
    }
    
    const evaluatedRules: string[] = [];
    
    // Evaluate each rule
    for (const rule of rules) {
      const result = this.evaluateRule(rule, context);
      evaluatedRules.push(`${rule.condition}: ${result.passed ? 'PASS' : 'FAIL'}`);
      
      if (!result.passed) {
        return {
          granted: false,
          reason: rule.errorMessage,
          evaluatedRules,
        };
      }
    }
    
    // All rules passed
    return {
      granted: true,
      reason: 'All attribute rules satisfied',
      evaluatedRules,
    };
  }
  
  /**
   * Evaluate a single rule
   */
  private evaluateRule(
    rule: AttributeRule,
    context: PermissionContext,
  ): { passed: boolean; details?: string } {
    switch (rule.condition) {
      case RuleCondition.SAME_DEPARTMENT:
        return this.checkSameDepartment(context);
        
      case RuleCondition.BUSINESS_HOURS:
        if (!rule.params) {
          return { passed: false, details: 'Missing params for BUSINESS_HOURS rule' };
        }
        return this.checkBusinessHours(context, rule.params as { start: number; end: number });
        
      case RuleCondition.MFA_REQUIRED:
        return this.checkMFA(context);
        
      case RuleCondition.TRUSTED_IP:
        if (!rule.params) {
          return { passed: false, details: 'Missing params for TRUSTED_IP rule' };
        }
        return this.checkTrustedIP(context, rule.params as { allowedRanges: string[] });
        
      case RuleCondition.RESOURCE_OWNER:
        return this.checkResourceOwner(context);
        
      case RuleCondition.MAX_SESSION_AGE:
        if (!rule.params) {
          return { passed: false, details: 'Missing params for MAX_SESSION_AGE rule' };
        }
        return this.checkSessionAge(context, rule.params as { maxMinutes: number });
        
      case RuleCondition.WEEKDAY_ONLY:
        return this.checkWeekday(context);
        
      default:
        return { passed: false, details: 'Unknown rule condition' };
    }
  }
  
  // ========== Rule Implementations ==========
  
  private checkSameDepartment(context: PermissionContext): { passed: boolean } {
    if (!context.userDepartment || !context.resourceDepartment) {
      return { passed: false };
    }
    return { 
      passed: context.userDepartment === context.resourceDepartment 
    };
  }
  
  private checkBusinessHours(
    context: PermissionContext,
    params: { start: number; end: number },
  ): { passed: boolean } {
    const hour = context.timestamp.getHours();
    const { start, end } = params;
    return { passed: hour >= start && hour < end };
  }
  
  private checkMFA(context: PermissionContext): { passed: boolean } {
    return { passed: context.hasMFA === true };
  }
  
  private checkTrustedIP(
    context: PermissionContext,
    params: { allowedRanges: string[] },
  ): { passed: boolean } {
    // For simplicity, just check if IP starts with allowed prefix
    // In production, use 'ip-range-check' library
    const { allowedRanges } = params;
    const ipPrefix = context.ipAddress.split('.').slice(0, 3).join('.');
    
    const isAllowed = allowedRanges.some(range => {
      const rangePrefix = range.split('/')[0].split('.').slice(0, 3).join('.');
      return ipPrefix === rangePrefix;
    });
    
    return { passed: isAllowed };
  }
  
  private checkResourceOwner(context: PermissionContext): { passed: boolean } {
    if (!context.resourceOwnerId) {
      return { passed: false };
    }
    return { passed: context.userId === context.resourceOwnerId };
  }
  
  private checkSessionAge(
    context: PermissionContext,
    params: { maxMinutes: number },
  ): { passed: boolean } {
    const { maxMinutes } = params;
    return { passed: context.sessionAge <= maxMinutes };
  }
  
  private checkWeekday(context: PermissionContext): { passed: boolean } {
    const dayOfWeek = context.timestamp.getDay();
    // 0 = Sunday, 6 = Saturday
    return { passed: dayOfWeek >= 1 && dayOfWeek <= 5 };
  }
}