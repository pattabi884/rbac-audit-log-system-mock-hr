/*
  This guard validates the JWT token by calling rbac-service.
  Instead of duplicating JWT validation logic, we just ask
  rbac-service to validate it for us. This keeps the JWT
  secret in one place — rbac-service only.
  
  Flow:
  1. Extract Bearer token from Authorization header
  2. POST it to rbac-service /auth/validate
  3. rbac-service returns the user payload or 401
  4. Attach user to request for downstream use
*/
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);

  constructor(private httpService: HttpService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    try {
      /*
        Forward the token to rbac-service for validation.
        rbac-service checks signature + expiry + user exists + isActive.
        Returns the user payload if valid.
      */
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.RBAC_SERVICE_URL}/auth/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      // Attach validated user + token to request for use in guards and controllers
      request.user = response.data;
      request.token = token;
      return true;
    } catch (err) {
      this.logger.warn(`JWT validation failed: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}