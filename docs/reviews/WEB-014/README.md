# WEB-014 rendered review

Production build in installed Chrome at 360×800 and 1280×900 against the live local backend.

## Result

The same real train that read **"Train548"** now reads **"PERRYVILLE"**, with the verbatim
identifier and the line name beside it:

> # PERRYVILLE
> Train548 · PENN - WASHINGTON
> *Destination as scheduled by the operator; it does not describe where this train is now.*

Requests issued by the detail screen, at both viewports:

```
/api/v1/trains/{id}?limit=200
/api/v1/stops?limit=200
/api/v1/routes?limit=200
/api/v1/departures?stopId=11958&serviceDate=2026-09-30&routeId=11705&limit=200
```

**One departures request**, anchored on a stop this train demonstrably calls at — its own
first scheduled stop — and filtered to its route. 0 px horizontal overflow, no page errors.

## Scope delivered, and what was not

The ticket asked for the destination on the list, the detail screen and the Pulse preview.
**Only the detail screen got it**, and that is a deliberate narrowing rather than an
oversight.

A detail screen knows a stop the train calls at, so it can anchor the stop-scoped departures
read exactly. **The list cannot**: its response carries no stops, so there is no stop to
anchor on and no way to discover one without first reading a train's detail — which is the
per-train fan-out the ticket forbids.

Pulse turned out not to need it at all: its sections are lines, not trains, so there is no
train identity on that screen to improve.

## Evidence for the backend ask

One probe makes the missing piece precise. A single departures read at stop **11958** (Union
Station Washington) returned **91 trips across all three routes** with `nextAfter: null` —
nearly the whole service date's trains, in one bounded request.

So the data needed to label the list already exists and is cheap to serve; what is missing is
any way for the client to know which stop to anchor on. BACKEND-UI-01 is updated with that
finding: either carry the headsign on the train list and detail responses, or expose the
line's terminal so one anchored read can cover it.

## Design checklist

- **What dominates?** The destination now, which is what a commuter recognises. The trip
  identifier moved beside it rather than away, because support and diagnosis still need it.
- **Anything duplicated?** No; the identifier appears once and only when a destination
  replaced it in the heading.
- **Unknown distinct from healthy?** A destination is SCHEDULED, and the screen says so in
  words: "it does not describe where this train is now." It cannot be mistaken for realtime.
- **Official distinct from calculated?** The headsign is the operator's own published value,
  joined on the trip identifier the backend itself returned. Nothing is parsed out of the
  identifier and no destination is inferred.
- **Without colour?** Unchanged; this is text only.

## Limitations

The list and Pulse are unchanged, for the reason above. A train whose trip is absent from the
departures response keeps its identifier — tested — and a failed departures read costs only
the label, never the screen, because a missing destination is a missing label while a missing
status is the reason the commuter came.

Chrome only; not a full accessibility audit.
