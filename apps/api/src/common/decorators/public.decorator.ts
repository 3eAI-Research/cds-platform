import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as public — skips JWT auth guard.
 * Used for: estate-types, furniture-types, post-codes, auth endpoints.
 *
 * Usage: @Public() on controller method
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
