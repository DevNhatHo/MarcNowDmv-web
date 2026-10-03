"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { fetchStops, fetchTrainDetail } from "../lib/api";
import type { MapTrain } from "../lib/presentation/markers";
import type { Stop } from "../lib/types/catalogs";
import type { TrainDetail } from "../lib/types/trains";
import { useSharedResource } from "./useSharedResource";
import TrainFacts from "./TrainFacts";
import styles from "./TrainQuickLook.module.css";

/**
 * A contextual preview of one train.
 *
 * **One pattern, both viewports.** This is a native `<dialog>` opened with `showModal()`,
 * styled as a sheet rising from the bottom on a phone and a compact centred panel on a wide
 * screen. The element gives focus trapping, Escape to dismiss, a backdrop and focus return to
 * the control that opened it — all behaviours this project would otherwise hand-roll, and all
 * of them easy to get subtly wrong.
 *
 * That choice is deliberate over an anchored popover. A popover is visually lighter on
 * desktop, but it needs its own positioning, dismissal and focus management, and the
 * accessibility floor here is not worth trading for a lighter shadow. **No component library
 * was added**: the app still has no UI dependency.
 *
 * Nothing is hover-only. It opens from a link, so pointer, keyboard and touch all reach it
 * identically, and the preview is never the only route to anything — "View train details"
 * leads to the full page.
 *
 * **The request rule.** Opening a preview reads the detail endpoint for that one train,
 * because `calculated` is deliberately absent from the trains list. This component is mounted
 * only while a preview is open, so closing it stops the read and its polling. It is never
 * prefetched for rows nobody opened, and never issued per row or per marker.
 */
export default function TrainQuickLook({
  train,
  closeHref,
  detailHref,
}: {
  train: MapTrain;
  /** Where dismissing returns to. Selection lives in the URL, so Back closes it too. */
  closeHref: string;
  detailHref: string;
}) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  /** Escape and a backdrop click both route through the same close link, so the URL and the
   * dialog can never disagree about whether a preview is open. */
  const close = useRef<HTMLAnchorElement | null>(null);

  const load = useCallback(
    (signal: AbortSignal) => fetchTrainDetail(train.id, { limit: 200 }, { signal }),
    [train.id],
  );
  const resource = useSharedResource<TrainDetail>(
    `quick-look:${train.id}`,
    "detail",
    load,
  );

  /*
   * Station names for the calculated next stop. Read here rather than by the screen, so a
   * list nobody previews pays nothing for it, and on the **catalog** cadence under a shared
   * key, so opening several previews reads it once.
   */
  const loadStops = useCallback(
    (signal: AbortSignal) => fetchStops({ limit: 200 }, { signal }),
    [],
  );
  const stops = useSharedResource<{ data: Stop[] }>("catalog:stops", "catalog", loadStops);

  useEffect(() => {
    const element = dialog.current;
    if (element === null || element.open) return;
    element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-label={`Quick look at ${train.label}`}
      /*
       * Escape fires `cancel` rather than a click, so dismissal is routed through the same
       * link the close control uses. Without this the dialog would close while the URL still
       * said a preview was open.
       */
      onCancel={(event) => {
        event.preventDefault();
        close.current?.click();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === dialog.current) close.current?.click();
      }}
    >
      <div className={styles.sheet}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{train.label}</h2>
            {train.line === null ? null : <p className={styles.line}>{train.line}</p>}
          </div>
          <Link ref={close} href={closeHref} className={styles.close} aria-label="Close quick look">
            ✕
          </Link>
        </div>

        <TrainFacts train={train} detail={resource.data} stops={stops.data?.data ?? []} />

        <Link href={detailHref} className={styles.details}>
          View train details →
        </Link>
      </div>
    </dialog>
  );
}
