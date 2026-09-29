import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, decodeJwt, jwtVerify, SignJWT } from 'jose';
import { ENV, Env } from '../infra/env';

export const MOCK_ISSUER = 'bml-mock-idp';
export const API_AUDIENCE = 'bml-people-er-api';

export interface VerifiedIdentity {
  issuer: 'mock' | 'entra';
  upn: string;
  displayName?: string;
  entraObjectId?: string;
}

/**
 * Token validation (PLT-001). Accepts:
 *  - Microsoft Entra ID access tokens (signature via tenant JWKS, issuer, audience, expiry) when configured;
 *  - DEV mock-IdP tokens ONLY when PLATFORM_ENV=dev and MOCK_IDP_ENABLED=true. Otherwise always 401.
 */
@Injectable()
export class TokenService {
  private readonly devKey?: Uint8Array;
  private readonly jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(@Inject(ENV) private readonly env: Env) {
    if (env.DEV_JWT_SECRET) this.devKey = new TextEncoder().encode(env.DEV_JWT_SECRET);
    if (env.ENTRA_TENANT_ID) {
      this.jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/discovery/v2.0/keys`));
    }
  }

  get mockEnabled() {
    return this.env.PLATFORM_ENV === 'dev' && this.env.MOCK_IDP_ENABLED && !!this.devKey;
  }

  async issueMockToken(upn: string, displayName: string): Promise<string> {
    if (!this.mockEnabled) throw new UnauthorizedException('Mock IdP disabled');
    return new SignJWT({ name: displayName, preferred_username: upn })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(MOCK_ISSUER).setAudience(API_AUDIENCE).setSubject(upn)
      .setIssuedAt().setExpirationTime('8h')
      .sign(this.devKey!);
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    let iss: string | undefined;
    try { iss = decodeJwt(token).iss; } catch { throw new UnauthorizedException('Malformed token'); }

    if (iss === MOCK_ISSUER) {
      if (!this.mockEnabled) throw new UnauthorizedException('Mock tokens are not accepted in this environment');
      try {
        const { payload } = await jwtVerify(token, this.devKey!, { issuer: MOCK_ISSUER, audience: API_AUDIENCE });
        return { issuer: 'mock', upn: String(payload.sub), displayName: payload.name as string | undefined };
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    if (this.jwks && this.env.ENTRA_TENANT_ID) {
      try {
        const { payload } = await jwtVerify(token, this.jwks, {
          issuer: `https://login.microsoftonline.com/${this.env.ENTRA_TENANT_ID}/v2.0`,
          audience: this.env.ENTRA_API_AUDIENCE,
        });
        const upn = (payload.preferred_username ?? payload.upn ?? payload.email) as string | undefined;
        if (!upn || !payload.oid) throw new Error('missing claims');
        return { issuer: 'entra', upn, displayName: payload.name as string | undefined, entraObjectId: String(payload.oid) };
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
    throw new UnauthorizedException('Unrecognised token issuer');
  }
}
