# Epic 8: Admin & Operations Platform

**Duration:** Estimated 3–4 weeks  
**Priority:** High  
**Status:** 📋 **READY TO START**

**Dependency:** Epic 7 (Public Launch) — Stories 7.1–7.4 should be complete so admin can link to public venue pages  
**Assets:** Full admin frontend exists at `src/frontend/admin/` (React/Vite) — port to Next.js  
**Assets:** Full admin API exists at `src/backend/SunnySeat.Api/` (.NET) — port to Next.js API routes

## Epic Goal

Build the admin and operations platform within the Next.js app: venue management, patio polygon editing, building data import, accuracy tracking dashboard, and operational tooling. This migrates the existing `src/frontend/admin/` React app and `.NET` admin APIs into the unified Next.js application.

## Epic Description

**Context:**
SunnySeat has a complete admin frontend (`src/frontend/admin/`) with venue management, polygon editing, accuracy dashboard, and timeline visualization — but it was built as a separate React/Vite SPA talking to the old .NET backend. The admin API endpoints also exist in .NET but haven't been ported to Next.js API routes.

**What This Epic Delivers:**

- Admin dashboard in Next.js (`/admin/`) with auth-protected routes
- Venue CRUD (create, read, update, delete) via Next.js API routes
- Patio polygon editor with MapLibre GL JS
- Building data management and GeoPackage import
- Accuracy tracking dashboard with feedback analytics
- Venue quality metrics and data quality overview
- Operational alerting when accuracy drops

**Porting Strategy:**
The existing React components in `src/frontend/admin/src/components/` are largely reusable. We port them into `nextjs-app/app/admin/` using Next.js App Router conventions, converting to Client Components where needed and leveraging Server Components for data loading.

---

## Stories

### Story 8.1: Admin Authentication & Protected Routes

**Goal:** Set up admin route protection in Next.js using existing JWT auth system.

**Source files to port:**
- `src/frontend/admin/src/components/auth/LoginPage.tsx`
- `src/frontend/admin/src/components/auth/ProtectedRoute.tsx`
- `src/frontend/admin/src/hooks/useAuth.tsx`

**Acceptance Criteria:**

1. `/admin/login` page with username/password form
2. Successful login stores JWT token and redirects to `/admin`
3. All `/admin/*` routes are protected — redirect to login if not authenticated
4. Token refresh happens automatically before expiry
5. Logout clears tokens and redirects to login
6. Admin middleware validates JWT on all `/api/admin/*` routes
7. Role-based access check (Admin, SuperAdmin) on sensitive operations
8. Session persists across page reloads (token in httpOnly cookie or localStorage)

---

### Story 8.2: Venue Management API Routes

**Goal:** Port venue CRUD and management APIs from .NET to Next.js API routes.

**Source files to port:**
- `src/backend/SunnySeat.Api/Endpoints/VenuesController.cs`
- `src/backend/SunnySeat.Core/Services/VenueService.cs`

**Acceptance Criteria:**

1. `GET /api/admin/venues` — list venues with filters (type, mapped status, search)
2. `GET /api/admin/venues/[id]` — venue by ID with optional forecast data
3. `POST /api/admin/venues` — create venue
4. `PUT /api/admin/venues/[id]` — update venue
5. `DELETE /api/admin/venues/[id]` — delete venue
6. `GET /api/admin/venues/unmapped` — unmapped venues list
7. `GET /api/admin/venues/[id]/patios` — patios for venue
8. `POST /api/admin/venues/[id]/patios` — create patio with polygon geometry
9. `GET /api/admin/venues/quality/overview` — overall data quality metrics
10. `POST /api/admin/venues/seed` — seed Gothenburg venues
11. All endpoints require admin JWT authentication
12. Input validation with appropriate error responses

---

### Story 8.3: Admin Dashboard & Venue List Page

**Goal:** Port the admin dashboard with venue list, search, and quality overview.

**Source files to port:**
- `src/frontend/admin/src/pages/AdminDashboard.tsx`
- `src/frontend/admin/src/components/venue/VenueList.tsx`
- `src/frontend/admin/src/components/navigation/Navigation.tsx`

**Acceptance Criteria:**

1. `/admin` dashboard shows summary: total venues, mapped %, quality score
2. Venue list with search, filter by type, filter by mapped status
3. Each venue row shows name, type, patio count, quality score, mapped status
4. Click venue to navigate to venue detail/edit page
5. "Add Venue" button to create new venue
6. Admin navigation sidebar with links to Dashboard, Venues, Import, Accuracy
7. Responsive layout works on tablet and desktop
8. Data loads from `/api/admin/venues` with loading and error states

---

### Story 8.4: Patio Polygon Editor

**Goal:** Port the MapLibre-based polygon editor for drawing and editing patio boundaries.

**Source files to port:**
- `src/frontend/admin/src/hooks/usePolygonEditor.ts`
- `src/frontend/admin/src/components/map/PolygonLayer.tsx`
- `src/frontend/admin/src/components/patio/` (PatioCard, PatioList, etc.)

**Acceptance Criteria:**

1. `/admin/venues/[id]` shows venue detail with map
2. Map displays existing patio polygons for the venue
3. Admin can draw new patio polygon on map (click to place vertices, double-click to close)
4. Admin can edit existing polygon vertices (drag to move)
5. Admin can delete a patio polygon
6. Patio metadata form: name, height source, polygon quality, review flag
7. Save persists polygon geometry to Supabase via API
8. Import from GeoJSON file supported
9. Undo/redo for polygon edits
10. Visual feedback: polygon fill color, vertex handles, snap-to guides

---

### Story 8.5: Building Data Management & Import

**Goal:** Port building data import and management tools.

**Source files to port:**
- `src/backend/SunnySeat.Api/Endpoints/BuildingEndpoints.cs`
- `src/frontend/admin/src/components/import/FileUpload.tsx`
- `src/backend/Tools/SunnySeat.DataImport/`

**Acceptance Criteria:**

1. `GET /api/admin/buildings` — list buildings with stats
2. `GET /api/admin/buildings/stats` — building data statistics (count, height distribution)
3. `POST /api/admin/buildings/import` — import buildings from GeoPackage/GeoJSON
4. `/admin/import` page with file upload component
5. Import progress indicator and result summary
6. Building height override capability per building
7. Building data displayed on admin map (footprint outlines)
8. Error handling for invalid or corrupt import files

---

### Story 8.6: Accuracy Dashboard & Feedback Analytics

**Goal:** Port the accuracy tracking dashboard and feedback analytics.

**Source files to port:**
- `src/frontend/admin/src/pages/AccuracyDashboard.tsx`
- `src/frontend/admin/src/components/accuracy/` (MetricsCard, Chart, ProblematicVenues)
- `src/frontend/admin/src/services/accuracyApi.ts`
- `src/backend/SunnySeat.Core/Services/AccuracyTrackingService.cs`

**Acceptance Criteria:**

1. `/admin/accuracy` page shows rolling 14-day accuracy percentage
2. Accuracy trend chart (daily accuracy over time)
3. Problematic venues list (venues with accuracy < threshold)
4. Total feedback count and breakdown (accurate vs inaccurate)
5. Average confidence score displayed
6. Data refreshes automatically (polling every 5 minutes)
7. Alert indicator when accuracy drops below 80% for 3+ consecutive days
8. Drill-down: click venue to see venue-specific feedback history

---

## Story Dependency Graph

```
8.1 (Auth)    ──→ 8.2 (Venue API) ──→ 8.3 (Dashboard)
                                   ──→ 8.4 (Polygon Editor)
                                   ──→ 8.5 (Building Import)
              ──→ 8.6 (Accuracy Dashboard)
```

**Parallelizable after 8.1 + 8.2:**
- Stories 8.3, 8.4, 8.5, and 8.6 can be developed in parallel

---

## Epic Definition of Done

- [ ] All 6 stories completed with acceptance criteria met
- [ ] Admin routes protected with JWT authentication
- [ ] Venue CRUD fully functional
- [ ] Polygon editor draws, edits, and saves patio boundaries
- [ ] Building import works with GeoPackage files
- [ ] Accuracy dashboard shows live metrics and trends
- [ ] All admin APIs have input validation and error handling
- [ ] Admin UI works on tablet and desktop
- [ ] Old `src/frontend/admin/` components successfully migrated
