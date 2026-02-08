# Update Documentation

Invoke the **doc-updater** agent to sync documentation with source code.

## Capabilities

### Code Documentation
- Read `package.json` scripts → generate scripts reference
- Read `.env.example` → document env vars
- Generate `docs/CONTRIB.md` (dev workflow, setup, testing)
- Generate `docs/RUNBOOK.md` (deployment, monitoring, rollback)

### Architecture Maps
- Scan source files for imports/exports/dependencies
- Generate codemaps: `codemaps/architecture.md`, `backend.md`, `frontend.md`, `data.md`
- Add freshness timestamps
- Request approval if changes > 30%

## Related

- Agent: `doc-updater`
