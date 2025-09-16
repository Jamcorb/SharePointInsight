import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

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
    
    // In a real implementation, you would validate the Azure AD token
    // For now, we'll decode it assuming it's valid
    const decoded = jwt.decode(token) as any;
    
    if (!decoded?.upn) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Get or create user
    let user = await storage.getUserByUpn(decoded.upn);
    if (!user) {
      // Extract tenant from UPN domain
      const domain = decoded.upn.split("@")[1];
      let tenant = await storage.getTenantByDomain(domain);
      
      if (!tenant) {
        tenant = await storage.createTenant({
          name: domain,
          domain: domain,
          azureTenantId: decoded.tid || "unknown",
        });
      }

      user = await storage.createUser({
        tenantId: tenant.id,
        upn: decoded.upn,
        name: decoded.name || decoded.upn,
        email: decoded.email || decoded.upn,
        roles: [],
      });
    }

    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant) {
      return res.status(500).json({ error: "User tenant not found" });
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
