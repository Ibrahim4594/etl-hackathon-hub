"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { GraduationCap, Building2, Scale, ShieldCheck, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { MagicCard } from "@/components/ui/magic-card";
import { ModeToggle } from "@/components/shared/mode-toggle";

const ROLES = [
  {
    key: "student" as const,
    label: "Participant",
    description: "Compete in hackathons, build projects, and win prizes",
    icon: GraduationCap,
    bullets: ["Join hackathons", "Build with teammates", "Win prizes & badges"],
  },
  {
    key: "sponsor" as const,
    label: "Organizer",
    description: "Host competitions and discover top talent",
    icon: Building2,
    bullets: ["Publish hackathons", "Discover talent", "AI-powered judging"],
  },
  {
    key: "judge" as const,
    label: "Judge",
    description: "Evaluate submissions and score projects",
    icon: Scale,
    bullets: ["Review submissions", "Score on rubric", "AI-assisted evaluation"],
  },
  {
    key: "admin" as const,
    label: "Admin",
    description: "Platform management and oversight",
    icon: ShieldCheck,
    bullets: ["Manage users", "Approve competitions", "Platform settings"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const meta = user.publicMetadata as { role?: string; onboardingComplete?: boolean };
    if (meta.role && meta.onboardingComplete) {
      window.location.href = `/${meta.role}/dashboard`;
    }
  }, [isLoaded, user]);

  const selectRole = async (role: "student" | "sponsor" | "judge") => {
    if (!user) return;
    await user.update({
      unsafeMetadata: { ...user.unsafeMetadata, selectedRole: role },
    });
    router.push(`/onboarding/${role}`);
  };

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch("/api/onboarding/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid credentials");
        return;
      }
      toast.success("Admin access granted!");
      window.location.href = "/admin/dashboard";
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      {/* Background orbs */}
      <div className="absolute -left-20 top-20 w-72 h-72 bg-primary/15 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none animate-orb-drift-1" />
      <div className="absolute -right-20 bottom-20 w-96 h-96 bg-primary/10 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none animate-orb-drift-2" />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
            className="flex justify-center mb-5"
          >
            <Image
              src="/logo/spark-logo-animated-themed.gif"
              width={48}
              height={48}
              alt="Spark logo"
              unoptimized
              className="logo-glow"
            />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            How will you use{" "}
            <span className="animated-gradient-text">Spark</span>?
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-2 text-sm text-muted-foreground"
          >
            Choose your role to set up your account
          </motion.p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!showAdminLogin ? (
            <motion.div
              key="roles"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {ROLES.map((role, index) => {
                const Icon = role.icon;

                const handleClick = () => {
                  if (role.key === "admin") {
                    setShowAdminLogin(true);
                  } else {
                    selectRole(role.key);
                  }
                };

                return (
                  <motion.div
                    key={role.key}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.25 + index * 0.08,
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <button type="button" onClick={handleClick} className="w-full text-left">
                      <MagicCard
                        gradientSize={200}
                        gradientOpacity={0.1}
                        className="p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/[0.06] hover:border-primary/30"
                      >
                        {/* Icon — dark foreground on light teal bg for contrast */}
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Title — dark, readable */}
                        <h3 className="mt-3.5 text-[15px] font-semibold text-foreground">
                          {role.label}
                        </h3>
                        <p className="mt-0.5 text-[13px] text-muted-foreground leading-relaxed">
                          {role.description}
                        </p>

                        {/* Bullets — muted, small */}
                        <ul className="mt-3.5 space-y-2">
                          {role.bullets.map((b) => (
                            <li key={b} className="flex items-center gap-2.5 text-[12px] text-muted-foreground">
                              <span className="h-1 w-1 rounded-full bg-foreground/20 shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>

                        {/* CTA */}
                        <div className="mt-4 flex items-center gap-1 text-[12px] font-medium text-foreground/50">
                          Get started <ArrowRight className="h-3 w-3" />
                        </div>
                      </MagicCard>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="admin"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-sm"
            >
              <MagicCard gradientSize={300} gradientOpacity={0.08} className="p-6 space-y-5">
                <div className="text-center space-y-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </motion.div>
                  <h3 className="text-base font-semibold text-foreground mt-3">Admin Access</h3>
                  <p className="text-[13px] text-muted-foreground">Enter platform admin credentials</p>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@spark.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      placeholder="Enter admin password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    />
                  </div>
                  <Button
                    className="w-full h-10 rounded-xl"
                    onClick={handleAdminLogin}
                    disabled={adminLoading || !adminEmail || !adminPassword}
                  >
                    {adminLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In as Admin
                  </Button>
                </div>

                <button
                  onClick={() => setShowAdminLogin(false)}
                  className="flex items-center justify-center gap-1.5 w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to role selection
                </button>
              </MagicCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
