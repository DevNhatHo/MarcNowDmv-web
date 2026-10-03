import type { Alert } from "../lib/types/alerts";
import {
  causeLabel,
  effectLabel,
  periodLabel,
  preferredText,
  safeLink,
  scopeSummary,
  selectorLabel,
} from "../lib/presentation/alerts";
import styles from "./AlertCard.module.css";

/**
 * One MARC advisory, summarised, with the operator's full notice one action away.
 *
 * Text is rendered as plain text and never as markup, the link is followed only for an
 * http(s) target, and no severity is derived from the effect code: an advisory about parking
 * is not styled like a suspension because both are "alerts".
 *
 * **The title is the operator's, whole and verbatim.** The design reference shows a short
 * subject line over a station name, and producing that would mean splitting prose like "MARC
 * Odenton Station update - Parking closure for Phase 1 of garage construction" into fields the
 * feed never published. The scope line beneath comes from `informedEntity` instead, which is
 * where the operator actually said what this applies to.
 *
 * Collapsed, the card shows that scope, the effect, the period and a clamped preview of the
 * notice. Nothing is removed: the full text is in the document either way, and measured on the
 * real feed it is roughly 1,000 characters against an 80-character title.
 */
export default function AlertCard({
  alert,
  names,
  formatTime,
}: {
  alert: Alert;
  names: { routes: Map<string, string>; stops: Map<string, string> };
  formatTime: (iso: string) => string | null;
}) {
  const title = preferredText(alert.headerText);
  const description = preferredText(alert.descriptionText);
  const link = safeLink(alert.url);
  const effect = effectLabel(alert.effect);
  const cause = causeLabel(alert.cause);
  const scope = scopeSummary(alert.informedEntity, names);
  const periods = alert.activePeriods;

  return (
    <li className={styles.card}>
      <details className={styles.disclosure}>
        <summary className={styles.summary}>
          <span className={styles.head}>
            {/* An advisory with no usable title is still shown; it is published evidence. */}
            <h2 className={styles.title}>
              {title ?? "Advisory published without a title"}
            </h2>
            {effect !== null ? <span className={styles.effect}>{effect}</span> : null}
          </span>

          <span className={styles.meta}>
            {scope !== null ? <span className={styles.scope}>{scope}</span> : null}
            {periods.length === 0 ? (
              <span>No active period given</span>
            ) : (
              <span>{periodLabel(periods[0], formatTime)}</span>
            )}
            {periods.length > 1 ? (
              <span>and {periods.length - 1} more period{periods.length > 2 ? "s" : ""}</span>
            ) : null}
          </span>

          {/*
            * A visual preview only, clamped by CSS rather than cut from the string, and
            * hidden from assistive technology so the notice is not announced twice. The
            * expanded body below carries the real text.
            */}
          {description !== null ? (
            <span className={styles.preview} aria-hidden="true">
              {description}
            </span>
          ) : null}

          <span className={styles.more}>
            <span className={styles.moreOpen}>Read more</span>
            <span className={styles.moreClose}>Show less</span>
          </span>
        </summary>

        <div className={styles.body}>
          {description !== null ? (
            <p className={styles.description}>{description}</p>
          ) : (
            <p className={styles.caveat}>No description was published with this advisory.</p>
          )}

          {cause !== null ? <p className={styles.cause}>{cause}</p> : null}

          {periods.length > 1 ? (
            <ul className={styles.periods} aria-label="When this advisory applies">
              {periods.map((period, index) => (
                <li key={index}>{periodLabel(period, formatTime)}</li>
              ))}
            </ul>
          ) : null}

          <div className={styles.scopeBlock}>
            <p className={styles.scopeTitle}>Applies to</p>
            {alert.informedEntity.length === 0 ? (
              <p className={styles.caveat}>
                The operator did not say what this advisory applies to.
              </p>
            ) : (
              <ul className={styles.scopeList} aria-label="What this advisory applies to">
                {alert.informedEntity.map((entity, index) => (
                  <li key={index}>{selectorLabel(entity, names)}</li>
                ))}
              </ul>
            )}
          </div>

          {link !== null ? (
            <a
              className={`${styles.link} standalone-link`}
              href={link}
              rel="noreferrer noopener"
              target="_blank"
            >
              Read the operator&rsquo;s notice
            </a>
          ) : null}
        </div>
      </details>
    </li>
  );
}
