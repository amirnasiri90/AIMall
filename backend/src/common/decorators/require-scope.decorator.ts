import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SCOPE_KEY = 'requireScope';

/**
 * When using API Key auth, the key must have this scope (or '*').
 * Ignored when using JWT auth.
 */
export const RequireScope = (scope: string) => SetMetadata(REQUIRE_SCOPE_KEY, scope);
