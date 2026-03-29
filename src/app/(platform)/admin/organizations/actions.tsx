"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AdminOrgActionsProps {
  organizationId: string;
  currentStatus: string;
}

export function AdminOrgActions({ organizationId, currentStatus }: AdminOrgActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (currentStatus !== "pending") {
    return <span className="text-xs text-muted-foreground">No actions available</span>;
  }

  async function handleAction(verification: "verified" | "rejected") {
    setLoading(true);

    const rejectionReason =
      verification === "rejected"
        ? prompt("Enter rejection reason (optional):")
        : undefined;

    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          verification,
          rejectionReason: rejectionReason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update organization");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={loading}
        onClick={() => handleAction("verified")}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => handleAction("rejected")}
      >
        Reject
      </Button>
    </div>
  );
}
