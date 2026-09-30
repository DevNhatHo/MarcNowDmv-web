import type { Metadata } from "next";
import { Suspense } from "react";
import TrainDetailScreen from "../../../components/TrainDetailScreen";
import { LoadingRows } from "../../../components/Feedback";

export const metadata: Metadata = { title: "Train" };

/**
 * One train, addressed by the backend's opaque identifier. The identifier is passed
 * through untouched; nothing about it is parsed, because it encodes a schedule version and
 * service date that only the backend may interpret.
 */
export default async function TrainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<LoadingRows count={3} label="Loading this train" />}>
      <TrainDetailScreen id={id} />
    </Suspense>
  );
}
