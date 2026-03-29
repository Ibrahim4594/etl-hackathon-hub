import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { competitions } from "./competitions";
import { contributionTypeEnum, sponsorTierEnum } from "./enums";

export const competitionSponsors = pgTable("competition_sponsors", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitionId: uuid("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  contributionType: contributionTypeEnum("contribution_type").notNull().default("monetary"),
  contributionTitle: text("contribution_title").notNull(),
  contributionDescription: text("contribution_description"),
  contributionAmount: integer("contribution_amount"),
  contributionCurrency: text("contribution_currency").default("PKR"),
  contactPersonName: text("contact_person_name"),
  contactPersonEmail: text("contact_person_email"),
  contactPersonPhone: text("contact_person_phone"),
  sponsorTier: sponsorTierEnum("sponsor_tier").notNull().default("partner"),
  displayOrder: integer("display_order").default(0),
  featured: boolean("featured").default(false),
  isOrganizer: boolean("is_organizer").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
