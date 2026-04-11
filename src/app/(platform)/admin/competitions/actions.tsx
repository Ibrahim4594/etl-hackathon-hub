"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface AdminCompetitionActionsProps {
  competitionId: string;
}

export function AdminCompetitionActions({
  competitionId,
}: AdminCompetitionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/competitions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId, action: "approve" }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to approve");
        return;
      }

      toast.success("Competition approved! Organizer can now go live.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/competitions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId,
          action: "reject",
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to reject");
        return;
      }

      toast.success("Competition rejected");
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={loading}
          onClick={handleApprove}
          className="gap-1.5 rounded-full"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => setRejectOpen(true)}
          className="gap-1.5 rounded-full"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Competition</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The organizer will see this on
              their dashboard.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (e.g., incomplete details, unclear challenge statement, insufficient prize pool)..."
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-xl"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading || !reason.trim()}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject Competition
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
