export interface Project {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  destinationUrl: string;
  isPublished: boolean;
  isDemo: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  orderCode: string;
  customerName: string;
  phone: string;
  email: string;
  projectType: string;
  budgetRange: string;
  projectDescription: string;
  referenceUrl: string;
  additionalNotes: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Completed' | 'Cancelled';
  isRead: boolean;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface NavigationLink {
  id: number;
  label: string;
  destinationUrl: string;
  placement: 'header' | 'footer' | 'social' | 'contact' | 'hero';
  displayOrder: number;
  isEnabled: boolean;
  openInNewTab: boolean;
}

export interface MediaItem {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string;
  uploadedAt: string;
  usedByProjects?: { id: number; title: string; isPublished: boolean }[];
}

export interface NotificationConfig {
  notify_email_enabled: boolean;
  notify_recipient_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_from: string;
  smtp_pass_configured: boolean;
  notify_telegram_enabled: boolean;
  telegram_chat_id: string;
  telegram_bot_token_configured: boolean;
}

export interface SecurityLog {
  id: number;
  eventType: string;
  description: string;
  ipAddress: string;
  createdAt: string;
}

export interface ActiveSession {
  id: number;
  authMethod: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: string;
  createdAt: string;
}
