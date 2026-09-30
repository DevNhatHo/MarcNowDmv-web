import styles from "./RoutePlaceholder.module.css";

/**
 * An honest placeholder for a destination whose content a later ticket owns.
 *
 * It states plainly that the screen is not built yet. It shows no counts, no sample rows
 * and no status-like figures, because a placeholder that resembles data would be read as
 * data — and unavailable information must never look like a healthy answer.
 */
export default function RoutePlaceholder({
  question,
  title,
  explanation,
  arriving,
}: {
  question: string;
  title: string;
  explanation: string;
  arriving: string;
}) {
  return (
    <div className={styles.placeholder}>
      <p className={styles.question}>{question}</p>
      <h1 className={styles.title}>{title}</h1>
      <section className={styles.status} aria-labelledby="placeholder-status">
        <p className={styles.statusLabel} id="placeholder-status">
          Not built yet
        </p>
        <p className={styles.explanation}>{explanation}</p>
        <p className={styles.arriving}>{arriving}</p>
      </section>
    </div>
  );
}
