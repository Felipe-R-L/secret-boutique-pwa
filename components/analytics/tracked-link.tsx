"use client";

import type { ComponentProps } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { AnalyticsEvent } from "@/lib/analytics/events";

// Link externo que registra o clique — para usar em componentes de servidor
// (como o rodapé), que não podem ter onClick.
export function TrackedLink({
  event,
  from,
  onClick,
  ...props
}: ComponentProps<"a"> & { event: AnalyticsEvent; from: string }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        trackEvent(event, { props: { from } });
        onClick?.(e);
      }}
    />
  );
}
