import { serverAuth } from "@/lib/auth/server-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, organizations, competitions, competitionSponsors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ensureDbUser } from "@/lib/auth/ensure-db-user";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function daysFromNow(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date;
}

export async function POST() {
  try {
    const { userId } = await serverAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await ensureDbUser(userId);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create demo organizations
    const orgData = [
      {
        name: "TechCorp Pakistan",
        slug: "techcorp-pakistan",
        website: "https://techcorp.pk",
        description: "Leading AI and machine learning company in Pakistan, building next-generation intelligent systems.",
        industry: "Technology",
        contactEmail: "hello@techcorp.pk",
      },
      {
        name: "JazzCash",
        slug: "jazzcash",
        website: "https://jazzcash.com.pk",
        description: "Pakistan's leading digital payments platform, enabling financial inclusion for millions.",
        industry: "FinTech",
        contactEmail: "dev@jazzcash.com.pk",
      },
      {
        name: "PTCL",
        slug: "ptcl",
        website: "https://ptcl.com.pk",
        description: "Pakistan's largest telecommunications company driving digital transformation.",
        industry: "Telecommunications",
        contactEmail: "innovation@ptcl.com.pk",
      },
      {
        name: "Systems Limited",
        slug: "systems-limited",
        website: "https://systemsltd.com",
        description: "Pakistan's premier IT services company, listed on PSX, delivering enterprise solutions globally.",
        industry: "IT Services",
        contactEmail: "hackathon@systemsltd.com",
      },
      {
        name: "Sehat Kahani",
        slug: "sehat-kahani",
        website: "https://sehatkahani.com",
        description: "Digital health platform connecting patients with doctors, transforming healthcare access in Pakistan.",
        industry: "HealthTech",
        contactEmail: "tech@sehatkahani.com",
      },
      {
        name: "ETL Online",
        slug: "etl-online",
        website: "https://etlonline.org",
        description: "Empowering tech communities through education, events, and open source initiatives across Pakistan.",
        industry: "Education",
        contactEmail: "hello@etlonline.org",
      },
    ];

    const orgIds: string[] = [];

    for (const org of orgData) {
      // Upsert: skip if slug already exists
      const [existing] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, org.slug));

      if (existing) {
        orgIds.push(existing.id);
      } else {
        const [inserted] = await db
          .insert(organizations)
          .values({
            ownerId: dbUser.id,
            ...org,
            verification: "verified",
          })
          .returning({ id: organizations.id });
        orgIds.push(inserted.id);
      }
    }

    // Create demo competitions
    const compData = [
      {
        title: "AI Innovation Challenge 2025",
        slug: "ai-innovation-challenge-2025",
        tagline: "Build the next breakthrough AI application that solves real problems for Pakistan",
        description:
          "The AI Innovation Challenge brings together Pakistan's brightest minds to develop cutting-edge AI solutions. Whether you're building NLP tools for Urdu, computer vision for agriculture, or predictive models for healthcare — we want to see your innovative ideas come to life.\n\nThis competition is open to participants, professionals, and AI enthusiasts from across Pakistan. Teams will have 4 weeks to build and submit their projects.",
        challengeStatement: "Design and build an AI-powered application that addresses a real-world challenge faced by communities in Pakistan. Your solution must use at least one machine learning model and demonstrate practical impact.",
        requirements: "- Must include a trained ML model (not just API calls)\n- Working demo or prototype required\n- GitHub repository with clean documentation\n- 3-minute video walkthrough",
        category: "AI/ML",
        tags: ["AI", "Machine Learning", "NLP", "Computer Vision", "Python"],
        totalPrizePool: 500000,
        prizes: [
          { position: 1, title: "1st Place", amount: 250000, currency: "PKR", description: "Winner takes all — plus mentorship from TechCorp's AI team" },
          { position: 2, title: "2nd Place", amount: 150000, currency: "PKR", description: "Runner up prize" },
          { position: 3, title: "3rd Place", amount: 100000, currency: "PKR", description: "Third place prize" },
        ],
        orgIndex: 0,
        status: "active" as const,
        registrationStart: daysFromNow(-30),
        registrationEnd: daysFromNow(7),
        submissionStart: daysFromNow(-14),
        submissionEnd: daysFromNow(21),
        judgingStart: daysFromNow(22),
        judgingEnd: daysFromNow(35),
        resultsDate: daysFromNow(40),
        maxTeamSize: 4,
        minTeamSize: 2,
        maxParticipants: 200,
      },
      {
        title: "FinTech Hackathon",
        slug: "fintech-hackathon-2025",
        tagline: "Reimagine digital payments and financial services for Pakistan's unbanked population",
        description:
          "JazzCash presents the FinTech Hackathon — a 48-hour sprint to build innovative financial technology solutions. With over 100 million Pakistanis still unbanked, there's a massive opportunity to create tools that drive financial inclusion.\n\nWe're looking for creative solutions in digital payments, micro-lending, savings platforms, and financial literacy tools.",
        challengeStatement: "Build a fintech solution that makes financial services more accessible to underserved communities in Pakistan.",
        requirements: "- Must address financial inclusion\n- Working prototype with payment flow demo\n- Blockchain solutions welcome but not required\n- Pitch deck required",
        category: "FinTech",
        tags: ["Blockchain", "FinTech", "Payments", "React", "Node.js"],
        totalPrizePool: 300000,
        prizes: [
          { position: 1, title: "1st Place", amount: 150000, currency: "PKR", description: "Plus integration opportunity with JazzCash" },
          { position: 2, title: "2nd Place", amount: 100000, currency: "PKR" },
          { position: 3, title: "3rd Place", amount: 50000, currency: "PKR" },
        ],
        orgIndex: 1,
        status: "active" as const,
        registrationStart: daysFromNow(-20),
        registrationEnd: daysFromNow(10),
        submissionStart: daysFromNow(-7),
        submissionEnd: daysFromNow(14),
        judgingStart: daysFromNow(15),
        judgingEnd: daysFromNow(25),
        resultsDate: daysFromNow(30),
        maxTeamSize: 3,
        minTeamSize: 1,
        maxParticipants: 150,
      },
      {
        title: "Green Pakistan IoT Challenge",
        slug: "green-pakistan-iot-challenge",
        tagline: "Use IoT and smart technology to build a more sustainable Pakistan",
        description:
          "PTCL's Green Pakistan IoT Challenge invites innovators to develop IoT solutions for environmental sustainability. From smart agriculture to air quality monitoring, energy optimization to waste management — use connected devices to make Pakistan greener.\n\nPTCL will provide IoT development kits to the top 20 registered teams.",
        challengeStatement: "Design an IoT-based solution that contributes to environmental sustainability in Pakistan.",
        requirements: "- Must include hardware/IoT component (real or simulated)\n- Environmental impact metrics required\n- Video demo showing the prototype\n- Technical architecture documentation",
        category: "IoT",
        tags: ["IoT", "Sustainability", "Arduino", "Raspberry Pi", "Python"],
        totalPrizePool: 200000,
        prizes: [
          { position: 1, title: "1st Place", amount: 100000, currency: "PKR" },
          { position: 2, title: "2nd Place", amount: 60000, currency: "PKR" },
          { position: 3, title: "3rd Place", amount: 40000, currency: "PKR" },
        ],
        orgIndex: 2,
        status: "active" as const,
        registrationStart: daysFromNow(-15),
        registrationEnd: daysFromNow(15),
        submissionStart: daysFromNow(-5),
        submissionEnd: daysFromNow(30),
        judgingStart: daysFromNow(31),
        judgingEnd: daysFromNow(40),
        resultsDate: daysFromNow(45),
        maxTeamSize: 5,
        minTeamSize: 2,
        maxParticipants: 100,
      },
      {
        title: "WebDev Sprint 2025",
        slug: "webdev-sprint-2025",
        tagline: "Build a production-quality web application in 72 hours",
        description:
          "Systems Limited presents WebDev Sprint — a fast-paced 72-hour hackathon for web developers. Build a full-stack web application from scratch. We're looking for clean code, beautiful UI, and real-world utility.\n\nTop performers will be invited for interviews at Systems Limited.",
        challengeStatement: "Build a full-stack web application that solves a problem you're passionate about. Must include authentication, database, and a responsive frontend.",
        requirements: "- Full-stack application (frontend + backend + database)\n- Deployed on a live URL\n- GitHub repo with README\n- Must use modern frameworks (React, Next.js, Vue, etc.)",
        category: "Web Dev",
        tags: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js"],
        totalPrizePool: 150000,
        prizes: [
          { position: 1, title: "1st Place", amount: 80000, currency: "PKR", description: "Plus fast-track interview at Systems Limited" },
          { position: 2, title: "2nd Place", amount: 45000, currency: "PKR" },
          { position: 3, title: "3rd Place", amount: 25000, currency: "PKR" },
        ],
        orgIndex: 3,
        status: "judging" as const,
        registrationStart: daysFromNow(-60),
        registrationEnd: daysFromNow(-30),
        submissionStart: daysFromNow(-45),
        submissionEnd: daysFromNow(-10),
        judgingStart: daysFromNow(-9),
        judgingEnd: daysFromNow(5),
        resultsDate: daysFromNow(10),
        maxTeamSize: 3,
        minTeamSize: 1,
        maxParticipants: 300,
      },
      {
        title: "HealthTech AI Challenge",
        slug: "healthtech-ai-challenge",
        tagline: "Leverage AI to improve healthcare access and outcomes in Pakistan",
        description:
          "Sehat Kahani presents the HealthTech AI Challenge. Pakistan's healthcare system faces immense challenges — from doctor shortages in rural areas to diagnostic delays. Use artificial intelligence to build solutions that save lives.\n\nMentorship from Sehat Kahani's medical and tech teams will be available throughout the competition.",
        challengeStatement: "Build an AI-powered healthcare solution that addresses a specific challenge in Pakistan's healthcare system.",
        requirements: "- Must include an AI/ML component\n- Healthcare domain focus required\n- User-friendly interface for non-technical users\n- Privacy and data security considerations documented",
        category: "HealthTech",
        tags: ["AI", "HealthTech", "Python", "TensorFlow", "React"],
        totalPrizePool: 400000,
        prizes: [
          { position: 1, title: "1st Place", amount: 200000, currency: "PKR", description: "Plus pilot opportunity with Sehat Kahani" },
          { position: 2, title: "2nd Place", amount: 120000, currency: "PKR" },
          { position: 3, title: "3rd Place", amount: 80000, currency: "PKR" },
        ],
        orgIndex: 4,
        status: "active" as const,
        registrationStart: daysFromNow(-10),
        registrationEnd: daysFromNow(20),
        submissionStart: daysFromNow(0),
        submissionEnd: daysFromNow(28),
        judgingStart: daysFromNow(29),
        judgingEnd: daysFromNow(40),
        resultsDate: daysFromNow(45),
        maxTeamSize: 4,
        minTeamSize: 2,
        maxParticipants: 150,
      },
      {
        title: "Open Source Pakistan",
        slug: "open-source-pakistan",
        tagline: "Contribute to open source and put Pakistan on the global developer map",
        description:
          "ETL Online's Open Source Pakistan competition encourages developers to create or meaningfully contribute to open source projects. The best open source projects built by Pakistani developers will be showcased at the annual ETL Developer Summit.\n\nAll skill levels welcome — from first-time contributors to seasoned maintainers.",
        challengeStatement: "Create a new open source project or make significant contributions to existing ones. Projects should benefit the Pakistani developer community.",
        requirements: "- Public GitHub repository with OSS license\n- Meaningful README and documentation\n- At least 10 commits from team members\n- Project must be useful to the community",
        category: "Open Innovation",
        tags: ["Open Source", "GitHub", "TypeScript", "Python", "Community"],
        totalPrizePool: 100000,
        prizes: [
          { position: 1, title: "1st Place", amount: 50000, currency: "PKR", description: "Plus featured talk at ETL Developer Summit" },
          { position: 2, title: "2nd Place", amount: 30000, currency: "PKR" },
          { position: 3, title: "3rd Place", amount: 20000, currency: "PKR" },
        ],
        orgIndex: 5,
        status: "completed" as const,
        registrationStart: daysFromNow(-90),
        registrationEnd: daysFromNow(-60),
        submissionStart: daysFromNow(-75),
        submissionEnd: daysFromNow(-30),
        judgingStart: daysFromNow(-29),
        judgingEnd: daysFromNow(-15),
        resultsDate: daysFromNow(-10),
        maxTeamSize: 4,
        minTeamSize: 1,
        maxParticipants: 500,
      },
    ];

    // Seed sponsor data per competition slug
    const COMP_SPONSORS: Record<string, {
      companyName: string; website?: string; contributionType: "monetary" | "tech_credits" | "mentorship" | "internships" | "cloud_services" | "api_credits" | "other";
      contributionTitle: string; contributionDescription?: string; contributionAmount?: number;
      sponsorTier: "title" | "gold" | "silver" | "bronze" | "partner"; featured?: boolean;
    }[]> = {
      "ai-innovation-challenge-2025": [
        { companyName: "NUST", website: "https://nust.edu.pk", contributionType: "mentorship", contributionTitle: "Academic Partner", contributionDescription: "Providing mentorship from NUST AI faculty and access to GPU compute labs", sponsorTier: "gold", featured: true },
        { companyName: "Google Pakistan", website: "https://google.com", contributionType: "api_credits", contributionTitle: "Cloud & API Credits", contributionDescription: "$500 in Google Cloud and Vertex AI credits per team", contributionAmount: 75000, sponsorTier: "silver" },
      ],
      "fintech-hackathon-2025": [
        { companyName: "Easypaisa", website: "https://easypaisa.com.pk", contributionType: "monetary", contributionTitle: "Co-Prize Sponsor", contributionDescription: "PKR 100K for the Best Financial Inclusion Hack", contributionAmount: 100000, sponsorTier: "gold", featured: true },
        { companyName: "State Bank of Pakistan", website: "https://sbp.org.pk", contributionType: "mentorship", contributionTitle: "Regulatory Partner", contributionDescription: "Expert mentorship on financial regulations and compliance", sponsorTier: "partner" },
      ],
      "green-pakistan-iot-challenge": [
        { companyName: "Jazz", website: "https://jazz.com.pk", contributionType: "monetary", contributionTitle: "Innovation Prize Sponsor", contributionDescription: "PKR 150K for the most innovative IoT solution", contributionAmount: 150000, sponsorTier: "gold", featured: true },
      ],
    };

    let created = 0;
    let skipped = 0;

    for (const comp of compData) {
      const [existing] = await db
        .select({ id: competitions.id })
        .from(competitions)
        .where(eq(competitions.slug, comp.slug));

      if (existing) {
        skipped++;
        continue;
      }

      const { orgIndex, ...rest } = comp;
      const [inserted] = await db.insert(competitions).values({
        ...rest,
        organizationId: orgIds[orgIndex],
        createdBy: dbUser.id,
        judgingCriteria: [
          { name: "Innovation", description: "Uniqueness and creativity of the solution", weight: 30, maxScore: 10 },
          { name: "Technical Execution", description: "Code quality, architecture, and completeness", weight: 30, maxScore: 10 },
          { name: "Impact", description: "Real-world applicability and potential impact", weight: 25, maxScore: 10 },
          { name: "Presentation", description: "Demo quality, documentation, and pitch", weight: 15, maxScore: 10 },
        ],
        submissionRequirements: {
          githubRequired: true,
          videoRequired: true,
          deployedUrlRequired: false,
          pitchDeckRequired: false,
          maxScreenshots: 5,
        },
        publishedAt: rest.registrationStart,
        featured: rest.totalPrizePool >= 300000,
      }).returning({ id: competitions.id });

      // Seed sponsors for this competition
      const seedSponsors = COMP_SPONSORS[rest.slug] ?? [];
      const orgForComp = orgData[orgIndex];
      await db.insert(competitionSponsors).values([
        {
          competitionId: inserted.id,
          companyName: orgForComp.name,
          website: orgForComp.website,
          contributionType: "monetary" as const,
          contributionTitle: "Primary Organizer",
          sponsorTier: "title" as const,
          displayOrder: 0,
          isOrganizer: true,
          featured: true,
        },
        ...seedSponsors.map((s, i) => ({
          competitionId: inserted.id,
          ...s,
          displayOrder: i + 1,
          isOrganizer: false,
        })),
      ]);

      created++;
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${created} competitions, skipped ${skipped} (already exist)`,
      organizations: orgIds.length,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { error: "Seed failed", details: String(err) },
      { status: 500 }
    );
  }
}
