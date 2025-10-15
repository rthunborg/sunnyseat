# Development Handoff: Story 2.2.1 - Shadow API Endpoints

**Created**: October 13, 2025  
**From**: Sarah (Product Owner)  
**To**: Development Team  
**Priority**: HIGH  
**Type**: Remediation Story

---

## Executive Summary

Story 2.2 was marked "Done" in December 2024, but QA review (January 2025) identified that the documented API endpoints were never implemented. The service layer is complete and production-ready, but the REST API layer is missing.

**PO Decision**: Implement the standalone Shadow API endpoints as originally documented (Option B).

**New Work Item**: Story 2.2.1 - Shadow API Endpoints (Remediation)

---

## Context

### What's Already Done ✅

- ✅ `IShadowCalculationService` fully implemented and tested
- ✅ All entity models exist (ShadowProjection, PatioShadowInfo, ShadowTimeline)
- ✅ Service layer methods operational and integrated with Story 2.3
- ✅ 30 passing unit tests for shadow geometry and calculations
- ✅ BuildingHeightManager with multi-source height support

### What's Missing ⏳

- ⏳ ShadowController with REST API endpoints
- ⏳ Request/response models for batch operations
- ⏳ API integration tests
- ⏳ Performance benchmarks (BenchmarkDotNet)

---

## Story Location

**File**: `SunnySeat.Docs/docs/stories/2.2.1.shadow-api-endpoints.md`

**Key Sections**:

- Acceptance Criteria: 6 criteria focused on API layer
- Tasks: 5 tasks covering controller, endpoints, tests, and benchmarks
- Dev Notes: Complete API specifications with code examples

---

## Implementation Scope

### Task 1: ShadowController (2-3 hours)

Create `src/backend/SunnySeat.Api/Endpoints/ShadowController.cs`

**Endpoint**: `GET /api/shadow/patio/{id}?timestamp={utc}`

- Inject `IShadowCalculationService` (already available)
- Call `CalculatePatioShadowAsync(patioId, timestamp)`
- Add OpenAPI/Swagger annotations
- Error handling for invalid patio IDs

### Task 2: Batch Endpoint (3-4 hours)

**Endpoint**: `POST /api/shadow/patios/batch`

**New Files**:

- `src/backend/SunnySeat.Core/Models/Requests/BatchShadowRequest.cs`
- `src/backend/SunnySeat.Core/Models/Responses/BatchShadowResponse.cs`

**Validation**:

- Max 100 patios per batch
- Validate all patio IDs exist

### Task 3: Timeline Endpoint (2-3 hours)

**Endpoint**: `GET /api/shadow/patio/{id}/timeline?start={utc}&end={utc}&intervalMinutes={int}`

**Validation**:

- Max 48-hour time range
- Default interval: 10 minutes

### Task 4: Performance Benchmarks (4-5 hours)

**New File**: `src/backend/SunnySeat.Core.Tests/Services/ShadowCalculationPerformanceTests.cs`

**Requirements**:

- Use BenchmarkDotNet
- Validate Story 2.2 AC #3: <100ms service layer calculation (95th percentile)
- Benchmark API overhead: <200ms total response time
- Document baseline metrics

### Task 5: API Tests (3-4 hours)

**New File**: `src/backend/SunnySeat.Api.Tests/Endpoints/ShadowControllerTests.cs`

**Coverage**:

- All three endpoints with valid inputs
- Error cases (invalid IDs, out-of-range parameters)
- Batch size limit validation
- Timeline range validation

---

## Technical Notes

### Service Layer Integration

```csharp
// Service is already registered in DI - just inject it:
public ShadowController(IShadowCalculationService shadowService)
{
    _shadowService = shadowService;
}

// All methods available:
await _shadowService.CalculatePatioShadowAsync(patioId, timestamp, ct);
await _shadowService.CalculatePatioBatchShadowAsync(patioIds, timestamp, ct);
await _shadowService.CalculatePatioShadowTimelineAsync(patioId, start, end, interval, ct);
```

### Response Format Examples

See Story 2.2.1 Dev Notes section "API Endpoint Specifications" for complete JSON response schemas.

### No Breaking Changes

- Pure additive work - no service layer changes
- Story 2.3 Sun Exposure API unaffected
- No database schema changes

---

## Acceptance Criteria Summary

1. ✓ Shadow API endpoints accessible via RESTful HTTP
2. ✓ Single patio endpoint <200ms (95th percentile)
3. ✓ Batch endpoint supports up to 100 patios
4. ✓ Timeline endpoint returns 12-48 hour ranges
5. ✓ OpenAPI/Swagger documentation complete
6. ✓ Performance benchmarks validate AC #3 from Story 2.2

---

## Estimated Effort

**Total**: 3-5 development days

**Breakdown**:

- Endpoints: 1.5-2 days
- Performance benchmarks: 0.5-1 day
- API tests: 0.5-1 day
- Documentation/review: 0.5 day

**Risk**: LOW (wrapping existing, tested services)

---

## Definition of Done

- [ ] All 3 API endpoints implemented and functional
- [ ] Request/response models created
- [ ] All 5 tasks marked complete in Story 2.2.1
- [ ] API tests passing (ShadowControllerTests.cs)
- [ ] Performance benchmarks passing (<100ms service, <200ms API)
- [ ] OpenAPI/Swagger documentation complete
- [ ] Code review approved
- [ ] QA gate updated to PASS
- [ ] Story 2.2 status updated to "Done"

---

## Related Documents

- **Story 2.2**: `docs/stories/2.2.shadow-modeling-engine.md` (service layer complete)
- **Story 2.2.1**: `docs/stories/2.2.1.shadow-api-endpoints.md` (this work)
- **QA Gate**: `docs/qa/gates/2.2-shadow-modeling-engine.yml` (updated with PO decision)
- **Epic 2**: `docs/epics/epic-2-sun-shadow-engine.md`

---

## Questions?

Contact: Sarah (Product Owner)

**Key Decision Rationale**: Standalone Shadow API provides flexibility for future features and maintains architectural consistency with other calculation services (Solar Position API in Story 2.1, Sun Exposure API in Story 2.3).

---

**Status**: Ready for Implementation  
**Next Steps**: Assign to development team, add to current sprint backlog
