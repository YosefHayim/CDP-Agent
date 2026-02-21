# Component Testing Patterns

> **React Testing Library patterns** - How to test React components effectively.

---

## Test Structure

```typescript
// src/components/Button/Button.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  // ============================================
  // SETUP
  // ============================================
  const defaultProps = {
    children: 'Click me',
    onClick: vi.fn(),
  };

  const renderButton = (props = {}) => {
    return render(<Button {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // RENDERING TESTS
  // ============================================
  describe('rendering', () => {
    it('renders with children', () => {
      renderButton();
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders with icon', () => {
      renderButton({ icon: <span data-testid="icon">+</span> });
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('applies variant styles', () => {
      renderButton({ variant: 'secondary' });
      expect(screen.getByRole('button')).toHaveClass('bg-secondary');
    });
  });

  // ============================================
  // INTERACTION TESTS
  // ============================================
  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      renderButton();

      await user.click(screen.getByRole('button'));

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const user = userEvent.setup();
      renderButton({ disabled: true });

      await user.click(screen.getByRole('button'));

      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // STATE TESTS
  // ============================================
  describe('states', () => {
    it('shows loading spinner when isLoading', () => {
      renderButton({ isLoading: true });
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Click me')).not.toBeInTheDocument();
    });

    it('is disabled when isLoading', () => {
      renderButton({ isLoading: true });
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('edge cases', () => {
    it('handles empty children', () => {
      renderButton({ children: '' });
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles very long text', () => {
      const longText = 'A'.repeat(1000);
      renderButton({ children: longText });
      expect(screen.getByRole('button')).toHaveTextContent(longText);
    });
  });
});
```

---

## Query Priority

Use queries in this priority order (most to least recommended):

### 1. Accessible Queries (Preferred)

```typescript
// By role (BEST - how users interact)
screen.getByRole('button', { name: 'Submit' });
screen.getByRole('textbox', { name: 'Email' });
screen.getByRole('checkbox', { name: 'Remember me' });

// By label text
screen.getByLabelText('Email address');

// By placeholder
screen.getByPlaceholderText('Enter your email');

// By text content
screen.getByText('Welcome back');

// By display value (inputs)
screen.getByDisplayValue('current value');
```

### 2. Semantic Queries

```typescript
// By alt text (images)
screen.getByAltText('User avatar');

// By title attribute
screen.getByTitle('Close');
```

### 3. Test IDs (Last Resort)

```typescript
// Only when no accessible alternative
screen.getByTestId('complex-chart');
```

---

## Async Testing

### Waiting for Elements

```typescript
// Wait for element to appear
const button = await screen.findByRole('button');

// Wait for element with timeout
const element = await screen.findByText('Loaded', { timeout: 5000 });

// Wait for element to disappear
await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));
```

### Waiting for State Changes

```typescript
import { waitFor } from '@testing-library/react';

it('updates after async operation', async () => {
  const user = userEvent.setup();
  renderComponent();

  await user.click(screen.getByRole('button', { name: 'Save' }));

  await waitFor(() => {
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });
});
```

---

## Mocking

### Mocking Hooks

```typescript
import { useUser } from '@/hooks/useUser';

vi.mock('@/hooks/useUser');

describe('UserProfile', () => {
  it('renders user data', () => {
    vi.mocked(useUser).mockReturnValue({
      data: { id: '1', name: 'John' },
      isLoading: false,
      error: null,
    });

    render(<UserProfile />);
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    vi.mocked(useUser).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<UserProfile />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### Mocking API Calls

```typescript
import { server } from '@/test/mocks/server';
import { rest } from 'msw';

describe('UserList', () => {
  it('fetches and displays users', async () => {
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.json({ data: [{ id: '1', name: 'John' }] }));
      })
    );

    render(<UserList />);

    expect(await screen.findByText('John')).toBeInTheDocument();
  });

  it('handles error', async () => {
    server.use(
      rest.get('/api/users', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<UserList />);

    expect(await screen.findByText('Error loading users')).toBeInTheDocument();
  });
});
```

---

## Testing Forms

```typescript
describe('LoginForm', () => {
  it('submits with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    // Fill form
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');

    // Submit
    await user.click(screen.getByRole('button', { name: 'Login' }));

    // Verify
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('shows validation errors', async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={vi.fn()} />);

    // Submit empty form
    await user.click(screen.getByRole('button', { name: 'Login' }));

    // Check errors
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });
});
```

---

## Custom Render

```typescript
// src/test/utils.tsx

import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/providers/theme';

interface WrapperProps {
  children: React.ReactNode;
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Usage in tests
import { renderWithProviders } from '@/test/utils';

it('works with providers', () => {
  renderWithProviders(<MyComponent />);
  // ...
});
```

---

## Anti-Patterns

### DON'T: Test Implementation Details

```typescript
// BAD: Testing internal state
expect(component.state.isOpen).toBe(true);

// GOOD: Test what user sees
expect(screen.getByRole('dialog')).toBeInTheDocument();
```

### DON'T: Use Arbitrary Timeouts

```typescript
// BAD: Arbitrary wait
await new Promise(r => setTimeout(r, 1000));

// GOOD: Wait for specific condition
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### DON'T: Test Third-Party Code

```typescript
// BAD: Testing library behavior
it('React Query caches data', () => { ... });

// GOOD: Test YOUR code's behavior
it('displays cached user data', () => { ... });
```

---

[Back to Testing](./index.md) | [Back to Patterns](../index.md)
