import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDormitory, addStream, getCampus, emptyCampus } from "@/lib/school/queries";
import { whenAuthed } from "@/lib/school/safe";

export const Route = createFileRoute("/campus")({
  loader: () => whenAuthed(getCampus, emptyCampus),
  component: CampusPage,
});

function CampusPage() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const campusQ = useQuery({ queryKey: ["campus"], queryFn: () => getCampus(), initialData: initial });
  const data = campusQ.data ?? initial;

  const [streamClass, setStreamClass] = useState("");
  const [streamName, setStreamName] = useState("");
  const [dormBlock, setDormBlock] = useState("");
  const [dormName, setDormName] = useState("");
  const [dormCap, setDormCap] = useState("40");

  const streamMut = useMutation({
    mutationFn: () => addStream({ data: { classId: Number(streamClass), name: streamName } }),
    onSuccess: () => {
      toast.success("Stream added");
      qc.invalidateQueries({ queryKey: ["campus"] });
      setStreamName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dormMut = useMutation({
    mutationFn: () => addDormitory({ data: { blockId: Number(dormBlock), name: dormName, capacity: Number(dormCap) } }),
    onSuccess: () => {
      toast.success("Dormitory added");
      qc.invalidateQueries({ queryKey: ["campus"] });
      setDormName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        kicker="Structure"
        title="Campus"
        description="Every class is divided into streams. Every boarding block houses several dormitories."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Classes and streams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.classes.map((c) => {
              const streams = data.streams.filter((s) => s.classId === c.id);
              return (
                <div key={c.id}>
                  <p className="text-sm font-medium">{c.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {streams.map((s) => (
                      <span key={s.id} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium">
                        Stream {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_8rem_auto]">
              <Select value={streamClass} onValueChange={setStreamClass}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {data.classes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="D" value={streamName} onChange={(e) => setStreamName(e.target.value)} />
              <Button disabled={!streamClass || !streamName || streamMut.isPending} onClick={() => streamMut.mutate()}>
                Add stream
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blocks and dormitories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {data.blocks.map((b) => {
              const dorms = data.dormitories.filter((d) => d.blockId === b.id);
              return (
                <div key={b.id}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{b.name} block</p>
                    <StatusBadge value={b.gender} />
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {dorms.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <span>{d.name}</span>
                        <span className="tabular-nums text-muted">{d.occupied}/{d.capacity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="grid gap-2 border-t border-border pt-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <Select value={dormBlock} onValueChange={setDormBlock}>
                  <SelectTrigger><SelectValue placeholder="Block" /></SelectTrigger>
                  <SelectContent>
                    {data.blocks.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Cedar 4" value={dormName} onChange={(e) => setDormName(e.target.value)} />
                <div className="grid gap-1.5">
                  <Label className="sr-only">Capacity</Label>
                  <Input type="number" min={1} value={dormCap} onChange={(e) => setDormCap(e.target.value)} />
                </div>
              </div>
              <Button disabled={!dormBlock || !dormName || dormMut.isPending} onClick={() => dormMut.mutate()}>
                Add dormitory
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
