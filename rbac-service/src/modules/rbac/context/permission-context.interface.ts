export interface PermissionContext {
  // User attributes
  userId: string;
  userEmail: string;
  userDepartment?: string;
  userRole?: string;
  
  // Resource attributes
  resourceId?: string;
  resourceType: string;  // 'user', 'order', 'invoice', etc.
  resourceDepartment?: string;
  resourceOwnerId?: string;
  
  // Environmental attributes
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  
  // Security attributes
  hasMFA: boolean;
  sessionAge: number;     // Minutes since login
  deviceTrusted: boolean;
}

export interface PermissionDecision {
  granted: boolean;
  reason: string;
  evaluatedRules: string[];
}