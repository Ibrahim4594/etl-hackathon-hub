"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RegisterButton({ competitionId }: { competitionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleRegister = async () => {
    if (!termsAccepted) {
      toast.error("Please accept the terms and conditions to register");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/register`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      toast.success("Registered! You can now form a team and submit.");
      router.push("/student/teams");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          I accept the competition rules and agree to the terms of participation,
          including submission guidelines and fair play policies.
        </span>
      </label>
      <Button size="lg" onClick={handleRegister} disabled={loading || !termsAccepted} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Register Now
      </Button>
    </div>
  );
}
