import type { Metadata } from "next";
import { Suspense } from "react";
import MapScreen from "../../components/map/MapScreen";
import { LoadingRows } from "../../components/Feedback";

export const metadata: Metadata = { title: "Map" };

export default function MapPage() {
  // The screen reads its line filter from the URL, so it renders inside Suspense.
  return (
    <Suspense fallback={<LoadingRows count={2} label="Loading route geometry" />}>
      <MapScreen />
    </Suspense>
  );
}
