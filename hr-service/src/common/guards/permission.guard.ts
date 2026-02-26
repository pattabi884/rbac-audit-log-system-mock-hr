/*
  Checks if the authenticated user has the required permission
  by calling rbac-service. This means hr-service doesn't need
  its own permission logic — it delegates entirely to rbac-service.
  
  Usage on any controller method:
  @RequirePermission('employees:update')
  @Patch(':id')
  update(...) {}
*/
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export const RequirePermission = (permission: string) =>
  Reflect.metadata('permission', permission);

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private httpService: HttpService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.get<string>('permission', context.getHandler());

    // No permission required — allow through
    if (!permission) return true;

    const request = context.switchToHttp().getRequest();
    const { user, token } = request;

    if (!user) return false;

    try {
      /*
        Ask rbac-service: does this user have this permission?
        rbac-service checks the user's roles, their permissions,
        and runs context evaluation (business hours etc).
        Returns { granted: true/false, reason: string }
      */
      const response = await firstValueFrom(
        this.httpService.post(
          `${process.env.RBAC_SERVICE_URL}/auth/check-permission`,
          { permission },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      if (!response.data.granted) {
        this.logger.warn(`Permission denied: ${user.email} -> ${permission}`);
        throw new ForbiddenException(`Missing permission: ${permission}`);
      }

      this.logger.log(`Permission granted: ${user.email} -> ${permission}`);
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.error(`Permission check failed: ${err.message}`);
      throw new ForbiddenException(`Permission check failed`);
    }
  }
}