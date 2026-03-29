"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const faqs = [
  {
    question: "How do I register as a participant?",
    answer:
      "Click 'Start Your Journey', sign up with your email, and select the Participant role. Complete your profile with your university, skills, and links. You'll be ready to browse and join competitions immediately.",
  },
  {
    question: "Is the platform free for participants?",
    answer:
      "Yes — Competition Spark is completely free for participants. You can browse competitions, form teams, submit projects, and earn badges at no cost. Organizers pay a listing fee to host competitions.",
  },
  {
    question: "How do organizers post competitions?",
    answer:
      "Organizers create an organization account, then use our step-by-step wizard to define challenge details, timelines, prizes, and judging criteria. After a quick admin review, competitions go live on the marketplace.",
  },
  {
    question: "How does AI judging work?",
    answer:
      "Our AI engine (powered by GPT-4o) analyzes each submission's GitHub repository, README, and demo video. It scores across four dimensions — Innovation, Technical Quality, Impact, and Design — and generates structured feedback. Human judges make all final decisions.",
  },
  {
    question: "How are teams formed?",
    answer:
      "Create a team from your dashboard and share the unique invite code with teammates. Members join by entering the code. Most competitions allow teams of up to 4, but solo entries are welcome too.",
  },
  {
    question: "What can I win?",
    answer:
      "Prizes vary by competition and include cash awards (PKR 10K–500K+), achievement badges, certificates, and portfolio recognition. Top performers gain visibility with recruiters and industry partners across Pakistan.",
  },
  {
    question: "How is judging fairness ensured?",
    answer:
      "We use Z-score normalization to eliminate judge bias — harsh and lenient scorers are mathematically balanced. AI provides a consistent baseline score, and multiple judges evaluate each submission independently.",
  },
  {
    question: "Can I participate in multiple competitions?",
    answer:
      "Absolutely. Join as many competitions as you like — each has its own team and submission. Your profile tracks all your participations, wins, and badges across every competition.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10" />
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-primary/10 text-foreground hover:bg-primary/20 border-primary/20 px-4 py-1.5 text-sm">
            <HelpCircle className="w-4 h-4 mr-2" />
            FAQ
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold mb-8 text-foreground">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-primary via-primary-hover to-foreground bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Everything you need to know about Competition Spark
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-background rounded-xl shadow-lg border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-xl"
            >
              <button
                type="button"
                className="flex justify-between items-center w-full text-left p-6 cursor-pointer"
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              >
                <h3 className="text-lg font-semibold text-foreground pr-4">
                  {faq.question}
                </h3>
                <ChevronDown
                  className={`w-5 h-5 text-primary shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
