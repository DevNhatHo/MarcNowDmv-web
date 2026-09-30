import type { Metadata } from "next";
import RoutePlaceholder from "../components/RoutePlaceholder";

// The root layout's title template applies to child segments only, and this page shares
// the root segment, so its title is written in full rather than inherited.
export const metadata: Metadata = {
  title: { absolute: "MARC Pulse · MARC Now DMV" },
};

export default function PulsePage() {
  return (
    <RoutePlaceholder
      question="How is MARC running right now?"
      title="MARC Pulse"
      explanation="This overview is not built yet, so nothing here reports how MARC is running. No live service information is shown anywhere in this app at the moment."
      arriving="It will summarise each line's reported status and current MARC advisories, and say plainly when that information is unavailable rather than implying that service is fine."
    />
  );
}
