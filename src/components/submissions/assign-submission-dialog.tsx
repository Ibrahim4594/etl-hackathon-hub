"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, CheckCircle2, X } from "lucide-react";

interface Judge {
  id: string;
  name: string;
  email: string;
}

interface AssignSubmissionDialogProps {
  submissionId: string;
  submissionTitle: string;
  judges: Judge[];
  assignedJudgeIds?: string[];
}

export function AssignSubmissionDialog({
  submissionId,
  submissionTitle,
  judges,
  assignedJudgeIds = [],
}: AssignSubmissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<Set<string>>(new Set(assignedJudgeIds));

  async function handleAssign(judgeId: string) {
    setLoading(judgeId);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to assign submission");
        return;
      }

      toast.success("Submission assigned — judge has been notified");
      setAssigned((prev) => new Set(prev).add(judgeId));
    } finally {
      setLoading(null);
    }
  }

  async function handleUnassign(judgeId: string) {
    setLoading(judgeId);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/assign?judgeId=${judgeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to unassign");
        return;
      }

      toast.success("Judge unassigned from this submission");
      setAssigned((prev) => {
        const next = new Set(prev);
        next.delete(judgeId);
        return next;
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <Button size="sm" variant="default" onClick={() => setOpen(true)}>
        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
        Assign
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Submission</DialogTitle>
            <DialogDescription>
              Select a judge to review &ldquo;{submissionTitle}&rdquo;. They
              will be notified immediately.
            </DialogDescription>
          </DialogHeader>

          {judges.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No judges assigned to this competition yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Invite judges first from the competition detail page.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {judges.map((judge) => {
                const isAssigned = assigned.has(judge.id);
                const isLoading = loading === judge.id;

                return (
                  <div
                    key={judge.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {judge.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {judge.email}
                      </p>
                    </div>
                    {isAssigned ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Assigned
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleUnassign(judge.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(judge.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Assign"
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
