---
description: "Enforce TDD workflow for React. Write component/hook tests first with Vitest + RTL, then implement. Verify 80%+ coverage."
---

# React TDD Workflow

## TDD Cycle

This command enforces the Red-Green-Refactor cycle for React development:

1. **RED** -- Write a failing test that describes the desired behavior
2. **GREEN** -- Write the minimum implementation to make the test pass
3. **REFACTOR** -- Improve the code while keeping tests green
4. **REPEAT** -- Continue until the feature is complete

### Rules

- Never write implementation code without a failing test first
- Each test should cover exactly one behavior or requirement
- Tests must be deterministic -- no reliance on timing, network, or random values
- Use React Testing Library (RTL) queries that reflect how users interact with the UI
- Prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId`
- Mock external dependencies at module boundaries, not internal functions

## Full Example: TDD Session for SearchInput Component

### Requirements

- Renders an input field with placeholder "Search..."
- Calls `onSearch` callback after 300ms debounce when user types
- Shows a loading spinner when `isLoading` prop is true
- Clears the input when the clear button is clicked
- Is accessible with proper ARIA attributes

### Step 1: RED -- Write the first failing test

```tsx
// src/components/SearchInput/SearchInput.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders an input with the correct placeholder', () => {
    render(<SearchInput onSearch={vi.fn()} />);

    expect(
      screen.getByPlaceholderText('Search...')
    ).toBeInTheDocument();
  });
});
```

Run the test:

```bash
npx vitest run src/components/SearchInput/SearchInput.test.tsx
```

Result: FAIL -- `SearchInput` module not found.

### Step 2: GREEN -- Minimal implementation

```tsx
// src/components/SearchInput/SearchInput.tsx
interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch }: SearchInputProps) {
  return <input placeholder="Search..." />;
}
```

Run the test: PASS.

### Step 3: RED -- Debounced search callback

```tsx
describe('SearchInput', () => {
  // ... previous test ...

  it('calls onSearch with debounced value after 300ms', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSearch = vi.fn();

    render(<SearchInput onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'react');

    // Should not have been called yet
    expect(onSearch).not.toHaveBeenCalled();

    // Advance past debounce delay
    vi.advanceTimersByTime(300);

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('react');

    vi.useRealTimers();
  });
});
```

Run the test: FAIL -- `onSearch` never called.

### Step 4: GREEN -- Add debounce logic

```tsx
import { useState, useEffect, useRef } from 'react';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch }: SearchInputProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (value) {
        onSearch(value);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [value, onSearch]);

  return (
    <input
      placeholder="Search..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
```

Run the test: PASS.

### Step 5: RED -- Loading spinner

```tsx
it('shows a loading spinner when isLoading is true', () => {
  render(<SearchInput onSearch={vi.fn()} isLoading={true} />);

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

it('does not show a loading spinner when isLoading is false', () => {
  render(<SearchInput onSearch={vi.fn()} isLoading={false} />);

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
```

Run the test: FAIL.

### Step 6: GREEN -- Add loading state

```tsx
export function SearchInput({ onSearch, isLoading = false }: SearchInputProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (value) {
        onSearch(value);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [value, onSearch]);

  return (
    <div>
      <input
        placeholder="Search..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search"
      />
      {isLoading && (
        <span role="status" aria-live="polite">
          Loading...
        </span>
      )}
    </div>
  );
}
```

Run the test: PASS.

### Step 7: RED -- Clear button

```tsx
it('clears the input when the clear button is clicked', async () => {
  const user = userEvent.setup();
  const onSearch = vi.fn();

  render(<SearchInput onSearch={onSearch} />);

  const input = screen.getByPlaceholderText('Search...');
  await user.type(input, 'test query');

  expect(input).toHaveValue('test query');

  const clearButton = screen.getByRole('button', { name: /clear/i });
  await user.click(clearButton);

  expect(input).toHaveValue('');
});
```

Run the test: FAIL.

### Step 8: GREEN -- Add clear button

```tsx
export function SearchInput({ onSearch, isLoading = false }: SearchInputProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (value) {
        onSearch(value);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [value, onSearch]);

  const handleClear = () => {
    setValue('');
  };

  return (
    <div>
      <input
        placeholder="Search..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search"
      />
      {value && (
        <button onClick={handleClear} aria-label="Clear search">
          X
        </button>
      )}
      {isLoading && (
        <span role="status" aria-live="polite">
          Loading...
        </span>
      )}
    </div>
  );
}
```

Run the test: PASS.

### Step 9: REFACTOR -- Extract custom hook

```tsx
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

```tsx
// src/hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('returns debounced value after the specified delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    );

    rerender({ value: 'world', delay: 300 });
    expect(result.current).toBe('hello');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('world');

    vi.useRealTimers();
  });
});
```

Run all tests: PASS.

## Test Patterns

### Component Test Pattern

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

describe('ComponentName', () => {
  const defaultProps = {
    // Required props with sensible defaults
  };

  function renderComponent(overrides = {}) {
    return render(<ComponentName {...defaultProps} {...overrides} />);
  }

  it('renders without crashing', () => {
    renderComponent();
  });

  it('describes a specific behavior', async () => {
    const user = userEvent.setup();
    renderComponent({ someProp: 'value' });

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Expected result')).toBeInTheDocument();
  });
});
```

### Custom Hook Test Pattern

```tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('useCustomHook', () => {
  it('returns the initial state', () => {
    const { result } = renderHook(() => useCustomHook(initialArgs));
    expect(result.current.someValue).toBe(expectedValue);
  });

  it('updates state when action is called', () => {
    const { result } = renderHook(() => useCustomHook(initialArgs));

    act(() => {
      result.current.someAction(newValue);
    });

    expect(result.current.someValue).toBe(updatedValue);
  });
});
```

### test.each Pattern for Data-Driven Tests

```tsx
it.each([
  { input: '', expected: true, label: 'empty string' },
  { input: 'valid', expected: false, label: 'non-empty string' },
  { input: '  ', expected: true, label: 'whitespace only' },
])('validates "$label" correctly', ({ input, expected }) => {
  const { result } = renderHook(() => useValidation(input));
  expect(result.current.isEmpty).toBe(expected);
});
```

## Coverage Commands and Targets

### Running Tests

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest

# Run tests for a specific file
npx vitest run src/components/SearchInput/SearchInput.test.tsx

# Run tests matching a pattern
npx vitest run --reporter=verbose "SearchInput"
```

### Coverage

```bash
# Generate coverage report
npx vitest run --coverage

# Generate HTML coverage report for detailed inspection
npx vitest run --coverage --coverage.reporter=html

# Check coverage for a specific directory
npx vitest run --coverage src/components/
```

### Coverage Targets

| Metric       | Minimum | Target |
|--------------|---------|--------|
| Statements   | 80%     | 90%+   |
| Branches     | 80%     | 85%+   |
| Functions    | 80%     | 90%+   |
| Lines        | 80%     | 90%+   |

### Vitest Configuration for Coverage

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
      ],
    },
  },
});
```

## Related

- `skills/react-testing/` -- Testing philosophy and patterns reference
