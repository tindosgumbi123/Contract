import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  shareToken: text("share_token").notNull().unique(),
  contractType: text("contract_type").notNull(),
  status: text("status").notNull().default("draft"),
  employeeName: text("employee_name"),
  employeeAddress: text("employee_address"),
  letterDate: text("letter_date"),
  position: text("position"),
  startDate: text("start_date"),
  annualSalary: text("annual_salary"),
  monthlySalary: text("monthly_salary"),
  supervisor: text("supervisor"),
  employmentStatus: text("employment_status"),
  placeOfWork: text("place_of_work"),
  employeeSignature: text("employee_signature"),
  employeeSignedAt: text("employee_signed_at"),
  witnessSignature: text("witness_signature"),
  witnessName: text("witness_name"),
  witnessSignedAt: text("witness_signed_at"),
  projectManagerSignature: text("project_manager_signature"),
  projectManagerSignedAt: text("project_manager_signed_at"),
  projectManagerName: text("project_manager_name"),
  directorSignature: text("director_signature"),
  directorSignedAt: text("director_signed_at"),
  companySignature: text("company_signature"),
  companySignedAt: text("company_signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  id: true,
  shareToken: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
