# Next.js & React 성능 규칙

Vercel React Best Practices 기반. 코드 작성/리뷰 시 항상 적용.

## 1. Waterfall 제거 (CRITICAL)

### 독립 작업은 Promise.all

```typescript
// BAD - 순차 실행 (3 round trips)
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()

// GOOD - 병렬 실행 (1 round trip)
const [user, posts, comments] = await Promise.all([
  fetchUser(), fetchPosts(), fetchComments()
])
```

### await는 필요한 분기로 이동

```typescript
// BAD - 항상 대기
async function handle(userId: string, skip: boolean) {
  const data = await fetchData(userId)
  if (skip) return { skipped: true }
  return process(data)
}

// GOOD - 필요할 때만 대기
async function handle(userId: string, skip: boolean) {
  if (skip) return { skipped: true }
  const data = await fetchData(userId)
  return process(data)
}
```

### Suspense로 스트리밍

```tsx
// BAD - 전체 페이지가 데이터 대기
async function Page() {
  const data = await fetchData()
  return <div><Header /><DataView data={data} /><Footer /></div>
}

// GOOD - 레이아웃 즉시 렌더, 데이터만 스트리밍
function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        <DataView />
      </Suspense>
      <Footer />
    </div>
  )
}
```

## 2. 번들 최적화 (CRITICAL)

### 배럴 파일 직접 임포트

```typescript
// BAD - 전체 라이브러리 로드 (200-800ms)
import { Check, X } from 'lucide-react'

// GOOD - 필요한 것만 로드
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'

// GOOD (Next.js) - next.config에서 자동 변환
// experimental: { optimizePackageImports: ['lucide-react'] }
```

### 무거운 컴포넌트는 dynamic import

```tsx
// BAD - 메인 번들에 포함
import { MonacoEditor } from './monaco-editor'

// GOOD - 필요할 때 로드
import dynamic from 'next/dynamic'
const MonacoEditor = dynamic(() => import('./monaco-editor'), { ssr: false })
```

### 서드파티는 hydration 후 로드

```tsx
// BAD - 초기 번들 차단
import { Analytics } from '@vercel/analytics/react'

// GOOD - hydration 후 로드
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(m => m.Analytics),
  { ssr: false }
)
```

## 3. 서버 사이드 (HIGH)

### Server Action은 API 라우트처럼 인증

```typescript
'use server'

export async function deleteUser(userId: string) {
  // Server Action은 공개 엔드포인트. 반드시 내부에서 인증
  const session = await verifySession()
  if (!session) throw new Error('Unauthorized')
  if (session.user.role !== 'admin' && session.user.id !== userId) {
    throw new Error('Forbidden')
  }
  await db.user.delete({ where: { id: userId } })
}
```

### React.cache()로 요청 내 중복 제거

```typescript
import { cache } from 'react'

// 같은 요청 내에서 여러 번 호출해도 1번만 실행
export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null
  return db.user.findUnique({ where: { id: session.user.id } })
})

// 주의: 인자는 원시값만 (Object.is 비교)
const getUser = cache(async (uid: number) => { /* ... */ })  // OK
const getUser = cache(async (params: { uid: number }) => { /* ... */ })  // 항상 miss
```

### RSC 경계에서 직렬화 최소화

```tsx
// BAD - 50개 필드 전체 직렬화
async function Page() {
  const user = await fetchUser()
  return <Profile user={user} />
}

// GOOD - 필요한 필드만 전달
async function Page() {
  const user = await fetchUser()
  return <Profile name={user.name} avatar={user.avatar} />
}
```

### 컴포넌트 분리로 병렬 fetch

```tsx
// BAD - Header fetch 끝나야 Sidebar fetch 시작
async function Page() {
  const header = await fetchHeader()
  return <div><div>{header}</div><Sidebar /></div>
}

// GOOD - 동시 fetch
function Page() {
  return <div><Header /><Sidebar /></div>
}
async function Header() { const data = await fetchHeader(); return <div>{data}</div> }
async function Sidebar() { const items = await fetchSidebarItems(); return <nav>...</nav> }
```
