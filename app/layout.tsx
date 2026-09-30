import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "../components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  // Each page supplies its own name; the template keeps the service identifiable in a
  // browser tab, a bookmark and a screen reader's document announcement.
  title: {
    default: "MARC Now DMV",
    template: "%s · MARC Now DMV",
  },
  description: "Independent MARC train information for your commute.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
