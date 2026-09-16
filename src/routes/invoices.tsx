import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createInvoice, listInvoices, listItems, setInvoiceStatus } from "@/lib/school/queries";
import { whenAuthed } from "@/lib/school/safe";
import { formatDate, money } from "@/lib/utils";
import type { Invoice } from "@/lib/school/types";

export const Route = createFileRoute("/invoices")({
  loader: async () => {
    const [invoices, items] = await Promise.all([whenAuthed(listInvoices, []), whenAuthed(listItems, [])]);
    return { invoices, items };
  },
  component: InvoicesPage,
});

function InvoicesPage() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const invQ = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices(), initialData: initial.invoices });
  const itemsQ = useQuery({ queryKey: ["items"], queryFn: () => listItems(), initialData: initial.items });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Invoice | null>(null);

  const statusMut = useMutation({
    mutationFn: (payload: { id: number; status: Invoice["status"] }) => setInvoiceStatus({ data: payload }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Invoice updated"); },
  });

  return (
    <div>
      <PageHeader
        kicker="Finance"
        title="Invoices"
        description="Supplier purchases and student charges. Purchase invoices can receive stock in one step."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New invoice</Button>}
      />
      <div className="space-y-3">
        {(invQ.data ?? []).map((inv) => (
          <Card key={inv.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button className="text-left" onClick={() => setActive(inv)}>
                <p className="font-mono text-xs text-muted">{inv.invoiceNo}</p>
                <p className="font-medium">{inv.partyName}</p>
                <p className="text-xs text-muted">
                  {formatDate(inv.issuedAt)}
                  {inv.partyId ? ` · ${inv.partyId}` : ""}
                </p>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={inv.kind} />
                <StatusBadge value={inv.status} />
                <p className="min-w-24 text-right font-display text-lg tabular-nums">{money(inv.total)}</p>
                {inv.status === "issued" ? (
                  <Button size="sm" onClick={() => statusMut.mutate({ id: inv.id, status: "paid" })}>Mark paid</Button>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <NewInvoiceDialog open={open} onOpenChange={setOpen} items={itemsQ.data ?? []} onSaved={() => qc.invalidateQueries()} />
      <Sheet open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <SheetContent className="overflow-y-auto">
          {active ? (
            <>
              <SheetHeader>
                <SheetTitle>{active.invoiceNo}</SheetTitle>
                <SheetDescription>{active.partyName} · {formatDate(active.issuedAt)}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 px-5 pb-8">
                <div className="flex gap-2">
                  <StatusBadge value={active.kind} />
                  <StatusBadge value={active.status} />
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                      <th className="py-2 font-medium">Line</th>
                      <th className="py-2 font-medium">Qty</th>
                      <th className="py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.lines.map((l) => (
                      <tr key={l.id} className="border-b border-border/70">
                        <td className="py-2">{l.description}</td>
                        <td className="py-2 tabular-nums">{l.quantity}</td>
                        <td className="py-2 text-right tabular-nums">{money(l.quantity * l.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-right font-display text-2xl tabular-nums">{money(active.total)}</p>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NewInvoiceDialog({
  open, onOpenChange, items, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  items: { id: number; name: string; unitCost: number }[]; onSaved: () => void;
}) {
  const [kind, setKind] = useState<"purchase" | "issue_charge">("purchase");
  const [partyName, setPartyName] = useState("");
  const [notes, setNotes] = useState("");
  const [receiveStock, setReceiveStock] = useState(true);
  const [lines, setLines] = useState([{ itemId: "", quantity: "1", unitPrice: "" }]);
  const mut = useMutation({
    mutationFn: () => createInvoice({
      data: {
        kind,
        partyType: kind === "purchase" ? "supplier" : "student",
        partyName,
        notes,
        receiveStock: kind === "purchase" && receiveStock,
        lines: lines.filter((l) => l.itemId).map((l) => ({
          itemId: Number(l.itemId), quantity: Number(l.quantity), unitPrice: Number(l.unitPrice),
        })),
      },
    }),
    onSuccess: (inv) => {
      toast.success(`${inv.invoiceNo} posted`);
      onSaved();
      onOpenChange(false);
      setPartyName("");
      setNotes("");
      setLines([{ itemId: "", quantity: "1", unitPrice: "" }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const total = useMemo(
    () => lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0),
    [lines],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Purchases restock the store. Charges bill a student or department.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase (supplier)</SelectItem>
                  <SelectItem value="issue_charge">Charge (student)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>{kind === "purchase" ? "Supplier" : "Bill to"}</Label>
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} />
            </div>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid gap-2 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <Label>Item</Label>
                <Select
                  value={line.itemId}
                  onValueChange={(v) => {
                    const item = items.find((i) => String(i.id) === v);
                    const next = [...lines];
                    next[idx] = { ...line, itemId: v, unitPrice: item ? String(item.unitCost) : line.unitPrice };
                    setLines(next);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Choose item" /></SelectTrigger>
                  <SelectContent>
                    {items.map((i) => <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Qty</Label>
                <Input type="number" min={1} value={line.quantity} onChange={(e) => {
                  const next = [...lines]; next[idx] = { ...line, quantity: e.target.value }; setLines(next);
                }} />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Unit price</Label>
                <Input type="number" min={0} value={line.unitPrice} onChange={(e) => {
                  const next = [...lines]; next[idx] = { ...line, unitPrice: e.target.value }; setLines(next);
                }} />
              </div>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setLines([...lines, { itemId: "", quantity: "1", unitPrice: "" }])}>
            Add line
          </Button>
          {kind === "purchase" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={receiveStock} onChange={(e) => setReceiveStock(e.target.checked)} />
              Receive these quantities into stores
            </label>
          ) : null}
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-right font-display text-xl tabular-nums">{money(total)}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!partyName || lines.every((l) => !l.itemId) || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Posting…" : "Post invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
