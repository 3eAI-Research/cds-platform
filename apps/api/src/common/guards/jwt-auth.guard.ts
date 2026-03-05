import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * JWT authentication guard.
 *
 * AUTH_ENABLED=false (default, MVP): Always allows access, injects stub user.
 * AUTH_ENABLED=true (Phase 2): Validates Keycloak JWT token, extracts user info.
 *
 * Respects @Public() decorator — public endpoints skip auth entirely.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly authEnabled: boolean;

  /** Stub users for development/testing (hardcoded until Keycloak) */
  private readonly STUB_CUSTOMER: AuthUser = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'customer@cds-platform.de',
    roles: ['customer'],
  };

  private readonly STUB_PROVIDER: AuthUser = {
    userId: '00000000-0000-0000-0000-000000000002',
    email: 'provider@cds-platform.de',
    roles: ['provider_owner'],
  };

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.authEnabled = this.configService.get<string>('AUTH_ENABLED') === 'true';
    if (!this.authEnabled) {
      this.logger.warn('Auth disabled (AUTH_ENABLED != true) — using stub users');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    if (!this.authEnabled) {
      // MVP stub: determine user from X-User-Role header or default to customer
      const roleHeader = request.headers['x-user-role'] as string | undefined;
      request.user =
        roleHeader === 'provider' ? this.STUB_PROVIDER : this.STUB_CUSTOMER;
      return true;
    }

    // Phase 2: Keycloak JWT validation
    // const token = request.headers.authorization?.replace('Bearer ', '');
    // if (!token) throw new UnauthorizedException('Missing JWT token');
    // const decoded = this.verifyKeycloakToken(token);
    // request.user = { userId: decoded.sub, email: decoded.email, roles: decoded.realm_access.roles };

    this.logger.warn('AUTH_ENABLED=true but Keycloak validation not implemented yet');
    return false;
  }
}
