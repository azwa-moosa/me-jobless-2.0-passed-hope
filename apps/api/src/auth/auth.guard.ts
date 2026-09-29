import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, PolicyDenied } from '@bml/policy';
import { ACCESS_KEY, AccessRule } from './decorators';
import { TokenService } from './token.service';
import { SecurityContextService } from './security-context.service';
import { requestStore } from '../infra/request-context';

/**
 * Global guard: deny by default. Every route must declare @Public, @Authenticated, @Requires or
 * @RequiresAny (checked again at boot by RouteAccessAuditor). Record/scope checks happen in handlers.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private tokens: TokenService, private contexts: SecurityContextService) {}

  async canActivate(host: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<AccessRule>(ACCESS_KEY, [host.getHandler(), host.getClass()]);
    if (!rule) throw new PolicyDenied('route', 'route has no declared access rule');
    if (rule.kind === 'public') return true;

    const req = host.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const identity = await this.tokens.verify(header.slice(7));
    const user = await this.contexts.resolveUser(identity);
    const ctx = await this.contexts.build(user);
    req.ctx = ctx;
    const store = requestStore.getStore();
    if (store) store.ctx = ctx;

    if (rule.kind === 'authenticated') return true;
    const ok = rule.kind === 'all' ? rule.permissions.every((p) => can(ctx, p)) : rule.permissions.some((p) => can(ctx, p));
    if (!ok) throw new PolicyDenied(rule.permissions.join(rule.kind === 'all' ? '+' : '|'), 'missing permission');
    return true;
  }
}
