# WEB-MAP-7 — rendered review

Production build, system Chrome, against the local backend with `cmd/ingest` polling.

| File | Shows | Data |
|---|---|---|
| `desktop-system.png`, `mobile-system.png` | The system map | **Real** |
| `desktop-focused.png`, `mobile-focused.png` | A focused train | **Real** |
| `desktop-reduced-motion.png`, `mobile-reduced-motion.png` | The same map under `prefers-reduced-motion` | **Real** |
| `SYNTHETIC-before-new-position.png` | A marker before a newer report arrives | **SYNTHETIC** |
| `SYNTHETIC-mid-transition.png` | The same marker **795 ms** into its 900 ms transition | **SYNTHETIC** |
| `SYNTHETIC-after-settled.png` | The marker settled on the new published coordinate | **SYNTHETIC** |

## The synthetic frames, stated plainly

To capture a transition in flight, a test intercept shifted **one train's coordinate 0.25°
west** and advanced its `sourceTimestamp` by 30 s. That movement **did not happen**. It is not
an observed MARC train, was never published by MDOT, and must not be read or reused as one.
Every other marker in those three frames is real.

The mid frame differs from **both** endpoints, which is the evidence that the marker was caught
mid-transition rather than photographed after it landed.

## Limits

A still cannot show that a marker *stopped*. That it never drifts past its newest observation
is asserted by `tests/e2e/map.spec.ts` and by the unit tests on `motionFor` and `pointAlong`,
not by these images.
