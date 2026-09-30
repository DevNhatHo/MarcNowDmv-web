import type { Metadata } from "next";
import RoutePlaceholder from "../../components/RoutePlaceholder";

export const metadata: Metadata = { title: "Trains" };

export default function TrainsPage() {
  return (
    <RoutePlaceholder
      question="Which train do I care about?"
      title="Trains"
      explanation="The train list is not built yet, so no trains are shown or hidden here. An empty screen at this stage means the screen is unfinished, not that no trains are scheduled."
      arriving="It will list the whole scheduled service date with line and date controls, each row carrying its scheduled time, the officially reported status and how old that evidence is."
    />
  );
}
