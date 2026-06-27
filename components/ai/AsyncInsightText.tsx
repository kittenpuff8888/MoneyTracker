"use client";

import { useEffect, useState } from "react";

const inFlightRequests = new Map<string, Promise<string | null>>();

function requestInsight(period: "weekly" | "monthly") {
  const existing = inFlightRequests.get(period);
  if (existing) return existing;

  const request = fetch(`/api/ai/budget-insight?period=${period}`)
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json();
      return typeof data.conclusion === "string" && data.conclusion.trim()
        ? data.conclusion.trim()
        : null;
    })
    .catch(() => null)
    .finally(() => {
      inFlightRequests.delete(period);
    });

  inFlightRequests.set(period, request);
  return request;
}

export function AsyncInsightText({
  initialInsight,
  period,
  className
}: {
  initialInsight: string;
  period: "weekly" | "monthly";
  className?: string;
}) {
  const [insight, setInsight] = useState(initialInsight);

  useEffect(() => {
    const controller = new AbortController();

    async function refreshInsight() {
      const updatedInsight = await requestInsight(period);
      if (updatedInsight && !controller.signal.aborted) setInsight(updatedInsight);
    }

    void refreshInsight();
    return () => controller.abort();
  }, [period]);

  return <p aria-live="polite" className={className}>{insight}</p>;
}
