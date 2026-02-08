---
name: react-testing
description: React testing patterns including component tests, hook tests, integration tests, snapshot tests, and coverage. Uses Vitest + React Testing Library following TDD methodology.
---

# React Testing Patterns

Comprehensive React testing patterns for writing reliable, maintainable tests following TDD methodology with Vitest and React Testing Library.

## When to Activate

- Writing new React components or custom hooks
- Adding test coverage to existing components
- Creating integration tests for user flows
- Testing async data fetching and state management
- Following TDD workflow in React projects

## TDD Workflow for React

### The RED-GREEN-REFACTOR Cycle

```
RED     → Write a failing test first
GREEN   → Write minimal code to pass the test
REFACTOR → Improve code while keeping tests green
REPEAT  → Continue with next requirement
```

### Step-by-Step TDD in React

```tsx
// Step 1: Write failing test (RED)
// src/components/Greeting/Greeting.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Greeting } from './Greeting';

describe('Greeting', () => {
  it('renders the greeting message with the given name', () => {
    render(<Greeting name="Alice" />);
    expect(screen.getByText('Hello, Alice!')).toBeInTheDocument();
  });
});

// Step 2: Run test - verify FAIL
// $ npx vitest run src/components/Greeting/Greeting.test.tsx
// Error: Cannot find module './Greeting'

// Step 3: Implement minimal code (GREEN)
// src/components/Greeting/Greeting.tsx
interface GreetingProps {
  name: string;
}

export function Greeting({ name }: GreetingProps) {
  return <p>Hello, {name}!</p>;
}

// Step 4: Run test - verify PASS
// $ npx vitest run src/components/Greeting/Greeting.test.tsx
// PASS

// Step 5: Refactor if needed, verify tests still pass
```

## Component Testing Patterns

### Basic Component Test

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  const defaultProps = {
    label: 'Click me',
    onClick: vi.fn(),
  };

  function renderButton(overrides = {}) {
    return render(<Button {...defaultProps} {...overrides} />);
  }

  it('renders with the correct label', () => {
    renderButton();
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderButton({ onClick });

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    renderButton({ disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Testing with Context Providers

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';

function renderWithProviders(ui: React.ReactElement, options = {}) {
  return render(
    <AuthProvider>
      <ThemeProvider>
        {ui}
      </ThemeProvider>
    </AuthProvider>,
    options
  );
}

describe('Dashboard', () => {
  it('renders the dashboard title', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
  });
});
```

### Data-Driven Tests with test.each

```tsx
it.each([
  { status: 'active', expected: 'green', label: 'active status' },
  { status: 'inactive', expected: 'gray', label: 'inactive status' },
  { status: 'error', expected: 'red', label: 'error status' },
])('renders $label with correct color', ({ status, expected }) => {
  render(<StatusBadge status={status} />);
  const badge = screen.getByText(status);
  expect(badge).toHaveClass(`text-${expected}`);
});
```

## Custom Hook Testing

### Basic Hook Test

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('returns the initial count', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments the count', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements the count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

### Hook with Async Operations

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useFetchUser } from './useFetchUser';

// Mock the API module
vi.mock('../api/users', () => ({
  fetchUser: vi.fn(),
}));

import { fetchUser } from '../api/users';

describe('useFetchUser', () => {
  it('returns loading state initially', () => {
    (fetchUser as any).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useFetchUser('123'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it('returns user data on success', async () => {
    const mockUser = { id: '123', name: 'Alice' };
    (fetchUser as any).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useFetchUser('123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUser);
    expect(result.current.error).toBeNull();
  });

  it('returns error on failure', async () => {
    (fetchUser as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFetchUser('123'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });
});
```

## Async Testing Patterns

### Testing Loading and Error States

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserProfile } from './UserProfile';

vi.mock('../api/users');

describe('UserProfile', () => {
  it('shows loading spinner while fetching', () => {
    render(<UserProfile userId="123" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders user data after loading', async () => {
    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    render(<UserProfile userId="invalid" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
```

### Testing with Fake Timers

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Notification } from './Notification';

describe('Notification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-dismisses after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<Notification message="Success!" onDismiss={onDismiss} />);

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
```

## Mocking Patterns

### Module Mocking with vi.mock

```tsx
// Mock an entire module
vi.mock('../services/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}));

// Mock with factory function
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));
```

### MSW (Mock Service Worker) for API Mocking

```tsx
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen, waitFor } from '@testing-library/react';
import { UserList } from './UserList';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserList', () => {
  it('renders users from API', async () => {
    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    server.use(
      http.get('/api/users', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

## Form Testing

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ContactForm } from './ContactForm';

describe('ContactForm', () => {
  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ContactForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Message'), 'Hello!');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Hello!',
    });
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });
});
```

## RTL Query Priority

Prefer queries that reflect how users interact with your app:

| Priority | Query | When to Use |
|----------|-------|-------------|
| 1 | `getByRole` | Best: matches accessibility tree |
| 2 | `getByLabelText` | Form fields with labels |
| 3 | `getByPlaceholderText` | When no visible label |
| 4 | `getByText` | Non-interactive text content |
| 5 | `getByDisplayValue` | Current input values |
| 6 | `getByAltText` | Images with alt text |
| 7 | `getByTestId` | Last resort only |

### Query Variants

```tsx
// getBy* - throws if not found (synchronous)
screen.getByRole('button', { name: /submit/i });

// queryBy* - returns null if not found (for asserting absence)
expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

// findBy* - async, waits for element to appear
const heading = await screen.findByRole('heading', { name: /dashboard/i });
```

## Test Coverage

### Running Coverage

```bash
# Basic coverage
npx vitest run --coverage

# Generate HTML coverage report
npx vitest run --coverage --coverage.reporter=html

# Coverage for specific directory
npx vitest run --coverage src/components/

# Watch mode with coverage
npx vitest --coverage
```

### Coverage Targets

| Code Type | Target |
|-----------|--------|
| Critical user flows | 100% |
| Shared components/hooks | 90%+ |
| General components | 80%+ |
| Generated/config code | Exclude |

### Vitest Coverage Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/*.stories.tsx',
      ],
    },
  },
});
```

### Test Setup File

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

## Testing Commands

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run tests for a specific file
npx vitest run src/components/Button/Button.test.tsx

# Run tests matching a pattern
npx vitest run --reporter=verbose "Button"

# Run only changed tests
npx vitest run --changed

# Run tests with UI
npx vitest --ui

# Type check tests
npx tsc --noEmit
```

## Best Practices

**DO:**
- Write tests FIRST (TDD)
- Test user behavior, not implementation details
- Use accessible queries (getByRole, getByLabelText)
- Test loading, error, and empty states
- Use `userEvent` over `fireEvent` for realistic interactions
- Clean up after each test (RTL does this automatically)
- Use meaningful test descriptions

**DON'T:**
- Test implementation details (internal state, method calls)
- Use `getByTestId` when accessible queries work
- Snapshot test everything (use for stable, visual output only)
- Mock too much (prefer integration-style tests)
- Test third-party library behavior
- Use `fireEvent` when `userEvent` is available

## Integration with CI/CD

```yaml
# GitHub Actions example
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Type check
      run: npx tsc --noEmit

    - name: Run tests with coverage
      run: npx vitest run --coverage

    - name: Check coverage threshold
      run: npx vitest run --coverage --coverage.thresholds.lines=80
```

**Remember**: Tests are documentation. They show how your components are meant to be used. Write them clearly and keep them up to date.
