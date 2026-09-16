import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "ok" | "warn" | "danger" | "muted" | "default" }> = {
  active: { label: "Active", variant: "ok" },
  on_leave: { label: "On leave", variant: "warn" },
  alumni: { label: "Alumni", variant: "muted" },
  inactive: { label: "Inactive", variant: "danger" },
  teacher: { label: "Teaching", variant: "default" },
  non_teaching: { label: "Non-teaching", variant: "muted" },
  tsc_no: { label: "TSC no.", variant: "default" },
  id_no: { label: "ID no.", variant: "muted" },
  draft: { label: "Draft", variant: "muted" },
  issued: { label: "Issued", variant: "warn" },
  paid: { label: "Paid", variant: "ok" },
  void: { label: "Void", variant: "danger" },
  receive: { label: "Receive", variant: "ok" },
  issue: { label: "Issue", variant: "default" },
  adjust: { label: "Adjust", variant: "warn" },
  return: { label: "Return", variant: "muted" },
  purchase: { label: "Purchase", variant: "muted" },
  issue_charge: { label: "Charge", variant: "default" },
  boys: { label: "Boys", variant: "default" },
  girls: { label: "Girls", variant: "ok" },
  mixed: { label: "Mixed", variant: "muted" },
};

export function StatusBadge({ value }: { value: string }) {
  const m = MAP[value] ?? { label: value, variant: "muted" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
