"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function InviteJudgeDialog({ competitionId }: { competitionId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [expertise, setExpertise] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/judge/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name.trim(), competitionId, expertise: expertise.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite judge");

      toast.success(data.message || "Judge invited successfully!");
      setOpen(false);
      setName("");
      setEmail("");
      setExpertise("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Judge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a Judge</DialogTitle>
          <DialogDescription>
            Enter the email of the person you want to invite as a judge.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="judge-name">Judge Name</Label>
            <Input
              id="judge-name"
              type="text"
              placeholder="Dr. Ahmed Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="judge-email">Email Address</Label>
            <Input
              id="judge-email"
              type="email"
              placeholder="judge@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="judge-expertise">Area of Expertise</Label>
            <Input
              id="judge-expertise"
              type="text"
              placeholder="e.g. Machine Learning, Web Development"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
            />
          </div>
          <Button onClick={handleInvite} disabled={!name.trim() || !email.trim() || loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
