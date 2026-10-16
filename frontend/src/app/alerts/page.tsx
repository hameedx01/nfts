import type { Metadata } from "next";
import { LiveAlerts } from "@/components/LiveAlerts";
export const metadata: Metadata = { title: "Live mint alerts" };
export default function Page() {
  return <LiveAlerts />;
}
