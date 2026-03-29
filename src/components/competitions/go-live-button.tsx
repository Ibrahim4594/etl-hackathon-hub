"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GoLiveButtonProps {
  competitionId: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function GoLiveButton({ competitionId, size = "default" }: GoLiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleGoLive() {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/go-live`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to publish");
        return;
      }

      toast.success("Competition is now live!");
      setConfirmOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to publish competition");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size={size}
        onClick={() => setConfirmOpen(true)}
        className="gap-1.5"
      >
        <Rocket className="h-4 w-4" />
        Go Live
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ready to go live?</DialogTitle>
            <DialogDescription>
              Are you ready to publish? Your competition will be visible to all
              participants on the marketplace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGoLive}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Publish Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
