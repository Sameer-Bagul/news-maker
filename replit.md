# Overview

This is a MERN-style news aggregation and AI humanization platform that fetches articles from RSS feeds and news APIs, processes them through AI (specifically Google Gemini) to create humanized, fact-checked content, and serves it through a modern web interface. The application follows an MVC architecture with automated content processing pipelines and admin controls for content review and publication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite for development and building
- **Styling**: Tailwind CSS with custom design system and shadcn/ui components
- **State Management**: TanStack Query for server state and React Context for authentication
- **Routing**: Wouter for client-side routing
- **Design System**: Custom theme with CSS variables supporting light/dark modes

## Backend Architecture
- **Runtime**: Node.js with Express.js following MVC pattern
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: In-memory sessions (designed for Redis in production)
- **Background Jobs**: Custom worker system with scheduled job processing
- **Content Pipeline**: Multi-stage processing (fetch → extract → humanize → review → publish)

## Content Processing Pipeline
- **RSS Fetching**: Scheduled jobs fetch articles from configured news sources
- **Content Extraction**: Service extracts clean text from article URLs using web scraping
- **AI Humanization**: Google Gemini API processes raw content to create humanized versions with fact-checking
- **Review System**: Admin interface for content approval and quality control
- **Publication**: Approved articles are published with SEO-friendly URLs and metadata

## Database Schema
- **Users**: Authentication with Google OAuth support and role-based access (user/admin/editor)
- **Sources**: News source configuration with RSS feeds and rate limiting
- **Articles**: Core content storage with status tracking and metadata
- **Reports**: AI-generated humanized content with confidence scores and fact-checks
- **Jobs**: Background task queue management

## Authentication & Authorization
- **Google OAuth**: Primary authentication method with fallback email/password
- **Role-based Access**: Three-tier system (user, editor, admin) with granular permissions
- **Session Management**: Token-based sessions with configurable expiration

## API Design
- **RESTful Endpoints**: Standard HTTP methods with consistent response formats
- **Admin API**: Protected endpoints for dashboard stats, content review, and system monitoring
- **Public API**: Article retrieval with SEO-friendly slugs and metadata
- **Error Handling**: Centralized error middleware with structured error responses

# External Dependencies

## AI Services
- **Google Gemini API**: Primary LLM for content humanization, fact-checking, and entity extraction
- **Content Processing**: Cheerio for HTML parsing and text extraction from web pages

## Database & Storage
- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Drizzle ORM**: Type-safe database operations with automatic migrations
- **Connection Pooling**: Configured for serverless environments

## Authentication
- **Google OAuth**: Integrated for user authentication and profile management
- **JWT/Session Tokens**: Custom session management with token-based authentication

## UI Components & Styling
- **Radix UI**: Headless component library for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Shadcn/UI**: Pre-built component collection built on Radix and Tailwind

## Development & Build Tools
- **Vite**: Development server and build tool with HMR support
- **TypeScript**: Type safety across frontend, backend, and shared schemas
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

## News Sources
- **RSS Feeds**: Primary method for content discovery from news sources
- **Rate Limiting**: Configurable per-source rate limits to respect publisher guidelines
- **Content Validation**: URL validation and content quality checks before processing