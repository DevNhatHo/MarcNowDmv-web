"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";

/**
 * The three destinations from the information architecture. Each answers one question, so
 * the labels stay nouns and the set stays short.
 */
const destinations = [
  { href: "/", label: "Pulse" },
  { href: "/trains", label: "Trains" },
  { href: "/alerts", label: "Alerts" },
] as const;

/**
 * A nested route belongs to its section, so train detail keeps Trains current. The home
 * destination matches exactly, because every path would otherwise start with it.
 */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Native links with `aria-current`, so the current destination is announced rather than
 * only coloured. The visible marker is a weight and underline change, not colour alone.
 */
export default function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className={styles.nav}>
      <ul className={styles.navList}>
        {destinations.map(({ href, label }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={styles.navLink}
                aria-current={current ? "page" : undefined}
                data-current={current ? "true" : undefined}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
