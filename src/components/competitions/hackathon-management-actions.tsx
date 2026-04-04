"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, Pencil, Trash2, Loader2, Globe, EyeOff } from "lucide-react";

interface HackathonManagementActionsProps {
  competitionId: string;
  competitionSlug: string;
  status: string;
}

export function HackathonManagementActions({
  competitionId,
  competitionSlug,
  status,
}: HackathonManagementActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canDelete = status === "draft" || status === "cancelled";
  const canUnpublish = status === "active" || status === "approved";

  async function handleDelete() {
    setLoading("delete");
    try {
      const res = await fetch(`/api/competitions/${competitionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete hackathon");
        return;
      }
      toast.success("Hackathon deleted");
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleUnpublish() {
    setLoading("unpublish");
    try {
      const res = await fetch(`/api/competitions/${competitionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to unpublish hackathon");
        return;
      }
      toast.success("Hackathon unpublished and set back to draft");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/competitions/${competitionSlug}`} target="_blank">
        <Button size="sm" variant="ghost">
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
      </Link>
      <Link href={`/sponsor/competitions/new?edit=${competitionId}`}>
        <Button size="sm" variant="outline">
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      </Link>
      {canUnpublish && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleUnpublish}
          disabled={loading === "unpublish"}
        >
          {loading === "unpublish" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
          )}
          Unpublish
        </Button>
      )}
      {canDelete && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hackathon</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this hackathon? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading === "delete"}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading === "delete"}>
              {loading === "delete" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
