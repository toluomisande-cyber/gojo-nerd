"use client";

import * as React from "react";
import { CitedAnswer, type AnswerSource, type CitedAnswerStatus } from "./cited-answer";

const QUESTION = "Can a customer on an annual plan get a refund after the first 30 days?";

const SOURCES: AnswerSource[] = [
  {
    kind: "doc",
    site: "Help Center",
    title: "Refunds and cancellations",
    meta: "Updated Sep 12",
    snippet:
      "Annual plans are refunded in full within 30 days of purchase. After that, we refund the months that haven't started yet, up to 90 days from purchase.",
  },
  {
    kind: "file",
    site: "Finance / Policies",
    label: "Billing policy",
    title: "Billing policy 2026.pdf",
    meta: "Page 4",
    snippet:
      "Prorated refunds cover whole unused months, less any discount given at purchase. After 90 days, a refund is an exception approved by a support lead.",
  },
  {
    kind: "chat",
    site: "#billing-ops",
    title: "Refunds over $2,000 now need Finance sign-off",
    meta: "Sep 30",
    snippet:
      "From October 1, any refund above $2,000 goes to Finance before it's issued. Usual turnaround is two working days.",
  },
  {
    kind: "ticket",
    site: "Support",
    label: "Ticket 48213",
    title: "Refund request, annual Team plan, day 41",
    meta: "Closed Oct 3",
    snippet: "Refunded 10 of 12 months, minus the 15% annual discount. The customer confirmed the amount.",
  },
  {
    kind: "doc",
    site: "Finance wiki",
    title: "Issuing a prorated refund in Stripe",
    meta: "Updated Aug 28",
    snippet: "Use Refund unused time on the subscription, then change the amount by hand when a discount was applied.",
  },
  {
    kind: "email",
    site: "Legal",
    title: "EU customers and the 14-day right to withdraw",
    meta: "Jul 2",
    snippet: "Consumers in the EU can withdraw within 14 days of purchase. Business customers on Team plans are not covered.",
  },
];

const ANSWER = `Yes, up to 90 days after purchase, but only for the months they haven't used. [1] In the first 30 days, an annual plan is refunded in full. [1]

To work out the amount:

- Refund whole unused months, and take off any discount given at purchase. [2]
- Ticket 48213 is a recent example: 10 of 12 months back, minus the 15% annual discount. [4]
- In Stripe, use **Refund unused time**, then change the amount by hand when a discount applies. [5]

Since October 1, refunds above **$2,000** need Finance sign-off before they go out, which usually takes two working days. [3]

Past 90 days, a refund is an exception that a support lead has to approve. [2] The EU's right to withdraw within 14 days doesn't change this, because it only covers consumers, not businesses on Team plans. [6]`;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

type State = {
  status: CitedAnswerStatus;
  sources: AnswerSource[];
  content: string;
  duration?: number;
};

const FINAL: State = { status: "done", sources: SOURCES, content: ANSWER, duration: 4600 };

export function CitedAnswerDemo() {
  const root = React.useRef<HTMLDivElement>(null);
  const run = React.useRef<AbortController | null>(null);
  const [state, setState] = React.useState<State>({ status: "searching", sources: [], content: "" });
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  const play = React.useCallback(async () => {
    run.current?.abort();
    const controller = new AbortController();
    run.current = controller;
    const { signal } = controller;
    const started = performance.now();
    setFeedback(null);
    setState({ status: "searching", sources: [], content: "" });
    try {
      await wait(1100, signal);
      for (let i = 1; i <= SOURCES.length; i++) {
        setState({ status: "reading", sources: SOURCES.slice(0, i), content: "" });
        await wait(i === 1 ? 420 : 300, signal);
      }
      await wait(250, signal);
      const words = ANSWER.split(/(?<=\s)/);
      let shown = "";
      for (const word of words) {
        shown += word;
        setState({ status: "streaming", sources: SOURCES, content: shown });
        await wait(12 + word.length * 5 + (/[.,:]\s*$/.test(word) ? 90 : 0), signal);
      }
      setState({ ...FINAL, duration: Math.round(performance.now() - started) });
    } catch {
      // Replaced by a newer run.
    }
  }, []);

  React.useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setState(FINAL));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void play();
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      run.current?.abort();
    };
  }, [play]);

  return (
    <div ref={root} className="flex w-full justify-center px-4 py-10 sm:px-8 sm:py-14">
      <CitedAnswer
        question={QUESTION}
        statusText="Searching your workspace"
        {...state}
        feedback={feedback}
        onFeedback={setFeedback}
        onRetry={() => void play()}
        className="max-w-[720px]"
      />
    </div>
  );
}

export default CitedAnswerDemo;
