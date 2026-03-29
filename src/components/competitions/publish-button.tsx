"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PublishButton({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.missingFields
          ? `Missing: ${data.missingFields.join(", ")}`
          : data.error || "Failed to submit";
        throw new Error(msg);
      }
      toast.success("Competition submitted for review!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handlePublish} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Submit for Review
    </Button>
  );
}
