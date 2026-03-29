/**
 * Achievement service.
 *
 * Checks predefined achievement criteria and awards badges to users.
 * Achievements are stored as a JSON string array on the user record.
 */

import { db } from "@/lib/db";
import {
  users,
  submissions,
  teamMembers,
  teams,
  finalRankings,
} from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";

// ────────────────────────── types ──────────────────────────

interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  event: string;
  check: (userId: string) => Promise<boolean>;
}

// ────────────────────────── definitions ──────────────────────────

const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "first_submission",
    name: "First Submission",
    description: "Submitted your first project",
    event: "first_submission",
    check: async (userId: string) => {
      const [result] = await db
        .select({ count: count() })
        .from(submissions)
        .where(eq(submissions.submittedBy, userId));
      return (result?.count ?? 0) >= 1;
    },
  },
  {
    id: "first_win",
    name: "First Win",
    description: "Won your first competition",
    event: "first_win",
    check: async (userId: string) => {
      // Check if the user is part of any winning team
      const [result] = await db
        .select({ count: count() })
        .from(finalRankings)
        .innerJoin(teams, eq(finalRankings.teamId, teams.id))
        .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
        .where(
          sql`${teamMembers.userId} = ${userId} AND ${finalRankings.isWinner} = true`
        );
      return (result?.count ?? 0) >= 1;
    },
  },
  {
    id: "team_lead",
    name: "Team Leader",
    description: "Led a team in a competition",
    event: "team_lead",
    check: async (userId: string) => {
      const [result] = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(
          sql`${teamMembers.userId} = ${userId} AND ${teamMembers.role} = 'lead'`
        );
      return (result?.count ?? 0) >= 1;
    },
  },
  {
    id: "five_competitions",
    name: "Veteran Competitor",
    description: "Participated in 5 or more competitions",
    event: "five_competitions",
    check: async (userId: string) => {
      const [result] = await db
        .select({
          count: sql<number>`count(distinct ${teams.competitionId})`,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teamMembers.userId, userId));
      return (result?.count ?? 0) >= 5;
    },
  },
  {
    id: "finalist",
    name: "Finalist",
    description: "Reached the finals in a competition",
    event: "finalist",
    check: async (userId: string) => {
      const [result] = await db
        .select({ count: count() })
        .from(finalRankings)
        .innerJoin(teams, eq(finalRankings.teamId, teams.id))
        .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
        .where(
          sql`${teamMembers.userId} = ${userId} AND ${finalRankings.isFinalist} = true`
        );
      return (result?.count ?? 0) >= 1;
    },
  },
];

// ────────────────────────── main ──────────────────────────

export async function checkAndAwardAchievements(
  userId: string,
  event: string
): Promise<string[]> {
  try {
    // 1. Fetch the user's current achievements
    const [user] = await db
      .select({ achievements: users.achievements })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      console.error(`User ${userId} not found for achievement check`);
      return [];
    }

    const currentAchievements: string[] = user.achievements ?? [];

    // 2. Find achievement definitions matching this event
    const matchingDefinitions = achievementDefinitions.filter(
      (def) => def.event === event
    );

    if (matchingDefinitions.length === 0) {
      return [];
    }

    // 3. Check each matching achievement
    const newlyAwarded: string[] = [];

    for (const definition of matchingDefinitions) {
      // Skip if already awarded
      if (currentAchievements.includes(definition.id)) {
        continue;
      }

      // Check if the user qualifies
      const qualifies = await definition.check(userId);
      if (qualifies) {
        newlyAwarded.push(definition.id);
      }
    }

    // 4. Update user record with new achievements
    if (newlyAwarded.length > 0) {
      const updatedAchievements = [...currentAchievements, ...newlyAwarded];
      await db
        .update(users)
        .set({
          achievements: updatedAchievements,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // 5. Return the names of newly awarded achievements
    return newlyAwarded.map((id) => {
      const def = achievementDefinitions.find((d) => d.id === id);
      return def?.name ?? id;
    });
  } catch (error) {
    console.error(
      `Achievement check failed for user ${userId}, event ${event}:`,
      error
    );
    return [];
  }
}
