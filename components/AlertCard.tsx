import type { Alert } from "../lib/types/alerts";
import {
  causeLabel,
  effectLabel,
  periodLabel,
  preferredText,
  safeLink,
  selectorLabel,
} from "../lib/presentation/alerts";
import styles from "./AlertCard.module.css";

/**
 * One MARC advisory, as the operator published it.
 *
 * Text is rendered as plain text and never as markup, the link is followed only for an
 * http(s) target, and no severity is derived from the effect code: an advisory about
 * parking is not styled like a suspension because both are "alerts".
 *
 * The scope is reported at the level the feed published it. A stop or route entity says
 * what it says; it is never turned into a claim about a particular train.
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

  return (
    <li className={styles.card}>
      {/* An advisory with no usable title is still shown; it is real, published evidence. */}
      <h2 className={styles.title}>{title ?? "Advisory published without a title"}</h2>
      <p className={styles.labels}>
        {effect !== null ? <span>{effect}</span> : null}
        {cause !== null ? <span>{cause}</span> : null}
        {alert.activePeriods.length === 0 ? (
          <span>No active period given</span>
        ) : (
          alert.activePeriods.map((period, index) => (
            <span key={index}>{periodLabel(period, formatTime)}</span>
          ))
        )}
      </p>
      {description !== null ? (
        <p className={styles.description}>{description}</p>
      ) : (
        <p className={styles.caveat}>No description was published with this advisory.</p>
      )}
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
      <div className={styles.scope}>
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
    </li>
  );
}
