/**
 * Session Configuration
 * Configures session timeout and management
 */

/**
 * Session timeout configuration (in seconds)
 */
export const SESSION_CONFIG = {
  // Session timeout: 8 hours
  timeout: 8 * 60 * 60,
  
  // Idle timeout: 2 hours of inactivity
  idleTimeout: 2 * 60 * 60,
  
  // Refresh token before expiry: 1 hour
  refreshBefore: 60 * 60,
  
  // Remember me duration: 30 days
  rememberMeDuration: 30 * 24 * 60 * 60,
}

/**
 * Check if session should be refreshed
 */
export function shouldRefreshSession(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const timeUntilExpiry = expiresAt - now
  
  return timeUntilExpiry < SESSION_CONFIG.refreshBefore
}

/**
 * Check if session is expired
 */
export function isSessionExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  return now >= expiresAt
}

/**
 * Calculate session expiry time
 */
export function getSessionExpiry(rememberMe: boolean = false): number {
  const now = Math.floor(Date.now() / 1000)
  const duration = rememberMe 
    ? SESSION_CONFIG.rememberMeDuration 
    : SESSION_CONFIG.timeout
  
  return now + duration
}
