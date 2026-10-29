import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const adminCredentials = pgTable('admin_credentials', {
  id: serial('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(true),
  recoveryEmail: text('recovery_email').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: serial('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  authMethod: text('auth_method').notNull().default('password'),
  ipAddress: text('ip_address').notNull().default(''),
  userAgent: text('user_agent').notNull().default(''),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const securityLogs = pgTable('security_logs', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  description: text('description').notNull(),
  ipAddress: text('ip_address').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull().default(''),
  imageUrl: text('image_url').notNull(),
  destinationUrl: text('destination_url').notNull().default(''),
  isPublished: boolean('is_published').notNull().default(true),
  isDemo: boolean('is_demo').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderCode: text('order_code').notNull().unique(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  projectType: text('project_type').notNull().default(''),
  budgetRange: text('budget_range').notNull().default(''),
  projectDescription: text('project_description').notNull(),
  referenceUrl: text('reference_url').notNull().default(''),
  additionalNotes: text('additional_notes').notNull().default(''),
  status: text('status').notNull().default('New'),
  isRead: boolean('is_read').notNull().default(false),
  adminNotes: text('admin_notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const websiteSettings = pgTable('website_settings', {
  id: serial('id').primaryKey(),
  settingKey: text('setting_key').notNull().unique(),
  settingValue: text('setting_value').notNull(),
  isPublic: boolean('is_public').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull().default('image/svg+xml'),
  sizeBytes: integer('size_bytes').notNull().default(0),
  storagePath: text('storage_path').notNull(),
  publicUrl: text('public_url').notNull(),
  dataUrl: text('data_url').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

export const navigationLinks = pgTable('navigation_links', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  destinationUrl: text('destination_url').notNull(),
  placement: text('placement').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isEnabled: boolean('is_enabled').notNull().default(true),
  openInNewTab: boolean('open_in_new_tab').notNull().default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(adminSessions),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(users, {
    fields: [adminSessions.userId],
    references: [users.id],
  }),
}));
