import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PreQualifyCta } from "@/components/pre-qualify-cta";
import { FinanceQuizProvider } from "@/components/finance/quiz-provider";
import { ChatWidget } from "@/components/chat/chat-widget";

export const metadata: Metadata = {
  title: {
    default: "Esteem Cars — Peace of mind, delivered.",
    template: "%s | Esteem Cars",
  },
  description:
    "Quality used vehicles in Takanini and New Lynn, backed by the Esteem Service Shield. Get pre-qualified in 30 seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NZ">
      <body className="flex min-h-dvh flex-col">
        {/* Hosts the pre-qual slide-over so any CTA anywhere can open it. */}
        <FinanceQuizProvider>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />

        {/*
          Sticky finance pre-qual pill (brief §4.3). Same component as the hero
          end card, so the two can never drift in wording or styling.

          Placement follows the §10 warning that this and the chat bubble must
          not collide on small screens: a centred bar along the bottom on mobile,
          leaving the bottom-right corner free for the chat trigger, and a
          right-edge pill from sm up.

          Still to do: pass onOpen so it launches the quiz as a slide-over
          instead of navigating to /finance.
        */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:inset-x-auto sm:right-4 sm:top-1/2 sm:block sm:-translate-y-1/2 sm:pb-0">
          <PreQualifyCta variant="sticky" />
        </div>

        {/* Beat 04 — delayed-trigger chat bubble (§4.4). */}
        <ChatWidget />
        </FinanceQuizProvider>
      </body>
    </html>
  );
}
