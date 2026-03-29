"use client";

import FloatingActionMenu from "@/components/ui/floating-action-menu";
import { usePathname } from "next/navigation";
import { Trophy, FileText, Users, Plus } from "lucide-react";

export function PlatformFab() {
  const pathname = usePathname();

  // Determine options based on current route section
  const section = pathname.split("/")[1]; // student, sponsor, judge, admin

  const baseOptions = [
    {
      label: "Competitions",
      Icon: <Trophy className="w-4 h-4" />,
      onClick: () => {
        window.location.href = "/competitions";
      },
    },
  ];

  if (section === "sponsor") {
    return (
      <FloatingActionMenu
        options={[
          {
            label: "New Competition",
            Icon: <Plus className="w-4 h-4" />,
            onClick: () => {
              window.location.href = "/sponsor/competitions/new";
            },
          },
          {
            label: "My Competitions",
            Icon: <Trophy className="w-4 h-4" />,
            onClick: () => {
              window.location.href = "/sponsor/competitions";
            },
          },
          ...baseOptions,
        ]}
      />
    );
  }

  if (section === "student") {
    return (
      <FloatingActionMenu
        options={[
          {
            label: "My Submissions",
            Icon: <FileText className="w-4 h-4" />,
            onClick: () => {
              window.location.href = "/student/submissions";
            },
          },
          {
            label: "My Teams",
            Icon: <Users className="w-4 h-4" />,
            onClick: () => {
              window.location.href = "/student/teams";
            },
          },
          ...baseOptions,
        ]}
      />
    );
  }

  return <FloatingActionMenu options={baseOptions} />;
}
