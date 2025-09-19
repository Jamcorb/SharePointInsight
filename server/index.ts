import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { validateConfiguration } from "./config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Only capture response data in development
  if (process.env.NODE_ENV === 'development') {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Basic logging for production
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Add response details only in development
      if (process.env.NODE_ENV === 'development' && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate Azure AD configuration on startup
  validateConfiguration();
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Environment-appropriate logging
    if (process.env.NODE_ENV === 'development') {
      console.error("🚨 Express error handler triggered:");
      console.error("Status:", status);
      console.error("Message:", message);
      console.error("Request URL:", req.url);
      console.error("Request method:", req.method);
      console.error("Full error:", err);
      console.error("Stack trace:", err.stack);
    } else {
      // Production: Single-line summary without sensitive details
      console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.url} ${status} ${message} [${requestId}]`);
    }

    if (!res.headersSent) {
      res.status(status).json({ 
        error: process.env.NODE_ENV === 'development' ? message : "Internal server error",
        requestId: requestId,
        details: process.env.NODE_ENV === 'development' ? {
          stack: err.stack,
          url: req.url,
          method: req.method
        } : undefined
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
