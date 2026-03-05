import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restricts endpoint to specific roles.
 * Roles: 'customer', 'provider_owner', 'provider_dispatcher', 'admin'
 *
 * Usage: @Roles('customer', 'provider_owner')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
