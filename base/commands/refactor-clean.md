# Refactor Clean

Invoke the **refactor-cleaner** agent to safely identify and remove dead code.

## Process

1. Agent runs dead code analysis (knip, depcheck, ts-prune)
2. Categorizes by risk: SAFE / CAUTION / DANGER
3. For each safe deletion: run tests → apply → re-run tests → rollback if fail
4. Shows summary of cleaned items

## Related

- Agent: `refactor-cleaner`
