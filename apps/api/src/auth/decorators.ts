import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { SecurityContext } from '@bml/policy';

export const ACCESS_KEY = 'bml:access';
export type AccessRule =
  | { kind: 'public' }
  | { kind: 'authenticated' }
  | { kind: 'all'; permissions: string[] }
  | { kind: 'any'; permissions: string[] };

/** No authentication (health, dev persona list/login). */
export const Public = () => SetMetadata(ACCESS_KEY, { kind: 'public' } satisfies AccessRule);
/** Any signed-in user, no permission (e.g. /me – so users without roles see a clear "no access" state). */
export const Authenticated = () => SetMetadata(ACCESS_KEY, { kind: 'authenticated' } satisfies AccessRule);
/** Requires ALL listed permissions. Record/scope checks still happen in the handler. */
export const Requires = (...permissions: string[]) => SetMetadata(ACCESS_KEY, { kind: 'all', permissions } satisfies AccessRule);
/** Requires ANY of the listed permissions. */
export const RequiresAny = (...permissions: string[]) => SetMetadata(ACCESS_KEY, { kind: 'any', permissions } satisfies AccessRule);

export const Ctx = createParamDecorator((_: unknown, host: ExecutionContext): SecurityContext => host.switchToHttp().getRequest().ctx);
