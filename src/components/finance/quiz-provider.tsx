"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FinanceQuiz } from "@/components/finance/finance-quiz";

type OpenContext = { vehicleSlug?: string };

type FinanceQuizContextValue = {
  isOpen: boolean;
  open: (ctx?: OpenContext) => void;
  close: () => void;
  vehicleSlug?: string;
};

const FinanceQuizContext = createContext<FinanceQuizContextValue | null>(null);

/**
 * Null when no provider is mounted, so a CTA rendered outside the provider
 * degrades to a plain link to /finance rather than throwing.
 */
export function useFinanceQuiz(): FinanceQuizContextValue | null {
  return useContext(FinanceQuizContext);
}

/**
 * Hosts the pre-qualification slide-over (brief §4.3).
 *
 * The quiz opens over the page rather than navigating, so nobody loses their
 * place in the funnel. Built on a native <dialog> with showModal(), which gives
 * focus trapping, Escape-to-close, background inertness and the top layer for
 * free — all things a hand-rolled overlay tends to get subtly wrong.
 */
export function FinanceQuizProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [vehicleSlug, setVehicleSlug] = useState<string | undefined>(undefined);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback((ctx?: OpenContext) => {
    setVehicleSlug(ctx?.vehicleSlug);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  const value = useMemo(
    () => ({ isOpen, open, close, vehicleSlug }),
    [isOpen, open, close, vehicleSlug],
  );

  return (
    <FinanceQuizContext.Provider value={value}>
      {children}

      <dialog
        ref={dialogRef}
        // Escape and backdrop dismissal both route back through React state.
        onClose={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
        aria-label="Get pre-qualified"
        className="quiz-dialog m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg border-l border-ink-line bg-ink p-0 text-neutral-200 backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        {/* Remount per open so a returning visitor starts fresh. */}
        {isOpen && <FinanceQuiz key={String(isOpen)} vehicleSlug={vehicleSlug} onClose={close} />}
      </dialog>
    </FinanceQuizContext.Provider>
  );
}
