# React 렌더링 & 상태 규칙

리렌더 최적화, 렌더링 성능, 클라이언트 데이터 패턴.

## 1. 리렌더 최적화 (MEDIUM)

### 파생 상태는 렌더 중에 계산 (useEffect 금지)

```tsx
// BAD - 불필요한 state + effect
const [firstName, setFirstName] = useState('First')
const [lastName, setLastName] = useState('Last')
const [fullName, setFullName] = useState('')
useEffect(() => setFullName(firstName + ' ' + lastName), [firstName, lastName])

// GOOD - 렌더 중 직접 계산
const [firstName, setFirstName] = useState('First')
const [lastName, setLastName] = useState('Last')
const fullName = firstName + ' ' + lastName
```

### 함수형 setState로 클로저 버그 방지

```tsx
// BAD - items 의존성 필요, stale closure 위험
const addItem = useCallback((item: Item) => {
  setItems([...items, item])
}, [items])

// GOOD - 안정적 콜백, stale closure 없음
const addItem = useCallback((item: Item) => {
  setItems(curr => [...curr, item])
}, [])
```

### 연속값 대신 파생 boolean 구독

```tsx
// BAD - 매 픽셀마다 리렌더
const width = useWindowWidth()
const isMobile = width < 768

// GOOD - boolean 변경 시에만 리렌더
const isMobile = useMediaQuery('(max-width: 767px)')
```

### 비긴급 업데이트는 startTransition

```tsx
// BAD - 스크롤마다 UI 블로킹
const handler = () => setScrollY(window.scrollY)

// GOOD - 비차단 업데이트
const handler = () => startTransition(() => setScrollY(window.scrollY))
```

### 비용 높은 작업은 memo 컴포넌트로 추출

```tsx
// BAD - loading 중에도 avatar 계산
function Profile({ user, loading }: Props) {
  const avatar = useMemo(() => computeAvatar(user), [user])
  if (loading) return <Skeleton />
  return <div>{avatar}</div>
}

// GOOD - loading이면 계산 자체를 건너뜀
const UserAvatar = memo(function({ user }: { user: User }) {
  const id = useMemo(() => computeAvatarId(user), [user])
  return <Avatar id={id} />
})

function Profile({ user, loading }: Props) {
  if (loading) return <Skeleton />
  return <div><UserAvatar user={user} /></div>
}
```

> React Compiler가 활성화되어 있으면 수동 memo/useMemo 불필요.

## 2. 렌더링 성능 (MEDIUM)

### content-visibility로 오프스크린 건너뛰기

```css
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

1000개 항목 중 ~990개의 레이아웃/페인트를 건너뛰어 10x 빠른 초기 렌더.

### hydration 깜빡임 방지 (localStorage/테마)

```tsx
// BAD - useEffect로 테마 적용 → 깜빡임
const [theme, setTheme] = useState('light')
useEffect(() => { setTheme(localStorage.getItem('theme') || 'light') }, [])

// GOOD - 인라인 스크립트로 hydration 전에 적용
<div id="theme-wrapper">{children}</div>
<script dangerouslySetInnerHTML={{ __html: `
  (function() {
    try {
      var t = localStorage.getItem('theme') || 'light';
      document.getElementById('theme-wrapper').className = t;
    } catch(e) {}
  })();
` }} />
```

### 조건부 렌더링은 삼항 연산자

```tsx
// BAD - count가 0이면 "0" 텍스트 렌더링
{count && <Badge>{count}</Badge>}

// GOOD - count가 0이면 아무것도 안 렌더
{count > 0 ? <Badge>{count}</Badge> : null}
```

## 3. 클라이언트 데이터 (MEDIUM-HIGH)

### SWR로 요청 자동 중복 제거

```tsx
// BAD - 각 인스턴스가 개별 fetch
const [users, setUsers] = useState([])
useEffect(() => { fetch('/api/users').then(r => r.json()).then(setUsers) }, [])

// GOOD - 여러 인스턴스가 하나의 요청 공유
const { data: users } = useSWR('/api/users', fetcher)
```
