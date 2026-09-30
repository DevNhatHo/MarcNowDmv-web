import type { Calculated } from "../lib/types/trains";
import type { Tone } from "../lib/presentation/status";
import {
  calculatedSource,
  displayableStationarySeconds,
  distanceLabel,
  durationLabel,
  movementLabel,
  nextStopLabel,
  trendChangeLabel,
  trendLabel,
} from "../lib/presentation/movement";
import { delayLabel } from "../lib/presentation/status";
import styles from "./Calculated.module.css";

const toneClass: Record<Tone, string> = {
  positive: styles.positive,
  information: styles.information,
  warning: styles.warning,
  critical: styles.critical,
  unknown: styles.unknown,
};

/** Every calculated value is introduced by its source, so it cannot read as official. */
function Source({ children }: { children: string }) {
  return <p className={styles.source}>{calculatedSource} · {children}</p>;
}

/**
 * Observed movement.
 *
 * The dwell is rendered only while the state is STATIONARY. An UNKNOWN movement may still
 * carry the duration it once observed, and showing that would claim a train is still
 * stopped when tracking has in fact been lost.
 *
 * This is physical evidence, not a service claim: a moving train may still be late, and a
 * stationary one is not an official disruption. No cause is offered for either.
 */
export function MovementStatus({ calculated }: { calculated: Calculated }) {
  const movement = calculated.observedMovement;
  const label = movementLabel(movement.state);
  const dwell = displayableStationarySeconds(movement);
  return (
    <div>
      <Source>observed movement</Source>
      <p className={`${styles.headline} ${toneClass[label.tone]}`}>
        {label.text}
        {dwell !== null ? ` · ${durationLabel(dwell)}` : ""}
      </p>
      {movement.state === "STATIONARY" ? (
        <p className={styles.detail}>
          Measured from reported positions. It does not say why, and it is not an official
          service status.
        </p>
      ) : null}
      {movement.state === "UNKNOWN" ? (
        <p className={styles.detail}>
          There are not enough recent positions to tell whether this train is moving. That
          is not the same as a stopped train.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The calculated next scheduled stop.
 *
 * A stop the operator reported skipped is said to be reported skipped, and this never
 * advances to the following call on its own: choosing a replacement would be inventing
 * official information. PASSED_FINAL likewise offers no substitute.
 */
export function NextStopStatus({
  calculated,
  stopNames,
}: {
  calculated: Calculated;
  stopNames: Map<string, string>;
}) {
  const call = calculated.nextStop;
  const label = nextStopLabel(call.state);
  const distance = distanceLabel(call);
  const name =
    call.stopId === null ? null : (stopNames.get(call.stopId) ?? call.stopId);
  return (
    <div>
      <Source>next stop</Source>
      <p className={`${styles.headline} ${toneClass[label.tone]}`}>{label.text}</p>
      {call.state === "IDENTIFIED" && name !== null ? (
        <p className={styles.stop}>{name}</p>
      ) : null}
      {distance !== null ? <p className={styles.detail}>{distance}</p> : null}
      {call.officiallySkipped === true ? (
        <p className={styles.skipped}>
          The operator reported this scheduled stop skipped.
        </p>
      ) : null}
      {call.state === "PASSED_FINAL" ? (
        <p className={styles.detail}>
          This train is past its last scheduled stop, so there is no next one to show.
        </p>
      ) : null}
      {call.state === "UNKNOWN" ? (
        <p className={styles.detail}>
          The next stop could not be calculated from the positions reported so far.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The trend of the operator's own published delays.
 *
 * This is measured from official Trip Update evidence and is independent of GPS: a stale or
 * missing position does not invalidate it, and the two are never combined into one claim.
 * The delay figure shown here is the one the trend was measured against, stated as such so
 * it does not read as a second, competing delay.
 */
export function DelayTrend({
  calculated,
  officialDelaySeconds,
}: {
  calculated: Calculated;
  /** The train's own published delay, so the same figure is not stated twice. */
  officialDelaySeconds: number | null;
}) {
  const trend = calculated.officialDelayTrend;
  const label = trendLabel(trend.state);
  const change = trendChangeLabel(trend);
  // The basis is worth naming only when it differs from the delay already shown above.
  const basis =
    trend.officialDelaySeconds === null ||
    trend.officialDelaySeconds === officialDelaySeconds
      ? null
      : trend.officialDelaySeconds;
  return (
    <div>
      <Source>trend of official delays</Source>
      <p className={`${styles.headline} ${toneClass[label.tone]}`}>{label.text}</p>
      {change !== null ? <p className={styles.detail}>{change}</p> : null}
      {basis !== null ? (
        <p className={styles.detail}>
          Measured against the operator&rsquo;s published delay of {delayLabel(basis)}.
        </p>
      ) : null}
      {trend.state === "UNKNOWN" ? (
        <p className={styles.detail}>
          There are not enough official delay reports in the recent window to describe a
          trend.
        </p>
      ) : null}
    </div>
  );
}
