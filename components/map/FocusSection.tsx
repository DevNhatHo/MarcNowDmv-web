"use client";

import type { MapTrain } from "../../lib/presentation/markers";
import type { Stop } from "../../lib/types/catalogs";
import type { TrainDetail } from "../../lib/types/trains";
import { fetchTrainDetail } from "../../lib/api";
import { useSharedResource } from "../useSharedResource";
import FocusPanel from "./FocusPanel";
import { useCallback } from "react";

/**
 * Loads the focused train's detail and renders its panel.
 *
 * This exists as its own component so the read is **mounted only while something is
 * selected**: exiting focus unmounts it, which stops the request and its polling rather
 * than leaving a subscription running for a train nobody is looking at.
 *
 * It is one request for one train, on the detail cadence. It is never issued per marker.
 */
export default function FocusSection({
  id,
  train,
  stops,
  follow,
  onFollowChange,
  followPaused,
  exitHref,
  detailHref,
}: {
  id: string;
  train: MapTrain;
  stops: readonly Stop[];
  follow: boolean;
  onFollowChange: (next: boolean) => void;
  followPaused: boolean;
  exitHref: string;
  detailHref: string;
}) {
  const load = useCallback(
    (signal: AbortSignal) => fetchTrainDetail(id, { limit: 200 }, { signal }),
    [id],
  );
  const resource = useSharedResource<TrainDetail>(`map-focus:${id}`, "detail", load);

  return (
    <FocusPanel
      train={train}
      // A failed or in-flight detail read leaves the panel's own facts intact: identity,
      // trust and the official status all come from the list and are unaffected by it.
      detail={resource.data ?? null}
      stops={stops}
      follow={follow}
      onFollowChange={onFollowChange}
      followPaused={followPaused}
      exitHref={exitHref}
      detailHref={detailHref}
    />
  );
}
