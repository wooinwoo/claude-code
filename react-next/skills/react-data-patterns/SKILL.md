---
name: react-data-patterns
description: React data fetching and state management patterns using TanStack Query, SWR, Suspense, error boundaries, and optimistic updates for robust client-server data synchronization.
---

# React Data Patterns

Data fetching, caching, and server-state management patterns for React applications.

## When to Activate

- Implementing data fetching in React components
- Setting up caching strategies for API data
- Building optimistic updates for better UX
- Handling loading, error, and empty states
- Integrating with REST or GraphQL APIs

## Data Fetching with TanStack Query

### Basic Query

```tsx
import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
    </div>
  );
}
```

### Query with Filters and Pagination

```tsx
interface MarketFilters {
  status?: 'active' | 'closed';
  category?: string;
  page: number;
  limit: number;
}

function useMarkets(filters: MarketFilters) {
  return useQuery({
    queryKey: ['markets', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.category) params.set('category', filters.category);
      params.set('page', String(filters.page));
      params.set('limit', String(filters.limit));

      const response = await fetch(`/api/markets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch markets');
      return response.json() as Promise<{ data: Market[]; total: number }>;
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

function MarketList() {
  const [filters, setFilters] = useState<MarketFilters>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, isPlaceholderData } = useMarkets(filters);

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />
      {isLoading && !data ? (
        <Skeleton count={5} />
      ) : (
        <>
          <div className={isPlaceholderData ? 'opacity-50' : ''}>
            {data?.data.map(market => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
          <Pagination
            total={data?.total ?? 0}
            page={filters.page}
            limit={filters.limit}
            onChange={(page) => setFilters(prev => ({ ...prev, page }))}
          />
        </>
      )}
    </div>
  );
}
```

### Dependent Queries

```tsx
function UserDashboard({ userId }: { userId: string }) {
  // First query: fetch user
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // Second query: depends on first
  const ordersQuery = useQuery({
    queryKey: ['orders', userId],
    queryFn: () => fetchOrders(userId),
    enabled: !!userQuery.data, // Only run when user is loaded
  });

  if (userQuery.isLoading) return <Spinner />;

  return (
    <div>
      <UserHeader user={userQuery.data!} />
      {ordersQuery.isLoading ? (
        <OrdersSkeleton />
      ) : (
        <OrderList orders={ordersQuery.data ?? []} />
      )}
    </div>
  );
}
```

## Mutations

### Basic Mutation with Cache Invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateMarket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMarketDto) => {
      const response = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create market');
      return response.json() as Promise<Market>;
    },
    onSuccess: () => {
      // Invalidate and refetch market lists
      queryClient.invalidateQueries({ queryKey: ['markets'] });
    },
  });
}

function CreateMarketForm() {
  const createMarket = useCreateMarket();

  const handleSubmit = (data: CreateMarketDto) => {
    createMarket.mutate(data, {
      onSuccess: (market) => {
        toast.success(`Market "${market.name}" created`);
        router.push(`/markets/${market.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={createMarket.isPending}>
        {createMarket.isPending ? 'Creating...' : 'Create Market'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```tsx
function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ marketId, isFavorite }: {
      marketId: string;
      isFavorite: boolean;
    }) => {
      const response = await fetch(`/api/markets/${marketId}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });
      if (!response.ok) throw new Error('Failed to toggle favorite');
    },

    // Optimistic update
    onMutate: async ({ marketId, isFavorite }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['market', marketId] });

      // Snapshot previous value
      const previousMarket = queryClient.getQueryData<Market>(['market', marketId]);

      // Optimistically update
      queryClient.setQueryData<Market>(['market', marketId], (old) =>
        old ? { ...old, isFavorite: !isFavorite } : old
      );

      return { previousMarket };
    },

    // Rollback on error
    onError: (_err, { marketId }, context) => {
      if (context?.previousMarket) {
        queryClient.setQueryData(['market', marketId], context.previousMarket);
      }
    },

    // Always refetch after mutation
    onSettled: (_data, _error, { marketId }) => {
      queryClient.invalidateQueries({ queryKey: ['market', marketId] });
    },
  });
}
```

## SWR Alternative

### Basic SWR Usage

```tsx
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
});

function UserProfile({ userId }: { userId: string }) {
  const { data, error, isLoading, mutate } = useSWR<User>(
    `/api/users/${userId}`,
    fetcher
  );

  if (isLoading) return <Skeleton />;
  if (error) return <Alert>{error.message}</Alert>;

  return (
    <div>
      <h2>{data!.name}</h2>
      <button onClick={() => mutate()}>Refresh</button>
    </div>
  );
}
```

### SWR with Optimistic Updates

```tsx
function useUpdateProfile() {
  const { data, mutate } = useSWR<User>('/api/profile', fetcher);

  const updateProfile = async (updates: Partial<User>) => {
    // Optimistic update
    await mutate(
      async () => {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        return response.json();
      },
      {
        optimisticData: data ? { ...data, ...updates } : undefined,
        rollbackOnError: true,
        revalidate: false,
      }
    );
  };

  return { profile: data, updateProfile };
}
```

## API Layer Patterns

### Type-Safe API Client

```tsx
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        error.message || 'Request failed'
      );
    }

    return response.json();
  }

  // Typed API methods
  users = {
    list: (params?: { page?: number; limit?: number }) =>
      this.request<PaginatedResponse<User>>(`/users?${new URLSearchParams(params as any)}`),

    get: (id: string) =>
      this.request<User>(`/users/${id}`),

    create: (data: CreateUserDto) =>
      this.request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: Partial<User>) =>
      this.request<User>(`/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      this.request<void>(`/users/${id}`, { method: 'DELETE' }),
  };
}

export const api = new ApiClient();

// Usage with TanStack Query
const { data } = useQuery({
  queryKey: ['users', page],
  queryFn: () => api.users.list({ page, limit: 20 }),
});
```

### Custom Error Class

```tsx
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isValidationError() {
    return this.status === 422;
  }
}
```

## Error Handling Patterns

### Error Boundary with Retry

```tsx
function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div role="alert" className="p-4 bg-red-50 rounded-lg">
          <h3 className="text-red-800 font-semibold">Something went wrong</h3>
          <p className="text-red-600">{error.message}</p>
          <button
            onClick={() => {
              queryClient.invalidateQueries();
              resetErrorBoundary();
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### Global Error Handler

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      onError: (error) => {
        if (error instanceof ApiError && error.isUnauthorized) {
          // Redirect to login
          window.location.href = '/login';
        }
      },
    },
  },
});
```

## Suspense Integration

### Suspense with TanStack Query

```tsx
function UserProfileSuspense({ userId }: { userId: string }) {
  // useSuspenseQuery throws promise for Suspense
  const { data } = useSuspenseQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // data is guaranteed to exist here
  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
    </div>
  );
}

// Parent wraps with Suspense
function UserPage({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfileSuspense userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Parallel Suspense Queries

```tsx
function DashboardContent() {
  // These queries run in parallel
  const { data: stats } = useSuspenseQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  });

  const { data: recentActivity } = useSuspenseQuery({
    queryKey: ['activity'],
    queryFn: fetchRecentActivity,
  });

  return (
    <div>
      <StatsGrid stats={stats} />
      <ActivityFeed items={recentActivity} />
    </div>
  );
}

function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
```

## Real-Time Data Patterns

### WebSocket Integration

```tsx
function useWebSocket<T>(url: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as {
        type: string;
        queryKey: string[];
        data: T;
      };

      // Update the relevant query cache
      queryClient.setQueryData(message.queryKey, message.data);
    };

    return () => ws.close();
  }, [url, queryClient]);

  return { isConnected };
}
```

### Polling Pattern

```tsx
function useLivePrice(marketId: string) {
  return useQuery({
    queryKey: ['price', marketId],
    queryFn: () => fetchPrice(marketId),
    refetchInterval: 5000, // Poll every 5 seconds
    refetchIntervalInBackground: false, // Pause when tab is hidden
  });
}
```

## Caching Strategies

### Stale-While-Revalidate

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // Data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000,       // Cache kept for 30 minutes
    },
  },
});
```

### Prefetching

```tsx
function MarketList({ markets }: { markets: Market[] }) {
  const queryClient = useQueryClient();

  return (
    <ul>
      {markets.map(market => (
        <li
          key={market.id}
          onMouseEnter={() => {
            // Prefetch market details on hover
            queryClient.prefetchQuery({
              queryKey: ['market', market.id],
              queryFn: () => fetchMarket(market.id),
              staleTime: 60 * 1000,
            });
          }}
        >
          <Link to={`/markets/${market.id}`}>{market.name}</Link>
        </li>
      ))}
    </ul>
  );
}
```

### Initial Data from Cache

```tsx
function MarketDetail({ marketId }: { marketId: string }) {
  const { data } = useQuery({
    queryKey: ['market', marketId],
    queryFn: () => fetchMarket(marketId),
    // Use data from the list query as initial data
    initialData: () => {
      const markets = queryClient.getQueryData<Market[]>(['markets']);
      return markets?.find(m => m.id === marketId);
    },
  });

  // ...
}
```

## Data Fetching with Next.js

### Server Components (Next.js App Router)

```tsx
// app/users/page.tsx (Server Component)
async function UsersPage() {
  const users = await fetch('https://api.example.com/users', {
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
  }).then(res => res.json());

  return <UserList users={users} />;
}

// Client component for interactive features
'use client';
function UserList({ users }: { users: User[] }) {
  const [search, setSearch] = useState('');
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

### Server Actions

```tsx
// app/actions.ts
'use server';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  const user = await db.users.create({ data: { name, email } });

  revalidatePath('/users');
  return user;
}

// app/users/new/page.tsx
'use client';
import { createUser } from '../actions';

function NewUserForm() {
  const [state, formAction] = useFormState(createUser, null);

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit">Create User</button>
    </form>
  );
}
```

## Best Practices

**DO:**
- Use TanStack Query or SWR for server state
- Separate server state from client state
- Handle loading, error, and empty states
- Use optimistic updates for better UX
- Prefetch data for navigation
- Set appropriate staleTime and gcTime
- Use typed API clients

**DON'T:**
- Store server data in useState/useReducer
- Fetch in useEffect without a library (missing caching, dedup, retry)
- Ignore error states
- Use `any` for API response types
- Poll at aggressive intervals
- Forget to invalidate cache after mutations
- Mix server and client state in the same store

**Remember**: Server state and client state are fundamentally different. Use the right tool for each.
