import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  emptySettings,
  getSettings,
  importRemoteCatalog,
  linkStaffIdentity,
  listAppUsers,
  listInvoices,
  listStaff,
  previewRemoteCatalog,
  pushInvoiceToApi,
  updateSettings,
} from "@/lib/school/queries";
import { whenAuthed } from "@/lib/school/safe";
import { formatDate } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import type { ApiProvider, RemoteProduct } from "@/lib/school/types";

export const Route = createFileRoute("/settings")({
  loader: async () => {
    const [settings, invoices, accounts, staff] = await Promise.all([
      whenAuthed(getSettings, emptySettings),
      whenAuthed(listInvoices, []),
      whenAuthed(listAppUsers, []),
      whenAuthed(listStaff, []),
    ]);
    return { settings, invoices, accounts, staff };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const user = useCurrentUser();
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: () => getSettings(), initialData: initial.settings });
  const invQ = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices(), initialData: initial.invoices });
  const accountsQ = useQuery({ queryKey: ["app-users"], queryFn: () => listAppUsers(), initialData: initial.accounts });
  const staffQ = useQuery({ queryKey: ["staff"], queryFn: () => listStaff(), initialData: initial.staff });
  const s = settingsQ.data;
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [campus, setCampus] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [prefix, setPrefix] = useState<string | null>(null);
  const [provider, setProvider] = useState<ApiProvider | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<RemoteProduct[] | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [staffId, setStaffId] = useState("");

  const filled = s
    ? {
        schoolName: schoolName ?? s.schoolName,
        campus: campus ?? s.campus,
        currency: currency ?? s.currency,
        prefix: prefix ?? s.invoicePrefix,
        provider: (provider ?? s.apiProvider) as ApiProvider,
        baseUrl: baseUrl ?? s.apiBaseUrl ?? "",
      }
    : null;

  const saveMut = useMutation({
    mutationFn: () => updateSettings({
      data: {
        schoolName: filled!.schoolName, campus: filled!.campus, currency: filled!.currency,
        invoicePrefix: filled!.prefix, apiProvider: filled!.provider, apiBaseUrl: filled!.baseUrl,
      },
    }),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewMut = useMutation({
    mutationFn: (useSample: boolean) => previewRemoteCatalog({
      data: { provider: filled?.provider ?? "local", baseUrl: filled?.baseUrl, token, useSample },
    }),
    onSuccess: (res) => {
      setPreview(res.products);
      setSource(res.source);
      toast.success(res.source === "sample" ? "Loaded a sample Invoice Ninja catalog" : `Loaded ${res.products.length} remote products`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMut = useMutation({
    mutationFn: (useSample: boolean) => importRemoteCatalog({
      data: { provider: filled?.provider ?? "local", baseUrl: filled?.baseUrl, token, useSample },
    }),
    onSuccess: (res) => { toast.success(res.note); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pushMut = useMutation({
    mutationFn: (invoiceId: number) => pushInvoiceToApi({
      data: {
        invoiceId,
        provider: filled!.provider === "generic_rest" ? "generic_rest" : "invoice_ninja",
        baseUrl: filled!.baseUrl,
        token,
      },
    }),
    onSuccess: () => { toast.success("Invoice pushed to the invoicing API"); qc.invalidateQueries({ queryKey: ["invoices"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkMut = useMutation({
    mutationFn: () => linkStaffIdentity({ data: { staffIdentifier: staffId } }),
    onSuccess: () => {
      toast.success("Staff identity linked");
      setStaffId("");
      qc.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!s || !filled) return <div className="h-40 rounded-xl bg-surface-2" />;

  const myAccount = (accountsQ.data ?? []).find((a) => a.userId === user?.id);

  return (
    <div>
      <PageHeader
        kicker="School"
        title="Link and settings"
        description="Your staff account, campus identity, and the Invoice Ninja hook. Tokens stay in this session."
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Staff account</CardTitle>
          <CardDescription>
            Sign in with Google (Gmail), X, or school email. Link a TSC or national ID from the staff roll.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.displayName ?? "Staff user"}</p>
              <p className="truncate text-xs text-muted">{user?.primaryEmail ?? "No email on file"}</p>
              {myAccount?.staffIdentifier ? (
                <p className="mt-1 font-mono text-xs text-primary">
                  Linked {myAccount.staffName ?? myAccount.staffIdentifier} · {myAccount.staffIdentifier}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted">Not yet linked to a TSC or ID number</p>
              )}
            </div>
            <UserButton />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label>Link TSC or ID number</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff record" />
                </SelectTrigger>
                <SelectContent>
                  {(staffQ.data ?? []).map((member) => (
                    <SelectItem key={member.identifier} value={member.identifier}>
                      {member.firstName} {member.lastName} · {member.identifier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" disabled={!staffId || linkMut.isPending} onClick={() => linkMut.mutate()}>
              {linkMut.isPending ? "Linking…" : "Link identity"}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                  <th className="py-2 font-medium">User</th>
                  <th className="py-2 font-medium">Role</th>
                  <th className="py-2 font-medium">Staff key</th>
                  <th className="py-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {(accountsQ.data ?? []).map((account) => (
                  <tr key={account.userId} className="border-b border-border/70">
                    <td className="py-2">
                      <p className="font-medium">{account.displayName ?? account.email ?? "Staff"}</p>
                      <p className="text-xs text-muted">{account.email}</p>
                    </td>
                    <td className="py-2 capitalize">{account.role}</td>
                    <td className="py-2 font-mono text-xs">{account.staffIdentifier ?? "—"}</td>
                    <td className="py-2 text-xs text-muted">{formatDate(account.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campus</CardTitle>
            <CardDescription>Used on invoices and the sidebar.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>School name</Label>
              <Input defaultValue={s.schoolName} onChange={(e) => setSchoolName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Campus</Label>
              <Input defaultValue={s.campus} onChange={(e) => setCampus(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <Input defaultValue={s.currency} onChange={(e) => setCurrency(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Invoice prefix</Label>
                <Input className="font-mono" defaultValue={s.invoicePrefix} onChange={(e) => setPrefix(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving…" : "Save campus"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoicing API</CardTitle>
            <CardDescription>
              Invoice Ninja v5 inventory (`/api/v1/products`) or a generic REST catalog. Without a token, import the sample catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Provider</Label>
              <Select defaultValue={s.apiProvider} onValueChange={(v) => setProvider(v as ApiProvider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local ledger only</SelectItem>
                  <SelectItem value="invoice_ninja">Invoice Ninja</SelectItem>
                  <SelectItem value="generic_rest">Generic REST inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Base URL</Label>
              <Input placeholder="https://invoicing.co" defaultValue={s.apiBaseUrl ?? ""} onChange={(e) => setBaseUrl(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>API token (this session)</Label>
              <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Not stored" />
            </div>
            {s.lastSyncNote ? (
              <p className="text-xs text-muted">Last sync {s.lastSyncAt ? formatDate(s.lastSyncAt) : ""} — {s.lastSyncNote}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => saveMut.mutate()}>Save connection</Button>
              <Button variant="outline" onClick={() => previewMut.mutate(false)} disabled={previewMut.isPending}>Test pull</Button>
              <Button variant="secondary" onClick={() => previewMut.mutate(true)} disabled={previewMut.isPending}>Sample catalog</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {preview ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Remote catalog</CardTitle>
            <CardDescription>Source: {source === "sample" ? "sample Invoice Ninja products" : source}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                    <th className="py-2 font-medium">SKU</th>
                    <th className="py-2 font-medium">Name</th>
                    <th className="py-2 font-medium">Qty</th>
                    <th className="py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p) => (
                    <tr key={p.externalId} className="border-b border-border/70">
                      <td className="py-2 font-mono text-xs">{p.sku}</td>
                      <td className="py-2">{p.name}</td>
                      <td className="py-2 tabular-nums">{p.quantity}</td>
                      <td className="py-2 tabular-nums">{p.unitCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-4" onClick={() => importMut.mutate(source === "sample")} disabled={importMut.isPending}>
              {importMut.isPending ? "Importing…" : "Import into stores"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {filled.provider !== "local" && token && filled.baseUrl ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Push an invoice</CardTitle>
            <CardDescription>Send a local invoice to the connected invoicing app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(invQ.data ?? []).slice(0, 6).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted">{inv.invoiceNo}</p>
                  <p className="text-sm">{inv.partyName}</p>
                </div>
                <Button size="sm" variant="outline" disabled={pushMut.isPending} onClick={() => pushMut.mutate(inv.id)}>Push</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
