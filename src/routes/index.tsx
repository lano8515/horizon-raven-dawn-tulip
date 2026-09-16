import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpRight, Boxes, FileText, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { getDashboard, emptyDashboard } from "@/lib/school/queries";
import { whenAuthed } from "@/lib/school/safe";
import { compactNumber, formatDate, money } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: () => whenAuthed(getDashboard, emptyDashboard),
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  const { data = initial } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    initialData: initial,
  });

  const kpis = [
    { label: "Active students", value: compactNumber(data.students), hint: `${data.staff} staff on roll`, icon: Users },
    { label: "Stock value", value: money(data.stockValue), hint: `${data.items} live SKUs`, icon: Boxes },
    { label: "Low stock", value: compactNumber(data.lowStock), hint: "At or below reorder", icon: AlertTriangle },
    { label: "Open invoices", value: money(data.openInvoiceTotal), hint: `${data.openInvoices} unpaid or draft`, icon: FileText },
  ];

  return (
    <div>
      <PageHeader
        kicker="Arden School · Term 3"
        title="Campus ledger"
        description="Students keyed by admission number. Teachers by TSC number, support staff by national ID. Classes sit in streams; dorms sit in blocks."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">{k.label}</p>
              <k.icon className="size-4 text-muted" strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-display text-2xl tabular-nums leading-none">{k.value}</p>
            <p className="mt-2 text-xs text-muted">{k.hint}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Value by store category</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <StockChart data={data.byCategory} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Needs reorder</CardTitle>
            <Link to="/inventory" className="text-xs text-primary hover:underline">Stores</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.lowStockItems.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="font-mono text-[11px] text-muted">{item.sku}</p>
                </div>
                <p className="tabular-nums text-sm text-danger">
                  {item.quantityOnHand}<span className="text-muted">/{item.reorderLevel}</span>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent issues and receipts</CardTitle>
          <Link to="/movements" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            All movements <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="pb-2 font-medium">When</th>
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Who</th>
              </tr>
            </thead>
            <tbody>
              {data.recentMovements.map((m) => (
                <tr key={m.id} className="border-b border-border/70 last:border-0">
                  <td className="py-3 text-muted">{formatDate(m.createdAt)}</td>
                  <td className="py-3">
                    <p>{m.itemName}</p>
                    <p className="font-mono text-[11px] text-muted">{m.sku}</p>
                  </td>
                  <td className="py-3"><StatusBadge value={m.movementType} /></td>
                  <td className="py-3 tabular-nums">{m.quantity}</td>
                  <td className="py-3 text-muted">
                    {m.personName ?? "—"}
                    {m.personId ? <span className="ml-1 font-mono text-[11px]">{m.personId}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StockChart({ data }: { data: { name: string; quantity: number; value: number }[] }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready) return <div className="h-full rounded-md bg-surface-2/60" />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barCategoryGap={18}>
        <XAxis dataKey="name" interval={0} angle={-32} textAnchor="end" height={68} tick={{ fontSize: 10, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
        <Tooltip
          cursor={{ fill: "color-mix(in oklab, var(--color-primary) 8%, transparent)" }}
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
          formatter={(value) => money(Number(value ?? 0))}
        />
        <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
