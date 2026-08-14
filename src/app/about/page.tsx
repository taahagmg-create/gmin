import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "About",
  description: "The Esteem Car Traders story — two Auckland yards, Takanini and New Lynn.",
};

export default function AboutPage() {
  return (
    <PagePlaceholder
      route="/about"
      briefRef="§3"
      title="About Esteem"
      purpose="Dealership story and the two locations — the trust layer behind the offer."
      todo={[
        "Brand story: who Esteem is and why the Service Shield exists",
        "Takanini and New Lynn location cards with photography",
        "Team section (copy and photos pending from Esteem)",
        "Trust proof — reviews, years trading, volume",
      ]}
    />
  );
}
