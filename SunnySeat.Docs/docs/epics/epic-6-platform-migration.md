# Epic 6: Platform Migration to Next.js/Vercel/Supabase

**Duration:** TBD (estimated 4-6 weeks)  
**Priority:** Critical Path  
**Status:** 📋 **READY TO START**

**Dependency:** None (can start immediately as app is not live)  
**Readiness:** Requirements clear, architecture decisions made, ready for implementation  
**Estimated Start:** Immediate

## Epic Goal

Migrate SunnySeat from .NET 8/Azure/PostgreSQL architecture to a modern Next.js full-stack application deployed on Vercel with Supabase as the database provider, maintaining all existing functionality while improving developer experience and reducing operational complexity.

## Epic Description

**Project Context:**
This epic represents a complete platform migration from a .NET backend with Azure hosting to a Next.js full-stack application on Vercel. The migration includes moving from Azure PostgreSQL to Supabase (which uses PostgreSQL with PostGIS), refactoring the React frontend to Next.js, and adapting all backend APIs to Next.js API routes or server actions. Since the application is not currently live, we can perform a clean migration without downtime concerns.

**What This Epic Delivers:**

- Complete Next.js 14+ application with App Router
- Supabase database with PostGIS spatial support
- Migrated API endpoints as Next.js API routes
- Refactored React components to Next.js Server/Client Components
- Background job migration to Vercel Cron or alternative solutions
- Vercel deployment configuration and CI/CD pipeline
- Complete data migration from Azure PostgreSQL to Supabase
- Updated documentation and deployment guides

**Technical Architecture Alignment:**

- Implements Next.js best practices for full-stack applications
- Maintains PostGIS spatial capabilities through Supabase
- Preserves all existing functionality and API contracts
- Optimizes for Vercel's serverless architecture
- Follows performance requirements from existing architecture docs

## Stories Breakdown

### Story 6.1: Next.js Project Setup & Configuration

**Goal:** Establish Next.js foundation with proper tooling and Supabase integration

**Key Deliverables:**

- Next.js 14+ project with App Router configured
- TypeScript configuration with strict mode
- Tailwind CSS setup (migrated from existing config)
- ESLint and Prettier configuration
- Supabase client library integration
- Environment variable management
- Development and build scripts

**Acceptance Criteria:**

- Next.js application runs locally on `npm run dev`
- TypeScript compilation succeeds with no errors
- Tailwind CSS styles are applied correctly
- ESLint and Prettier are configured and working
- Supabase client can connect to Supabase project
- Environment variables are loaded from `.env.local`
- Build process completes successfully (`npm run build`)
- Project structure follows Next.js App Router conventions

**Technical Notes:**

- Use Next.js 14+ with App Router (not Pages Router)
- Maintain existing Tailwind configuration from current frontend
- Setup Supabase client in `/lib/supabase` directory
- Configure TypeScript paths for clean imports

### Story 6.2: Supabase Database Schema Migration

**Goal:** Recreate database schema in Supabase with PostGIS support validated

**Key Deliverables:**

- Supabase project created and configured
- All database tables migrated from Azure PostgreSQL
- PostGIS extension enabled and verified
- Spatial indexes (GIST) created on geometry columns
- Foreign keys, constraints, and triggers migrated
- Database functions and stored procedures migrated
- Connection pooling configured

**Acceptance Criteria:**

- All tables from current database exist in Supabase
- PostGIS extension is enabled (`SELECT PostGIS_version()` works)
- All spatial columns have GIST indexes
- Foreign key constraints are in place
- Database functions execute correctly
- Connection pooling is configured (Supabase connection pooler)
- Schema matches current database structure exactly
- Spatial data types (geometry, geography) are preserved

**Technical Notes:**

- Use Supabase SQL Editor or migration scripts
- Verify PostGIS functions match current usage patterns
- Test spatial queries before data migration
- Document any differences in PostGIS versions

### Story 6.3: Data Migration Script

**Goal:** Migrate all data from Azure PostgreSQL to Supabase with integrity validation

**Key Deliverables:**

- Data export script from Azure PostgreSQL
- Data transformation script (if needed)
- Data import script to Supabase
- Data validation and integrity checks
- Rollback procedure documentation

**Acceptance Criteria:**

- All data successfully exported from Azure PostgreSQL
- Data import completes without errors
- Row counts match between source and destination
- Sample data validation confirms data integrity
- Spatial data (geometry columns) migrated correctly
- Foreign key relationships maintained
- Data types preserved correctly
- Migration script is documented and repeatable

**Technical Notes:**

- Use `pg_dump` for export, `psql` for import
- Test with small dataset first
- Validate spatial data with PostGIS functions
- Create backup before migration

### Story 6.4: Core API Routes Migration

**Goal:** Migrate essential API endpoints to Next.js API routes

**Key Deliverables:**

- Authentication endpoints migrated
- Core business logic endpoints migrated
- Supabase Auth integration (if replacing custom auth)
- Request/response handling
- Error handling and validation
- API route structure following Next.js conventions

**Acceptance Criteria:**

- Authentication endpoints work (login, register, if applicable)
- Core API endpoints respond correctly
- Request validation is in place
- Error responses follow consistent format
- API routes are organized in `/app/api` directory
- Supabase client is used for database operations
- API responses match current API contract
- Integration tests pass for migrated endpoints

**Technical Notes:**

- Convert Entity Framework queries to Supabase client calls
- Use Next.js Route Handlers for API endpoints
- Consider Server Actions for form submissions
- Maintain existing API response formats

### Story 6.5: Spatial/Geographic API Migration

**Goal:** Migrate PostGIS-dependent endpoints with spatial query validation

**Key Deliverables:**

- Patio search with spatial queries migrated
- Sun calculation endpoints migrated
- Geographic data endpoints migrated
- PostGIS function calls converted to Supabase RPC
- Spatial query performance validated
- Custom Postgres functions for complex spatial operations

**Acceptance Criteria:**

- Patio search by location and radius works correctly
- Spatial queries return accurate results
- Sun calculation endpoints produce correct results
- Spatial query performance is acceptable (<200ms p95)
- PostGIS functions execute correctly via Supabase
- Custom spatial functions are created and tested
- Spatial indexes are utilized in query plans
- Results match current API behavior

**Technical Notes:**

- Create Postgres functions for complex spatial queries
- Use `.rpc()` for custom spatial operations
- Test spatial accuracy thoroughly
- Monitor query performance

### Story 6.6: Frontend Migration to Next.js

**Goal:** Migrate React components to Next.js with Server/Client Component optimization

**Key Deliverables:**

- React components migrated to Next.js
- Server Components for data fetching
- Client Components for interactivity
- Routing migrated to App Router
- State management adapted (Context, TanStack Query)
- MapLibre GL JS integration maintained
- Component structure optimized for Next.js

**Acceptance Criteria:**

- All pages render correctly in Next.js
- Server Components fetch data from Supabase
- Client Components handle user interactions
- Routing works with App Router (`/app` directory)
- Map functionality works as before
- State management (Context, TanStack Query) works
- Component structure follows Next.js conventions
- No console errors or warnings

**Technical Notes:**

- Use Server Components by default, Client Components when needed
- Migrate routing from React Router to Next.js App Router
- Keep existing component logic, adapt to Next.js patterns
- Maintain MapLibre GL JS integration

### Story 6.7: Background Jobs Migration

**Goal:** Migrate background processing to Vercel Cron or alternative solution

**Key Deliverables:**

- Inventory of all background jobs
- Migration strategy for each job type
- Vercel Cron jobs for short-running tasks
- Alternative solution for long-running jobs
- Job scheduling and execution validation
- Error handling and retry logic

**Acceptance Criteria:**

- All background jobs identified and documented
- Short-running jobs (<10s) migrated to Vercel Cron
- Long-running jobs migrated to alternative solution
- Job schedules match current configuration
- Jobs execute successfully
- Error handling and logging in place
- Job execution is monitored and validated

**Technical Notes:**

- Vercel Cron: max 10s execution (50s on Pro plan)
- For longer jobs: Supabase Edge Functions, external service, or GitHub Actions
- Document job execution times and requirements
- Test job execution in Vercel environment

### Story 6.8: Vercel Deployment Configuration

**Goal:** Configure Vercel deployment with environment variables and CI/CD

**Key Deliverables:**

- Vercel project created and linked
- Environment variables configured
- Build configuration optimized
- Deployment pipeline setup
- Domain configuration (if applicable)
- Preview deployments for PRs
- Production deployment validation

**Acceptance Criteria:**

- Application deploys successfully to Vercel
- All environment variables are set correctly
- Build completes without errors
- Preview deployments work for pull requests
- Production deployment is accessible
- Environment-specific configurations work
- Deployment logs are accessible
- Rollback procedure is documented

**Technical Notes:**

- Configure `vercel.json` if needed
- Set up environment variables in Vercel dashboard
- Optimize build settings for Next.js
- Test deployment process

### Story 6.9: Integration Testing & Validation

**Goal:** Comprehensive testing to ensure all functionality works in new platform

**Key Deliverables:**

- End-to-end testing of all features
- Performance validation
- Data integrity verification
- API contract validation
- Spatial query accuracy testing
- User flow testing
- Error scenario testing

**Acceptance Criteria:**

- All user flows work correctly
- API endpoints return expected responses
- Spatial queries produce accurate results
- Performance meets or exceeds current targets
- Data integrity is maintained
- Error handling works correctly
- No regressions from current functionality
- Test results documented

**Technical Notes:**

- Create comprehensive test suite
- Compare results with current system
- Validate spatial calculations
- Performance benchmarking

### Story 6.10: Documentation & Cleanup

**Goal:** Update all documentation and archive old infrastructure code

**Key Deliverables:**

- Updated deployment documentation
- Updated architecture documentation
- Updated README with new setup instructions
- Archive old infrastructure code
- Migration guide for future reference
- Environment setup guide
- Troubleshooting guide

**Acceptance Criteria:**

- All documentation is updated and accurate
- README reflects new architecture
- Deployment docs include Vercel instructions
- Old infrastructure code is archived (not deleted)
- Migration process is documented
- Setup instructions work for new developers
- Troubleshooting guide covers common issues

**Technical Notes:**

- Keep old code in archive branch or directory
- Update all references to old architecture
- Document any breaking changes or differences

## Technical Implementation

**Next.js Architecture:**

- Next.js 14+ with App Router
- TypeScript (strict mode)
- Server Components for data fetching
- Client Components for interactivity
- API Routes for backend endpoints
- Server Actions for form submissions

**Database Architecture:**

- Supabase (PostgreSQL with PostGIS)
- Connection pooling via Supabase
- Row Level Security (RLS) if needed
- Custom Postgres functions for spatial queries

**Deployment Architecture:**

- Vercel for hosting and deployment
- Vercel Edge Functions for low-latency endpoints
- Vercel Cron for scheduled jobs
- Supabase for database and auth

**Component Structure:**

```
/app
  /api              # API routes
  /(routes)         # App Router pages
/lib
  /supabase         # Supabase client
  /services         # Business logic
  /utils            # Utility functions
/components         # React components
  /server           # Server Components
  /client           # Client Components
/public             # Static assets
```

## Migration Strategy

**Phase 1: Foundation (Stories 6.1-6.3)**

- Setup Next.js and Supabase
- Migrate database schema and data
- Validate PostGIS functionality

**Phase 2: Core APIs (Stories 6.4-6.5)**

- Migrate essential API endpoints
- Migrate spatial/geographic APIs
- Validate API functionality

**Phase 3: Frontend (Story 6.6)**

- Migrate React components
- Adapt to Next.js patterns
- Validate UI functionality

**Phase 4: Background Jobs (Story 6.7)**

- Migrate background processing
- Setup alternative solutions for long jobs
- Validate job execution

**Phase 5: Deploy & Validate (Stories 6.8-6.10)**

- Deploy to Vercel
- Comprehensive testing
- Documentation updates

## Risk Mitigation

**Primary Risks:**

1. **PostGIS Compatibility** → Mitigation: Early validation in Story 6.2
2. **Background Job Limitations** → Mitigation: Identify alternatives early
3. **API Contract Changes** → Mitigation: Maintain existing response formats
4. **Performance Degradation** → Mitigation: Performance testing in Story 6.9
5. **Data Migration Issues** → Mitigation: Test with small dataset first

**Technical Risks:**

- Vercel serverless cold starts
- Supabase connection limits
- PostGIS function differences
- Real-time features (if any) migration

**Rollback Plan:**

- Keep old infrastructure code archived
- Maintain Azure PostgreSQL backup
- Document rollback procedure
- Test rollback process

## Definition of Done

**Epic Complete When:**

- [ ] All 10 stories completed with acceptance criteria met
- [ ] Application fully functional on Vercel
- [ ] All data migrated and validated
- [ ] All APIs working correctly
- [ ] Frontend fully migrated and functional
- [ ] Background jobs running successfully
- [ ] Performance meets or exceeds targets
- [ ] Documentation updated and complete
- [ ] Old infrastructure code archived
- [ ] Integration testing passed
- [ ] Production deployment successful

## Success Metrics

**Migration Metrics:**

- All functionality preserved: 100%
- Data integrity: 100% match
- API response times: <200ms p95 (maintain or improve)
- Deployment success rate: >95%
- Zero data loss during migration

**Performance Metrics:**

- Page load times: Maintain or improve
- API response times: Maintain or improve
- Database query performance: Maintain or improve
- Build times: <5 minutes

**Developer Experience Metrics:**

- Setup time for new developers: <30 minutes
- Local development startup: <10 seconds
- Build time: <5 minutes

## Migration Checklist

**Pre-Migration:**

- [ ] Inventory all current functionality
- [ ] Document all API endpoints
- [ ] Document all background jobs
- [ ] Backup current database
- [ ] Document current architecture

**During Migration:**

- [ ] Test each story independently
- [ ] Validate data after migration
- [ ] Test API endpoints after migration
- [ ] Validate spatial queries
- [ ] Test background jobs

**Post-Migration:**

- [ ] Comprehensive integration testing
- [ ] Performance validation
- [ ] Documentation updates
- [ ] Archive old code
- [ ] Update CI/CD pipelines

---

**Epic Owner:** Development Team  
**Architecture Lead:** Winston (Architect)  
**Stakeholder:** Product Owner  
**Dependencies:** None (can start immediately)

This epic represents a complete platform modernization, moving from a traditional .NET/Azure stack to a modern Next.js/Vercel/Supabase architecture while preserving all functionality and improving developer experience.
