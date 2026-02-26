// src/modules/auth/guards/permissions.guard.ts
import { 
  Injectable, 
  CanActivate, 
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from 'src/modules/rbac/audit/audit.service';
import { ContextEvaluatorService } from 'src/modules/rbac/context/context-evaluator.service';
import { PermissionContext } from 'src/modules/rbac/context/permission-context.interface';
import { UserRolesService } from 'src/modules/rbac/user-roles/user-roles.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';


@Injectable()
export class PermissionsGuard implements CanActivate {
 
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private userRolesService: UserRolesService,
    private contextEvaluator: ContextEvaluatorService,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log('Route is public — skipping permission check');
      return true;
    }

   
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      this.logger.log('No permissions required for this route — allowing');
      return true;
    }

    this.logger.log(`Required permissions: ${requiredPermissions.join(', ')}`);

    
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user on request — JWT guard may have failed');
      return false;
    }

    this.logger.log(`Checking permissions for user: ${user.email} (${user.userId})`);

    // Build the full context object for attribute-based checks
    const permissionContext = this.buildContext(request, user);

    
    for (const permission of requiredPermissions) {
      this.logger.log(`Checking basic permission: ${permission}`);

      const hasBasicPermission = await this.userRolesService.hasPermission(
        user.userId,
        permission,
      );

      if (!hasBasicPermission) {
        this.logger.warn(
          `DENIED — User ${user.email} does not have permission: ${permission}`,
        );

        await this.auditService.logPermissionCheck({
          userId: user.userId,
          permission,
          granted: false,
          reason: 'Permission not assigned to user',
          context: permissionContext,
        });

        throw new ForbiddenException(
          `Missing required permission: ${permission}`,
        );
      }

      this.logger.log(`Basic permission ${permission} — FOUND, checking context rules...`);

     
      const decision = this.contextEvaluator.evaluatePermission(
        permission,
        permissionContext,
      );

      this.logger.log(
        `Context evaluation for ${permission}: ${decision.granted ? 'GRANTED' : 'DENIED'} — ${decision.reason}`,
      );

      await this.auditService.logPermissionCheck({
        userId: user.userId,
        permission,
        granted: decision.granted,
        reason: decision.reason,
        evaluatedRules: decision.evaluatedRules,
        context: permissionContext,
      });

      if (!decision.granted) {
        this.logger.warn(
          `DENIED by context rule — ${decision.reason}`,
        );
        throw new ForbiddenException(`Permission denied: ${decision.reason}`);
      }

      this.logger.log(`Permission ${permission} — GRANTED for ${user.email}`);
    }

    return true;
  }

  private buildContext(request: any, user: any): PermissionContext {
      const resourceId = request.params?.id || request.body?.resourceId;
  const resourceType = this.extractResourceType(request.route?.path);

    this.logger.debug(`Building context — resource: ${resourceType}, id: ${resourceId}`);

    return {
      userId: user.userId,
      userEmail: user.email,
      userDepartment: user.department,
      userRole: user.role,
      resourceId,
      resourceType,
      resourceDepartment: request.body?.department,
      resourceOwnerId: request.body?.ownerId,
      ipAddress: this.getClientIP(request),
      userAgent: request.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
      hasMFA: user.mfaVerified || false,
      sessionAge: this.calculateSessionAge(user.loginTime),
      deviceTrusted: this.isDeviceTrusted(request),
    };
  }

  private extractResourceType(path: string): string {
    if (!path) return 'unknown';
    const match = path.match(/\/api\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  private getClientIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private calculateSessionAge(loginTime: Date): number {
    if (!loginTime) return 9999;
    const now = new Date();
    const diffMs = now.getTime() - new Date(loginTime).getTime();
    return Math.floor(diffMs / 1000 / 60);
  }

  private isDeviceTrusted(request: any): boolean {
    return !!request.headers['x-device-id'];
  }
}