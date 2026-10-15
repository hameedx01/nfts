import type { Metadata } from "next";
import { Gallery } from "@/components/Gallery";
export const metadata: Metadata = { title: "The collection" };
export default function Page() {
  return <Gallery />;
}
