"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BRIDGE_MS,
  CONTACT_FIELDS,
  CONTACT_STEP,
  FINANCE_RESULT,
  QUIZ_INTRO,
  QUIZ_STEPS,
  QUIZ_TOTAL_STEPS,
  pickBridge,
  type QuizStep,
} from "@/lib/finance-quiz";
import type { BandAnswer } from "@/lib/integrations";

type Phase = "intro" | "question" | "contact" | "sending" | "done" | "error";

type Answers = {
  employment?: string;
  weeklyIncome?: BandAnswer;
  licence?: string;
  tradeIn?: string;
  tradeInVehicle?: string;
  weeklySavings?: BandAnswer;
};

type Contact = { name: string; phone: string; email: string };

export function FinanceQuiz({
  vehicleSlug,
  onClose,
}: {
  vehicleSlug?: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [contact, setContact] = useState<Contact>({ name: "", phone: "", email: "" });
  const [bridge, setBridge] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Varies bridge copy between visits without re-randomising on every render.
  const [seed] = useState(() => Math.floor(Math.random() * 997));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const step = QUIZ_STEPS[stepIndex];

  const stepNumber =
    phase === "contact" || phase === "sending" ? QUIZ_STEPS.length + 1 : stepIndex + 1;
  const percent =
    phase === "done" ? 100 : phase === "intro" ? 0 : Math.round((stepNumber / QUIZ_TOTAL_STEPS) * 100);

  /** Show the warm bridge line, then move on. */
  const advance = useCallback(
    (from: QuizStep) => {
      setBridge(pickBridge(from.bridges, seed + stepIndex));
      timerRef.current = setTimeout(
        () => {
          setBridge(null);
          if (stepIndex >= QUIZ_STEPS.length - 1) setPhase("contact");
          else setStepIndex((i) => i + 1);
        },
        reducedMotion ? 350 : BRIDGE_MS,
      );
    },
    [seed, stepIndex, reducedMotion],
  );

  const goBack = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setBridge(null);
    if (phase === "contact") {
      setPhase("question");
      setStepIndex(QUIZ_STEPS.length - 1);
    } else if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    } else {
      setPhase("intro");
    }
  }, [phase, stepIndex]);

  const onSelect = (s: Extract<QuizStep, { kind: "select" }>, value: string) => {
    setAnswers((a) => ({ ...a, [s.id]: value }));
    // A follow-up keeps the visitor on this screen; everything else moves on.
    if (s.followUp && s.followUp.whenValue === value) return;
    if (s.followUp) setAnswers((a) => ({ ...a, tradeInVehicle: undefined }));
    advance(s);
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    for (const f of CONTACT_FIELDS) {
      if (f.required && !contact[f.name].trim()) next[f.name] = "This one's needed.";
    }
    if (contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
      next.email = "That doesn't look quite right.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setPhase("sending");
    setSendError(null);

    try {
      const res = await fetch("/api/finance-quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...answers,
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          email: contact.email.trim() || undefined,
          vehicleSlug,
          submittedAt: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Something went wrong.");
      setPhase("done");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("error");
    }
  };

  const anim = reducedMotion ? "" : "quiz-step-in";

  return (
    <div className="flex h-full flex-col">
      {/* Header: progress and a way out. */}
      <header className="shrink-0 border-b border-ink-line px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          {phase !== "intro" && phase !== "done" ? (
            <button
              type="button"
              onClick={goBack}
              className="text-xs text-neutral-500 transition hover:text-white"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2 py-1 text-lg leading-none text-neutral-500 transition hover:text-white"
          >
            ×
          </button>
        </div>

        {phase !== "intro" && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              <span>
                {phase === "done"
                  ? "All done"
                  : `Step ${Math.min(stepNumber, QUIZ_TOTAL_STEPS)} of ${QUIZ_TOTAL_STEPS}`}
              </span>
              {/* A number, not just a bar — "quick" should be provable. */}
              <span className="text-accent">{percent}%</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-8">
        {/* Bridge: a brief warm beat between questions, never permanent. */}
        {bridge ? (
          <p className={`text-2xl font-medium text-white ${anim}`}>{bridge}</p>
        ) : phase === "intro" ? (
          <div className={anim}>
            <h2 className="text-3xl font-semibold text-white">{QUIZ_INTRO.headline}</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">{QUIZ_INTRO.body}</p>
            <ul className="mt-6 space-y-2.5">
              {QUIZ_INTRO.points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-neutral-300">
                  <span aria-hidden="true" className="mt-0.5 text-accent">✓</span>
                  {p}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setPhase("question")}
              className="mt-8 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-hover"
            >
              {QUIZ_INTRO.cta}
            </button>
            <p className="mt-3 text-center text-xs text-neutral-500">{QUIZ_INTRO.footnote}</p>
          </div>
        ) : phase === "question" && step ? (
          <div key={step.id} className={anim}>
            <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
              {step.question}
            </h2>
            <p className="mt-2 text-sm text-neutral-400">{step.helper}</p>

            {step.kind === "select" ? (
              <SelectStep step={step} answers={answers} setAnswers={setAnswers} onSelect={onSelect} onContinue={() => advance(step)} />
            ) : (
              <BandStep step={step} answers={answers} setAnswers={setAnswers} onContinue={() => advance(step)} />
            )}
          </div>
        ) : phase === "contact" || phase === "sending" ? (
          <div className={anim}>
            <h2 className="text-xl font-semibold leading-snug text-white sm:text-2xl">
              {CONTACT_STEP.question}
            </h2>
            <p className="mt-2 text-sm text-neutral-400">{CONTACT_STEP.helper}</p>

            <div className="mt-6 space-y-4">
              {CONTACT_FIELDS.map((f) => (
                <label key={f.name} className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    {f.label}
                    {!f.required && <span className="ml-1 normal-case text-neutral-600">(optional)</span>}
                  </span>
                  <input
                    type={f.type}
                    autoComplete={f.autoComplete}
                    placeholder={f.placeholder}
                    value={contact[f.name]}
                    disabled={phase === "sending"}
                    onChange={(e) => setContact((c) => ({ ...c, [f.name]: e.target.value }))}
                    aria-invalid={Boolean(errors[f.name])}
                    className="mt-1.5 w-full rounded-xl border border-ink-line bg-ink-soft px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-accent focus:outline-none disabled:opacity-50"
                  />
                  {errors[f.name] && (
                    <span className="mt-1 block text-xs text-neutral-400">{errors[f.name]}</span>
                  )}
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={phase === "sending"}
              className="mt-7 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-hover disabled:opacity-60"
            >
              {phase === "sending" ? "Sending…" : CONTACT_STEP.cta}
            </button>
          </div>
        ) : phase === "done" ? (
          <div className={`text-center ${anim}`}>
            <CheckMark reducedMotion={reducedMotion} />
            <h2 className="mt-6 text-3xl font-semibold text-white">{FINANCE_RESULT.headline}</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-neutral-300">
              {FINANCE_RESULT.body}
            </p>
            <p className="mx-auto mt-4 max-w-sm text-xs text-neutral-500">
              {FINANCE_RESULT.footnote}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 rounded-full border border-white/25 px-6 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Back to browsing
            </button>
          </div>
        ) : (
          <div className={anim}>
            <h2 className="text-xl font-semibold text-white">That didn&apos;t go through</h2>
            <p className="mt-2 text-sm text-neutral-400">
              {sendError} Your answers are still here — give it another go.
            </p>
            <button
              type="button"
              onClick={() => setPhase("contact")}
              className="mt-6 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-hover"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectStep({
  step,
  answers,
  setAnswers,
  onSelect,
  onContinue,
}: {
  step: Extract<QuizStep, { kind: "select" }>;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  onSelect: (s: Extract<QuizStep, { kind: "select" }>, value: string) => void;
  onContinue: () => void;
}) {
  const current = answers[step.id];
  const showFollowUp = Boolean(step.followUp && current === step.followUp.whenValue);

  return (
    <>
      <div className="mt-6 space-y-2.5">
        {step.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(step, o.value)}
            aria-pressed={current === o.value}
            className={`w-full rounded-xl border px-5 py-4 text-left text-sm font-medium transition ${
              current === o.value
                ? "border-accent bg-accent/10 text-white"
                : "border-ink-line bg-ink-soft text-neutral-200 hover:border-neutral-600 hover:bg-ink-line/40"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {showFollowUp && step.followUp && (
        <div className="mt-5">
          <label className="block">
            <span className="text-sm text-neutral-300">{step.followUp.prompt}</span>
            <input
              type="text"
              value={answers.tradeInVehicle ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, tradeInVehicle: e.target.value }))}
              placeholder={step.followUp.placeholder}
              className="mt-2 w-full rounded-xl border border-ink-line bg-ink-soft px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-accent focus:outline-none"
            />
          </label>
          {/* Blank is fine — the follow-up must never block progress. */}
          <button
            type="button"
            onClick={onContinue}
            className="mt-4 w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-ink transition hover:bg-accent-hover"
          >
            Continue
          </button>
        </div>
      )}
    </>
  );
}

function BandStep({
  step,
  answers,
  setAnswers,
  onContinue,
}: {
  step: Extract<QuizStep, { kind: "band" }>;
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
  onContinue: () => void;
}) {
  const existing = answers[step.id];
  const startIndex = Math.floor(step.bands.length / 2);
  const currentIndex = existing ? step.bands.findIndex((b) => b.id === existing.id) : startIndex;
  const index = currentIndex === -1 ? startIndex : currentIndex;
  const band = step.bands[index];

  const setIndex = (i: number) => {
    const b = step.bands[i];
    setAnswers((a) => ({ ...a, [step.id]: { id: b.id, label: b.label, min: b.min, max: b.max } }));
  };

  return (
    <div className="mt-8">
      {/*
        DELIBERATE: the display below is the band label and nothing else. No
        praise, no caution, no colour keyed to the value, no helper text that
        changes with the amount. Whatever someone picks, this screen looks the
        same. Adding a reaction here would turn the quiz into an assessment,
        which is the one thing it must never feel like.
      */}
      <p className="text-center text-3xl font-semibold text-white sm:text-4xl">{band.label}</p>

      <input
        type="range"
        min={0}
        max={step.bands.length - 1}
        step={1}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        aria-label={step.question}
        aria-valuetext={band.label}
        className="quiz-range mt-7 w-full"
      />

      <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wide text-neutral-600">
        <span>{step.bands[0].label}</span>
        <span>{step.bands[step.bands.length - 1].label}</span>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!existing) setIndex(index);
          onContinue();
        }}
        className="mt-8 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-ink transition hover:bg-accent-hover"
      >
        That&apos;s about right
      </button>
    </div>
  );
}

function CheckMark({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      viewBox="0 0 52 52"
      className="mx-auto h-20 w-20"
      role="img"
      aria-label="Sent"
    >
      <circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={`text-accent ${reducedMotion ? "" : "quiz-check-circle"}`}
      />
      <path
        d="M14 27l8 8 16-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-accent ${reducedMotion ? "" : "quiz-check-mark"}`}
      />
    </svg>
  );
}
