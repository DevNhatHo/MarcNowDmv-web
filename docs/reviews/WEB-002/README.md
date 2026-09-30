# WEB-002 rendered review

Reviewed 2026-09-29 America/New_York using installed Chrome and temporary Playwright tooling against the production app at localhost:3000. No new test dependency was installed.

| View | Starter | Expanded keyboard focus | 200% CSS zoom | Grayscale stress fixture |
|---|---|---|---|---|
| Mobile 360×800 | [Image](mobile.png) | [Image](mobile-focus.png) | [Image](mobile-zoom-200.png) | [Image](mobile-grayscale-fixture.png) |
| Desktop 1280×900 | [Image](desktop.png) | [Image](desktop-focus.png) | [Image](desktop-zoom-200.png) | [Image](desktop-grayscale-fixture.png) |

All eight screenshots were visually inspected: heading dominates, service-unavailable copy remains readable and neutral, disclosure focus is obvious and uncut, long text wraps, and the 200% layout remains usable without horizontal overflow. One meaningful disclosure uses a surface; ordinary text remains unboxed. There are no duplicate status blocks or prominent diagnostics. Mobile gutters are 16px and desktop gutters 24px. The page remains a starter, not a completed commuter screen.

[Measured results](measurements.json): both viewports returned HTTP 200 with no uncaught page errors; Tab reached the native summary with visible 3px outline and 48px height; Enter expanded and Space collapsed it. Reduced-motion media emulation changed the motion token to zero and a temporary transition probe to 0.01ms, with automatic scrolling. All eight foreground roles on both intended backgrounds passed 4.5:1; minimum was 6.07:1. Ratios were computed from browser-resolved hex tokens using sRGB relative luminance (without rounding before comparison).

The temporary review script initially compared literal `0ms`; production CSS normalized it to `0s`. The review was corrected to compare numeric duration and rerun successfully. No application bug was concealed. CSS 200% zoom is a reflow stress simulation, not a claim of testing every browser's native zoom UI. Synthetic grayscale status labels and a long identifier were injected only into the review browser and labeled explicitly; they do not ship in app/page.tsx. Text alone distinguishes official on-time, calculated stationary, stale and unavailable examples.

Async loading/error/empty/real-data flows are inapplicable before API integration; no backend was contacted. Full screen-reader and cross-browser audits remain later work. Existing tests (2), lint, strict typecheck and production build passed. The review tooling was temporary under /tmp/marc-web-001-browser; a permanent Playwright suite remains WEB-004 scope.
