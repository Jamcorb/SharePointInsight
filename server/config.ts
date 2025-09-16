// Server-side configuration for Azure AD JWT validation
export interface AzureAdConfig {
  clientId: string;
  authority: string;
  tenantId?: string;
  audience?: string;
  issuer?: string | string[];
  requireHttps: boolean;
  clockTolerance: number;
  requiredScopes: string[];
}

export function getAzureAdConfig(): AzureAdConfig {
  // Get client ID from environment or use a default for development
  const clientId = process.env.AZURE_AD_CLIENT_ID || process.env.VITE_AZURE_AD_CLIENT_ID || "your-client-id";
  
  // Get authority from environment
  const authority = process.env.AZURE_AD_AUTHORITY || process.env.VITE_AZURE_AD_AUTHORITY || "https://login.microsoftonline.com/common";
  
  // Extract tenant ID from authority if available
  let tenantId: string | undefined;
  try {
    const authorityUrl = new URL(authority);
    const pathParts = authorityUrl.pathname.split('/');
    if (pathParts.length > 1 && pathParts[1] !== 'common') {
      tenantId = pathParts[1];
    }
  } catch (error) {
    console.warn('Could not parse tenant ID from authority URL:', authority);
  }

  // Override with explicit tenant ID if provided
  if (process.env.AZURE_AD_TENANT_ID) {
    tenantId = process.env.AZURE_AD_TENANT_ID;
  }

  return {
    clientId,
    authority,
    tenantId,
    audience: clientId, // For access tokens, audience is typically the client ID
    // Support both v1 and v2 Azure AD token issuers for backwards compatibility
    issuer: tenantId && tenantId !== 'common' 
      ? [`https://sts.windows.net/${tenantId}/`, `https://login.microsoftonline.com/${tenantId}/v2.0`]
      : undefined,
    requireHttps: process.env.NODE_ENV === 'production',
    clockTolerance: 60, // 60 seconds tolerance for clock skew
    requiredScopes: [
      'User.Read', // Minimum scope for user identification
      'Sites.Read.All', // Required for SharePoint access
    ],
  };
}

export function validateConfiguration(): void {
  const config = getAzureAdConfig();
  
  if (config.clientId === 'your-client-id') {
    console.warn('⚠️  Azure AD configuration warning: Using default client ID. Set AZURE_AD_CLIENT_ID environment variable for production.');
  }
  
  if (config.authority.includes('common')) {
    console.warn('⚠️  Azure AD configuration warning: Using common authority. Consider setting a specific tenant for better security.');
  }
  
  console.log('✅ Azure AD JWT validation configured:', {
    clientId: config.clientId.substring(0, 8) + '...',
    authority: config.authority,
    tenantId: config.tenantId || 'common',
    audience: config.audience?.substring(0, 8) + '...',
  });
}

// Environment variables documentation for reference
export const ENVIRONMENT_VARIABLES = {
  AZURE_AD_CLIENT_ID: 'Azure AD Application (client) ID',
  AZURE_AD_AUTHORITY: 'Azure AD Authority URL (e.g., https://login.microsoftonline.com/your-tenant-id)',
  AZURE_AD_TENANT_ID: 'Azure AD Tenant ID (optional, extracted from authority if not provided)',
  NODE_ENV: 'Environment (development/production) - affects HTTPS requirement',
} as const;