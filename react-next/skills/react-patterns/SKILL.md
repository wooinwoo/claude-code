---
name: react-patterns
description: React and TypeScript patterns, best practices, and conventions for building robust, performant, and maintainable React applications.
---

# React Development Patterns

React and TypeScript patterns and best practices for building robust, performant, and maintainable applications.

## When to Activate

- Writing new React components or hooks
- Reviewing React/TypeScript code
- Refactoring existing React code
- Designing component architecture

## Core Principles

### 1. Composition Over Inheritance

React favors composition. Build complex UIs by combining simple components.

```tsx
// Good: Composition with children
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg shadow-md p-4">{children}</div>;
}

function UserCard({ user }: { user: User }) {
  return (
    <Card>
      <Avatar src={user.avatar} />
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
    </Card>
  );
}

// Bad: Trying to use inheritance
class UserCard extends Card {
  // Don't do this in React
}
```

### 2. Single Responsibility Components

Each component should do one thing well.

```tsx
// Good: Focused components
function UserAvatar({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="rounded-full w-10 h-10" />;
}

function UserName({ name }: { name: string }) {
  return <span className="font-semibold">{name}</span>;
}

function UserCard({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar src={user.avatar} alt={user.name} />
      <UserName name={user.name} />
    </div>
  );
}

// Bad: Monolithic component doing too much
function UserCard({ user, onEdit, onDelete, showActions, isAdmin, theme }) {
  // 200+ lines handling everything
}
```

### 3. Explicit Props with TypeScript

Always type your props explicitly. Prefer interfaces for component props.

```tsx
// Good: Explicit prop types
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({
  variant,
  size = 'md',
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(variants[variant], sizes[size])}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// Bad: Using `any` or no types
function Button(props: any) { ... }
```

## Component Patterns

### Compound Components

```tsx
// Compound pattern for related components
interface SelectContextValue {
  value: string;
  onChange: (value: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function Select({ value, onChange, children }: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div role="listbox">{children}</div>
    </SelectContext.Provider>
  );
}

function Option({ value, children }: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('Option must be used within Select');

  return (
    <button
      role="option"
      aria-selected={ctx.value === value}
      onClick={() => ctx.onChange(value)}
    >
      {children}
    </button>
  );
}

Select.Option = Option;

// Usage
<Select value={selected} onChange={setSelected}>
  <Select.Option value="a">Option A</Select.Option>
  <Select.Option value="b">Option B</Select.Option>
</Select>
```

### Render Props Pattern

```tsx
interface DataFetcherProps<T> {
  url: string;
  children: (data: {
    data: T | null;
    isLoading: boolean;
    error: string | null;
  }) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const { data, isLoading, error } = useFetch<T>(url);
  return <>{children({ data, isLoading, error })}</>;
}

// Usage
<DataFetcher<User[]> url="/api/users">
  {({ data, isLoading, error }) => {
    if (isLoading) return <Spinner />;
    if (error) return <Error message={error} />;
    return <UserList users={data!} />;
  }}
</DataFetcher>
```

### Polymorphic Components

```tsx
type PolymorphicProps<T extends React.ElementType> = {
  as?: T;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children'>;

function Text<T extends React.ElementType = 'span'>({
  as,
  children,
  ...props
}: PolymorphicProps<T>) {
  const Component = as || 'span';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Text>Default span</Text>
<Text as="h1" className="text-2xl">Heading</Text>
<Text as="p" className="text-gray-600">Paragraph</Text>
<Text as="label" htmlFor="name">Label</Text>
```

## Hooks Patterns

### Custom Hook for Form State

```tsx
function useForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = (field: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleBlur = (field: keyof T) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return { values, errors, touched, handleChange, handleBlur, setErrors, reset };
}
```

### Custom Hook for Media Queries

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage
function Layout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

### Custom Hook for Local Storage

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    window.localStorage.setItem(key, JSON.stringify(valueToStore));
  };

  return [storedValue, setValue] as const;
}
```

## State Management Patterns

### Context for Global State (Simple Cases)

```tsx
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  const login = async (credentials: Credentials) => {
    const user = await authApi.login(credentials);
    setState({ user, isAuthenticated: true });
  };

  const logout = () => {
    authApi.logout();
    setState({ user: null, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

### useReducer for Complex State

```tsx
type Action =
  | { type: 'SET_LOADING' }
  | { type: 'SET_DATA'; payload: Item[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'ADD_ITEM'; payload: Item }
  | { type: 'REMOVE_ITEM'; payload: string };

interface State {
  items: Item[];
  isLoading: boolean;
  error: string | null;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'SET_DATA':
      return { items: action.payload, isLoading: false, error: null };
    case 'SET_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };
  }
}
```

## Performance Patterns

### When to Memoize

```tsx
// React.memo: Components that receive same props frequently
const ExpensiveList = React.memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

// useMemo: Expensive computations
function Dashboard({ data }: { data: DataPoint[] }) {
  const chartData = useMemo(
    () => data.map(d => ({ x: d.date, y: d.value })).sort((a, b) => a.x - b.x),
    [data]
  );

  return <Chart data={chartData} />;
}

// useCallback: Functions passed to memoized children
function Parent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback((id: string) => {
    setCount(prev => prev + 1);
  }, []);

  return <MemoizedChild onClick={handleClick} />;
}
```

### When NOT to Memoize

```tsx
// Don't memoize cheap renders
function SimpleText({ text }: { text: string }) {
  return <span>{text}</span>; // No memo needed
}

// Don't memoize if props change every render
function Parent() {
  // This object is new every render, memo on child is useless
  return <Child style={{ color: 'red' }} />;
}

// Don't memoize components rendered once (pages, layouts)
function HomePage() {
  return <Layout><Content /></Layout>; // No memo needed
}
```

### Code Splitting with React.lazy

```tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Suspense>
  );
}
```

## Error Handling Patterns

### Error Boundary

```tsx
interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorFallback />}>
  <Dashboard />
</ErrorBoundary>
```

### Loading/Error/Empty State Pattern

```tsx
interface AsyncStateProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  error: string | null;
  emptyMessage?: string;
  children: (data: T) => React.ReactNode;
}

function AsyncState<T>({
  data,
  isLoading,
  error,
  emptyMessage = 'No data available',
  children,
}: AsyncStateProps<T>) {
  if (isLoading) return <Skeleton />;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return <EmptyState message={emptyMessage} />;
  }
  return <>{children(data)}</>;
}

// Usage
<AsyncState data={users} isLoading={isLoading} error={error}>
  {(users) => <UserList users={users} />}
</AsyncState>
```

## Accessibility Patterns

### Keyboard Navigation

```tsx
function Tabs({ tabs }: { tabs: Tab[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        setActiveIndex(prev => (prev + 1) % tabs.length);
        break;
      case 'ArrowLeft':
        setActiveIndex(prev => (prev - 1 + tabs.length) % tabs.length);
        break;
      case 'Home':
        setActiveIndex(0);
        break;
      case 'End':
        setActiveIndex(tabs.length - 1);
        break;
    }
  };

  return (
    <div role="tablist" onKeyDown={handleKeyDown}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={index === activeIndex}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => setActiveIndex(index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

### Accessible Form Pattern

```tsx
function FormField({
  label,
  error,
  children,
  required = false,
}: {
  label: string;
  error?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
  required?: boolean;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({
        id,
        'aria-describedby': error ? errorId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} role="alert" className="text-red-500 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
```

## Project Organization

### Standard React Project Layout

```text
src/
├── components/           # Shared UI components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── ...
├── hooks/                # Custom hooks
│   ├── useDebounce.ts
│   ├── useDebounce.test.ts
│   └── ...
├── contexts/             # React contexts
├── pages/                # Route pages (or app/ for Next.js)
├── services/             # API calls and external services
├── utils/                # Pure utility functions
├── types/                # Shared TypeScript types
├── test/                 # Test setup and utilities
│   └── setup.ts
├── App.tsx
└── main.tsx
```

### Component File Naming

```text
# Good: PascalCase for components, camelCase for hooks
components/UserCard/UserCard.tsx
hooks/useDebounce.ts
utils/formatDate.ts

# Bad: Inconsistent naming
components/user-card/user_card.tsx
```

## TypeScript Patterns

### Discriminated Unions for State

```tsx
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function UserProfile() {
  const [state, setState] = useState<RequestState<User>>({ status: 'idle' });

  // TypeScript narrows the type based on status
  switch (state.status) {
    case 'idle':
      return <button onClick={fetchUser}>Load Profile</button>;
    case 'loading':
      return <Spinner />;
    case 'success':
      return <Profile user={state.data} />; // data is available
    case 'error':
      return <Error message={state.error} />; // error is available
  }
}
```

### Generic Components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

function List<T>({ items, renderItem, keyExtractor, emptyMessage }: ListProps<T>) {
  if (items.length === 0) {
    return <p>{emptyMessage || 'No items'}</p>;
  }

  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// Usage - TypeScript infers T from items
<List
  items={users}
  renderItem={(user) => <UserCard user={user} />}
  keyExtractor={(user) => user.id}
/>
```

## Quick Reference: React Idioms

| Idiom | Description |
|-------|-------------|
| Composition over inheritance | Build complex UIs by combining simple components |
| Lift state up | Share state via closest common ancestor |
| Colocation | Keep related code close together |
| Controlled components | Form inputs driven by React state |
| Unidirectional data flow | Data flows from parent to child via props |
| Derived state | Compute values from existing state instead of syncing |
| Key prop for identity | Use stable keys for list items |
| Effects for synchronization | useEffect syncs with external systems, not for state derivation |

## Anti-Patterns to Avoid

```tsx
// Bad: Prop drilling through many levels
<App user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <UserMenu user={user} />  // 4 levels deep!

// Good: Use context for widely-shared state
const UserContext = createContext<User | null>(null);

// Bad: Derived state in useState
const [items, setItems] = useState(initialItems);
const [filteredItems, setFilteredItems] = useState(initialItems); // Don't!

// Good: Derive during render
const filteredItems = useMemo(
  () => items.filter(item => item.active),
  [items]
);

// Bad: useEffect for state synchronization
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// Good: Compute during render
const fullName = `${firstName} ${lastName}`;

// Bad: Mutating state directly
const handleAdd = () => {
  items.push(newItem); // Mutation!
  setItems(items);
};

// Good: Create new reference
const handleAdd = () => {
  setItems(prev => [...prev, newItem]);
};
```

**Remember**: React code should be predictable and easy to trace. When in doubt, favor explicit over implicit, and composition over abstraction.
