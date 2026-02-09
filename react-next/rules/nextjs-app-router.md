# Next.js App Router 컨벤션

App Router 파일 구조, Server/Client 컴포넌트, 라우팅 패턴.

## 1. 파일 컨벤션

```
app/
├── layout.tsx          # 공유 레이아웃 (중첩 가능)
├── page.tsx            # 라우트 UI
├── loading.tsx         # Suspense fallback (자동 적용)
├── error.tsx           # Error Boundary (자동 적용, 'use client' 필수)
├── not-found.tsx       # 404 UI
├── route.ts            # API 엔드포인트 (page.tsx와 공존 불가)
├── template.tsx        # 매 네비게이션마다 새 인스턴스 (layout과 다름)
├── default.tsx         # Parallel route fallback
└── (group)/            # Route group (URL에 영향 없음)
    └── page.tsx
```

## 2. Server vs Client 컴포넌트

**기본은 Server Component.** `'use client'`는 필요할 때만.

| Server Component | Client Component (`'use client'`) |
|-------------------|-----------------------------------|
| 데이터 fetch (async/await) | useState, useEffect, 이벤트 핸들러 |
| 민감 정보 접근 (DB, env) | 브라우저 API (localStorage, window) |
| 번들 사이즈 0 | 인터랙션 (onClick, onChange) |
| SEO 콘텐츠 | 서드파티 클라이언트 라이브러리 |

### 경계 설계 원칙

```tsx
// BAD - 전체 페이지를 Client로
'use client'
export default function Page() {
  const [count, setCount] = useState(0)
  const data = useQuery(...)  // 서버에서 할 수 있는 걸 클라이언트에서
  return <div>{data.map(...)}<button onClick={() => setCount(c+1)}>{count}</button></div>
}

// GOOD - 인터랙션만 Client, 나머지 Server
export default async function Page() {
  const data = await fetchData()  // Server에서 fetch
  return (
    <div>
      {data.map(item => <Card key={item.id} item={item} />)}
      <Counter />  {/* 인터랙션만 Client */}
    </div>
  )
}

// Counter.tsx
'use client'
export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c+1)}>{count}</button>
}
```

### Client 경계는 최대한 아래로

```tsx
// BAD - 상위에서 'use client' → 하위 전체가 Client
'use client'
function Dashboard() {  // 큰 컴포넌트 전체가 Client
  const [tab, setTab] = useState('overview')
  return <div><Sidebar /><Content tab={tab} /><Analytics /></div>
}

// GOOD - 필요한 부분만 Client
function Dashboard() {  // Server Component
  return (
    <div>
      <Sidebar />
      <TabSwitcher />  {/* 이것만 Client */}
      <Analytics />
    </div>
  )
}
```

## 3. 데이터 패턴

### Server Component에서 직접 fetch

```tsx
// page.tsx — Server Component
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id)
  return <ProductDetail product={product} />
}
```

### 병렬 데이터 로딩

```tsx
// layout에서 여러 데이터를 병렬로
export default async function Layout({ children }: { children: ReactNode }) {
  const [user, notifications] = await Promise.all([
    getUser(), getNotifications()
  ])
  return <div><Nav user={user} notifications={notifications} />{children}</div>
}
```

### loading.tsx로 스트리밍

```tsx
// loading.tsx — 자동으로 Suspense boundary 생성
export default function Loading() {
  return <Skeleton />
}
```

## 4. Metadata

```tsx
// 정적
export const metadata: Metadata = {
  title: '페이지 제목',
  description: '설명',
}

// 동적
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.id)
  return { title: product.name, description: product.description }
}
```

## 5. 라우트 핸들러

```tsx
// app/api/users/route.ts
export async function GET(request: Request) {
  const users = await db.user.findMany()
  return Response.json(users)
}

export async function POST(request: Request) {
  const body = await request.json()
  const user = await db.user.create({ data: body })
  return Response.json(user, { status: 201 })
}
```

## 6. Server Actions

```tsx
// actions.ts
'use server'

export async function createPost(formData: FormData) {
  const session = await auth()  // 반드시 인증 확인
  if (!session) throw new Error('Unauthorized')

  const title = formData.get('title') as string
  await db.post.create({ data: { title, authorId: session.user.id } })
  revalidatePath('/posts')
}

// page.tsx
export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">작성</button>
    </form>
  )
}
```
