import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as http from 'http';
import axios from 'axios';

export type OAuth2GrantType =
  | 'authorization_code'
  | 'authorization_code_pkce'
  | 'client_credentials'
  | 'password'
  | 'refresh_token';

export interface OAuth2Config {
  grantType: OAuth2GrantType;
  authorizationUrl?: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  redirectUri?: string;
  username?: string;
  password?: string;
  refreshToken?: string;
  state?: string;
  // PKCE
  codeVerifier?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface OAuth2Token {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
  expiresAt?: number;
  raw: Record<string, unknown>;
}

export class OAuth2Service {
  private callbackServer?: http.Server;
  private pendingAuth?: {
    resolve: (code: string) => void;
    reject: (error: Error) => void;
    state: string;
  };
  private tokens: Map<string, OAuth2Token> = new Map();
  private secretStorage?: vscode.SecretStorage;

  constructor(secretStorage?: vscode.SecretStorage) {
    this.secretStorage = secretStorage;
  }

  /**
   * Initialize with VS Code secret storage
   */
  setSecretStorage(storage: vscode.SecretStorage): void {
    this.secretStorage = storage;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  generatePKCE(): { codeVerifier: string; codeChallenge: string; codeChallengeMethod: 'S256' } {
    // Generate a random code verifier (43-128 characters)
    const codeVerifier = this.generateRandomString(64);

    // Create code challenge using SHA-256
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    const codeChallenge = this.base64URLEncode(hash);

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256',
    };
  }

  /**
   * Generate random string for state/nonce
   */
  generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomBytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i]! % chars.length];
    }
    return result;
  }

  /**
   * Base64 URL encode (RFC 4648)
   */
  private base64URLEncode(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Build authorization URL for browser redirect
   */
  buildAuthorizationUrl(config: OAuth2Config): string {
    if (!config.authorizationUrl) {
      throw new Error('Authorization URL is required');
    }

    const url = new URL(config.authorizationUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', config.clientId);

    if (config.redirectUri) {
      url.searchParams.set('redirect_uri', config.redirectUri);
    }

    if (config.scope) {
      url.searchParams.set('scope', config.scope);
    }

    if (config.state) {
      url.searchParams.set('state', config.state);
    }

    // Add PKCE parameters
    if (config.grantType === 'authorization_code_pkce' && config.codeChallenge) {
      url.searchParams.set('code_challenge', config.codeChallenge);
      url.searchParams.set('code_challenge_method', config.codeChallengeMethod || 'S256');
    }

    return url.toString();
  }

  /**
   * Start authorization code flow
   * Opens browser and waits for callback
   */
  async startAuthorizationCodeFlow(config: OAuth2Config): Promise<OAuth2Token> {
    // Generate PKCE if using PKCE flow
    let pkce: { codeVerifier: string; codeChallenge: string; codeChallengeMethod: 'S256' } | undefined;
    if (config.grantType === 'authorization_code_pkce') {
      pkce = this.generatePKCE();
      config.codeVerifier = pkce.codeVerifier;
      config.codeChallenge = pkce.codeChallenge;
      config.codeChallengeMethod = pkce.codeChallengeMethod;
    }

    // Generate state for CSRF protection
    const state = this.generateRandomString();
    config.state = state;

    // Set default redirect URI if not provided
    if (!config.redirectUri) {
      config.redirectUri = 'http://localhost:9876/callback';
    }

    // Start callback server
    const code = await this.startCallbackServer(config.redirectUri, state);

    // Exchange code for token
    return this.exchangeCodeForToken(code, config);
  }

  /**
   * Start local callback server to receive authorization code
   */
  private startCallbackServer(redirectUri: string, state: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(redirectUri);
      const port = parseInt(url.port) || 9876;

      this.pendingAuth = { resolve, reject, state };

      this.callbackServer = http.createServer((req, res) => {
        const reqUrl = new URL(req.url || '/', `http://localhost:${port}`);

        if (reqUrl.pathname === '/callback' || reqUrl.pathname === url.pathname) {
          const code = reqUrl.searchParams.get('code');
          const returnedState = reqUrl.searchParams.get('state');
          const error = reqUrl.searchParams.get('error');
          const errorDescription = reqUrl.searchParams.get('error_description');

          // Send response to browser
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Authorization Complete</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1e1e1e; color: #d4d4d4; }
                  .container { text-align: center; padding: 40px; }
                  .success { color: #4caf50; }
                  .error { color: #f44336; }
                </style>
              </head>
              <body>
                <div class="container">
                  ${
                    error
                      ? `<h1 class="error">Authorization Failed</h1><p>${errorDescription || error}</p>`
                      : `<h1 class="success">Authorization Successful</h1><p>You can close this window and return to VS Code.</p>`
                  }
                </div>
                <script>setTimeout(() => window.close(), 2000);</script>
              </body>
            </html>
          `);

          // Close server
          this.callbackServer?.close();
          this.callbackServer = undefined;

          if (error) {
            this.pendingAuth?.reject(new Error(errorDescription || error));
          } else if (returnedState !== state) {
            this.pendingAuth?.reject(new Error('State mismatch - possible CSRF attack'));
          } else if (code) {
            this.pendingAuth?.resolve(code);
          } else {
            this.pendingAuth?.reject(new Error('No authorization code received'));
          }

          this.pendingAuth = undefined;
        }
      });

      this.callbackServer.listen(port, () => {
        // Open browser for authorization
        const authUrl = this.buildAuthorizationUrl({
          ...this.pendingAuth!,
          grantType: 'authorization_code_pkce',
          state,
        } as unknown as OAuth2Config);

        // Note: The actual authorization URL should be passed from the caller
        // This is just setting up the server
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.callbackServer) {
          this.callbackServer.close();
          this.callbackServer = undefined;
          reject(new Error('Authorization timed out'));
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code: string, config: OAuth2Config): Promise<OAuth2Token> {
    const params = new URLSearchParams();
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('client_id', config.clientId);

    if (config.redirectUri) {
      params.set('redirect_uri', config.redirectUri);
    }

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    // Add PKCE code verifier
    if (config.codeVerifier) {
      params.set('code_verifier', config.codeVerifier);
    }

    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return this.parseTokenResponse(response.data);
  }

  /**
   * Get token using client credentials flow
   */
  async getClientCredentialsToken(config: OAuth2Config): Promise<OAuth2Token> {
    const params = new URLSearchParams();
    params.set('grant_type', 'client_credentials');
    params.set('client_id', config.clientId);

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    if (config.scope) {
      params.set('scope', config.scope);
    }

    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return this.parseTokenResponse(response.data);
  }

  /**
   * Get token using resource owner password flow (deprecated but still used)
   */
  async getPasswordToken(config: OAuth2Config): Promise<OAuth2Token> {
    if (!config.username || !config.password) {
      throw new Error('Username and password are required for password grant');
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'password');
    params.set('client_id', config.clientId);
    params.set('username', config.username);
    params.set('password', config.password);

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    if (config.scope) {
      params.set('scope', config.scope);
    }

    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return this.parseTokenResponse(response.data);
  }

  /**
   * Refresh an access token
   */
  async refreshAccessToken(config: OAuth2Config): Promise<OAuth2Token> {
    if (!config.refreshToken) {
      throw new Error('Refresh token is required');
    }

    const params = new URLSearchParams();
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', config.refreshToken);
    params.set('client_id', config.clientId);

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret);
    }

    const response = await axios.post(config.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return this.parseTokenResponse(response.data);
  }

  /**
   * Parse token response from OAuth server
   */
  private parseTokenResponse(data: Record<string, unknown>): OAuth2Token {
    const token: OAuth2Token = {
      accessToken: String(data.access_token || ''),
      tokenType: String(data.token_type || 'Bearer'),
      expiresIn: data.expires_in ? Number(data.expires_in) : undefined,
      refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
      scope: data.scope ? String(data.scope) : undefined,
      raw: data,
    };

    // Calculate expiration time
    if (token.expiresIn) {
      token.expiresAt = Date.now() + token.expiresIn * 1000;
    }

    return token;
  }

  /**
   * Check if token is expired (with 60s buffer)
   */
  isTokenExpired(token: OAuth2Token): boolean {
    if (!token.expiresAt) {
      return false; // No expiration info, assume valid
    }
    return Date.now() >= token.expiresAt - 60000; // 60 second buffer
  }

  /**
   * Store token securely
   */
  async storeToken(key: string, token: OAuth2Token): Promise<void> {
    if (this.secretStorage) {
      await this.secretStorage.store(`apiforge.oauth2.${key}`, JSON.stringify(token));
    }
    this.tokens.set(key, token);
  }

  /**
   * Retrieve stored token
   */
  async getStoredToken(key: string): Promise<OAuth2Token | null> {
    // Check memory cache first
    const cached = this.tokens.get(key);
    if (cached) {
      return cached;
    }

    // Check secret storage
    if (this.secretStorage) {
      const stored = await this.secretStorage.get(`apiforge.oauth2.${key}`);
      if (stored) {
        const token = JSON.parse(stored) as OAuth2Token;
        this.tokens.set(key, token);
        return token;
      }
    }

    return null;
  }

  /**
   * Delete stored token
   */
  async deleteToken(key: string): Promise<void> {
    this.tokens.delete(key);
    if (this.secretStorage) {
      await this.secretStorage.delete(`apiforge.oauth2.${key}`);
    }
  }

  /**
   * Get a valid token, refreshing if necessary
   */
  async getValidToken(key: string, config: OAuth2Config): Promise<OAuth2Token | null> {
    const token = await this.getStoredToken(key);
    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token) && token.refreshToken) {
      try {
        config.refreshToken = token.refreshToken;
        const newToken = await this.refreshAccessToken(config);
        await this.storeToken(key, newToken);
        return newToken;
      } catch {
        // Refresh failed, token is no longer valid
        await this.deleteToken(key);
        return null;
      }
    }

    return token;
  }

  /**
   * Cancel any pending authorization
   */
  cancelAuthorization(): void {
    if (this.callbackServer) {
      this.callbackServer.close();
      this.callbackServer = undefined;
    }
    if (this.pendingAuth) {
      this.pendingAuth.reject(new Error('Authorization cancelled'));
      this.pendingAuth = undefined;
    }
  }
}

export const oauth2Service = new OAuth2Service();
