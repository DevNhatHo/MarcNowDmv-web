import Link from "next/link";
import type { ReactNode } from "react";
import SiteNavigation from "./SiteNavigation";
import styles from "./AppShell.module.css";

/** Required verbatim by the design plan; no other independence wording is permitted. */
export const independenceNotice =
  "MARC Now DMV is an independent service and is not affiliated with or endorsed by MDOT MTA.";

/**
 * The persistent page structure: skip link, header with primary navigation, one main
 * landmark and the independence footer. It is a Server Component; only the navigation
 * needs the current path, so only the navigation is a Client Component.
 *
 * The brand is a link rather than a heading, so each page keeps the single `h1` that names
 * what that page answers.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={`${styles.skipLink} standalone-link`} href="#main-content">
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={`${styles.brand} standalone-link`}>
            MARC Now DMV
          </Link>
          <SiteNavigation />
        </div>
      </header>
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p className={styles.independence}>{independenceNotice}</p>
      </footer>
    </div>
  );
}
