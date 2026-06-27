/**
 * Auth helpers for MSAL flow.
 * 
 * For local development without Azure AD configured,
 * supports a "dev mode" that bypasses MSAL.
 */

const DEV_MODE = false; // Set to true for development without Azure AD

interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  tenantName: string;
}

/**
 * Trigger MSAL login flow.
 * In dev mode, creates a mock user.
 */
export async function loginWithMicrosoft(): Promise<void> {
  if (DEV_MODE) {
    // Dev mode: create mock user
    const mockUser: User = {
      id: 'dev-user-001',
      email: 'dev@example.com',
      name: 'Dev User',
      tenantId: 'parent',
      tenantName: '母公司',
    };
    const mockToken = 'dev-token-' + Date.now();
    localStorage.setItem('oa_token', mockToken);
    localStorage.setItem('oa_user', JSON.stringify(mockUser));
    window.location.href = '/';
    return;
  }

  // Production: redirect to Azure AD
  const clientId = import.meta.env.VITE_MSAL_CLIENT_ID || 'your-client-id';
  const tenantId = import.meta.env.VITE_MSAL_TENANT_ID || 'common';
  const redirectUri = window.location.origin + '/auth/callback';
  
  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
    `client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=openid%20profile%20email%20User.Read&response_mode=query`;
  
  window.location.href = authUrl;
}

/**
 * Log out - clear local storage and redirect to login.
 */
export function logout(): void {
  localStorage.removeItem('oa_token');
  localStorage.removeItem('oa_user');
  window.location.href = '/login';
}

/**
 * Get current user from local storage.
 */
export function getCurrentUser(): User | null {
  const stored = localStorage.getItem('oa_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('oa_token');
}

/**
 * Handle auth callback from Azure AD.
 * Exchange authorization code for JWT from our backend.
 */
export async function handleAuthCallback(code: string): Promise<void> {
  const { authApi } = await import('../api/client');
  const response = await authApi.login(code);
  
  localStorage.setItem('oa_token', response.data.token);
  localStorage.setItem('oa_user', JSON.stringify(response.data.user));
  window.location.href = '/';
}
