import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const content = sqliteTable('content', {id:text('id').primaryKey(),kind:text('kind').notNull(),status:text('status').notNull(),data:text('data').notNull(),revision:integer('revision').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const settings = sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
