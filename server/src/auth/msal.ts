/**
 * Microsoft Authentication Library (MSAL) configuration for Node.js.
 * 
 * Uses Authorization Code Flow with PKCE for user authentication.
 * The server acts as a Confidential Client Application.
 */

import { ConfidentialClientApplication, Configuration, AuthorizationCodeRequest } from '@azure/msal-node';
import { getConfig } from '../config';

let _msalApp: ConfidentialClientApplication | null = null;

/**
 * Get or create the MSAL Confidential Client Application instance.
 */
export function getMsalApp(): ConfidentialClientApplication {
  if (_msalApp) return _msalApp;

  const config = getConfig();

  const msalConfig: Configuration = {
    auth: {
      clientId: config.msal.clientId,
      authority: config.msal.authority,
      clientSecret: config.msal.clientSecret,
    },
  };

  _msalApp = new ConfidentialClientApplication(msalConfig);
  return _msalApp;
}

/**
 * Exchange an authorization code for tokens.
 * Returns the token response containing accessToken and idToken.
 */
export async function acquireTokenByCode(code: string): Promise<{
  accessToken: string;
  idToken: string;
  idTokenClaims: Record<string, any>;
}> {
  const app = getMsalApp();
  const config = getConfig();

  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri: config.msal.redirectUri,
  };

  const response = await app.acquireTokenByCode(tokenRequest);
  
  if (!response || !response.idTokenClaims) {
    throw new Error('Failed to acquire token from Azure AD');
  }

  return {
    accessToken: response.accessToken || '',
    idToken: response.idToken || '',
    idTokenClaims: response.idTokenClaims as Record<string, any>,
  };
}

/**
 * Verify and decode an ID token from Azure AD.
 * Extracts key user claims.
 */
export interface UserClaims {
  oid: string;       // Object ID (unique user identifier)
  email: string;
  name: string;
  preferred_username: string;
  tid: string;       // Tenant ID
}

export function extractUserClaims(idTokenClaims: Record<string, any>): UserClaims {
  return {
    oid: idTokenClaims['oid'] || idTokenClaims['sub'] || '',
    email: idTokenClaims['email'] || idTokenClaims['preferred_username'] || '',
    name: idTokenClaims['name'] || '',
    preferred_username: idTokenClaims['preferred_username'] || '',
    tid: idTokenClaims['tid'] || '',
  };
}

export default { getMsalApp, acquireTokenByCode, extractUserClaims };
