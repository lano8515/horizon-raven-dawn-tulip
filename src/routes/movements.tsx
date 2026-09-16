import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMovements } from "@/lib/school/queries";
import { whenAuthed } from "@/lib/school/safe";
import { formatDate, money } from "@/lib/utils";

export const Route = createFileRoute("/movements")({
  loader: () => whenAuthed(listMovements, []),
  component: MovementsPage,
});

function MovementsPage() {
  const initial = Route.useLoaderData();
  const qy = useQuery({ queryKey: ["movements"], queryFn: () => listMovements(), initialData: initial });
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    return (qy.data ?? []).filter((m) => {
      const hay = `${m.itemName} ${m.sku} ${m.personName ?? ""} ${m.personId ?? ""} ${m.notes ?? ""}`.toLowerCase();
      return (!q || hay.includes(q.toLowerCase())) && (type === "all" || m.movementType === type);
    });
  }, [qy.data, q, type]);

  return (
    <div>
      <PageHeader
        kicker="Stores"
        title="Issues and receipts"
        description="The movement ledger. Issues record the student's admission number or the staff TSC / ID number."
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search item, name, or number" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="issue">Issue</SelectItem>
            <SelectItem value="receive">Receive</SelectItem>
            <SelectItem value="return">Return</SelectItem>
            <SelectItem value="adjust">Adjust</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/60 text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Key</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 text-muted">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <p>{m.itemName}</p>
                    <p className="font-mono text-[11px] text-muted">{m.sku}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={m.movementType} /></td>
                  <td className="px-4 py-3 tabular-nums">{m.quantity}</td>
                  <td className="px-4 py-3 tabular-nums">{money(m.quantity * m.unitCost)}</td>
                  <td className="px-4 py-3">{m.personName ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{m.personId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
