import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Service Shield",
  description:
    "The Esteem Service Shield — cover that means a breakdown doesn't come out of your pocket.",
};

export default function ServiceShieldPage() {
  return (
    <PagePlaceholder
      route="/service-shield"
      briefRef="§3"
      title="Service Shield"
      purpose="Dedicated offer landing page — paid ad traffic lands here, so it carries its own conversion path."
      todo={[
        "Offer hero: the Service Shield promise, standalone from the homepage film",
        "How it works — what's covered, what it costs, what happens at claim time",
        "Inline finance pre-qual CTA (same slide-over as the rest of the site)",
        "Proof: reviews, lender logos, peace-of-mind points",
        "Campaign tracking — GA4 + Meta Pixel events distinct from organic home traffic",
      ]}
      later={["HeyGen presenter-led explainer segment, if used (§9)", "A/B testing on offer framing"]}
    />
  );
}
