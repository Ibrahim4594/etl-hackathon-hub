import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const DEV_USERS: Record<string, { email: string; firstName: string; lastName: string; role: "student" | "sponsor" | "judge" | "admin" }> = {
  student: { email: "student@test.dev", firstName: "Test", lastName: "Student", role: "student" },
  sponsor: { email: "sponsor@test.dev", firstName: "Test", lastName: "Organizer", role: "sponsor" },
  judge: { email: "judge@test.dev", firstName: "Test", lastName: "Judge", role: "judge" },
  admin: { email: "admin@test.dev", firstName: "Test", lastName: "Admin", role: "admin" },
};

export async function POST(req: Request) {
  const { role } = await req.json();

  if (!DEV_USERS[role]) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const config = DEV_USERS[role];
  const clerkId = `dev_${role}`;

  // Upsert user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));

  let dbUser = existing;

  if (!dbUser) {
    const [inserted] = await db
      .insert(users)
      .values({
        clerkId,
        email: config.email,
        firstName: config.firstName,
        lastName: config.lastName,
        role: config.role,
        onboardingComplete: true,
        university: config.role === "student" ? "Test University" : null,
        whatsapp: config.role === "student" ? "+923001234567" : null,
        skills: config.role === "student" ? ["JavaScript", "React", "Python"] : null,
      })
      .returning();
    dbUser = inserted;
  }

  // If sponsor, ensure an org exists
  if (role === "sponsor") {
    const [existingOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, dbUser.id));

    if (!existingOrg) {
      await db.insert(organizations).values({
        ownerId: dbUser.id,
        name: "Test Organization",
        slug: "test-org-" + Date.now().toString(36),
        website: "https://testorg.dev",
        description: "A test organization for development",
        industry: "Technology",
        contactEmail: "sponsor@test.dev",
        contactPhone: "+923001234567",
        contactPersonName: "Test Organizer",
        verification: "verified",
      });
    }
  }

  const res = NextResponse.json({ success: true, role, userId: dbUser.id });
  res.cookies.set("dev-auth-role", role, {
    path: "/",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("dev-auth-role");
  return res;
}
