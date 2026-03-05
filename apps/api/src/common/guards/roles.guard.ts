import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Role-based access control guard.
 *
 * AUTH_ENABLED=false (MVP): Always allows access (stub mode).
 * AUTH_ENABLED=true (Phase 2): Checks user roles from request.user against @Roles().
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  private readonly authEnabled: boolean;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.authEnabled = this.configService.get<string>('AUTH_ENABLED') === 'true';
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles specified → allow
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!this.authEnabled) {
      return true;
    }

    // Phase 2: Check user roles from JWT
    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user || !user.roles) {
      this.logger.warn('No user or roles on request — denying');
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      this.logger.warn(
        `User ${user.userId} lacks required roles [${requiredRoles.join(', ')}], has [${user.roles.join(', ')}]`,
      );
    }

    return hasRole;
  }
}
