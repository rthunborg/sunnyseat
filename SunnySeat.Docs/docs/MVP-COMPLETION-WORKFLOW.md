# SunnySeat MVP Completion Workflow

**Generated:** October 8, 2025  
**Purpose:** Step-by-step guide to complete SunnySeat from current state to MVP launch  
**Estimated Timeline:** 5-6 weeks to production deployment

---

## 📊 Current Project Status

**Project Health:** STRONG - 57% Complete  
**Completion Status:**

- ✅ Epic 1: 90% (Foundation & Data Setup)
- ✅ Epic 2: 100% (Sun/Shadow Engine) - QA Approved October 7, 2025
- 🟡 Epic 3: 20% (Weather Integration) - Story 3.2 complete
- 🔴 Epic 4: 0% (Public Interface) - Ready to start after Epic 3
- 🔴 Epic 5: 0% (Deployment) - Final phase

**Stories Implemented but Awaiting QA:** ~10 stories  
**Stories Remaining:** ~13 stories  
**Total to MVP:** ~23 stories

---

## 🎯 Workflow Overview

### The Process Flow:

```
Draft → Approved → In Progress → Ready for Review → Done
         ↑           ↑              ↑                ↑
        @sm         @dev           @dev             @qa
```

### Agent Roles:

- **@sm** (Scrum Master): Reviews/approves draft stories, creates new stories
- **@dev** (Developer): Implements stories, marks complete
- **@qa** (QA Engineer): Reviews code quality, validates acceptance criteria
- **@pm** (Product Manager): Strategic oversight, documentation

---

## 📋 Phase 1: Clear Review Backlog (Days 1-3)

**Goal:** Get all "Ready for Review" stories through QA approval

### Epic 1 Stories (Foundation & Data)

#### ✅ Story 1.1: Project Foundation Setup

**Current Status:** Ready for Review  
**Action Required:** QA Review

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @qa
3. Message: "Please review Story 1.1: Project Foundation Setup"
4. Attach file: docs/stories/1.1.project-foundation-setup.md
5. Wait for QA to execute review-story task
6. If PASS: QA updates status to "Done"
7. If FAIL: Note issues, create new chat with @dev to fix, then retry
```

**Expected Outcome:** Status → "Done"

---

#### ✅ Story 1.2: Building Data Import Pipeline

**Current Status:** Architecture Complete - Final Validation Pending  
**Action Required:** QA Review

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @qa
3. Message: "Please review Story 1.2: Building Data Import Pipeline. Architecture is complete, needs final validation."
4. Attach file: docs/stories/1.2.building-data-import-pipeline.md
5. QA validates GDAL pipeline, import service, building entity
6. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

#### ✅ Story 1.3: Admin Authentication & Security

**Current Status:** Ready for Review  
**Action Required:** Security Audit by QA

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @qa
3. Message: "Please review Story 1.3: Admin Authentication & Security. Perform security audit."
4. Attach file: docs/stories/1.3.admin-authentication-security.md
5. QA reviews JWT implementation, role-based access, security middleware
6. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

#### ✅ Story 1.4: Admin Polygon Editor Interface

**Current Status:** Architecture Complete - Ready for Deployment  
**Action Required:** QA Review

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @qa
3. Message: "Please review Story 1.4: Admin Polygon Editor Interface"
4. Attach file: docs/stories/1.4.admin-polygon-editor-interface.md
5. QA validates React admin SPA, map interface, polygon editing
6. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

#### ✅ Story 1.5: Venue Data Seeding & Validation

**Current Status:** Architecture Complete - Ready for Deployment  
**Action Required:** QA Review

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @qa
3. Message: "Please review Story 1.5: Venue Data Seeding & Validation"
4. Attach file: docs/stories/1.5.venue-data-seeding-validation.md
5. QA validates venue database, data quality, seeding process
6. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

#### ⚠️ Story 1.6: CI/CD Pipeline Setup

**Current Status:** Not Started (UNCERTAIN)  
**Action Required:** Status Verification First

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "What is the actual status of Story 1.6: CI/CD Pipeline Setup? I see build tasks in workspace (tasks.json). Is this complete or partially complete?"
4. Attach file: docs/stories/1.6.ci-cd-pipeline-setup.md
5. Dev investigates and reports actual status

IF COMPLETE:
6. Update story status to "Done"
7. Add completion notes

IF INCOMPLETE:
6. Dev implements remaining work
7. Mark "Ready for Review"
8. Then QA review (follow standard pattern)
```

**Expected Outcome:** Status verified and updated

---

#### ⚠️ Story 1.7: Azure Infrastructure Provisioning

**Current Status:** Not Started (UNCERTAIN)  
**Action Required:** Status Verification First

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "What is the actual status of Story 1.7: Azure Infrastructure Provisioning? Is infrastructure already provisioned?"
4. Attach file: docs/stories/1.7.azure-infrastructure-provisioning.md
5. Dev investigates and reports actual status

IF COMPLETE:
6. Update story status to "Done"
7. Add completion notes

IF INCOMPLETE:
6. Dev provisions infrastructure
7. Mark "Ready for Review"
8. Then QA review
```

**Expected Outcome:** Status verified and updated

---

### Epic 2 Stories (Sun/Shadow Engine)

**🎉 GOOD NEWS:** Epic 2 already has comprehensive QA approval from Story 2.6 (October 7, 2025)

#### ✅ Stories 2.1-2.5: ALREADY QA APPROVED

**Action Required:** Update status to "Done" (administrative task)

The following stories were comprehensively reviewed and approved in Story 2.6's Epic 2-wide QA assessment:

- Story 2.1: Solar Position Calculations
- Story 2.2: Shadow Modeling Engine
- Story 2.3: Sun Exposure Calculation API
- Story 2.4: Precomputation Pipeline & Caching
- Story 2.5: Sun Timeline & Forecast API

**✅ ALREADY UPDATED:** These stories have been marked "Done" with notes referencing the Epic 2 QA approval.

---

#### 📋 Story 2.7: Test Infrastructure Improvements

**Current Status:** In Progress - Phase 1 Complete  
**Priority:** P2 (Technical Debt - NOT BLOCKING MVP)

**DECISION POINT:**

**Option A (Recommended):** Skip for now, revisit post-MVP

- Story 2.7 fixes test infrastructure technical debt
- NOT blocking any Epic 3, 4, or 5 work
- Can be completed after MVP launch

**Option B:** Complete in parallel with Epic 3

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "Continue Story 2.7: Test Infrastructure Improvements - Phase 2"
4. Attach file: docs/stories/2.7.test-infrastructure-improvements.md
5. Dev completes remaining test infrastructure work
6. Mark "Ready for Review"
7. QA reviews
```

**Recommendation:** Choose Option A - defer until post-MVP

---

## 📋 Phase 2: Epic 3 Weather Integration (Days 4-10)

**Goal:** Integrate weather data with sun calculations for confidence scoring

---

### Story 3.1: Weather Data Integration Pipeline

**Current Status:** Ready for Review (Architecture Complete)  
**Action Required:** Verify if implementation is complete, or implement

```
STEPS - FIRST CHECK STATUS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "Is Story 3.1: Weather Data Integration Pipeline already implemented? Status shows 'Ready for Review' with architecture complete. Please verify."
4. Attach file: docs/stories/3.1.weather-data-integration-pipeline.md

IF ALREADY IMPLEMENTED:
5. Proceed to QA review:
   - NEW CLEAN CHAT → @qa
   - "Please review Story 3.1: Weather Data Integration Pipeline"
   - QA validates implementation
   - Status → "Done"

IF NOT YET IMPLEMENTED:
5. Dev implements Yr.no/Met.no integration
6. Dev implements OpenWeatherMap fallback
7. Dev creates weather ingestion worker service
8. Mark "Ready for Review"
9. Then QA review
```

**Expected Outcome:** Status → "Done"

---

### Story 3.2: Cloud Cover & Weather Processing

**Current Status:** ✅ Done  
**Action Required:** Verification only

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @qa
3. Message: "Please verify Story 3.2: Cloud Cover & Weather Processing is complete and all tests passing"
4. Attach file: docs/stories/3.2.cloud-cover-weather-processing.md
5. QA confirms completion
```

**Expected Outcome:** Confirmed "Done"

---

### Story 3.3: Confidence Scoring Algorithm

**Current Status:** UNCERTAIN (corrupted file header)  
**Action Required:** Check status, then implement or review

```
STEPS - STATUS CHECK:
1. Open file: docs/stories/3.3.confidence-scoring-algorithm.md
2. Manually check if tasks are marked [x] complete

IF INCOMPLETE:
3. Open NEW CLEAN CHAT → @dev
4. Message: "Implement Story 3.3: Confidence Scoring Algorithm"
5. Attach file
6. Dev implements confidence formula: (GeometryQuality × 0.6) + (CloudCertainty × 0.4)
7. Mark "Ready for Review"
8. QA review

IF COMPLETE:
3. Open NEW CLEAN CHAT → @qa
4. Message: "Please review Story 3.3: Confidence Scoring Algorithm"
5. Attach file
6. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

### Story 3.4: Enhanced Sun Exposure APIs

**Current Status:** Ready for Review  
**Action Required:** Verify implementation, then QA review

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "Is Story 3.4: Enhanced Sun Exposure APIs already implemented? Please verify status."
4. Attach file: docs/stories/3.4.enhanced-sun-exposure-apis.md

IF IMPLEMENTED:
5. NEW CLEAN CHAT → @qa
6. "Please review Story 3.4: Enhanced Sun Exposure APIs"
7. QA validates weather-informed API responses
8. Status → "Done"

IF NOT IMPLEMENTED:
5. Dev integrates weather data with sun exposure APIs
6. Dev adds confidence explanations
7. Mark "Ready for Review"
8. Then QA review
```

**Expected Outcome:** Status → "Done"

---

### Story 3.5: Accuracy Tracking & Dashboard

**Current Status:** Ready for Review  
**Action Required:** Verify implementation, then QA review

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "Is Story 3.5: Accuracy Tracking & Dashboard already implemented? Please verify status."
4. Attach file: docs/stories/3.5.accuracy-tracking-dashboard.md

IF IMPLEMENTED:
5. NEW CLEAN CHAT → @qa
6. "Please review Story 3.5: Accuracy Tracking & Dashboard"
7. QA validates feedback system and dashboard
8. Status → "Done"

IF NOT IMPLEMENTED:
5. Dev implements user feedback collection (Yes/No buttons)
6. Dev creates accuracy dashboard
7. Mark "Ready for Review"
8. Then QA review
```

**Expected Outcome:** Status → "Done"

---

## 📋 Phase 3: Epic 4 Public Interface (Days 11-20)

**Goal:** Build React frontend for public users

---

### Story 4.1: Map-Based Patio Search Interface

**Current Status:** Draft  
**Action Required:** SM approval, then implementation

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @sm
3. Message: "Please review Story 4.1: Map-Based Patio Search Interface (currently Draft). Is it ready for implementation?"
4. Attach file: docs/stories/4.1.map-based-patio-search.md
5. SM reviews and updates if needed
6. SM changes status to "Approved"

THEN IMPLEMENT:
7. Open NEW CLEAN CHAT → @dev
8. Message: "Implement Story 4.1: Map-Based Patio Search Interface"
9. Attach updated file
10. Dev builds React SPA with MapLibre GL JS
11. Dev implements location detection, map markers, search radius
12. Mark "Ready for Review"

THEN QA:
13. Open NEW CLEAN CHAT → @qa
14. "Please review Story 4.1: Map-Based Patio Search Interface"
15. QA validates frontend implementation
16. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

### Story 4.2: Patio Information Cards & Results

**Current Status:** Ready for Review  
**Action Required:** Verify implementation, then QA

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "Is Story 4.2: Patio Information Cards already implemented? Please verify."
4. Attach file: docs/stories/4.2.patio-information-cards.md

IF IMPLEMENTED:
5. NEW CLEAN CHAT → @qa
6. "Please review Story 4.2: Patio Information Cards & Results"
7. QA validates result cards, mini timeline, confidence badges
8. Status → "Done"

IF NOT IMPLEMENTED:
5. Dev builds patio result cards
6. Dev implements mini 2-hour timeline
7. Dev adds distance display and empty state handling
8. Mark "Ready for Review"
9. Then QA review
```

**Expected Outcome:** Status → "Done"

---

### Story 4.3: Detailed Venue Pages

**Current Status:** UNCERTAIN (possible header corruption)  
**Action Required:** Check status, implement if needed

```
STEPS:
1. Open file: docs/stories/4.3.detailed-venue-pages.md
2. Check actual status and task completion

IF NOT IMPLEMENTED:
3. Open NEW CLEAN CHAT → @dev
4. Message: "Implement Story 4.3: Detailed Venue Pages"
5. Attach file
6. Dev builds venue detail pages with sun windows
7. Dev implements shareable deep links
8. Dev adds auto-refresh functionality
9. Mark "Ready for Review"

THEN QA:
10. Open NEW CLEAN CHAT → @qa
11. "Please review Story 4.3: Detailed Venue Pages"
12. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

### Story 4.4: User Feedback & Accuracy System

**Current Status:** UNCERTAIN  
**Action Required:** Check status, implement if needed

```
STEPS:
1. Open file: docs/stories/4.4.user-feedback-accuracy.md
2. Check actual status

IF NOT IMPLEMENTED:
3. Open NEW CLEAN CHAT → @dev
4. Message: "Implement Story 4.4: User Feedback & Accuracy System"
5. Attach file
6. Dev builds one-tap feedback UI ("Was it sunny?" Yes/No)
7. Dev integrates with Story 3.5 accuracy tracking backend
8. Mark "Ready for Review"

THEN QA:
9. Open NEW CLEAN CHAT → @qa
10. "Please review Story 4.4: User Feedback & Accuracy System"
11. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

### Story 4.5: Performance Optimization & SEO

**Current Status:** UNCERTAIN  
**Action Required:** Implement after all Epic 4 stories complete

```
STEPS:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "Implement Story 4.5: Performance Optimization & SEO (final Epic 4 story)"
4. Attach file: docs/stories/4.5.performance-optimization-seo.md
5. Dev optimizes frontend performance (code splitting, lazy loading)
6. Dev adds SEO meta tags and structured data
7. Dev implements PWA capabilities
8. Dev validates Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
9. Mark "Ready for Review"

THEN QA:
10. Open NEW CLEAN CHAT → @qa
11. "Please review Story 4.5: Performance Optimization & SEO"
12. QA validates performance benchmarks and SEO
13. Status → "Done"
```

**Expected Outcome:** Status → "Done"

---

## 📋 Phase 4: Epic 5 Deployment (Days 21-25)

**Goal:** Production deployment and operations handoff

---

### Story 5.1: Deployment & Operations Handoff

**Current Status:** Not Started  
**Action Required:** Create deployment documentation and execute

```
STEPS - DOCUMENTATION:
1. Open NEW CLEAN CHAT
2. Type: @dev
3. Message: "Implement Story 5.1: Deployment & Operations Handoff"
4. Attach file: docs/stories/5.1.deployment-operations-handoff.md
5. Dev creates production deployment guide
6. Dev documents operations runbooks
7. Dev creates incident response playbooks
8. Dev configures monitoring and alerting
9. Mark "Ready for Review"

THEN QA REVIEW:
10. Open NEW CLEAN CHAT → @qa
11. "Please review Story 5.1: Deployment & Operations Handoff"
12. QA validates documentation completeness
13. Status → "Done"

THEN PRODUCTION DEPLOYMENT:
14. Open NEW CLEAN CHAT → @dev or @sm
15. Message: "Execute production deployment using Story 5.1 procedures"
16. Follow deployment guide step-by-step
17. Monitor 48-hour post-deployment period
18. Epic 5 → "Complete"
```

**Expected Outcome:** MVP LAUNCHED! 🚀

---

## 🔄 Workflow Patterns Reference

### Pattern 1: QA Review (for "Ready for Review" stories)

```
1. NEW CLEAN CHAT
2. @qa
3. "Please review Story X.Y: [Story Title]"
4. Attach: docs/stories/X.Y.story-file.md
5. Wait for QA results
6. If PASS → Status "Done"
7. If FAIL → Fix with @dev, then retry
```

### Pattern 2: Implementation (for new/incomplete stories)

```
1. NEW CLEAN CHAT
2. @dev
3. "Implement Story X.Y: [Story Title]"
4. Attach: docs/stories/X.Y.story-file.md
5. Dev completes tasks
6. Dev marks "Ready for Review"
7. Then use Pattern 1 for QA review
```

### Pattern 3: Status Verification

```
1. NEW CLEAN CHAT
2. @dev
3. "What is the actual status of Story X.Y: [Story Title]?"
4. Attach: docs/stories/X.Y.story-file.md
5. Dev investigates and reports
6. Update story documentation
7. Then use Pattern 1 or 2 as appropriate
```

---

## 📊 Progress Tracking

### Week 1 Checklist (October 8-11): Clear Review Backlog

- [ ] Story 1.1 QA Review → Done
- [ ] Story 1.2 QA Review → Done
- [ ] Story 1.3 QA Review → Done
- [ ] Story 1.4 QA Review → Done
- [ ] Story 1.5 QA Review → Done
- [ ] Story 1.6 Status Verification → Update
- [ ] Story 1.7 Status Verification → Update
- [ ] ✅ Stories 2.1-2.5 Already Marked Done
- [ ] Epic 1 Status → "Complete"

### Week 2 Checklist (October 14-18): Epic 3 Implementation

- [ ] Story 3.1 Implementation/Review → Done
- [ ] Story 3.2 Verification → Confirmed Done
- [ ] Story 3.3 Implementation/Review → Done
- [ ] Story 3.4 Implementation/Review → Done
- [ ] Story 3.5 Implementation/Review → Done
- [ ] Epic 3 Status → "Complete"

### Week 3-4 Checklist (October 21-November 1): Epic 4 Frontend

- [ ] Story 4.1 SM Approval → Implementation → QA → Done
- [ ] Story 4.2 Implementation/Review → Done
- [ ] Story 4.3 Implementation/Review → Done
- [ ] Story 4.4 Implementation/Review → Done
- [ ] Story 4.5 Implementation/Review → Done
- [ ] Epic 4 Status → "Complete"

### Week 5 Checklist (November 4-8): Epic 5 Deployment

- [ ] Story 5.1 Documentation → QA → Done
- [ ] Production Deployment Executed
- [ ] 48-hour Monitoring Complete
- [ ] Epic 5 Status → "Complete"
- [ ] 🎉 MVP LAUNCHED!

---

## ⚡ Pro Tips for Efficiency

### 1. Use New Clean Chats

Always start a fresh chat for each agent interaction to avoid context confusion.

### 2. Batch Similar Tasks

Queue multiple QA reviews in sequence during Day 1-2 of Week 1.

### 3. Parallel Track When Possible

While waiting for QA review results, start status verification tasks.

### 4. Keep Documentation Updated

After each story completion, update the corresponding epic file status.

### 5. Celebrate Milestones

- Epic 1 Complete → Team lunch
- Epic 2 Complete → ✅ Already done!
- Epic 3 Complete → Team celebration
- Epic 4 Complete → Pre-launch party
- Epic 5 Complete → 🚀 MVP LAUNCH PARTY!

---

## 🚨 Troubleshooting

### Problem: QA Review Fails

**Solution:**

1. Note specific issues from QA feedback
2. Open NEW CHAT with @dev
3. "Please fix these issues in Story X.Y: [list issues]"
4. After fixes, retry QA review

### Problem: Story Status Unclear

**Solution:**

1. Use Pattern 3 (Status Verification)
2. Have @dev investigate actual code state
3. Update documentation to match reality

### Problem: Agent Doesn't Understand Request

**Solution:**

1. Be more specific about which story file to work on
2. Include the full story file content
3. Reference specific acceptance criteria or tasks

### Problem: Blocked on External Dependency

**Solution:**

1. Document the blocker in story notes
2. Move to next story in sequence
3. Return to blocked story when unblocked
4. Update project timeline accordingly

---

## 📞 Support & Questions

If you encounter issues with this workflow:

1. **Check the story file** - Ensure status and tasks are accurate
2. **Verify agent context** - Use NEW CLEAN CHAT for each interaction
3. **Reference this guide** - Follow patterns exactly as written
4. **Ask @pm (Product Manager)** - For strategic questions about priority or scope
5. **Ask @sm (Scrum Master)** - For workflow or process questions

---

## 🎯 Success Metrics

**You'll know you're on track when:**

- ✅ Week 1 ends with Epic 1 complete (7/7 stories done)
- ✅ Week 2 ends with Epic 3 complete (5/5 stories done)
- ✅ Week 4 ends with Epic 4 complete (5/5 stories done)
- ✅ Week 5 ends with production deployment successful
- ✅ MVP is live and serving users!

**Target Launch Date:** Mid-November 2025

---

**Good luck! You've got this! 🚀**

_Generated by @pm (Product Manager) - October 8, 2025_
