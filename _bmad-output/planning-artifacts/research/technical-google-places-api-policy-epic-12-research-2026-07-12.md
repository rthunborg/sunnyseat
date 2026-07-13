---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-07-12.md'
  - '_bmad-output/planning-artifacts/epics.md#epic-12-story-12.1'
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Current Google Places API policy and technical viability for SunnySeat Epic 12 Story 12.1'
research_goals: 'Determine whether weekly synchronization and persistence of regularOpeningHours in a MapLibre application is compliant, identify attribution, storage, deletion, scheduling, quota, cost, and safeguard requirements, and recommend a compliant fallback if needed.'
user_name: 'Rasmus'
date: '2026-07-12'
web_research_enabled: true
source_verification: true
---

# Research Report: Technical

**Date:** 2026-07-12
**Author:** Rasmus
**Research Type:** Technical

---

## Research Overview

This report evaluates whether SunnySeat Epic 12 Story 12.1 can lawfully and safely synchronize Google Places `regularOpeningHours` into Supabase once per week and reuse the normalized schedules throughout a MapLibre-based PWA. It reviews the approved sprint change proposal and Epic 12 contract against current official Google Maps Platform documentation and EEA terms, with operational pricing, quota, security, deletion, and attribution analysis.

The decisive finding is that the proposed Google-backed cache is not compliant under the ordinary current terms applicable to a new or materially modified Swedish/EEA integration. Google provides no caching permission for `regularOpeningHours`, restricts Places API content from use with any map except latitude/longitude/Place ID, and limits other Places API content to enumerated EEA use cases that do not clearly cover SunnySeat. Weekly refresh, attribution, and narrow field masks do not cure those restrictions. The recommended Epic 12 pivot is independently sourced canonical hours with provenance and a weekly staleness/manual-review workflow; OpenStreetMap may be evaluated as a supplemental source after an ODbL and coverage pilot. See **Research Synthesis and Epic 12 Decision Input** for the final decision matrix.

## Technical Research Scope Confirmation

**Research Topic:** Current Google Places API policy and technical viability for SunnySeat Epic 12 Story 12.1

**Research Goals:** Determine whether weekly synchronization and persistence of `regularOpeningHours` in a MapLibre application is compliant; identify attribution, storage, deletion, scheduled-processing, quota, cost, and operational-safeguard requirements; and recommend a viable compliant fallback if needed.

**Technical Research Scope:**

- Policy and architecture analysis for Google Places data in a non-Google-map application
- Persistence, refresh, deletion, attribution, and display requirements
- Scheduled/background synchronization constraints and authentication patterns
- Quotas, pricing, rate limits, failure isolation, and production safeguards
- Compliance assessment of the proposed weekly job
- Alternative-provider and manual-review fallback evaluation

**Research Methodology:**

- Current official Google documentation as primary evidence
- Rigorous source verification and direct links
- Explicit separation of documented policy, technical fact, and inference
- Confidence indicators for ambiguous or contract-dependent conclusions

**Scope Confirmed:** 2026-07-12

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technology Stack Analysis

### Integration Stack in Scope

SunnySeat is a Next.js/TypeScript PWA backed by Supabase PostgreSQL and rendered over MapLibre. Story 12.1 proposes a server-only scheduled process that calls Places API (New) Place Details once per venue, transforms `regularOpeningHours.periods[]` into SunnySeat's existing `WeeklyOpeningHours` JSON shape, and persists that derived weekly schedule in `venues.opening_hours`. The browser and `/api/venues` request path would never call Google directly.

This is technically straightforward as an HTTP/JSON integration, but policy—not language or framework support—is the binding viability constraint. A background GitHub Action or authenticated Vercel cron does not change the licensing status of returned Places content after it is written to Supabase.

### Google Places API Surface

Places API (New) Place Details requires a response field mask. Requesting only `regularOpeningHours` minimizes returned data, but that field triggers the **Places API Place Details Enterprise** SKU—not an Essentials SKU. Google discourages wildcard field masks in production because they can return and bill unnecessary data.

Relevant official documentation:

- [Place Details (New): field masks and SKU-triggering fields](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Places REST resource: `regularOpeningHours`](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)
- [Places API usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)

### Storage Layer

The proposed PostgreSQL `jsonb` storage is technically suitable for SunnySeat's single-interval-per-weekday contract. It supports atomic per-venue replacement, validation before write, provenance fields, and retaining manually reviewed hours when a Google response fails or contains split periods.

However, Google's EEA agreement prohibits caching Google Maps Content unless a Service Specific Term expressly permits it. The current Places section expressly permits temporary caching only for latitude and longitude (30 consecutive calendar days) and separately permits permanent Place ID storage. It does **not** grant a caching period for `regularOpeningHours`. Therefore, database suitability does not create a right to persist the data.

Relevant official documentation:

- [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea)
- [Google Maps Platform EEA Service Specific Terms, Places API §15](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms)
- [Places API policies: Place ID caching exception](https://developers.google.com/maps/documentation/places/web-service/policies)

### Mapping and Presentation Layer

For an EEA-billed project created or materially modified after 8 July 2025, Places API content other than latitude, longitude, and Place ID must not be used “With any Map.” Google's examples treat content displayed on, next to, linked to, or visually associated with a map as map-related use. SunnySeat's opening-hours badge and selected-time filtering are integral to venue cards, detail panels, pins, and list/map state; transforming the hours into SunnySeat's own schema does not remove their origin as Google Maps Content.

Places UI Kit is exempt from the EEA Places API “With any Map” and permitted-use restrictions, but it does not fit Story 12.1's requirement to persist normalized hours and drive SunnySeat's own zero-fetch selected-time filtering. It is a Google-rendered presentation component, not a general data-export or synchronization mechanism.

Relevant official documentation:

- [Places API adjustments for EEA customers](https://developers.google.com/maps/comms/eea/places)
- [Places API EEA Permitted Uses](https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses)
- [EEA changes FAQ](https://developers.google.com/maps/comms/eea/faq)

### Scheduled Execution and Cloud Platform

The proposed weekly vehicle can be implemented safely with either a GitHub Actions schedule or authenticated Vercel cron, using a server-only, API-restricted Google key and a service-role Supabase credential. Operational controls should include a strict field mask, per-venue failure isolation, validation-before-write, bounded concurrency, retry with backoff, quota caps, billing budgets/alerts, and a batch outcome report.

These controls make the job reliable and cost-bounded, but they do not make otherwise prohibited persistence or display compliant. Google requires billing and authentication for Places API requests and recommends restricting API keys. Google Cloud quotas can cap consumption; budget alerts notify but do not themselves hard-stop spend.

Relevant official documentation:

- [Set up Places API (New) and restrict API keys](https://developers.google.com/maps/documentation/places/web-service/get-api-key)
- [Manage Google Maps Platform costs](https://developers.google.com/maps/billing-and-pricing/manage-costs)
- [Google Maps Platform pricing list](https://developers.google.com/maps/billing-and-pricing/pricing)

### Technology Adoption Decision Signal

The proposed integration has no material implementation-stack blocker: TypeScript, scheduled jobs, Places REST, and PostgreSQL are compatible. The preliminary policy signal is nevertheless **red** for the proposed Google-backed weekly cache in SunnySeat's EEA/MapLibre context:

1. `regularOpeningHours` has no express caching permission.
2. SunnySeat's use is visually and functionally associated with a map.
3. A general consumer venue-discovery/sun-planning product does not clearly fit any listed EEA Places API Permitted Use.
4. Place IDs are the clear permanent-storage exception; API-derived Google Maps/Places URLs are not expressly included in that exception.

**Confidence:** High on the stated EEA terms and technical architecture; final decision remains subject to the full integration, operational, and fallback analysis and—if Google use is still desired—written clarification from Google Maps Platform Support or counsel on SunnySeat's exact billing account and integration status.

## Integration Patterns Analysis

### Proposed Point-to-Point Integration

Story 12.1 proposes this data flow:

`scheduled trigger → Places API Place Details → transform periods → validate → persist Supabase jsonb → serve through SunnySeat API → filter/render beside MapLibre`

The request protocol is HTTPS REST with JSON responses and an `X-Goog-FieldMask: regularOpeningHours` header. The response's `periods[]` contains open/close points with day `0`=Sunday through `6`=Saturday and 24-hour hour/minute values. The array's starting day is not fixed, split periods are valid, an empty array can mean never open, and a 24/7 place can omit `close`. Therefore a correct adapter must parse by each point's explicit day and cannot assume array order or one interval per weekday.

Source: [Places REST resource and OpeningHours schema](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)

### Interoperability with SunnySeat's Hours Contract

SunnySeat's existing `WeeklyOpeningHours` permits only one interval per ISO weekday. The proposed wholesale skip for any venue with split periods is technically sound and preferable to either collapsing gaps or writing a false closed value. Additional incompatible cases that need explicit handling if any provider sync is implemented are 24/7 periods with no close, temporarily closed/empty periods, malformed points, and duplicated venue rows sharing one external identifier.

A provider-neutral adapter should therefore produce one of three outcomes before any database write:

- `accepted`: a complete validated single-interval weekly schedule;
- `manual_review`: valid provider data that cannot be represented without loss, such as split hours or an unsupported 24/7 shape;
- `failed`: transport, authentication, quota, schema, or validation failure.

No failed or unrepresentable response should overwrite the canonical schedule. This architecture remains useful for a contractually suitable provider, even though Google-derived hours cannot be the persisted source under the current terms.

### Persistence and Licensing Boundary

The proposed transform does not create independently owned data. The EEA Terms prohibit pre-fetching, indexing, storing, resharing/rehosting, caching without an express exception, and creating content based on Google Maps Content. Because the Places Service Specific Terms grant no `regularOpeningHours` cache permission, the following are all outside the safe integration boundary absent written contractual permission:

- storing raw Places responses;
- storing normalized weekday JSON derived from those responses;
- retaining old Google hours after a failed refresh;
- placing payloads in durable retry queues, logs, fixtures, or dead-letter stores;
- using weekly replacement as if it were a seven-day cache entitlement.

The official documentation does not define a positive transient-buffer duration for opening hours. The safe technical interpretation is in-memory processing only for an otherwise permitted immediate display, with no durable retention. That path still does not rescue SunnySeat because the EEA map-association and permitted-use restrictions independently apply.

Sources: [EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea), [EEA Service Specific Terms §15](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms)

### MapLibre and User-Experience Boundary

The EEA integration guide states that, except for latitude, longitude, and Place ID, Places API content must not be used “With any Map.” Google describes “With any Map” broadly enough to include content on, next to, linked to, or visually associated with a map. SunnySeat's synchronized hours would affect:

- whether a venue pin exists at the selected time;
- list membership and counts adjacent to the map;
- quick-info and detail opening-hours copy;
- favourites and other map-linked venue flows.

This is not a detached non-map presentation. Attribution cannot cure this restriction. Places UI Kit can be used with third-party maps and is exempt from the EEA Places API map/permitted-use clauses, but it does not license exporting its content into SunnySeat's DTO or database and cannot drive the zero-fetch open-at-selected-time predicate required by Story 12.14.

Sources: [Places API EEA integration guide](https://developers.google.com/maps/comms/eea/places), [EEA Places API Permitted Uses](https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses)

### Identifier and URL Interoperability

`place_id` has an explicit indefinite-storage exception. Google recommends—not mandates—refreshing stored IDs older than 12 months, using an IDs-only Place Details request that currently falls under the no-cost IDs-only SKU. `NOT_FOUND` or equivalent results should mark an ID obsolete for review rather than silently relinking a venue.

Source: [Save and refresh Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id)

SunnySeat's `places_api_url` is a locally constructed endpoint of the form `https://places.googleapis.com/v1/places/{place_id}`, not a returned public listing URL. As a technical string derived only from a permitted stored ID, it is closer to application configuration than cached Places content; nevertheless, permanent storage is unnecessary and Google gives only Place IDs an explicit exception. The safer design is to store only `place_id` and construct the endpoint at request time. Never persist or expose a URL containing an API key.

Returned fields such as `googleMapsUri`, `googleMapsLinks`, photo URIs, or provider URLs are Google Maps Content and do not share the Place ID exception. They should not be durably stored absent a separate express permission.

### Scheduled Job Security and Resilience Pattern

There is no separate technical prohibition on server-to-server cron calls. The blocker is the job's purpose—prefetching and persisting restricted content. For a permitted provider integration, the production pattern should be:

- server-only credential in a secret manager or deployment environment;
- provider/API restriction and, where stable egress permits, IP restriction;
- authenticated HTTP trigger using SunnySeat's `CRON_SECRET`, or a direct scheduled script with no public trigger;
- deduplication by external ID before calls;
- a run lock to prevent overlap;
- small bounded concurrency with jitter;
- timeouts and bounded exponential backoff for `429`, transient `5xx`, and network failures only;
- idempotent, validation-before-write updates;
- per-venue status plus an aggregate run report;
- quota cap, quota alert, billing budget alert, and anomaly monitoring.

Google recommends exponential backoff and warns against synchronized request spikes. It also recommends API and application restrictions, separate keys by application, usage monitoring, and keeping web-service keys out of clients and source control.

Sources: [Places web-service best practices](https://developers.google.com/maps/documentation/places/web-service/web-services-best-practices), [Google Maps Platform API security guidance](https://developers.google.com/maps/api-security-best-practices), [Cost controls](https://developers.google.com/maps/billing-and-pricing/manage-costs)

### Compliant Integration Alternatives

The most compatible pattern is provider-neutral canonical hours with explicit provenance:

`venue-provided or independently licensed evidence → maintainer review/import → validated canonical hours → weekly staleness queue/reminder → re-review when due`

Recommended fields are `hours_source_type`, `hours_source_reference`, `hours_reviewed_at`, `hours_next_review_at`, `hours_review_status`, and `hours_notes`. The weekly automation should identify stale or missing records and create a review report; it should not ingest Google content. Venue-owned submissions or direct confirmations can update the canonical schedule after review. Public venue websites may be used only where their terms and applicable database/copyright rules permit; provenance should identify the independent source and must not disguise data copied from Google.

### Integration Decision

**Decision signal: reject the Google Places weekly persistence pattern as currently proposed.** It is technically simple, low-volume, and securable, but fails three independent policy gates: no hours caching grant, no use with the MapLibre-associated experience, and no clear EEA permitted-use category for SunnySeat's consumer venue-discovery workflow.

**Confidence:** High. Attribution and refresh cadence are implementation obligations only after an integration is otherwise permitted; they do not override these gates.

## Architectural Patterns and Design

### System Architecture Decision

Reject Google Places as the canonical or synchronized source for `venues.opening_hours`. Retain SunnySeat's existing database-backed hours model, but populate it only from venue-provided evidence, maintainer verification, or a provider whose licence expressly permits persistent storage, transformation, redistribution, and display with MapLibre.

The replacement flow is:

`independent source → provider-neutral adapter or maintainer entry → contract validation → reviewed canonical hours → SunnySeat API → client-side selected-instant filtering`

This preserves the zero-fetch scrub invariant and keeps provider licensing outside the request path.

### Design Principles and Boundaries

- **Canonical data must be licensable:** persistence rights are a prerequisite, not an operational afterthought.
- **Provenance is part of the record:** every schedule should identify how and when it was verified.
- **Provider adapters cannot bypass contracts:** adapters may normalize syntax, but must not silently collapse split periods or other unsupported semantics.
- **Unknown is not closed:** failed refreshes and missing evidence must not fabricate a closed weekday.
- **One policy boundary:** no raw or normalized Google Places content enters Supabase, logs, fixtures, queues, or client DTOs.
- **Map-independent identifiers only:** retain `place_id` where useful; do not treat returned URLs or content as covered by the ID exception.

### Data Architecture

Keep `venues.opening_hours` as the canonical `WeeklyOpeningHours` value and add or associate governance metadata such as:

- `hours_source_type` (`venue_confirmed`, `venue_website`, `osm`, `licensed_provider`, `manual`);
- `hours_source_reference`;
- `hours_reviewed_at`;
- `hours_next_review_at`;
- `hours_review_status` (`verified`, `due`, `manual_review`, `unknown`);
- `hours_notes`.

Do not store provider payloads unless the provider's terms explicitly allow it. Store only the normalized fields required by SunnySeat plus the minimum provenance needed for auditability.

### Provider-Neutral Adapter Pattern

Define an internal adapter result rather than binding the job to Google response types:

- `accepted(schedule, provenance)`;
- `manual_review(reason, provenance)`;
- `failed(errorClass)`.

Adapters must recognize multiple intervals, 24/7 schedules, past-midnight intervals, closed days, and unknown data. Under the current single-interval SunnySeat contract, any split-day schedule is routed to manual review wholesale.

### Scheduled Governance Pattern

Replace the weekly Google ingestion cron with a weekly staleness audit:

1. Find schedules with missing provenance or `hours_next_review_at <= now()`.
2. Produce a review queue/report without changing public hours.
3. Allow a maintainer or venue owner to supply independently sourced evidence.
4. Validate and atomically update canonical hours plus provenance.
5. Report unresolved venues and preserve the prior verified schedule with an explicit stale/review status.

This scheduled process is deterministic, inexpensive, and does not depend on third-party data rights.

### Security Architecture

The fallback does not require a Google API key. Any future licensed provider must use a server-only, provider-restricted credential, authenticated job triggers, least-privilege database access, bounded retries, and redacted logs. The maintainer update path must remain localhost/dev-only or otherwise follow Epic 12's fail-closed maintenance boundary.

For any retained Google Place ID maintenance, isolate an optional annual IDs-only refresh from hours. Google recommends refreshing IDs older than 12 months; IDs-only Place Details is currently a no-cost SKU. It must never broaden its field mask to content fields.

Source: [Google Place ID storage and refresh guidance](https://developers.google.com/maps/documentation/places/web-service/place-id)

### OpenStreetMap as a Supplemental Architecture

OpenStreetMap is technically viable as a supplemental source because its `opening_hours` model supports split periods, past-midnight schedules, holidays, and source/check-date metadata. OSM data is licensed under ODbL, requiring attribution and potentially share-alike handling for a derivative database. That licence is materially more compatible with MapLibre and persistence than Google Places, but the exact boundary between SunnySeat's proprietary venue database and an OSM-derived or collective database must be designed and reviewed.

The public Nominatim service is not an opening-hours synchronization backend and discourages regular bulk jobs. A production OSM path should use an appropriate extract, Overpass instance under its usage policy, self-hosting, or a commercial OSM provider with explicit terms—not periodic bulk requests against the public Nominatim endpoint.

Sources: [OSMF licence FAQ](https://osmfoundation.org/wiki/License/Licence_and_Legal_FAQ), [OSMF attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines), [OSM `opening_hours` model](https://wiki.openstreetmap.org/wiki/Opening_hours), [public Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)

### Architecture Trade-off Summary

| Option | Persistence and MapLibre fit | Data freshness | Contract fit | Decision |
|---|---|---:|---:|---|
| Weekly Google Places cache | Prohibited under ordinary current terms | High | Requires split-hours skips | Reject |
| Places UI Kit | Map-compatible presentation exception, but no export/cache path | Live | Cannot drive SunnySeat DTO/filter | Reject for Story 12.1 |
| Venue-provided/manual review | Strong, evidence-controlled | Medium | Exact contract can be enforced | Recommended baseline |
| OSM-derived hours | Potentially viable under ODbL obligations | Variable | Richer than current contract | Supplemental pilot only |
| Commercial licensed provider | Depends on negotiated terms | Potentially high | Adapter required | Future option after terms review |

**Architectural Decision:** Use independently sourced canonical hours plus a weekly staleness/review workflow. Preserve a provider-neutral adapter seam. Do not implement the proposed Google hours synchronization without a written Google agreement that expressly permits persistence, transformation, the SunnySeat use case, and MapLibre-associated display.

## Implementation Approaches and Technology Adoption

### Immediate Decision and Remediation

1. Do not implement the Story 12.1 Google hours fetch-and-persist job.
2. Audit existing `opening_hours` provenance. If any values were copied from Places API responses, delete or replace them with independently sourced and reviewed schedules; do not relabel them as manual data.
3. Retain `place_id` values. Schedule an optional IDs-only check for IDs older than 12 months.
4. Stop treating `places_api_url` as a policy-safe persisted field. Because it is a deterministic endpoint constructed from `place_id`, derive it when needed or retire it in a future scoped data cleanup. Do not edit the current implementation as part of this research task.
5. Record the Epic 12 decision as “provider pivot required” before Story 12.1 implementation begins.

Google's terms do not state a grace period for stored opening hours. The prudent remediation is deletion or replacement as soon as identified. EEA latitude/longitude cached from Places has a specific 30-day deletion rule; Place IDs are indefinite. On agreement termination, Google content and software are subject to the agreement's termination obligations.

Sources: [EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms), [EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea), [Place ID guidance](https://developers.google.com/maps/documentation/places/web-service/place-id)

### Weekly Review Workflow

Implement a provider-neutral weekly audit rather than automated Google ingestion:

- query venues with missing, stale, or review-required provenance;
- deduplicate shared establishments where appropriate while preserving seating-area-specific records;
- produce a structured maintainer artifact listing current hours, source, last review, due date, and reason;
- accept an explicit reviewed update through the approved maintenance path;
- validate one interval per weekday, closed-day nulls, `HH:MM`, and past-midnight semantics;
- route split periods, 24/7, seasonal, and holiday-specific schedules to manual review until the core hours contract is extended;
- make updates idempotent and atomic; never partially overwrite a venue;
- retain the last independently verified value on evidence-fetch failure, while marking it stale.

### OpenStreetMap Pilot

OpenStreetMap is a viable supplemental provider candidate, not a drop-in canonical replacement. A bounded pilot should:

1. Match the 42 venues to OSM elements using existing coordinates/names and manual confirmation.
2. Read `opening_hours`, `check_date:opening_hours`, `source:opening_hours`, and `opening_hours:url` when present.
3. Parse the formal OSM syntax, including split and after-midnight intervals.
4. Compare coverage and disagreement rates against independently verified schedules.
5. Route mismatches and unsupported multi-interval schedules to review rather than auto-write.
6. Complete an ODbL assessment covering attribution, derivative/collective database classification, and any share-alike offer obligations before production persistence.

For predictable production ingestion, use a Sweden extract such as Geofabrik's PBF, an appropriately operated Overpass endpoint, self-hosting, or a commercial OSM service with explicit terms. Do not build a regular synchronization job on the public Nominatim service; its policy discourages periodic bulk requests and it is a geocoder, not the canonical bulk-data channel.

Sources: [Geofabrik Sweden extracts](https://download.geofabrik.de/europe/sweden.html), [OSM opening-hours syntax](https://wiki.openstreetmap.org/wiki/Opening_hours), [OSMF licence FAQ](https://osmfoundation.org/wiki/License/Licence_and_Legal_FAQ), [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)

### Testing and Quality Assurance

For the provider-neutral/manual workflow:

- unit-test parsing and validation for closed days, past midnight, 24/7, split periods, malformed times, and unknown schedules;
- contract-test adapter outcomes (`accepted`, `manual_review`, `failed`);
- test that no unsupported schedule overwrites canonical hours;
- test deduplication without merging distinct SunnySeat seating areas;
- test cron authentication or direct-script credential boundaries;
- test run locking, retry bounds, and per-venue isolation;
- add a policy regression test or static configuration guard ensuring no Places field mask includes `regularOpeningHours` in a scheduled sync;
- verify zero Places calls on all user request paths;
- verify the Story 12.14 selected-instant filter continues to use only canonical `opening_hours`.

### Google Cost, Quota, and Safeguard Facts

Although the Google design is rejected, the operational facts are useful decision evidence:

- `regularOpeningHours` triggers **Places API Place Details Enterprise**.
- Current global pricing provides **1,000 free billable events per month** for that SKU, then **USD $20 per 1,000** through 100,000 monthly events, followed by lower volume tiers.
- 42 venue rows at four to five weekly runs equal 168–210 calls/month. Deduplicating the shared Place ID gives 41 calls/run, or 164–205/month and about 2,132/year.
- At isolated SunnySeat scale, the estimated incremental charge is therefore **$0/month** under current pricing. Free usage is not guaranteed dedicated headroom if other usage shares the billing account/SKU.
- Places API (New) rate limits are per method per project. Google does not publish one universal Place Details default on the referenced page; the actual project limit must be checked in Cloud Console.
- Successful requests and server-error requests count against quota; authentication failures do not.
- Quotas are enforcement controls, while billing reporting can lag. Budget alerts notify but do not cap spend.

Sources: [Place Details field/SKU mapping](https://developers.google.com/maps/documentation/places/web-service/place-details), [current pricing table](https://developers.google.com/maps/billing-and-pricing/pricing), [usage and quota model](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), [cost controls](https://developers.google.com/maps/billing-and-pricing/manage-costs)

If Google ever grants written permission for this exact integration, production safeguards must include:

- a dedicated Google Cloud project or clearly isolated key;
- API restriction to Places API (New) and IP restriction where stable egress permits;
- a server-only credential, never `NEXT_PUBLIC_*`;
- exact field mask `regularOpeningHours` and no wildcard;
- a quota cap with retry headroom but below an unacceptable spend level;
- quota, error-rate, unexpected-request, and billing alerts;
- deduplication by `place_id`;
- serial or small-pool requests with jitter and bounded exponential backoff;
- authenticated cron trigger, run lock, and auditable results;
- immediate halt and review if usage occurs outside the scheduled window.

### Attribution Requirements if Google Content Is Ever Permitted

Any application displaying Places content must have publicly accessible Terms of Use and a Privacy Policy incorporating the Google Maps end-user terms and Google Privacy Policy. Displayed Google content must carry Google Maps attribution, preferably the official logo; constrained spaces may use “Google Maps” text. The content must be visually distinguishable as Google-provided, attribution must remain visible and unmodified, and any returned third-party `attributions[]` must also be displayed. Photos and reviews add author and source-link requirements.

Attribution is not required merely because SunnySeat stores a permitted Place ID without displaying other Places content. Attribution cannot legalize otherwise prohibited caching or use with a map.

Source: [Places API policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)

### Risk Assessment

| Risk | Severity | Mitigation |
|---|---:|---|
| Terms breach from persisted Google hours | Critical | Reject sync; audit/delete or independently replace affected values |
| MapLibre-associated display breach | Critical | Do not use Places hours in SunnySeat UI/filtering |
| Misreading weekly refresh as cache permission | High | Record explicit “no retention window” decision |
| `places_api_url` assumed covered by ID exception | Medium | Store ID only; derive endpoint; do not cache returned URIs |
| Manual hours drift | Medium | Weekly staleness queue, provenance, due dates, venue confirmation |
| OSM licence contamination or missed attribution | High | ODbL review before production; isolate provenance and database boundary |
| OSM coverage/accuracy gaps | Medium | Supplemental pilot plus manual verification; never auto-overwrite disagreements |
| Split-hours false representation | High | Whole-venue manual review until multi-interval contract exists |

## Technical Research Recommendations

### Implementation Roadmap

1. Approve the policy decision: Google weekly hours persistence is non-compliant under current ordinary terms.
2. Audit current provenance and remediate any Google-derived stored hours/URLs.
3. Define canonical-hours provenance and review metadata in Story 12.1 planning.
4. Implement the weekly stale-data report and maintainer review workflow.
5. Run a 42-venue OSM coverage/licensing pilot without production writes.
6. Decide whether the OSM pilot justifies a separately scoped licensed-provider adapter.
7. Extend the core hours contract in a prerequisite story if split schedules must be represented truthfully.

### Success Metrics

- zero scheduled or request-path calls for Google `regularOpeningHours`;
- 100% of canonical hours records have an approved source type or are explicitly unknown;
- 100% of updates record review time and reviewer/source evidence;
- zero unsupported split schedules flattened or written as closed;
- weekly audit completes with an inspectable per-venue outcome;
- stale schedules are surfaced by due date;
- any OSM-produced public data path has verified attribution and ODbL compliance.

## Research Synthesis and Epic 12 Decision Input

### Executive Summary

**Decision: do not implement the proposed weekly Google Places `regularOpeningHours` synchronization. Pivot Story 12.1 to independently sourced canonical hours plus scheduled review.**

The Google design is operationally inexpensive and technically simple, but it is policy-ineligible. Under the current EEA agreement for a 2026 Swedish integration, Google Maps Content may not be cached unless the Service Specific Terms expressly allow it. The Places section allows 30-day caching only for latitude/longitude and separately allows Place IDs to be retained; it grants no storage window for opening hours. The general Places policy likewise prohibits prefetching, caching, or storing Places content beyond stated exceptions.

The display/use problem is independent of storage. EEA Places content other than latitude, longitude, and Place ID cannot be used “With any Map,” which Google illustrates broadly as on, beside, linked to, or visually associated with a map. SunnySeat would use the hours to determine pin visibility, map-adjacent list membership, counts, and venue detail copy. Its consumer sun-and-venue discovery use also does not clearly fall within the nine enumerated EEA Places API Permitted Uses. Attribution is mandatory where display is allowed, but attribution does not override storage, map, or permitted-use restrictions.

The correct Epic 12 response is a source pivot, not a cron redesign. Keep `place_id` as an indefinitely storable identifier; derive rather than persist the redundant Places API endpoint; audit and replace any Google-derived schedules; store hours only from venue confirmation, independently permitted evidence, or a licensed provider; and run a weekly staleness/review job. Pilot OSM as supplemental evidence only after validating coverage, ODbL obligations, and compatibility with SunnySeat's single-interval-per-day contract.

### Table of Contents

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
3. [Integration Patterns Analysis](#integration-patterns-analysis)
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
5. [Implementation Approaches and Technology Adoption](#implementation-approaches-and-technology-adoption)
6. [Research Synthesis and Epic 12 Decision Input](#research-synthesis-and-epic-12-decision-input)
7. [Primary Official Sources](#primary-official-sources)

### Requested Policy Decision Matrix

| Question | Finding | Epic 12 consequence | Confidence |
|---|---|---|---:|
| May `regularOpeningHours` be persisted? | No express permission. Current EEA terms allow Places caching only for latitude/longitude for 30 days; Place ID is separately exempt. General policy prohibits storage beyond exceptions. | Do not write raw or normalized Google hours to Supabase, durable queues, logs, or fixtures. | High |
| For how long and under what refresh rules? | No positive retention window is stated for opening hours. Weekly refresh is not permission to retain for seven days. | No scheduled refresh cadence makes the cache compliant. | High |
| Attribution requirements | Permitted displayed content needs visible Google Maps attribution, Google content/source distinction, public app Terms and Privacy Policy incorporating Google's end-user terms/privacy policy, and any returned third-party attribution. | Attribution would be required if a permitted display existed, but it cannot cure this design. | High |
| Places data on MapLibre/non-Google map | For the EEA integration, content other than lat/lng/Place ID cannot be used “With any Map.” Standard non-EEA terms also restrict Places content with a non-Google map. | Hours cannot drive map pins, adjacent lists, filters, counts, or linked venue panels. | High |
| Permanent Place ID storage | Explicitly permitted indefinitely. Google recommends refreshing IDs older than 12 months; IDs-only refresh is currently no cost. | Keep `place_id`; optionally add an annual validity check. | High |
| Permanent Places API URL storage | The locally constructed API endpoint is not a returned content field, but only Place ID has an explicit caching exception and the endpoint is redundant. Returned `googleMapsUri`/links are Google content and have no such exception. | Store only `place_id`; derive the API endpoint transiently. Do not persist returned Google URIs. | Medium-high |
| Scheduled/background synchronization | No special technical ban on cron, but prefetching and durable storage of restricted content are prohibited. | The weekly job's intended purpose is impermissible even if authenticated and server-only. | High |
| Required deletion/refresh | Google-derived hours should be deleted or independently replaced when identified; lat/lng cached under the explicit exception must be deleted after 30 days; Place IDs need no deletion solely due to age. | Add a provenance audit before Story 12.1 implementation. | High |
| Quota/rate limits | Places API (New) limits are per method per project; the actual Place Details project quota must be checked in Cloud Console. Quota stops service at the configured limit. | Not a blocker at weekly scale; configure quotas only if a future permitted integration is approved. | High |
| Costs | `regularOpeningHours` triggers Place Details Enterprise: 1,000 free events/month, then $20/1,000 through 100,000 events at current global pricing. The 41 unique weekly IDs imply about 164–205 calls/month. | Estimated $0 incremental monthly cost today, but cost does not affect compliance. | High |
| Production safeguards | Restricted server credential, authenticated trigger, exact field mask, ID dedupe, bounded concurrency/backoff, lock, validation, per-record isolation, quotas, monitoring, and alerts. | Preserve these patterns for any future licensed provider; they do not legalize Google caching. | High |
| Is proposed weekly sync compliant? | No. It fails storage, map-association, and likely EEA permitted-use gates independently. | Story 12.1 must pivot its source/automation outcome. | High |
| Viable fallback | Venue-provided/manual evidence with provenance and weekly staleness review is immediately viable. OSM is a plausible supplemental provider subject to ODbL and coverage evaluation. | Reframe weekly automation as a review queue; run a non-writing OSM pilot. | High for manual fallback; medium for OSM until pilot |

### Governing-Terms Analysis

Sweden is in the EEA. Google's EEA FAQ states that projects created on or after 8 July 2025, and integrations materially modified after that date, are subject to the EEA-specific terms. Story 12.1 is a new Places integration in 2026 and should not rely on the legacy “unmodified state” carve-out. If SunnySeat's actual Google billing or negotiated agreement differs, the contract owner must verify that separately; no such exception was supplied for this research.

The result does not depend solely on EEA treatment. The current standard terms and Places policy also prohibit prefetching/storing content outside express exceptions and restrict Places content with non-Google maps. The EEA terms make the conclusion even clearer by adding the “With any Map” and enumerated permitted-use framework.

### Why Weekly Refresh Is Not Compliant

The proposal appears to assume that refreshing every seven days keeps a cache acceptably fresh. Google policy is permission-based, not freshness-based: content may be cached only where a term expressly authorizes a field and duration. The 30-day Places clause applies specifically to latitude/longitude, not to all Place Details content. `regularOpeningHours` has no listed duration.

Normalization also does not change the source. Converting Google's `periods[]` into ISO weekday JSON remains storage of content derived from Google Maps Content. A failed weekly fetch cannot safely retain a last-known Google value because the initial durable copy was never authorized.

### Attribution Decision

If a future written agreement permits the exact use, every UI container presenting Google-derived hours must clearly identify them as Google Maps content. The Google Maps logo is preferred, with “Google Maps” text allowed where space is constrained; attribution must be visible, unmodified, and associated with the content. Returned third-party attributions must be preserved. SunnySeat would also need public Terms of Use and a Privacy Policy with the required Google references.

Because the recommended design displays only independently sourced canonical hours, it should not add Google attribution merely for retained Place IDs. Doing so could misleadingly imply Google supplies or verifies SunnySeat's public schedule.

### Technical Viability and Economics

Had the policy allowed it, the job would be trivial at present scale. Place Details (New) requires a field mask, and `regularOpeningHours` alone triggers the Enterprise SKU. With 42 venue rows but 41 unique Place IDs, a weekly run would issue about 2,132 calls per year. Current monthly usage would remain well under the 1,000-event free cap, assuming no material shared billing-account consumption.

Google publishes the quota model but not one universal numeric default for the project's Place Details method on the cited page. The maintainer must inspect and configure the actual project quota. A hard quota is a spend/abuse control; budget alerts only notify and billing reports can lag.

### Recommended Epic 12 Replacement Decision

Replace “weekly Google Places synchronization” with “weekly opening-hours verification and stale-data workflow” while preserving the user outcome: hours remain current without affecting request latency.

Recommended operational contract:

1. Canonical hours remain in `venues.opening_hours`.
2. Accepted sources are venue confirmation, independently reviewed venue material, OSM after licence/coverage approval, or another provider with express persistence and redistribution rights.
3. Every schedule records provenance, review state, last-reviewed time, and next-review time.
4. Weekly automation reports due, unknown, conflicting, split-hours, or failed records; it does not silently overwrite them.
5. Split schedules remain manual-review-only until a prerequisite multi-interval hours contract is implemented.
6. Google Place IDs may remain for identity/reference, but no Google hours or returned URLs are persisted.

### Alternative Provider Assessment

OpenStreetMap is the most viable provider candidate identified because ODbL permits use and modification subject to attribution and share-alike obligations. Its `opening_hours` syntax is richer than SunnySeat's current shape, supporting multiple intervals, public holidays, seasons, and after-midnight times. That richness creates a representation issue rather than a policy prohibition.

The recommended pilot should measure how many of the 42 venues have OSM matches, valid hours, recent check dates, and agreement with independent evidence. It must not import anything into production until SunnySeat has determined whether its stored subset is a derivative or collective database and implemented the necessary attribution/share-alike posture. Geofabrik's Sweden extract provides an appropriate bulk-data acquisition route; the public Nominatim service should not be used for scheduled synchronization.

If OSM coverage is insufficient, the manual/venue-confirmation workflow is still viable at 42 venues. It trades perfect automation for clear data rights, auditability, and truthful exception handling.

### Production Safeguards for Any Future Provider

- contract and licence review before implementation;
- server-only, provider-restricted credentials;
- authenticated cron or direct scheduled script;
- external-ID deduplication;
- provider-neutral adapter and strict schema validation;
- small bounded concurrency, jitter, timeouts, and exponential backoff;
- no retry of permanent errors;
- atomic per-venue writes and non-overlapping run lock;
- per-venue provenance and outcome reporting;
- quotas, anomaly alerts, and budget alerts where billable;
- an emergency disable switch that does not affect user requests;
- periodic re-review of provider terms and pricing.

### Primary Official Sources

Google sources current as checked on 2026-07-12:

- [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea)
- [Google Maps Platform EEA Service Specific Terms](https://cloud.google.com/terms/maps-platform/eea/maps-service-terms)
- [EEA Places API Permitted Uses](https://cloud.google.com/terms/maps-platform/eea-places-api-permitted-uses)
- [Places API adjustments for EEA customers](https://developers.google.com/maps/comms/eea/places)
- [EEA changes FAQ](https://developers.google.com/maps/comms/eea/faq)
- [Places API policies and attribution](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Place IDs: storage and refresh](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Place Details (New): field masks and SKU fields](https://developers.google.com/maps/documentation/places/web-service/place-details)
- [Places REST resource and opening-hours schema](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)
- [Places API usage, billing, and quota model](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing)
- [Google Maps Platform current pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Cost controls and quota alerts](https://developers.google.com/maps/billing-and-pricing/manage-costs)
- [Google Maps Platform monitoring](https://developers.google.com/maps/reporting-and-monitoring/monitoring)
- [API security guidance](https://developers.google.com/maps/api-security-best-practices)
- [Places web-service retry best practices](https://developers.google.com/maps/documentation/places/web-service/web-services-best-practices)

Alternative-source references:

- [OpenStreetMap Foundation licence FAQ](https://osmfoundation.org/wiki/License/Licence_and_Legal_FAQ)
- [OpenStreetMap attribution guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)
- [OSM `opening_hours` syntax](https://wiki.openstreetmap.org/wiki/Opening_hours)
- [Geofabrik Sweden extract](https://download.geofabrik.de/europe/sweden.html)
- [Public Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)

### Methodology, Confidence, and Limitations

The research used official Google documentation and current contractual pages as primary sources, cross-checked policy statements against service-specific integration guides, field/SKU documentation, pricing, quota, monitoring, and security guidance. Local analysis was grounded in the approved 2026-07-12 sprint change proposal and Epic 12 Story 12.1.

Confidence is high for the rejection decision because three independent restrictions converge. Uncertainty remains around SunnySeat's actual Google billing-account agreement, any negotiated terms, and whether Google would grant a written exception. This report is technical decision support, not legal advice. If the team wants to pursue Google despite the result, obtain written Google Maps Platform Support/contract confirmation addressing all four points explicitly: persistence of normalized hours, scheduled prefetch, SunnySeat's consumer use case, and use with MapLibre-associated UI.

### Final Decision for Epic 12

**Status:** Google Places weekly synchronization — **not viable under current ordinary terms**.

**Approved technical direction recommended:** provider pivot to independently sourced canonical hours, weekly stale-data/manual-review automation, permanent storage of Place IDs only, and an OSM supplemental-source pilot behind licence and coverage gates.

- **Technical Research Completion Date:** 2026-07-12
- **Source Verification:** Current official sources checked through 2026-07-12
- **Overall Confidence:** High
