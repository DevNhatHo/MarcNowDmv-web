import type { Metadata } from "next";
import RoutePlaceholder from "../../components/RoutePlaceholder";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <RoutePlaceholder
      question="Is there anything important I need to know?"
      title="Alerts"
      explanation="MARC advisories are not built yet, so none are shown. This screen being empty is not evidence that there are no disruptions."
      arriving="It will show each advisory's title and description as published, what it applies to, when it is active, and how current the alert feed is."
    />
  );
}
