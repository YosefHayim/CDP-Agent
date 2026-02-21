# Testing Patterns

> **Test organization and best practices** - Component tests, service tests, E2E tests.

---

## Documents

| Document | Contents |
|----------|----------|
| [Component Tests](./component-tests.md) | React Testing Library patterns |
| [Service Tests](./service-tests.md) | Unit testing services and utilities |

---

## Quick Reference

### Test File Naming

```
ComponentName.test.tsx    # Unit tests
ComponentName.spec.tsx    # Alternative convention
ComponentName.e2e.ts      # E2E tests (Playwright)
```

### Test Structure

```typescript
describe('ComponentName', () => {
  // Setup
  const defaultProps = { ... };
  const renderComponent = (props = {}) => render(<Component {...defaultProps} {...props} />);

  describe('rendering', () => {
    it('renders correctly with default props', () => { ... });
    it('renders loading state', () => { ... });
    it('renders error state', () => { ... });
  });

  describe('interactions', () => {
    it('calls onClick when button clicked', () => { ... });
    it('submits form with valid data', () => { ... });
  });

  describe('edge cases', () => {
    it('handles empty data', () => { ... });
    it('handles long text', () => { ... });
  });
});
```

### Common Assertions

```typescript
// Existence
expect(screen.getByRole('button')).toBeInTheDocument();
expect(screen.queryByText('Error')).not.toBeInTheDocument();

// Content
expect(screen.getByText('Hello')).toBeInTheDocument();
expect(element).toHaveTextContent('Expected text');

// Attributes
expect(button).toBeDisabled();
expect(input).toHaveValue('test');
expect(link).toHaveAttribute('href', '/path');

// Classes
expect(element).toHaveClass('active');

// Calls
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

---

## Test Categories

| Category | Purpose | Location |
|----------|---------|----------|
| **Unit** | Test isolated functions/components | `*.test.ts(x)` |
| **Integration** | Test component + hooks + services | `*.integration.test.ts` |
| **E2E** | Test full user flows | `e2e/*.spec.ts` |

---

[Back to Patterns](../index.md) | [Back to Index](../../index.md)
