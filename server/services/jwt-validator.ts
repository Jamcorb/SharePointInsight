import jwt from "jsonwebtoken";
// @ts-ignore - jwks-client doesn't have official types
import jwksClient from "jwks-client";
import { getAzureAdConfig, type AzureAdConfig } from "../config";

interface AzureAdTokenPayload {
  iss: string; // Issuer
  aud: string; // Audience
  sub: string; // Subject
  tid: string; // Tenant ID
  upn?: string; // User Principal Name
  unique_name?: string; // Alternative UPN
  name?: string; // Display name
  email?: string; // Email
  preferred_username?: string; // Preferred username
  scp?: string; // Scopes
  roles?: string[]; // Application roles
  exp: number; // Expiry
  iat: number; // Issued at
  nbf: number; // Not before
  ver: string; // Version
}

interface ValidationOptions {
  audience?: string;
  issuer?: string | string[];
  tenantId?: string;
  requiredScopes?: string[];
}

export class AzureAdJwtValidator {
  private jwksClient: jwksClient.JwksClient;
  private config: AzureAdConfig;
  
  constructor() {
    this.config = getAzureAdConfig();
    
    // JWKS endpoint for Azure AD tokens - use tenant-specific endpoint if available
    const jwksUri = this.config.tenantId && this.config.tenantId !== 'common'
      ? `https://login.microsoftonline.com/${this.config.tenantId}/discovery/v2.0/keys`
      : 'https://login.microsoftonline.com/common/discovery/v2.0/keys';
    
    this.jwksClient = jwksClient({
      jwksUri,
      timeout: 30000,
      cache: true,
      rateLimit: true,
    });
  }

  /**
   * Get signing key for JWT verification
   */
  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      console.error('Failed to get signing key:', error);
      throw new Error('Unable to retrieve signing key for token validation');
    }
  }

  /**
   * Validate Azure AD JWT token with comprehensive security checks
   */
  async validateToken(
    token: string, 
    options: ValidationOptions = {}
  ): Promise<AzureAdTokenPayload> {
    // Merge configuration with provided options
    const validationOptions = {
      audience: this.config.audience,
      issuer: this.config.issuer,
      tenantId: this.config.tenantId,
      requiredScopes: this.config.requiredScopes,
      ...options, // Allow overrides
    };
    try {
      // Step 1: Decode header to get key ID (kid)
      console.log("🔍 Attempting to decode JWT token...");
      console.log("🔍 Token length:", token.length);
      console.log("🔍 Token parts:", token.split('.').length);
      
      const decoded = jwt.decode(token, { complete: true });
      console.log("🔍 Decoded token structure:", {
        exists: !!decoded,
        type: typeof decoded,
        hasHeader: decoded && typeof decoded !== 'string' ? !!decoded.header : false,
        hasPayload: decoded && typeof decoded !== 'string' ? !!decoded.payload : false,
        headerKeys: decoded && typeof decoded !== 'string' ? Object.keys(decoded.header || {}) : [],
        kid: decoded && typeof decoded !== 'string' ? decoded.header?.kid : undefined
      });
      
      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        console.error("❌ Token validation failed - details:", {
          decoded: !!decoded,
          isString: typeof decoded === 'string',
          hasHeader: decoded && typeof decoded !== 'string' ? !!decoded.header : false,
          hasKid: decoded && typeof decoded !== 'string' ? !!decoded.header?.kid : false,
          header: decoded && typeof decoded !== 'string' ? decoded.header : 'N/A'
        });
        throw new Error('Invalid token format or missing key ID');
      }

      // Step 2: Get public key for verification
      const signingKey = await this.getSigningKey(decoded.header.kid);

      // Step 3: Verify token signature and standard claims
      // Note: jwt.verify doesn't support multiple issuers, so we'll validate issuer manually
      const payload = jwt.verify(token, signingKey, {
        algorithms: ['RS256'], // Azure AD uses RS256
        clockTolerance: this.config.clockTolerance,
        audience: validationOptions.audience,
        // Skip issuer validation in jwt.verify since we handle it manually for multiple issuers
      }) as AzureAdTokenPayload;

      // Step 4: Validate Azure AD specific claims
      await this.validateAzureAdClaims(payload, validationOptions);

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`JWT validation failed: ${error.message}`);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not yet valid');
      }
      throw error;
    }
  }

  /**
   * Validate Azure AD specific claims and security requirements
   */
  private async validateAzureAdClaims(
    payload: AzureAdTokenPayload, 
    options: ValidationOptions
  ): Promise<void> {
    // Validate issuer (Azure AD tenant)
    if (!payload.iss) {
      throw new Error('Token missing issuer claim');
    }

    // Check if issuer is from Azure AD
    const validIssuers = [
      'https://sts.windows.net/',
      'https://login.microsoftonline.com/',
    ];
    
    const isValidIssuer = validIssuers.some(validIssuer => 
      payload.iss.startsWith(validIssuer)
    );
    
    if (!isValidIssuer) {
      throw new Error('Token issuer is not from Azure AD');
    }

    // Validate specific issuer if provided - handle both single and multiple issuers
    if (options.issuer) {
      const expectedIssuers = Array.isArray(options.issuer) ? options.issuer : [options.issuer];
      const isValidIssuer = expectedIssuers.some(expectedIssuer => 
        payload.iss === expectedIssuer || payload.iss.includes(expectedIssuer)
      );
      if (!isValidIssuer) {
        throw new Error('Token issuer does not match expected value');
      }
    }

    // Validate audience if provided
    if (options.audience && payload.aud !== options.audience) {
      throw new Error('Token audience does not match expected value');
    }

    // Validate tenant ID if provided
    if (options.tenantId && payload.tid !== options.tenantId) {
      throw new Error('Token tenant ID does not match expected value');
    }

    // Validate user identification claims
    const userIdentifier = payload.upn || payload.unique_name || payload.preferred_username;
    if (!userIdentifier) {
      throw new Error('Token missing user identification claims (upn, unique_name, or preferred_username)');
    }

    // Validate required scopes for Microsoft Graph API access
    if (options.requiredScopes && options.requiredScopes.length > 0) {
      const tokenScopes = payload.scp ? payload.scp.split(' ') : [];
      
      // Helper function to normalize scopes - extract simple names from full Graph URLs
      const normalizeScope = (scope: string): string => {
        if (scope.startsWith('https://graph.microsoft.com/')) {
          return scope.replace('https://graph.microsoft.com/', '');
        }
        return scope;
      };
      
      // Normalize both token scopes and required scopes for comparison
      const normalizedTokenScopes = tokenScopes.map(normalizeScope);
      const normalizedRequiredScopes = options.requiredScopes.map(normalizeScope);
      
      const hasRequiredScopes = normalizedRequiredScopes.every(requiredScope =>
        normalizedTokenScopes.includes(requiredScope)
      );
      
      if (!hasRequiredScopes) {
        console.error('🔍 Scope validation failed:');
        console.error('Token scopes:', tokenScopes);
        console.error('Normalized token scopes:', normalizedTokenScopes);
        console.error('Required scopes:', options.requiredScopes);
        console.error('Normalized required scopes:', normalizedRequiredScopes);
        throw new Error(`Token missing required scopes: ${options.requiredScopes.join(', ')}`);
      }
    }

    // Validate token version (should be 2.0 for modern Azure AD tokens)
    if (payload.ver && payload.ver !== '2.0' && payload.ver !== '1.0') {
      console.warn(`Unexpected token version: ${payload.ver}`);
    }

    // Ensure tenant ID is present for multi-tenant applications
    if (!payload.tid) {
      throw new Error('Token missing tenant ID claim');
    }
  }

  /**
   * Extract user information from validated token
   */
  extractUserInfo(payload: AzureAdTokenPayload) {
    const upn = payload.upn || payload.unique_name || payload.preferred_username;
    const email = payload.email || upn;
    const name = payload.name || upn;

    if (!upn) {
      throw new Error('Unable to extract user principal name from token');
    }

    return {
      upn,
      email,
      name,
      tenantId: payload.tid,
      subject: payload.sub,
      scopes: payload.scp ? payload.scp.split(' ') : [],
      roles: payload.roles || [],
    };
  }

  /**
   * Create tenant-specific validator for better performance and security
   */
  createTenantValidator(tenantId: string, audience?: string) {
    return {
      validateToken: (token: string) => this.validateToken(token, {
        tenantId,
        audience,
        issuer: tenantId,
        requiredScopes: ['User.Read'], // Minimum scope for user identification
      }),
    };
  }
}

// Singleton instance for application use
export const azureAdValidator = new AzureAdJwtValidator();

// Validation error types for better error handling
export class TokenValidationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InsufficientScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientScopeError';
  }
}