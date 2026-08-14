import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Contact",
  description: "Esteem Cars locations, opening hours and directions — Takanini and New Lynn.",
};

export default function ContactPage() {
  return (
    <PagePlaceholder
      route="/contact"
      briefRef="§3"
      title="Contact"
      purpose="Locations, hours and map — plus the lowest-friction path to a human."
      todo={[
        "Location cards: address, hours, phone for Takanini and New Lynn",
        "Embedded map per location",
        "Enquiry form posting through submitLead()",
        "Call tracking number wired for attribution (§9)",
        "Click-to-call prominent on mobile",
      ]}
    />
  );
}
