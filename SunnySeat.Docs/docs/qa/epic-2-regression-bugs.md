# Epic 2 - Critical Regression Issues

**Status**: 🔴 CRITICAL - 34 Test Failures  
**Created**: October 6, 2025  
**Discovered During**: Story 3.1 (Weather Data Integration) Testing  
**Impact**: High - Affects core solar calculation accuracy  
**Priority**: P0 - Must be resolved before production deployment

---

## Executive Summary

During Story 3.1 development, discovered **34 pre-existing test failures** in Epic 2 code affecting solar position calculations, timezone handling, and date/time conversions. These failures indicate **critical bugs** in core sun tracking functionality that could result in incorrect sun position predictions by 50-100 degrees and timezone offsets by 1-2 hours.

**Affected Systems**:

- Solar position calculations (azimuth accuracy)
- Timezone conversions (DST handling)
- Julian Day calculations (date/time math)
- Atmospheric refraction calculations
- Solar elevation calculations

---

## Test Failure Summary

| Category                  | Failed | Total   | Pass Rate | Severity    |
| ------------------------- | ------ | ------- | --------- | ----------- |
| Solar Math                | 12     | 20      | 40%       | 🔴 CRITICAL |
| Timezone Utils            | 14     | 18      | 22%       | 🔴 CRITICAL |
| Solar Calculation Service | 8      | 12      | 33%       | 🔴 CRITICAL |
| **TOTAL**                 | **34** | **118** | **71%**   | 🔴 CRITICAL |

---

## Critical Bug #1: Solar Azimuth Calculations Off by ~100°

### Impact

Solar azimuth predictions consistently incorrect by 50-100 degrees, making sun position predictions completely unreliable.

### Evidence

```
Test: CalculateSolarPositionAsync_NrelValidation_MatchesReferenceWithinTolerance
Expected Azimuth: 194.34°
Actual Azimuth: 94.65°
Difference: 99.69° ❌

Test: SolarMath_FullCalculationChain_ProducesReasonableResults
Expected Azimuth: 194.34°
Actual Azimuth: 94.65°
Difference: 99.69° ❌
```

### Root Cause (Suspected)

- Incorrect azimuth calculation in `SolarMath.cs`
- Possible coordinate system mismatch (mathematical vs compass azimuth)
- Julian Day calculation errors propagating through sun position algorithm

### Files Affected

- `src/backend/SunnySeat.Core/Utils/SolarMath.cs`
- `src/backend/SunnySeat.Core/Services/SolarCalculationService.cs`

### User Impact

Users would receive sun position data pointing 90-100° in wrong direction, making app completely unreliable for finding sunny seats.

---

## Critical Bug #2: Timezone DST Offset Doubling

### Impact

Timezone conversions adding extra 1-2 hours due to DST offset being applied twice.

### Evidence

```
Test: ConvertUtcToStockholm_VariousDates_ConvertsCorrectly
Input: 2024-06-15 12:00:00 UTC (summer, DST active)
Expected: 2024-06-15 14:00:00 CEST (UTC+2)
Actual: 2024-06-15 16:00:00
Difference: +2 hours ❌ (should be +2, getting +4)

Test: ConvertUtcToStockholm_VariousDates_ConvertsCorrectly
Input: 2024-01-15 12:00:00 UTC (winter, standard time)
Expected: 2024-01-15 13:00:00 CET (UTC+1)
Actual: 2024-01-15 14:00:00
Difference: +1 hour ❌ (should be +1, getting +2)
```

### Root Cause (Identified)

**File**: `TimezoneUtils.cs` Line 57

**Bug**: DST adjustment parameter incorrectly calculated

```csharp
// WRONG - This was doubling the offset
var daylightTime = TimeSpan.FromHours(2); // CEST = UTC+2
var adjustment = TimeZoneInfo.AdjustmentRule.CreateAdjustmentRule(
    DateTime.MinValue.Date,
    DateTime.MaxValue.Date,
    daylightTime - standardTime,  // ❌ This creates 1 hour delta, then adds to base offset
    startTransition,
    endTransition);

// CORRECT - Should be
var daylightDelta = TimeSpan.FromHours(1); // DST adds 1 hour
```

### Files Affected

- `src/backend/SunnySeat.Core/Utils/TimezoneUtils.cs`
- All timezone conversion methods

### User Impact

- Sunrise/sunset times off by 1-2 hours
- Sun position predictions at wrong local times
- DST transition handling completely broken

---

## Critical Bug #3: Julian Day Calculation Errors

### Impact

Julian Day Number calculations off by 0.04 to 1.08 days (~1-26 hours), propagating through all solar position calculations.

### Evidence

```
Test: CalculateJulianDay_KnownDates_ReturnsCorrectJulianDay
Input: 2024-06-21 12:00:00 UTC (Summer Solstice 2024)
Expected: 2460482.0
Actual: 2460483.083
Difference: 1.083 days ❌ (~26 hours off)

Test: CalculateJulianDay_KnownDates_ReturnsCorrectJulianDay
Input: 2000-01-01 12:00:00 UTC (J2000 Epoch)
Expected: 2451545.0
Actual: 2451545.0417
Difference: 0.0417 days ❌ (~1 hour off)
```

### Root Cause (Suspected)

DateTime parsing in tests not properly setting UTC Kind, causing local timezone interpretation:

```csharp
// WRONG - Doesn't guarantee UTC
var utcDateTime = DateTime.Parse(utcDateTimeString, null, DateTimeStyles.AssumeUniversal);

// CORRECT
var utcDateTime = DateTime.SpecifyKind(
    DateTime.Parse(utcDateTimeString, null, DateTimeStyles.None),
    DateTimeKind.Utc);
```

### Files Affected

- `src/backend/SunnySeat.Core.Tests/Utils/SolarMathTests.cs`
- `src/backend/SunnySeat.Core.Tests/Services/SolarCalculationServiceTests.cs`

### User Impact

All solar calculations based on incorrect time reference, compounding azimuth errors.

---

## Critical Bug #4: Atmospheric Refraction Calculations

### Impact

Atmospheric refraction corrections off by 0.1° to 1.0°.

### Evidence

```
Test: ApplyAtmosphericRefraction_VariousElevations_AppliesCorrectRefraction
True Elevation: 45°
Expected Apparent: 45.01° (0.01° refraction)
Actual: 45.63°
Difference: 0.62° ❌

Test: ApplyAtmosphericRefraction_VariousElevations_AppliesCorrectRefraction
True Elevation: 0°
Expected Apparent: 0.57° (horizon refraction)
Actual: -0.46°
Difference: 1.03° ❌
```

### Root Cause (Unknown)

Atmospheric refraction formula implementation in `SolarMath.cs` not matching expected NREL algorithm.

### Files Affected

- `src/backend/SunnySeat.Core/Utils/SolarMath.cs` - `ApplyAtmosphericRefraction` method

### User Impact

Sun visibility predictions near horizon (sunrise/sunset) will be inaccurate by several minutes.

---

## Critical Bug #5: Solar Elevation Calculation Errors

### Impact

Solar elevation calculations fundamentally broken, off by 11-104 degrees.

### Evidence

```
Test: CalculateSolarElevation_KnownConditions_ReturnsExpectedElevation
Latitude: 57.71° (Gothenburg)
Declination: -23.44° (Winter Solstice)
Hour Angle: 0° (Solar Noon)
Expected: 113° (beyond zenith, theoretical)
Actual: 8.85°
Difference: 104.15° ❌
```

### Root Cause (Suspected)

Core trigonometric formula implementation error in solar elevation calculation.

### Files Affected

- `src/backend/SunnySeat.Core/Utils/SolarMath.cs` - `CalculateSolarElevation` method

### User Impact

Completely incorrect sun height calculations affecting all shadow and exposure predictions.

---

## Critical Bug #6: DST Transition Detection Inverted

### Impact

DST active/inactive status detection returns opposite values around transition dates.

### Evidence

```
Test: IsDaylightSavingTime_VariousDates_ReturnsCorrectDstStatus
Input: 2024-03-31 00:30:00 UTC (BEFORE spring DST transition at 01:00 UTC)
Expected: False (still in standard time)
Actual: True ❌

Test: IsDaylightSavingTime_VariousDates_ReturnsCorrectDstStatus
Input: 2024-10-27 00:30:00 UTC (BEFORE fall DST transition at 01:00 UTC)
Expected: True (still in daylight time)
Actual: False ❌
```

### Root Cause (Suspected)

TimeZoneInfo.IsDaylightSavingTime being called with UTC time instead of local time, or DST transition times specified incorrectly.

### Files Affected

- `src/backend/SunnySeat.Core/Utils/TimezoneUtils.cs` - `IsDaylightSavingTime` method

### User Impact

All DST-related functionality broken around transition dates (2 days per year critical failure window).

---

## Critical Bug #7: Format String Error in FormatWithTimezone

### Impact

FormatWithTimezone method throws FormatException, breaking any timezone display functionality.

### Evidence

```
Test: FormatWithTimezone_VariousDates_FormatsCorrectly
Error: System.FormatException: Input string was not in a correct format.
Location: TimezoneUtils.cs:210
```

### Root Cause (Identified)

Invalid TimeSpan format specifier:

```csharp
// WRONG - '+' format specifier invalid for TimeSpan
return $"{localTime:yyyy-MM-dd HH:mm:ss} {abbreviation} (UTC{offset:+hh\\:mm})";

// CORRECT
var sign = offset < TimeSpan.Zero ? "-" : "+";
return $"{localTime:yyyy-MM-dd HH:mm:ss} {abbreviation} (UTC{sign}{Math.Abs(offset.Hours):D2}:{Math.Abs(offset.Minutes):D2})";
```

### Files Affected

- `src/backend/SunnySeat.Core/Utils/TimezoneUtils.cs` - Line 210

### User Impact

Any UI displaying formatted timezone information will crash.

---

## Recommended Fix Strategy

### Phase 1: Critical Data Integrity (P0 - Immediate)

1. ✅ **Fix Timezone DST Doubling Bug** (Bug #2)

   - Change `daylightTime - standardTime` to `daylightDelta = TimeSpan.FromHours(1)`
   - Status: Partial fix applied, needs rebuild and test

2. ✅ **Fix Format String Error** (Bug #7)

   - Replace invalid format specifier with manual string construction
   - Status: Fix applied, needs rebuild and test

3. **Fix DateTime Parsing in Tests** (Bug #3)
   - Use `DateTime.SpecifyKind(..., DateTimeKind.Utc)` in all test DateTime parsing
   - Status: Partial fix applied to 2 test files, needs completion

### Phase 2: Solar Calculation Accuracy (P0 - This Week)

4. **Debug Solar Azimuth Algorithm** (Bug #1)

   - Review NREL SPA algorithm implementation
   - Verify coordinate system conventions (N=0° vs S=180°)
   - Add detailed logging to trace calculation chain
   - Validate against known solar position data

5. **Fix Solar Elevation Calculation** (Bug #5)

   - Review trigonometric formula implementation
   - Verify angle unit conversions (degrees vs radians)
   - Test against NREL reference data

6. **Fix Atmospheric Refraction** (Bug #4)
   - Verify refraction formula matches NREL specification
   - Check boundary conditions (horizon, zenith)
   - Validate atmospheric parameters

### Phase 3: DST Edge Cases (P1 - This Week)

7. **Fix DST Detection** (Bug #6)
   - Review DST transition time specifications
   - Verify UTC vs local time handling in IsDaylightSavingTime
   - Add comprehensive DST transition tests

### Estimated Effort

- **Phase 1**: 2-4 hours (formatting, test infrastructure)
- **Phase 2**: 8-16 hours (algorithm debugging, mathematical verification)
- **Phase 3**: 2-4 hours (DST edge cases)
- **Total**: 12-24 hours of focused debugging

---

## Testing Requirements Post-Fix

1. **All 34 failing tests must pass**
2. **No regression in 84 currently passing tests**
3. **Validation against NREL SPA reference data**:
   - Golden test cases with known sun positions
   - Multiple dates across year (solstices, equinoxes)
   - Multiple times (sunrise, noon, sunset)
   - Gothenburg coordinates specifically
4. **DST transition testing**:
   - March 31, 2024 (Spring forward)
   - October 27, 2024 (Fall back)
   - Hours before/after transitions
5. **Performance regression testing**:
   - Solar calculation performance <100ms
   - Timezone conversion performance <10ms

---

## Impact on Epic 3 (Weather Integration)

### Story 3.1 Status

- ✅ Weather integration **implementation complete**
- ✅ All Story 3.1 acceptance criteria **functionally met**
- ✅ Code **compiles successfully** (0 errors)
- ⚠️ Weather service tests **require WireMock or live API** for proper validation
- ⚠️ Story 3.1 can proceed to QA **independently** of Epic 2 fixes

### Dependency Analysis

Story 3.1 (Weather Data Integration) has **NO RUNTIME DEPENDENCY** on Epic 2 solar calculations:

- Weather ingestion operates independently
- No shared code with solar math utilities
- No timezone conversion dependencies in weather pipeline
- Weather data storage is isolated

### Recommendation

**Proceed with Story 3.1 QA using live API testing** while Epic 2 regressions are fixed in parallel. Weather integration can be validated and deployed independently.

---

## Risk Assessment

### If Not Fixed Before Production

- 🔴 **Severity: CRITICAL**
- 🔴 **Likelihood: CERTAIN** (bugs exist in current code)
- 🔴 **Impact: HIGH** (core functionality unusable)

**Consequences**:

1. Sun position predictions completely wrong (100° azimuth errors)
2. Sunrise/sunset times off by 1-2 hours
3. Users cannot trust app for finding sunny seats
4. Potential safety issues (UV exposure miscalculations)
5. Reputational damage ("the app doesn't work")

### Mitigation if Immediate Fix Not Possible

1. **DO NOT DEPLOY** Epic 2 features to production
2. Feature flag all solar calculation endpoints
3. Display "Solar calculations under maintenance" message
4. Prioritize fix as P0 blocker for any production release
5. Consider rollback to last known good solar calculation code

---

## Technical Debt Classification

| Debt Type                    | Amount                  | Interest Rate                        |
| ---------------------------- | ----------------------- | ------------------------------------ |
| **Functional Debt**          | 34 broken tests         | 🔴 CRITICAL - Blocking production    |
| **Mathematical Debt**        | Solar algorithm errors  | 🔴 CRITICAL - Core feature broken    |
| **Test Infrastructure Debt** | DateTime parsing issues | 🟡 MEDIUM - Affects test reliability |
| **Code Quality Debt**        | Format string errors    | 🟢 LOW - Easy fixes                  |

---

## Action Items

- [ ] **IMMEDIATE**: Create Epic 2 Regression Fix Story
- [ ] **IMMEDIATE**: Assign P0 priority to regression fix
- [ ] **TODAY**: Complete Phase 1 fixes (formatting, test infrastructure)
- [ ] **THIS WEEK**: Complete Phase 2 fixes (solar calculations)
- [ ] **THIS WEEK**: Complete Phase 3 fixes (DST edge cases)
- [ ] **BEFORE MERGE**: All 34 tests passing
- [ ] **BEFORE MERGE**: NREL validation tests added and passing
- [ ] **POST-FIX**: Conduct full regression testing
- [ ] **POST-FIX**: Update Story 3.1 to use WireMock for weather tests

---

## Related Files

### Source Code

- `src/backend/SunnySeat.Core/Utils/SolarMath.cs` - Solar calculation algorithms
- `src/backend/SunnySeat.Core/Utils/TimezoneUtils.cs` - Timezone conversions
- `src/backend/SunnySeat.Core/Services/SolarCalculationService.cs` - Solar service

### Tests

- `src/backend/SunnySeat.Core.Tests/Utils/SolarMathTests.cs` - 12 failures
- `src/backend/SunnySeat.Core.Tests/Utils/TimezoneUtilsTests.cs` - 14 failures
- `src/backend/SunnySeat.Core.Tests/Services/SolarCalculationServiceTests.cs` - 8 failures

### Documentation

- `SunnySeat.Docs/docs/architecture.md` - Solar calculation architecture
- `SunnySeat.Docs/docs/stories/2.*.md` - Epic 2 stories

---

**Document Maintained By**: Dev Agent (James)  
**Last Updated**: October 6, 2025  
**Next Review**: After regression fixes completed
