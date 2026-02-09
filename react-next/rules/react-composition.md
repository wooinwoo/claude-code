# React 컴포넌트 구조 규칙

Vercel Composition Patterns 기반. 컴포넌트 설계/리팩토링 시 항상 적용.

## 1. Boolean Prop 금지 (CRITICAL)

boolean prop이 늘어나면 가능한 상태가 기하급수적으로 증가. 합성(composition)으로 해결.

```tsx
// BAD - boolean prop으로 분기
<Composer isThread isEditing={false} channelId="abc" showAttachments />

// GOOD - 명시적 변형 컴포넌트
<ThreadComposer channelId="abc" />
<EditComposer messageId="xyz" />
<ForwardComposer messageId="123" />
```

각 변형은 공유 부품을 조합하되, 자체적으로 명시적이고 자기 설명적.

```tsx
function ThreadComposer({ channelId }: { channelId: string }) {
  return (
    <Composer.Frame>
      <Composer.Input />
      <AlsoSendToChannelField channelId={channelId} />
      <Composer.Footer>
        <Composer.Formatting />
        <Composer.Submit />
      </Composer.Footer>
    </Composer.Frame>
  )
}
```

## 2. Compound Component 패턴 (HIGH)

복잡한 컴포넌트는 공유 context + 하위 컴포넌트로 구성. renderX prop 대신 children 사용.

```tsx
// BAD - renderX props
<Composer
  renderHeader={() => <Header />}
  renderFooter={() => <><Formatting /><Emojis /></>}
  renderActions={() => <Submit />}
/>

// GOOD - compound components with children
<Composer.Frame>
  <Composer.Header />
  <Composer.Input />
  <Composer.Footer>
    <Composer.Formatting />
    <Composer.Emojis />
    <Composer.Submit />
  </Composer.Footer>
</Composer.Frame>
```

> renderX prop은 부모가 자식에게 데이터를 전달해야 할 때만 사용 (예: `renderItem={({ item }) => ...}`).

## 3. 상태를 Provider로 분리 (HIGH)

UI 컴포넌트는 context 인터페이스만 소비. 상태 구현(useState, Zustand, 서버 동기화)은 Provider가 담당.

```tsx
// 제네릭 인터페이스 정의
interface ComposerContextValue {
  state: { input: string; attachments: Attachment[]; isSubmitting: boolean }
  actions: { update: (updater: (s: State) => State) => void; submit: () => void }
  meta: { inputRef: React.RefObject<TextInput> }
}

// UI 컴포넌트 - 인터페이스만 의존
function ComposerInput() {
  const { state, actions: { update }, meta } = use(ComposerContext)
  return <TextInput ref={meta.inputRef} value={state.input}
    onChangeText={(text) => update(s => ({ ...s, input: text }))} />
}

// Provider A - 로컬 상태
function ForwardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState)
  return <ComposerContext value={{ state, actions: { update: setState, submit }, meta }}>
    {children}
  </ComposerContext>
}

// Provider B - 글로벌 동기화 상태
function ChannelProvider({ channelId, children }: Props) {
  const { state, update, submit } = useGlobalChannel(channelId)
  return <ComposerContext value={{ state, actions: { update, submit }, meta }}>
    {children}
  </ComposerContext>
}
```

같은 UI, 다른 Provider. Provider를 바꾸면 상태 구현이 바뀌지만 UI는 그대로.

## 4. 상태를 Provider로 끌어올리기 (HIGH)

상태가 컴포넌트 내부에 갇히면 형제 컴포넌트가 접근 불가. Provider로 올리면 Provider 내 어디서든 접근 가능.

```tsx
// BAD - 상태가 Composer 내부에 갇힘
function Dialog() {
  return (
    <div>
      <ForwardComposer />
      <MessagePreview />     {/* composer 상태 접근 불가 */}
      <ForwardButton />      {/* submit 호출 불가 */}
    </div>
  )
}

// GOOD - Provider로 올리면 형제도 접근 가능
function Dialog() {
  return (
    <ForwardProvider>
      <ForwardComposer />
      <MessagePreview />     {/* use(ComposerContext)로 state 접근 */}
      <ForwardButton />      {/* use(ComposerContext)로 submit 호출 */}
    </ForwardProvider>
  )
}
```

## 5. React 19 API (MEDIUM)

> React 19+ 프로젝트에만 적용.

```tsx
// forwardRef 불필요 — ref는 일반 prop
function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}

// useContext 대신 use
const value = use(MyContext)  // 조건부 호출도 가능
```
