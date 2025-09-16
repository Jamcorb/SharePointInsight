# SP Reports Hub - SharePoint Reporting Tool

## Overview

SP Reports Hub is an enterprise SharePoint reporting tool that enables users to create unified reports across multiple SharePoint sites and lists through a drag-and-drop interface. The application allows users to discover SharePoint sources, combine them into a single normalized dataset, and export comprehensive reports with schema mapping and coverage analysis. Built with modern web technologies and designed to match SPLENS/SP DELTA visual standards, it provides an intuitive experience for creating cross-site SharePoint reports.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Components**: shadcn/ui components built on Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design tokens matching SPLENS visual style
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Animation**: Framer Motion for micro-interactions and smooth transitions
- **Drag & Drop**: HTML5 native drag-and-drop for source management

### Backend Architecture
- **Runtime**: Node.js with Express server in TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints with Zod validation schemas
- **Authentication**: Azure AD OAuth 2.0 with MSAL for frontend and backend token validation
- **Multi-tenancy**: Tenant isolation with domain-based tenant resolution

### Database Schema Design
- **Tenants**: Multi-tenant architecture with tenant isolation
- **Users**: User profiles linked to Azure AD accounts
- **Sources**: SharePoint sites and lists metadata with column definitions
- **Reports**: Saved report configurations and execution history
- **Views**: User-defined column selections and filters

### Authentication & Authorization
- **Frontend**: MSAL.js for Azure AD integration with PKCE flow
- **Backend**: JWT token validation and user/tenant resolution
- **Permissions**: SharePoint permissions inherited through Microsoft Graph
- **Scopes**: Sites.Read.All, Files.Read.All, User.Read, offline_access

### Data Processing Pipeline
- **Discovery**: Microsoft Graph API for SharePoint site and list enumeration
- **Schema Union**: Intelligent column mapping and type coercion across sources
- **Data Retrieval**: Concurrent fetching with throttling and error handling
- **Normalization**: Column superset creation with coverage tracking
- **Export**: Multi-format export (CSV, XLSX) with schema documentation

## External Dependencies

### Microsoft Services
- **Microsoft Graph API**: SharePoint data access and user information
- **Azure Active Directory**: Authentication and tenant management
- **SharePoint Online**: Primary data source for lists and libraries

### Database & Storage
- **Neon PostgreSQL**: Cloud PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations and migrations

### Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Backend bundling for production deployments

### UI Component Libraries
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide Icons**: Consistent icon system
- **Framer Motion**: Animation and gesture library

### Data Processing
- **ExcelJS**: XLSX file generation for exports
- **json2csv**: CSV export functionality
- **Zod**: Runtime validation and type checking

### Hosting & DevOps
- **Replit**: Development and hosting platform
- **GitHub Actions**: CI/CD pipeline support
- **Docker**: Containerization for production deployments