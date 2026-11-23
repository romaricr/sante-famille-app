import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey(),
  space: text('space').notNull(),
  ownerId: text('owner_id').notNull(),
  person: text('person').notNull(),
  careDate: date('care_date').notNull(),
  category: text('category').notNull(),
  provider: text('provider').notNull(),
  cents: integer('cents').notNull(),
  note: text('note').notNull(),
  receipt: text('receipt'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check('expenses_positive_cents', sql`${table.cents} > 0`),
  index('expenses_space_date').on(table.space, table.careDate, table.createdAt),
]);

export const sessions = pgTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  familyHash: text('family_hash'),
  space: text('space').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('sessions_family_hash').on(table.familyHash),
  index('sessions_expires_at').on(table.expiresAt),
]);

export const rateLimits = pgTable('rate_limits', {
  scope: text('scope').primaryKey(),
  attempts: integer('attempts').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [index('rate_limits_expires_at').on(table.expiresAt)]);
