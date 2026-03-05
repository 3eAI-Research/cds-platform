import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Authenticated user information extracted from JWT token.
 *
 * MVP: populated by JwtAuthGuard stub with hardcoded values.
 * Phase 2: populated from Keycloak JWT claims.
 */
export interface AuthUser {
  userId: string;
  email?: string;
  roles: string[];
}

/**
 * Parameter decorator to extract authenticated user from request.
 *
 * Usage:
 *   @Get()
 *   async list(@CurrentUser() user: AuthUser) {
 *     return this.service.findByUser(user.userId);
 *   }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (data) {
      return user?.[data] as unknown as AuthUser;
    }

    return user;
  },
);
