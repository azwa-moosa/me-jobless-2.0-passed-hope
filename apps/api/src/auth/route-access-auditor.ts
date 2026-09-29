import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { PERMISSION_CODES } from '@bml/policy';
import { ACCESS_KEY, AccessRule } from './decorators';

/**
 * Boot-time check (M.7 "unknown route permission = build-time error"): the API refuses to start if any
 * route lacks an access rule or references a permission not in the catalogue.
 */
@Injectable()
export class RouteAccessAuditor implements OnApplicationBootstrap {
  constructor(private discovery: DiscoveryService, private scanner: MetadataScanner, private reflector: Reflector) {}

  onApplicationBootstrap() {
    const problems: string[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;
      const proto = Object.getPrototypeOf(instance);
      for (const name of this.scanner.getAllMethodNames(proto)) {
        const handler = proto[name];
        if (!Reflect.getMetadata('path', handler) && Reflect.getMetadata('method', handler) === undefined) continue;
        const rule = this.reflector.getAllAndOverride<AccessRule>(ACCESS_KEY, [handler, metatype]);
        if (!rule) problems.push(`${metatype.name}.${name}: no access rule`);
        else if ((rule.kind === 'all' || rule.kind === 'any') && rule.permissions.some((p) => !PERMISSION_CODES.has(p))) {
          problems.push(`${metatype.name}.${name}: unknown permission in ${rule.permissions.join(',')}`);
        }
      }
    }
    if (problems.length) throw new Error(`Route access audit failed:\n  ${problems.join('\n  ')}`);
  }
}
