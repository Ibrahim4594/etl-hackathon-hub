"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function QuickPublishButton({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  const handleQuickPublish = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/quick-publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to quick publish");
      }
      toast.success("Competition is now LIVE!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to quick publish");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleQuickPublish}
      disabled={loading}
      variant="outline"
      size="sm"
      className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Zap className="mr-1.5 h-3.5 w-3.5" />
      )}
      Quick Publish (Dev)
    </Button>
  );
}
