import 'server-only';
export const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';
export const SESSION_COOKIE = 'bml_session';
export const IS_PROD = process.env.NODE_ENV === 'production' && process.env.PLATFORM_ENV !== 'dev';
