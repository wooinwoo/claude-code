---
description: 학습 시스템 통합 커맨드. 패턴 추출, 상태 조회, 진화, 스킬 생성, 내보내기/가져오기.
---

# Learn — 학습 시스템

## Usage

```
/learn                    → 현재 세션에서 패턴 추출
/learn status             → 학습된 instinct 목록 + 신뢰도
/learn evolve             → 관련 instinct → 스킬/커맨드/에이전트 진화
/learn create             → git 히스토리에서 커스텀 스킬 생성
/learn export             → instinct 내보내기 (팀 공유)
/learn import <path>      → instinct 가져오기
```

## 서브커맨드

### (기본) — 패턴 추출

현재 세션을 분석하여 재사용 가능한 패턴을 추출합니다.

**추출 대상:**
- 에러 해결 패턴 (어떤 에러 → 원인 → 수정)
- 디버깅 기법 (비자명한 진단 과정)
- 라이브러리 워크어라운드
- 프로젝트 고유 패턴

**절차:**
1. 세션에서 추출할 패턴 식별
2. `~/.claude/skills/learned/{pattern-name}.md` 초안 작성
3. 사용자 확인 후 저장

**저장 제외:** 오타, 단순 문법 에러, 일회성 이슈

### status — Instinct 조회

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py status
```

도메인별 그룹핑, 신뢰도 바 표시.

옵션: `--domain <name>`, `--low-confidence`, `--high-confidence`

### evolve — Instinct 진화

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py evolve
```

3개 이상 관련 instinct를 클러스터링:
- **→ Command**: 사용자가 명시적으로 요청하는 액션들
- **→ Skill**: 자동 트리거되는 행동들
- **→ Agent**: 복잡한 멀티스텝 프로세스

옵션: `--execute`, `--dry-run`, `--domain <name>`, `--threshold <n>`

### create — 커스텀 스킬 생성

로컬 git 히스토리를 분석하여 코딩 패턴을 추출하고 SKILL.md를 생성합니다.

### export — 내보내기

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py export [--format json|yaml]
```

팀원이나 다른 프로젝트와 instinct를 공유합니다.

### import — 가져오기

```bash
python3 ~/.claude/skills/continuous-learning-v2/scripts/instinct-cli.py import <path> [--trust-level 0.5]
```

외부 instinct를 `inherited/` 디렉토리로 가져옵니다.
