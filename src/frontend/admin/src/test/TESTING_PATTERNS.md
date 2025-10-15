# Testing Patterns for SunnySeat Frontend

## Async Testing Best Practices

### ✅ DO: Use `waitFor` for async operations

```typescript
// GOOD: Using waitFor for async state changes
it("should show prompt after 10 minutes if user is at venue", async () => {
  const pageOpenedAt = new Date(Date.now() - 601000); // 10 minutes + 1 second ago
  const { result } = renderHook(() =>
    useFeedbackPrompt({
      ...defaultOptions,
      pageOpenedAt,
    })
  );

  await waitFor(
    () => {
      expect(result.current.showPrompt).toBe(true);
    },
    { timeout: 2000 }
  );
});
```

### ❌ DON'T: Use fake timers unless absolutely necessary

```typescript
// BAD: Fake timers can cause unpredictable test failures
beforeEach(() => {
  vi.useFakeTimers(); // Avoid this
});

it("should show prompt after 10 minutes", async () => {
  const { result } = renderHook(() => useFeedbackPrompt(defaultOptions));

  act(() => {
    vi.advanceTimersByTime(600000); // Brittle and inconsistent
  });

  await waitFor(() => {
    expect(result.current.showPrompt).toBe(true);
  });
});
```

### Use `findBy*` queries for elements that appear asynchronously

```typescript
// GOOD: findBy automatically waits for the element
const element = await screen.findByText("Was it sunny?");
expect(element).toBeInTheDocument();

// LESS PREFERRED: Manually using waitFor with getBy
await waitFor(() => {
  expect(screen.getByText("Was it sunny?")).toBeInTheDocument();
});
```

### Add `data-testid` for critical test stability

```typescript
// Component
<div className="animate-pulse" data-testid="venue-skeleton">
  {/* skeleton content */}
</div>;

// Test
it("should render loading state initially", () => {
  render(<VenuePage />);
  expect(screen.getByTestId("venue-skeleton")).toBeInTheDocument();
});
```

## Component Testing

### Prefer testing behavior over implementation

```typescript
// GOOD: Testing user-facing behavior
it("should submit feedback when user clicks Yes", async () => {
  const onSubmit = vi.fn();
  render(<FeedbackButton onSubmit={onSubmit} showPrompt={true} />);

  const yesButton = screen.getByRole("button", { name: /yes/i });
  await userEvent.click(yesButton);

  expect(onSubmit).toHaveBeenCalledWith(true);
});

// BAD: Testing implementation details
it("should update internal state when clicked", () => {
  const { result } = renderHook(() => useFeedbackButton());
  expect(result.current.internalState).toBe("idle"); // Don't test this
});
```

### Mock external services consistently

```typescript
// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, "geolocation", {
  value: mockGeolocation,
  writable: true,
});

// Mock API calls
vi.mock("../../services/api/feedbackService", () => ({
  submitFeedback: vi.fn().mockResolvedValue({ success: true }),
}));
```

## Timing and Delays

### Use realistic time delays in tests

```typescript
// GOOD: Use past timestamps for time-based conditions
const pageOpenedAt = new Date(Date.now() - 601000); // 10 minutes ago

// GOOD: Use short timeouts for fast tests
undoTimeoutMs={1000} // 1 second instead of 5 seconds

// GOOD: Set appropriate waitFor timeouts
await waitFor(() => {
  expect(condition).toBe(true);
}, { timeout: 2000 }); // Enough time for real async operations
```

## Accessibility Testing

### Always test ARIA attributes

```typescript
it("should have proper ARIA attributes", () => {
  render(<FeedbackConfirmation show={true} onClose={onClose} />);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveAttribute("aria-live", "assertive");
  expect(alert).toHaveAttribute("aria-atomic", "true");
});
```

### Use semantic queries

```typescript
// GOOD: Query by role and accessible name
const button = screen.getByRole("button", { name: /undo/i });

// LESS PREFERRED: Query by test ID (use only when necessary)
const button = screen.getByTestId("undo-button");
```

## Test Organization

### Structure tests with clear Arrange-Act-Assert

```typescript
it("should auto-dismiss after timeout", async () => {
  // Arrange
  const onClose = vi.fn();
  render(
    <FeedbackConfirmation show={true} onClose={onClose} undoTimeoutMs={1000} />
  );

  // Assert initial state
  expect(onClose).not.toHaveBeenCalled();

  // Act (wait for timeout)
  await waitFor(
    () => {
      expect(onClose).toHaveBeenCalled();
    },
    { timeout: 2000 }
  );
});
```

### Use descriptive test names

```typescript
// GOOD: Describes behavior and context
it("should show prompt after 10 minutes if user is at venue", async () => {});
it("should detect when user is at venue (within 100m)", async () => {});

// BAD: Vague or implementation-focused
it("works correctly", async () => {});
it("calls function", async () => {});
```

## Common Pitfalls

### 1. React state updates not wrapped in act()

This warning appears when state updates happen outside the React rendering cycle. Using `waitFor` instead of `act` typically resolves this.

### 2. Tests timing out

Increase `timeout` in `waitFor` options or use more realistic time values:

```typescript
await waitFor(
  () => {
    expect(condition).toBe(true);
  },
  { timeout: 5000 }
); // Increase if needed
```

### 3. Tests flaking due to timing

Use real timestamps instead of advancing timers:

```typescript
// STABLE: Real past timestamp
const pageOpenedAt = new Date(Date.now() - 601000);

// FLAKY: Fake timer advancement
vi.advanceTimersByTime(600000);
```

## Test Coverage Goals

- **New code**: >85% coverage
- **Critical paths**: 100% coverage (feedback submission, geolocation, API calls)
- **Error handling**: All error paths tested
- **Accessibility**: All interactive components tested for ARIA compliance
