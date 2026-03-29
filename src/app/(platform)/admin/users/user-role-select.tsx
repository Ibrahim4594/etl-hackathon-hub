"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const ROLES = [
  { value: "student", label: "Participant" },
  { value: "sponsor", label: "Organizer" },
  { value: "judge", label: "Judge" },
  { value: "admin", label: "Admin" },
] as const;

interface UserRoleSelectProps {
  userId: string;
  currentRole: string | null;
  isSelf: boolean;
}

export function UserRoleSelect({ userId, currentRole, isSelf }: UserRoleSelectProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRoleChange(newRole: string | null) {
    if (!newRole) return;
    if (newRole === currentRole) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
        return;
      }

      toast.success(`Role updated to ${ROLES.find(r => r.value === newRole)?.label ?? newRole}`);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (isSelf) {
    return (
      <span className="text-xs text-muted-foreground italic">
        (you)
      </span>
    );
  }

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  return (
    <Select
      value={currentRole ?? "student"}
      onValueChange={handleRoleChange}
    >
      <SelectTrigger size="sm" className="h-7 w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            {role.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
