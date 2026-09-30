# WEB-012 integration smoke record

The whole path a commuter takes — browser → same-origin proxy → Go backend — exercised
against the real local stack at 360×800 and 1280×900.

## Setup actually used

Backend, from `/home/nhat/MarcNowDmv`, read-only against the retained planning database:

```
DATABASE_URL='postgres://marc_now_dmv:marc_now_dmv_local@127.0.0.1:5432/marc_208_live?sslmode=disable' \
  HTTP_ADDR=127.0.0.1:8080 go run ./cmd/api
```

Frontend, from `/home/nhat/marc-now-dmv-web`, with `.env.local` copied from `.env.example`
and `API_BASE_URL=http://127.0.0.1:8080`:

```
npm run build && npm start
npx playwright test          # 46 tests, 23 per viewport
```

**No feed was ingested, no migration was run and no schema was changed.** The database is
the retained one from planning; the frontend never writes.

## Screenshots

| File | What it shows |
|---|---|
| `*-1-pulse.png` → `*-4-alerts.png` | the journey: Pulse → filtered list → detail → alerts |
| `*-offline-pulse.png`, `*-offline-trains.png`, `*-offline-alerts.png` | every screen with the backend unreachable |

## Results

| Check | Result |
|---|---|
| `/health` through the proxy | 200, `{"status":"ok"}` |
| CORS header on the proxied response | **absent**, and not needed — the request is same-origin |
| Allowlisted paths (`trains`, `routes`, `alerts`) | 200 |
| Non-contract paths (`routes/{id}`, `/metrics`, `/api/v2/trains`) | 404, backend never contacted |
| `POST` to the proxy | 405 |
| `?limit=bad` | 400, passed through untouched |
| Unknown train id | 404 → "That train isn't available" |
| `?afterStop=1` on a real id | 200 |
| `?stopAfter=1` on a real id | **400** — confirms the handler's cursor names, not the prose's |
| Journey Pulse → line → detail → back | filters restored exactly: `?serviceDate=20260930&routeId=11704` |
| List ordering | chronological across every loaded page |
| Pagination | completes and says so, rather than leaving a partial list looking complete |
| Backend unreachable, all three screens | "Couldn't reach the service" with a retry, and **no good news**: neither "On time" nor "No active MARC alerts reported" appears |

## Integration defect found and fixed

The detail error page showed **two identical "Back to trains" links** — one above the
notice and one inside its actions. Strict-mode locator resolution surfaced it, and the
design checklist forbids the duplication. The notice now offers only the action it adds.

## One contract discrepancy re-confirmed against a live backend

The backend's own prose documents `stopAfter`/`updateAfter` while the handler accepts
`afterStop`/`afterUpdate`. This suite now proves it live at the HTTP level: the documented
name returns **400** and the implemented name returns **200** on the same real identifier.
That is recorded as BACKEND-UI-04 in [BACKEND_GAPS.md](../../BACKEND_GAPS.md); the backend
was not modified.

## Limitations

The retained database holds **no fresh realtime evidence**, so the live journey shows every
train as "Realtime status unavailable" and every calculation as unknown. The delayed,
cancelled, moving, stationary and trend presentations are covered by unit tests and by
clearly labelled synthetic fixtures — not by this smoke test, which asserts behaviour rather
than any particular train.

This suite is the **only** one that needs the backend; everything else in the repository is
deterministic, so CI never depends on a live service. It asserts no particular train, time
or count, so it keeps working as retained data changes.

Chrome only. No screen reader, no second engine, no load or soak testing.
