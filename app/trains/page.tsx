import type { Metadata } from "next";
import { Suspense } from "react";
import TrainListScreen from "../../components/TrainListScreen";
import { LoadingRows } from "../../components/Feedback";

export const metadata: Metadata = { title: "Trains" };

export default function TrainsPage() {
  // The screen reads its filters from the URL, so it renders inside Suspense.
  return (
    <Suspense fallback={<LoadingRows label="Loading scheduled trains" />}>
      <TrainListScreen />
    </Suspense>
  );
}
