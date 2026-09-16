import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordMovement } from "@/lib/school/queries";
import { staffKeyLabel } from "@/lib/utils";
import type { InventoryItem, StaffMember, Student } from "@/lib/school/types";

export function IssueDialog({
  open,
  onOpenChange,
  items,
  students,
  staff,
  presetPerson,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: InventoryItem[];
  students: Student[];
  staff: StaffMember[];
  presetPerson?: { type: "student" | "staff"; id: string; name: string };
}) {
  const qc = useQueryClient();
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [who, setWho] = useState(presetPerson ? `${presetPerson.type}:${presetPerson.id}` : "");
  const [notes, setNotes] = useState("");
  const [charge, setCharge] = useState(false);

  const people = useMemo(() => {
    const s = students
      .filter((p) => p.status === "active")
      .map((p) => ({
        key: `student:${p.admissionNo}`,
        label: `${p.firstName} ${p.lastName} · Adm ${p.admissionNo}`,
      }));
    const t = staff
      .filter((p) => p.status === "active")
      .map((p) => ({
        key: `staff:${p.identifier}`,
        label: `${p.firstName} ${p.lastName} · ${staffKeyLabel(p.identifierKind)} ${p.identifier}`,
      }));
    return [...s, ...t];
  }, [students, staff]);

  const mutation = useMutation({
    mutationFn: () => {
      const raw = presetPerson ? `${presetPerson.type}:${presetPerson.id}` : who;
      const [personType, ...rest] = raw.split(":");
      const personId = rest.join(":");
      const personName = presetPerson
        ? presetPerson.name
        : people.find((p) => p.key === who)?.label.split(" · ")[0];
      return recordMovement({
        data: {
          itemId: Number(itemId),
          movementType: "issue",
          quantity: Number(qty),
          personType: personType as "student" | "staff",
          personId,
          personName,
          notes,
          charge,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(res.invoice ? `Issued and billed as ${res.invoice.invoiceNo}` : "Item issued from stores");
      qc.invalidateQueries();
      onOpenChange(false);
      setQty("1");
      setNotes("");
      setCharge(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue from stores</DialogTitle>
          <DialogDescription>Deduct stock and optionally raise a charge invoice.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an item" />
              </SelectTrigger>
              <SelectContent>
                {items
                  .filter((i) => i.isActive)
                  .map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name} · {i.quantityOnHand} {i.unit}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {!presetPerson ? (
            <div className="grid gap-1.5">
              <Label>Issued to</Label>
              <Select value={who} onValueChange={setWho}>
                <SelectTrigger>
                  <SelectValue placeholder="Student or staff" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label>Quantity</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Note</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for issue" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={charge} onChange={(e) => setCharge(e.target.checked)} />
            Raise a charge invoice at unit cost
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!itemId || (!presetPerson && !who) || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Issuing…" : "Issue item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
