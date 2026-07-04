import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/subscription")({
  beforeLoad: () => {
    throw redirect({ to: "/app/billing", replace: true });
  },
});
