import type { SessionTokenResponse } from './types';
import { AuthError, NetworkError } from './errors';

const SESSION_KEY = '__aw_session';

interface CachedSession {
  token: string;
  expiresAt: number;
  workspaceId: string;
  permissions: string[];
}

/**
 * Manages widget authentication.
 * - Public keys (ak_pub_*) are sent directly in Authorization header.
 * - Server keys exchange for short-lived JWT session tokens.
 */
export class AuthManager {
  private baseUrl: string;
  private apiKey: string;
  private session: CachedSession | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.loadCachedSession();
  }

  get isPublicKey(): boolean {
    return this.apiKey.startsWith('ak_pub_');
  }

  /**
   * Returns an Authorization header value.
   * Public keys are used directly; server keys exchange for JWT first.
   */
  async getAuthHeader(): Promise<string> {
    if (this.isPublicKey) {
      return `Bearer ${this.apiKey}`;
    }

    const session = await this.ensureSession();
    return `Bearer ${session.token}`;
  }

  get workspaceId(): string | undefined {
    return this.session?.workspaceId;
  }

  /**
   * Exchange server API key for JWT session token.
   */
  async authenticate(): Promise<SessionTokenResponse> {
    const res = await fetch(`${this.baseUrl}/api/widgets/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new AuthError(body || 'Authentication failed');
      }
      throw new NetworkError(body || 'Authentication request failed', res.status);
    }

    const data: SessionTokenResponse = await res.json();
    this.cacheSession(data);
    this.scheduleRefresh(data);
    return data;
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.session = null;
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // sessionStorage unavailable
    }
  }

  private async ensureSession(): Promise<CachedSession> {
    if (this.session && this.session.expiresAt > Date.now() + 60_000) {
      return this.session;
    }
    await this.authenticate();
    return this.session!;
  }

  private cacheSession(data: SessionTokenResponse): void {
    this.session = {
      token: data.session_token,
      expiresAt: new Date(data.expires_at).getTime(),
      workspaceId: data.workspace_id,
      permissions: data.permissions,
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } catch {
      // sessionStorage unavailable
    }
  }

  private loadCachedSession(): void {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedSession;
        if (parsed.expiresAt > Date.now() + 60_000) {
          this.session = parsed;
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      // sessionStorage unavailable
    }
  }

  private scheduleRefresh(data: SessionTokenResponse): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const expiresAt = new Date(data.expires_at).getTime();
    // Refresh 5 minutes before expiry, minimum 30 seconds
    const refreshIn = Math.max(expiresAt - Date.now() - 5 * 60_000, 30_000);
    this.refreshTimer = setTimeout(() => {
      this.authenticate().catch(() => {
        // Silent refresh failure; next request will trigger re-auth
      });
    }, refreshIn);
  }
}
