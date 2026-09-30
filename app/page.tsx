import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.introduction}>
        <p className={styles.eyebrow}>Your MARC commute</p>
        <h1 className={styles.title}>MARC Now DMV</h1>
        <p className={styles.intro}>A clearer view of your train.</p>
      </div>
      <p className={styles.notice}>
        Train information is coming soon. Live service information is not
        available here yet.
      </p>
      <details className={styles.about}>
        <summary>About this preview</summary>
        <p>
          MARC Now DMV is an independent service and is not affiliated with or
          endorsed by MDOT MTA.
        </p>
      </details>
    </main>
  );
}
