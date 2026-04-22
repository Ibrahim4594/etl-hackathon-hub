"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pktLocalToUtcIso, utcIsoToPktLocal } from "@/lib/utils/timezone";

interface ExtendDeadlinesDialogProps {
  competitionId: string;
  registrationEnd: string | null;
  submissionEnd: string | null;
  judgingEnd: string | null;
  resultsDate: string | null;
}

export function ExtendDeadlinesDialog({
  competitionId,
  registrationEnd,
  submissionEnd,
  judgingEnd,
  resultsDate,
}: ExtendDeadlinesDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    registrationEnd: utcIsoToPktLocal(registrationEnd),
    submissionEnd: utcIsoToPktLocal(submissionEnd),
    judgingEnd: utcIsoToPktLocal(judgingEnd),
    resultsDate: utcIsoToPktLocal(resultsDate),
  });

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const k of ["registrationEnd", "submissionEnd", "judgingEnd", "resultsDate"] as const) {
        if (values[k]) {
          const iso = pktLocalToUtcIso(values[k]);
          if (iso) payload[k] = iso;
        }
      }

      const res = await fetch(`/api/competitions/${competitionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update deadlines");
        return;
      }

      toast.success("Deadlines updated");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Clock className="mr-1.5 h-3.5 w-3.5" />
        Extend Deadlines
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extend Deadlines</DialogTitle>
            <DialogDescription>
              Update the deadlines for this competition without taking it offline.
              All times are in Pakistan Time (PKT).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="regEnd">Registration Closes</Label>
              <Input
                id="regEnd"
                type="datetime-local"
                value={values.registrationEnd}
                onChange={(e) => setValues((v) => ({ ...v, registrationEnd: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subEnd">Submission Deadline</Label>
              <Input
                id="subEnd"
                type="datetime-local"
                value={values.submissionEnd}
                onChange={(e) => setValues((v) => ({ ...v, submissionEnd: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="judgeEnd">Judging Ends</Label>
              <Input
                id="judgeEnd"
                type="datetime-local"
                value={values.judgingEnd}
                onChange={(e) => setValues((v) => ({ ...v, judgingEnd: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="results">Results Announcement</Label>
              <Input
                id="results"
                type="datetime-local"
                value={values.resultsDate}
                onChange={(e) => setValues((v) => ({ ...v, resultsDate: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Deadlines
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
