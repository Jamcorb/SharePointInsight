# SP Reports Hub

An enterprise SharePoint reporting tool that enables users to create unified reports across multiple SharePoint sites and lists through an intuitive drag-and-drop interface.

## Overview

SP Reports Hub provides a comprehensive solution for creating cross-site SharePoint reports with schema mapping and coverage analysis. Built with modern web technologies, it offers an intuitive experience for combining data from multiple SharePoint sources into normalized, exportable datasets.

## Key Features

- **Multi-Site Data Collection**: Discover and connect to SharePoint sites and lists across your tenant
- **Drag-and-Drop Interface**: Intuitive canvas for selecting and combining data sources
- **Schema Union & Mapping**: Automatic column mapping and type coercion across different sources
- **Real-Time Preview**: Generate preview data to validate your report configuration
- **Multiple Export Formats**: Export reports as CSV or XLSX with comprehensive documentation
- **Azure AD Authentication**: Secure authentication using Microsoft Azure Active Directory
- **Enterprise Ready**: Multi-tenant architecture with tenant isolation and security

## Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **shadcn/ui** components built on Radix UI for accessibility
- **Tailwind CSS** with custom SPLENS visual design tokens
- **TanStack Query** for server state management
- **Wouter** for lightweight client-side routing
- **Framer Motion** for smooth animations and micro-interactions

### Backend
- **Node.js** with Express server in TypeScript
- **In-memory storage** for development and prototyping
- **Azure AD OAuth 2.0** with MSAL for authentication
- **Microsoft Graph API** for SharePoint data access

### Authentication & Security
- **Azure Active Directory** integration with redirect flow
- **JWT token validation** for secure API access
- **Microsoft Graph scopes**: `User.Read`, `Sites.Read.All`, `Files.Read.All`
- **Multi-tenant isolation** with domain-based tenant resolution

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Azure AD application registration with appropriate permissions

### Environment Variables

Create a `.env` file with the following variables:

```env
# Azure AD Configuration
VITE_AZURE_AD_CLIENT_ID=your_azure_ad_client_id
VITE_AZURE_AD_AUTHORITY=https://login.microsoftonline.com/your_tenant_id
VITE_AZURE_AD_REDIRECT_URI=https://your-domain.com

# Session Management
SESSION_SECRET=your_session_secret
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sp-reports-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`.

### Version Display

The application automatically displays its version number in the footer on all pages. The version is dynamically sourced from `package.json` via the `/api/version` endpoint, ensuring it stays current with your deployment.

## Usage

### Creating a Report

1. **Sign In**: Authenticate using your Microsoft work account
2. **Browse Sources**: Use the source browser to discover SharePoint sites and lists
3. **Add Sources**: Drag and drop lists/libraries onto the report canvas
4. **Configure Columns**: Select which columns to include in your unified report
5. **Preview Data**: Generate a preview to validate your configuration
6. **Export Report**: Download your report as CSV or XLSX

### Managing Reports

- **Save Reports**: Save report configurations for future use
- **Load Reports**: Restore previously saved report configurations  
- **Delete Reports**: Remove reports you no longer need

## Architecture

### Database Schema

- **Tenants**: Multi-tenant architecture with domain-based isolation
- **Users**: User profiles linked to Azure AD accounts
- **Sources**: SharePoint sites and lists metadata with column definitions
- **Reports**: Saved report configurations and execution history
- **Views**: User-defined column selections and filters

### Data Processing Pipeline

1. **Discovery**: Microsoft Graph API enumerates SharePoint sites and lists
2. **Schema Union**: Intelligent column mapping across multiple sources
3. **Data Retrieval**: Concurrent fetching with throttling and error handling
4. **Normalization**: Creates column superset with coverage tracking
5. **Export**: Multi-format export with comprehensive schema documentation

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production  
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking

### Project Structure

```
├── client/src/           # React frontend application
│   ├── components/       # Reusable UI components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries and configuration
│   ├── pages/           # Route components
│   └── types/           # TypeScript type definitions
├── server/              # Express backend server
│   ├── services/        # Business logic services
│   └── routes.ts        # API route definitions
├── shared/              # Shared types and schemas
└── drizzle.config.ts    # Database configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the SPLENS team or create an issue in the repository.

---

**SPLENS Reporting Platform** - SharePoint Reports Hub