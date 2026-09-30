import type { Metadata } from "next";
import PulseScreen from "../components/PulseScreen";

// The root layout's title template applies to child segments only, and this page shares
// the root segment, so its title is written in full rather than inherited.
export const metadata: Metadata = {
  title: { absolute: "MARC Pulse · MARC Now DMV" },
};

export default function PulsePage() {
  return <PulseScreen />;
}
