import { redirect } from "next/navigation";
import { resolveOnboardingUser } from "@/lib/auth/resolve-onboarding-user";
import { serverAuth } from "@/lib/auth/server-auth";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const { userId } = await serverAuth();
  if (!userId) redirect("/sign-in");
  const dbUser = await resolveOnboardingUser(userId);
  if (!dbUser || dbUser.role !== "admin") redirect("/");

  return <SettingsForm />;
}
