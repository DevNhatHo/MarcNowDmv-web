import type { Metadata } from "next";
import AlertsScreen from "../../components/AlertsScreen";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return <AlertsScreen />;
}
