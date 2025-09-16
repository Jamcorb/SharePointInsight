import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { azureAdValidator, TokenValidationError } from "./jwt-validator";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    upn: string;
    tenantId: string;
    name: string;
    email: string;
  };
  tenant?: {
    id: string;
    name: string;
    domain: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No valid authorization header" });
    }

    const token = authHeader.split(" ")[1];
    
    // Test mode bypass for development
    if (process.env.NODE_ENV === 'development' && token === 'test-token-789') {
      console.log("🧪 Backend running in test mode - bypassing authentication");
      
      // Create mock user and tenant for testing with proper UUID format
      req.user = {
        id: "12345678-1234-1234-1234-123456789abc",
        upn: "testuser@contoso.com",
        tenantId: "87654321-4321-4321-4321-cba987654321",
        name: "Test Admin",
        email: "testuser@contoso.com"
      };
      
      req.tenant = {
        id: "87654321-4321-4321-4321-cba987654321",
        name: "Contoso Test Corp",
        domain: "contoso.com"
      };
      
      return next();
    }
    
    // Validate Azure AD JWT token with proper security checks
    let validatedPayload;
    try {
      validatedPayload = await azureAdValidator.validateToken(token, {
        // Require minimum scopes for SharePoint/Graph access
        requiredScopes: ["User.Read"],
      });
    } catch (validationError) {
      console.error("JWT validation failed:", validationError);
      
      // In production, provide generic error messages to avoid information leakage
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: "Authentication failed" });
      }
      
      // In development, return specific error messages for better debugging
      if (validationError instanceof TokenValidationError) {
        return res.status(401).json({ error: "Invalid token: " + validationError.message });
      }
      return res.status(401).json({ error: "Token validation failed" });
    }

    // Extract user information from validated token
    const userInfo = azureAdValidator.extractUserInfo(validatedPayload);
    
    if (!userInfo.upn) {
      return res.status(401).json({ 
        error: process.env.NODE_ENV === 'production' 
          ? "Authentication failed" 
          : "Token missing user principal name" 
      });
    }

    // Get or create user
    let user = await storage.getUserByUpn(userInfo.upn);
    if (!user) {
      // Extract tenant from UPN domain
      const domain = userInfo.upn.split("@")[1];
      let tenant = await storage.getTenantByDomain(domain);
      
      if (!tenant) {
        tenant = await storage.createTenant({
          name: domain,
          domain: domain,
          azureTenantId: userInfo.tenantId,
        });
      }

      user = await storage.createUser({
        tenantId: tenant.id,
        upn: userInfo.upn,
        name: userInfo.name || userInfo.upn.split("@")[0],
        email: userInfo.email || userInfo.upn,
        roles: userInfo.roles,
      });
    }

    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant) {
      return res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
          ? "Internal error" 
          : "User tenant not found" 
      });
    }

    // Verify the token's tenant matches the user's tenant
    if (tenant.azureTenantId !== userInfo.tenantId) {
      console.warn(`Token tenant ID (${userInfo.tenantId}) does not match user's stored tenant ID (${tenant.azureTenantId})`);
      // Update tenant ID if it has changed
      await storage.updateTenant(tenant.id, { azureTenantId: userInfo.tenantId });
    }

    req.user = {
      id: user.id,
      upn: user.upn,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
    };
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
    };

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

export function validateTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.tenant) {
    return res.status(403).json({ error: "No tenant context" });
  }
  next();
}
