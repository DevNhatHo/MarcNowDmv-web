# Working on MARC Now DMV web

Read docs/CURRENT_STATE.md, docs/ARCHITECTURE.md, docs/DESIGN.md, docs/API_CONTRACT.md and the selected ticket before editing. Inspect git status and preserve unrelated work. Resume IN_PROGRESS work first; implement one dependency-ready ticket at a time. Use one primary agent by default.

This repository owns presentation only. Do not modify the sibling backend or begin AWS work. Document API gaps here and propose separate backend work. Do not calculate movement, route matching, delay trends, or inferred causes in the browser. UNKNOWN is never ON_TIME. Official MTA, scheduled, and MARC Now calculated values remain distinct. Stale tracking never means stationary.

The initial session is documentation only. Start implementation at WEB-001 only when authorized in a subsequent session. Do not scaffold future empty packages.

For implementation: mark IN_PROGRESS in the ticket and current state, run the ticket tests and the established test/lint/typecheck/build commands, review the diff, and record actual results. For every visual change inspect rendered mobile and desktop views, including loading/error/empty/data states where applicable; capture screenshots when tools permit. Never mark a visual ticket DONE from automated tests alone. Use the checklist in docs/DESIGN.md. If blocked, document the blocker and leave incomplete.

Default is one completed ticket per final ticket-oriented commit, with user authorization to commit. Do not commit failing or unrelated work. Update the ticket index, current state, and runbook when commands change. No forced pushes; use configured upstream only. Do not invent a remote or claim unexecuted checks passed.
