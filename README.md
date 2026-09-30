# MARC Now DMV web

A local commuter frontend for the existing Go backend. The local Next.js App Router starter is available. Train data, navigation, design tokens and maps are follow-on tickets.

Start with [current state](docs/CURRENT_STATE.md), [architecture](docs/ARCHITECTURE.md), [design](docs/DESIGN.md), and [ticket index](docs/tickets/README.md). Local setup and planned commands are in the [runbook](docs/RUNBOOK.md).

The backend is logically `marc-now-dmv-backend`; its existing checkout is `/home/nhat/MarcNowDmv`. This separate frontend checkout is `/home/nhat/marc-now-dmv-web`. Neither repository was renamed. AWS is outside this milestone.

MARC Now DMV is an independent service and is not affiliated with or endorsed by MDOT MTA.

System map and focused train maps are now part of the follow-on roadmap: [map plan and library recommendation](docs/MAP_PLAN.md). The original core plan remains intact; map implementation has not begun.

## Run locally

Use Node 24 LTS and npm 11, then `npm ci` and `npm run dev`. Open http://localhost:3000. The starter does not require the backend or environment variables; `.env.example` documents the planned WEB-003 proxy configuration.

Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`. Production preview: `npm run build` then `npm start` (stop the dev server first; both use port 3000).
