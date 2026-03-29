import { serverAuth } from "@/lib/auth/server-auth";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Rocket,
  Trophy,
  Users,
  Brain,
  Shield,
  BarChart3,
  ArrowRight,
  Building2,
  CheckCircle,
  Zap,
  Target,
  Code,
  Star,
  Award,
  Briefcase,
  TrendingUp,
  Clock,
} from "lucide-react";
import { db } from "@/lib/db";
import { competitions, organizations, users } from "@/lib/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { CompetitionCard } from "@/components/competitions/competition-card";
import { FaqSection } from "@/components/marketing/faq-section";
import { FadeIn } from "@/components/motion/fade-in";
import {
  StaggerChildren,
  StaggerItem,
} from "@/components/motion/stagger-children";
import { SlideIn } from "@/components/motion/slide-in";
import { CountUp } from "@/components/motion/count-up";
import { BackgroundOrbs } from "@/components/motion/background-orbs";
import { GlowCard } from "@/components/motion/glow-card";
import { HeroSparkAnimation } from "@/components/marketing/hero-spark-animation";
import { Spotlight } from "@/components/ui/spotlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { HeroTextReveal } from "@/components/marketing/hero-text-reveal";
import { AnimatedScoreBar } from "@/components/marketing/animated-score-bar";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { MagicCard } from "@/components/ui/magic-card";
import { GsapScrollReveal } from "@/components/motion/gsap-scroll-reveal";
import { GsapStaggerReveal } from "@/components/motion/gsap-stagger-reveal";
import { TestimonialsColumn, type Testimonial } from "@/components/ui/testimonials-columns";
import { IconBox } from "@/components/shared/icon-box";

/* ─── Data ────────────────────────────────────────────────────────────── */

const stats = [
  { icon: Trophy, label: "Active Competitions", value: "50+" },
  { icon: Users, label: "Participant Entries", value: "10,000+" },
  { icon: Target, label: "Prize Pool Awarded", value: "PKR 5M+" },
  { icon: Building2, label: "Partner Organizations", value: "100+" },
];

const universities = [
  "LUMS",
  "NUST",
  "FAST",
  "GIKI",
  "IBA",
  "NED",
  "COMSATS",
  "UET",
  "PIEAS",
  "ITU",
  "SZABIST",
  "UMT",
];

const steps = [
  {
    number: 1,
    icon: Building2,
    title: "Organizer Posts Challenge",
    description:
      "Organizations publish hackathons with prizes and requirements",
  },
  {
    number: 2,
    icon: Users,
    title: "Participants Register",
    description:
      "Form teams of up to 4 or go solo, verify with university email",
  },
  {
    number: 3,
    icon: Code,
    title: "Build & Submit",
    description:
      "Develop your solution, push to GitHub, record demo video, submit",
  },
  {
    number: 4,
    icon: Shield,
    title: "Auto Validation",
    description:
      "Platform validates GitHub repos, video links, required fields automatically",
  },
  {
    number: 5,
    icon: Brain,
    title: "AI + Human Judging",
    description:
      "GPT-4o pre-scores, then expert judges evaluate with Z-score fairness",
  },
  {
    number: 6,
    icon: Trophy,
    title: "Winners Announced",
    description:
      "Finalists selected, prizes awarded, badges earned, profiles updated",
  },
];

const features = [
  {
    icon: Trophy,
    title: "Hackathon Marketplace",
    description:
      "Browse and register for competitions from Pakistan's top organizations.",
    highlights: [
      "Browse active competitions",
      "One-click registration",
      "Category filtering",
    ],
  },
  {
    icon: Users,
    title: "Team Formation",
    description:
      "Find teammates, create teams, and collaborate with invite codes.",
    highlights: [
      "Create & manage teams",
      "Share invite codes",
      "Role-based access",
    ],
  },
  {
    icon: Shield,
    title: "Auto Validation",
    description:
      "Submissions are automatically validated for GitHub repos, video links, and deadlines.",
    highlights: [
      "GitHub repo validation",
      "Video link checks",
      "Deadline enforcement",
    ],
  },
  {
    icon: Brain,
    title: "AI-Powered Judging",
    description:
      "GPT-4o pre-scores submissions on innovation, technical quality, impact, and design.",
    highlights: [
      "4-dimension scoring",
      "Structured feedback",
      "Bias reduction",
    ],
  },
  {
    icon: BarChart3,
    title: "Live Leaderboard",
    description:
      "Real-time rankings with Z-score normalization for fair judging.",
    highlights: [
      "Real-time updates",
      "Z-score normalization",
      "Fair ranking",
    ],
  },
  {
    icon: Zap,
    title: "Instant Results",
    description:
      "Automated finalist selection, winner announcements, and achievement badges.",
    highlights: [
      "Auto finalist selection",
      "Winner announcements",
      "Achievement badges",
    ],
  },
];

const studentBenefits = [
  "Discover competitions from top Pakistani companies",
  "Build real-world projects that matter",
  "Get AI-powered feedback on your submissions",
  "Earn prizes, badges, and recognition",
  "Build a portfolio that gets you hired",
  "Connect with industry mentors and recruiters",
];

const sponsorBenefits = [
  "Access 10,000+ verified participant developers",
  "AI-powered screening saves 50% judging time",
  "Z-score normalization ensures fair evaluation",
  "Custom rubrics and judging criteria",
  "Real-time analytics and engagement metrics",
  "Brand visibility across 45+ universities",
];

const testimonialsCol1: Testimonial[] = [
  {
    text: "Spark completely changed how we approach hackathons. The platform made it so easy to find teammates and submit our project.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=FK&backgroundColor=2dd4bf",
    name: "Fatima Khan",
    role: "CS Student, LUMS",
  },
  {
    text: "The AI judging saved us hours of manual review. We processed 200+ submissions in a fraction of the time it used to take.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=AR&backgroundColor=14b8a6",
    name: "Ahmed Raza",
    role: "CTO, FinTech Pakistan",
  },
  {
    text: "Finding talented developers in Pakistan has never been easier. Spark connects us directly with the brightest minds from top universities.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=SH&backgroundColor=0d9488",
    name: "Sara Hassan",
    role: "Engineering Lead, Careem",
  },
];

const testimonialsCol2: Testimonial[] = [
  {
    text: "I won my first hackathon thanks to Spark's AI feedback. It pointed out areas to improve before the final judging round.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=AK&backgroundColor=2dd4bf",
    name: "Ayesha Khan",
    role: "SE Student, FAST Islamabad",
  },
  {
    text: "The Z-score normalization makes judging incredibly fair. Every submission gets evaluated on the same playing field.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=SM&backgroundColor=14b8a6",
    name: "Dr. Saad Malik",
    role: "AI Researcher, NUST",
  },
  {
    text: "We hosted our first company hackathon on Spark and got 300+ registrations in the first week. The platform handled everything seamlessly.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=OA&backgroundColor=0d9488",
    name: "Omar Ali",
    role: "Head of Engineering, Airlift",
  },
];

const testimonialsCol3: Testimonial[] = [
  {
    text: "The team formation feature is a game-changer. I found amazing teammates from GIKI and IBA for my first cross-university hackathon.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=HB&backgroundColor=2dd4bf",
    name: "Hassan Bilal",
    role: "EE Student, GIKI",
  },
  {
    text: "As a judge, the side-by-side AI and human scoring panel makes evaluation so efficient. Best judging experience I have had.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=NF&backgroundColor=14b8a6",
    name: "Dr. Nadia Farooq",
    role: "Professor, IBA Karachi",
  },
  {
    text: "Spark's real-time leaderboard kept our participants engaged throughout the entire competition. The energy was unmatched.",
    image: "https://api.dicebear.com/9.x/initials/svg?seed=UR&backgroundColor=0d9488",
    name: "Usman Rashid",
    role: "Community Lead, Google DSC Pakistan",
  },
];

const roadmapPhases = [
  {
    phase: "Phase 1",
    title: "Foundation",
    status: "completed" as const,
    items: [
      "Submission system & validation engine",
      "Team formation & invite codes",
      "Competition marketplace",
      "Clerk authentication & RBAC",
      "Participant & organizer onboarding",
    ],
  },
  {
    phase: "Phase 2",
    title: "AI & Judging",
    status: "in-progress" as const,
    items: [
      "AI Judge pipeline (GPT-4o)",
      "Human judge dashboard",
      "Z-score ranking engine",
      "Real-time leaderboard",
      "Notification system",
    ],
  },
  {
    phase: "Phase 3",
    title: "Scale",
    status: "upcoming" as const,
    items: [
      "Stripe payment integration",
      "WhatsApp notifications",
      "Plagiarism detection",
      "Mobile-first experience",
      "University partnerships",
    ],
  },
  {
    phase: "Phase 4",
    title: "Ecosystem",
    status: "upcoming" as const,
    items: [
      "Public API for integrations",
      "Mentorship marketplace",
      "Portfolio builder",
      "Recruiter dashboard",
      "International expansion",
    ],
  },
];

/* ScoreBar replaced by AnimatedScoreBar client component */

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default async function LandingPage() {
  const { userId } = await serverAuth();
  let role: string | undefined;
  if (userId) {
    const [u] = await db.select({ role: users.role }).from(users).where(eq(users.clerkId, userId));
    role = u?.role ?? undefined;
  }

  const featuredCompetitions = await db
    .select({
      id: competitions.id,
      title: competitions.title,
      slug: competitions.slug,
      tagline: competitions.tagline,
      category: competitions.category,
      tags: competitions.tags,
      coverImageUrl: competitions.coverImageUrl,
      totalPrizePool: competitions.totalPrizePool,
      maxTeamSize: competitions.maxTeamSize,
      minTeamSize: competitions.minTeamSize,
      submissionEnd: competitions.submissionEnd,
      status: competitions.status,
      organizationName: organizations.name,
      organizationLogoUrl: organizations.logoUrl,
    })
    .from(competitions)
    .leftJoin(organizations, eq(competitions.organizationId, organizations.id))
    .where(
      or(
        eq(competitions.status, "active"),
        eq(competitions.status, "judging")
      )
    )
    .orderBy(desc(competitions.featured), desc(competitions.createdAt))
    .limit(6);

  const studentHref = !userId
    ? "/sign-up"
    : role === "student"
      ? "/student/dashboard"
      : role
        ? "/sign-up"
        : "/onboarding";

  const sponsorHref = !userId
    ? "/sign-up"
    : role === "sponsor"
      ? "/sponsor/competitions/new"
      : role
        ? "/sign-up"
        : "/onboarding";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <BackgroundOrbs />

      {/* ───────────────── HERO ───────────────── */}
      <section className="relative pt-32 md:pt-40 pb-24 grain overflow-hidden">
        <div className="absolute inset-0 hero-animated-gradient" />
        <HeroSparkAnimation />
        <Spotlight size={500} color="rgba(81, 236, 220, 0.06)" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <HeroTextReveal>
            {/* Shimmer badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-5 py-2 text-sm font-medium shimmer mb-10">
              <Zap className="w-4 h-4 text-primary" />
              Pakistan&apos;s First AI-Powered Hackathon Platform
            </div>

            {/* Text generate effect — words blur-to-clear one by one */}
            <h1 className="text-6xl md:text-[8.5rem] font-black leading-[0.9] tracking-tighter mb-8">
              <TextGenerateEffect
                words="Compete. Build. Win."
                wordClassName="animated-gradient-text"
                duration={0.4}
              />
            </h1>

            {/* Logo with pulse glow */}
            <div className="flex justify-center mb-8">
              <Image
                src="/logo/spark-logo-animated-themed.gif"
                width={80}
                height={80}
                alt="Spark logo"
                unoptimized
                className="logo-glow"
              />
            </div>

            {/* Subtitle */}
            <div className="hero-subtitle">
              <p className="text-xl md:text-2xl leading-relaxed text-muted-foreground mb-14 max-w-4xl mx-auto">
                Where{" "}
                <span className="text-primary font-semibold">
                  10,000+ developers
                </span>{" "}
                compete in{" "}
                <span className="text-primary font-semibold">
                  AI-judged hackathons
                </span>{" "}
                from Pakistan&apos;s top organizations
              </p>
            </div>

            {/* Glow CTA buttons */}
            <div className="hero-ctas flex flex-col sm:flex-row gap-5 justify-center mb-24">
              <Link
                href={studentHref}
                className="arrow-slide-parent inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary text-primary-foreground px-9 py-4 text-lg font-bold cta-glow btn-interact"
              >
                Start Competing
                <ArrowRight className="w-5 h-5 arrow-slide" />
              </Link>
              <Link
                href={sponsorHref}
                className="inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full border border-border bg-card/50 backdrop-blur-sm text-foreground px-9 py-4 text-lg font-semibold hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
              >
                Host a Competition
                <Building2 className="w-5 h-5" />
              </Link>
            </div>
          </HeroTextReveal>

          {/* Glass stat cards */}
          <StaggerChildren className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto items-stretch">
            {stats.map((stat) => (
              <StaggerItem key={stat.label}>
                <div className="relative group h-full">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/0 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
                  <div className="relative bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 text-center card-hover h-full flex flex-col items-center justify-center">
                    <IconBox icon={stat.icon} size="lg" variant="primary" className="mx-auto mb-3" />
                    <div className="text-3xl md:text-4xl font-black text-foreground mb-1">
                      {stat.label === "Active Competitions" && (
                        <CountUp value={50} suffix="+" />
                      )}
                      {stat.label === "Participant Entries" && (
                        <CountUp value={10000} suffix="+" />
                      )}
                      {stat.label === "Prize Pool Awarded" && (
                        <>
                          PKR <CountUp value={5} suffix="M+" />
                        </>
                      )}
                      {stat.label === "Partner Organizations" && (
                        <CountUp value={100} suffix="+" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ───────────────── TRUSTED BY — MARQUEE ───────────────── */}
      <section className="py-10 border-y border-border/30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[11px] font-medium text-muted-foreground text-center mb-5 uppercase tracking-[0.2em]">
            Trusted by universities across Pakistan
          </p>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
            <div className="overflow-hidden">
              <div className="animate-marquee flex items-center gap-16 w-max">
                {[...universities, ...universities].map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    className="text-lg font-bold text-muted-foreground/60 whitespace-nowrap select-none"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── LIVE COMPETITIONS ───────────────── */}
      {featuredCompetitions.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <FadeIn>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                    Live{" "}
                    <span className="animated-gradient-text">
                      Competitions
                    </span>
                  </h2>
                  <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
                    Join active hackathons from Pakistan&apos;s top
                    organizations
                  </p>
                </div>
                <Link
                  href="/competitions"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:border-primary/50"
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </FadeIn>

            <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCompetitions.map((comp) => (
                <StaggerItem key={comp.id}>
                  <CompetitionCard
                    id={comp.id}
                    title={comp.title}
                    slug={comp.slug}
                    tagline={comp.tagline}
                    category={comp.category}
                    tags={comp.tags as string[] | undefined}
                    coverImageUrl={comp.coverImageUrl}
                    organizationName={comp.organizationName ?? "Unknown"}
                    organizationLogoUrl={comp.organizationLogoUrl}
                    totalPrizePool={comp.totalPrizePool ?? undefined}
                    maxTeamSize={comp.maxTeamSize}
                    minTeamSize={comp.minTeamSize}
                    submissionEnd={comp.submissionEnd}
                    status={comp.status}
                  />
                </StaggerItem>
              ))}
            </StaggerChildren>

            <div className="mt-8 text-center sm:hidden">
              <Link
                href="/competitions"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
              >
                Browse All Competitions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────── HOW IT WORKS ───────────────── */}
      <GsapScrollReveal>
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-foreground">
                From challenge to{" "}
                <span className="animated-gradient-text">champions</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl mx-auto">
                6 simple steps from posting a challenge to crowning winners
              </p>
            </div>
          </FadeIn>

          <div className="max-w-6xl mx-auto">
            {/* Row 1: Steps 1-3 */}
            <div className="relative mb-16">
              <div className="hidden lg:block absolute top-8 left-[17%] right-[17%] h-0.5 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40" />
              <div className="grid md:grid-cols-3 gap-10">
                {steps.slice(0, 3).map((step, index) => (
                  <FadeIn key={step.number} delay={index * 0.1}>
                    <MagicCard className="p-6">
                      <div className="text-center relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto mb-6 relative z-10 shadow-lg shadow-primary/20">
                          {step.number}
                        </div>
                        <IconBox icon={step.icon} size="lg" variant="primary" className="mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2 text-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </MagicCard>
                  </FadeIn>
                ))}
              </div>
            </div>

            {/* Vertical connector */}
            <div className="hidden lg:flex justify-center -mt-12 mb-4">
              <div className="w-0.5 h-12 bg-gradient-to-b from-primary/40 to-primary/10" />
            </div>

            {/* Row 2: Steps 4-6 */}
            <div className="relative">
              <div className="hidden lg:block absolute top-8 left-[17%] right-[17%] h-0.5 bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40" />
              <div className="grid md:grid-cols-3 gap-10">
                {steps.slice(3, 6).map((step, index) => (
                  <FadeIn key={step.number} delay={index * 0.1}>
                    <MagicCard className="p-6">
                      <div className="text-center relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto mb-6 relative z-10 shadow-lg shadow-primary/20">
                          {step.number}
                        </div>
                        <IconBox icon={step.icon} size="lg" variant="primary" className="mx-auto mb-4" />
                        <h3 className="text-lg font-bold mb-2 text-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </MagicCard>
                  </FadeIn>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      </GsapScrollReveal>

      {/* ───────────────── PLATFORM FEATURES — GLOW CARDS ───────────────── */}
      <section
        id="features"
        className="relative py-24 md:py-32 bg-background overflow-hidden"
      >
        <div className="absolute -right-32 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-foreground">
                Powerful tools for{" "}
                <span className="animated-gradient-text">success</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl mx-auto">
                Everything you need to compete, build, and win
              </p>
            </div>
          </FadeIn>

          <GsapStaggerReveal className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <GlowCard key={feature.title} innerClassName="p-8 shadow-sm">
                <IconBox icon={feature.icon} size="lg" variant="primary" className="mb-5" />
                <h3 className="text-lg font-bold mb-3 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </GlowCard>
            ))}
          </GsapStaggerReveal>
        </div>
      </section>

      {/* ───────────────── FOR STUDENTS ───────────────── */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left — Text */}
            <SlideIn direction="left">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-8 text-foreground">
                  Built for Pakistan&apos;s{" "}
                  <span className="animated-gradient-text">
                    brightest participants
                  </span>
                </h2>
                <ul className="space-y-4 mb-10">
                  {studentBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-lg leading-relaxed text-muted-foreground">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-primary text-primary-foreground px-8 py-4 text-lg font-semibold cta-glow btn-interact"
                >
                  Join as Participant
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </SlideIn>

            {/* Right — Mock Student Profile */}
            <SlideIn direction="right">
              <GlowCard innerClassName="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    AK
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground">
                      Ayesha Khan
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      CS @ LUMS &middot; Lahore
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">3</div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">8</div>
                    <div className="text-xs text-muted-foreground">
                      Submissions
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">5</div>
                    <div className="text-xs text-muted-foreground">Badges</div>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "React",
                      "Python",
                      "TensorFlow",
                      "Next.js",
                      "PostgreSQL",
                    ].map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="bg-primary/10 text-foreground border-primary/20 text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-3">
                    Recent Achievements
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-muted-foreground">
                        FinTech Hack &mdash; 1st Place
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-gray-400" />
                      <span className="text-muted-foreground">
                        AI Challenge &mdash; 2nd Place
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        Code Sprint &mdash; Top 10
                      </span>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* ───────────────── FOR SPONSORS ───────────────── */}
      <section id="sponsors" className="py-24 md:py-32 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left — Mock Sponsor Dashboard */}
            <SlideIn direction="left">
              <GlowCard innerClassName="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-primary-hover to-primary flex items-center justify-center text-white shadow-lg">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-foreground">
                      FinTech Pakistan
                    </h4>
                    <Badge className="bg-primary/10 text-foreground border-primary/20 text-xs">
                      Premium Organizer
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">
                      247
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Submissions
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">3</div>
                    <div className="text-xs text-muted-foreground">
                      Competitions
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-xl text-center">
                    <div className="text-2xl font-bold text-foreground">
                      89%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Engagement
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground font-medium">
                      Review Progress
                    </span>
                    <span className="font-bold text-foreground">82%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      style={{ width: "82%" }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-3">
                    Recent Activity
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        15 new submissions today
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-muted-foreground">
                        3 finalists selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">
                        AI scoring complete
                      </span>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </SlideIn>

            {/* Right — Text */}
            <SlideIn direction="right">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-8 text-foreground">
                  Find Pakistan&apos;s next{" "}
                  <span className="animated-gradient-text">top talent</span>
                </h2>
                <ul className="space-y-4 mb-10">
                  {sponsorBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-lg leading-relaxed text-muted-foreground">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-primary text-primary-foreground px-8 py-4 text-lg font-semibold cta-glow btn-interact"
                >
                  Host a Competition
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </SlideIn>
          </div>
        </div>
      </section>

      {/* ───────────────── AI JUDGE SHOWCASE ───────────────── */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-foreground">
                AI-powered{" "}
                <span className="animated-gradient-text">
                  evaluation engine
                </span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl mx-auto">
                GPT-4o analyzes every submission so judges can focus on what
                matters
              </p>
            </div>
          </FadeIn>

          {/* Mock AI Evaluation Card */}
          <FadeIn delay={0.1}>
            <div className="max-w-2xl mx-auto mb-16">
              <GlowCard innerClassName="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">
                      EcoTrack — Green Solutions
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Team Innovators &middot; FinTech Hackathon 2025
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <AnimatedScoreBar label="Innovation" score={8.5} delay={0} />
                  <AnimatedScoreBar label="Technical Quality" score={7.2} delay={200} />
                  <AnimatedScoreBar label="Impact" score={9.1} delay={400} />
                  <AnimatedScoreBar label="Design" score={6.8} delay={600} />
                </div>

                <div className="bg-muted p-6 rounded-xl mb-6">
                  <p className="text-sm font-medium text-foreground mb-2">
                    AI Summary
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    &ldquo;Strong environmental impact with innovative use of
                    real-time satellite data for carbon footprint tracking.
                    Well-structured React + Python codebase with comprehensive
                    tests. Design could benefit from improved mobile
                    responsiveness.&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    No issues detected
                  </span>
                </div>
              </GlowCard>
            </div>
          </FadeIn>

          {/* 3 highlight stats */}
          <StaggerChildren className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: Target,
                title: "4-Dimension Scoring",
                description: "Innovation, Technical, Impact, Design",
              },
              {
                icon: BarChart3,
                title: "Structured Summaries",
                description: "Detailed feedback for every submission",
              },
              {
                icon: Shield,
                title: "Bias Detection",
                description: "Flags anomalies and ensures consistency",
              },
            ].map((item) => (
              <StaggerItem key={item.title} className="text-center">
                <IconBox icon={item.icon} size="lg" variant="primary" className="mx-auto mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ───────────────── TESTIMONIALS — SCROLLING COLUMNS ───────────────── */}
      <GsapScrollReveal>
        <section className="py-24 md:py-32 bg-background">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-foreground">
                What Our Community{" "}
                <span className="animated-gradient-text">Says</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground max-w-3xl mx-auto">
                Hear from students and organizers across Pakistan
              </p>
            </div>

            <div className="relative max-w-6xl mx-auto max-h-[740px] overflow-hidden">
              {/* Top gradient mask */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
              {/* Bottom gradient mask */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                <TestimonialsColumn testimonials={testimonialsCol1} duration={15} className="hidden lg:block" />
                <TestimonialsColumn testimonials={testimonialsCol2} duration={19} className="hidden md:block" />
                <TestimonialsColumn testimonials={testimonialsCol3} duration={17} />
              </div>
            </div>
          </div>
        </section>
      </GsapScrollReveal>

      {/* ───────────────── ROADMAP ───────────────── */}
      <GsapScrollReveal>
      <section
        id="roadmap"
        className="py-24 md:py-32 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30"
      >
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-16 md:mb-20">
              <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-foreground">
                Competition Spark{" "}
                <span className="animated-gradient-text">roadmap</span>
              </h2>
            </div>
          </FadeIn>

          <div className="max-w-4xl mx-auto relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-primary/5 -translate-x-1/2" />

            {roadmapPhases.map((phase, i) => (
              <FadeIn key={phase.phase} delay={i * 0.15}>
                <div
                  className={`relative mb-16 last:mb-0 md:flex ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                        phase.status === "completed"
                          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/20"
                          : phase.status === "in-progress"
                            ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-primary/20"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {phase.status === "completed" ? (
                        <CheckCircle className="w-7 h-7" />
                      ) : phase.status === "in-progress" ? (
                        <Clock className="w-7 h-7" />
                      ) : (
                        <Rocket className="w-7 h-7" />
                      )}
                    </div>
                  </div>

                  <div
                    className={`ml-20 md:ml-0 md:w-[calc(50%-3rem)] ${
                      i % 2 === 0
                        ? "md:mr-auto md:pr-8"
                        : "md:ml-auto md:pl-8"
                    }`}
                  >
                    <Card className="border border-border/50 bg-card rounded-2xl card-hover">
                      <CardContent className="p-8">
                        <div className="flex items-center gap-3 mb-4">
                          <Badge
                            className={
                              phase.status === "completed"
                                ? "bg-primary text-primary-foreground border-0"
                                : phase.status === "in-progress"
                                  ? "bg-gradient-to-r from-primary to-accent text-primary-foreground border-0"
                                  : "bg-muted text-muted-foreground border-0"
                            }
                          >
                            {phase.phase}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {phase.status === "in-progress"
                              ? "In Progress"
                              : phase.status === "completed"
                                ? "Completed"
                                : "Upcoming"}
                          </span>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-4">
                          {phase.title}
                        </h3>
                        <ul className="space-y-2">
                          {phase.items.map((item) => (
                            <li
                              key={item}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <CheckCircle
                                className={`w-4 h-4 shrink-0 ${
                                  phase.status === "completed"
                                    ? "text-primary"
                                    : "text-muted-foreground/50"
                                }`}
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      </GsapScrollReveal>

      {/* ───────────────── FAQ ───────────────── */}
      <ScrollReveal y={20}>
        <FaqSection />
      </ScrollReveal>

      {/* ───────────────── FINAL CTA ───────────────── */}
      <GsapScrollReveal y={30}>
      <section className="relative py-24 md:py-32 bg-gradient-to-b from-background via-primary/80 to-primary overflow-hidden grain">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" />
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-8 text-primary-foreground">
              Ready to compete?
            </h2>
            <p className="text-lg leading-relaxed text-primary-foreground/80 mb-12 max-w-3xl mx-auto">
              Join participants, organizers, and universities building
              Pakistan&apos;s tech future together
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href={studentHref}
                className="inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full bg-white text-gray-900 px-8 py-4 text-lg font-bold shadow-2xl transition-all duration-200 hover:scale-105"
              >
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href={sponsorHref}
                className="inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full border-2 border-gray-900 text-gray-900 dark:border-white dark:text-white px-8 py-4 text-lg font-semibold transition-all duration-200 hover:scale-105 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Host a Competition
                <Building2 className="w-5 h-5" />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
      </GsapScrollReveal>
    </div>
  );
}
