import crypto from 'crypto';
import { asc, desc, eq, gt } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adminCredentials,
  adminSessions,
  media,
  navigationLinks,
  orders,
  projects,
  securityLogs,
  websiteSettings,
} from './schema.ts';

// High-resolution monochrome editorial SVG data URLs for initial portfolio visuals
const DEMO_SVGS = {
  kinetix: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
    <rect width="1200" height="900" fill="#0A0A0A"/>
    <rect x="60" y="60" width="1080" height="780" fill="none" stroke="#262626" stroke-width="2"/>
    <line x1="60" y1="150" x2="1140" y2="150" stroke="#262626" stroke-width="1.5"/>
    <circle cx="105" cy="105" r="8" fill="#FFFFFF"/>
    <text x="135" y="112" fill="#FFFFFF" font-family="sans-serif" font-size="18" font-weight="700" letter-spacing="4">KINETIX ATELIER</text>
    <text x="980" y="112" fill="#737373" font-family="monospace" font-size="14">COLLECTION 04</text>
    <rect x="120" y="220" width="460" height="540" fill="#141414" stroke="#333333" stroke-width="1"/>
    <path d="M180 680 L350 290 L520 680 Z" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
    <circle cx="350" cy="440" r="85" fill="none" stroke="#737373" stroke-width="1.5" stroke-dasharray="6 6"/>
    <text x="650" y="330" fill="#737373" font-family="monospace" font-size="15" letter-spacing="3">E-COMMERCE PLATFORM</text>
    <text x="650" y="410" fill="#FFFFFF" font-family="sans-serif" font-size="56" font-weight="700" letter-spacing="-1">Architectural</text>
    <text x="650" y="475" fill="#FFFFFF" font-family="sans-serif" font-size="56" font-weight="700" letter-spacing="-1">Menswear</text>
    <text x="650" y="545" fill="#A3A3A3" font-family="sans-serif" font-size="20">Headless storefront engineered for sub-second</text>
    <text x="650" y="575" fill="#A3A3A3" font-family="sans-serif" font-size="20">page transitions and global editorial drops.</text>
    <rect x="650" y="640" width="220" height="56" fill="#FFFFFF"/>
    <text x="710" y="675" fill="#0A0A0A" font-family="sans-serif" font-size="16" font-weight="700" letter-spacing="1">EXPLORE STORE</text>
  </svg>`)}`,
  aura: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
    <rect width="1200" height="900" fill="#F5F5F4"/>
    <rect x="60" y="60" width="1080" height="780" fill="#FFFFFF" stroke="#D6D3D1" stroke-width="2"/>
    <line x1="600" y1="60" x2="600" y2="840" stroke="#E7E5E4" stroke-width="1.5"/>
    <line x1="60" y1="450" x2="1140" y2="450" stroke="#E7E5E4" stroke-width="1.5"/>
    <text x="110" y="150" fill="#0A0A0A" font-family="sans-serif" font-size="20" font-weight="700" letter-spacing="5">AURA MONOLITH</text>
    <text x="110" y="280" fill="#0A0A0A" font-family="sans-serif" font-size="68" font-weight="800" letter-spacing="-2">Spatial</text>
    <text x="110" y="360" fill="#0A0A0A" font-family="sans-serif" font-size="68" font-weight="800" letter-spacing="-2">Architecture</text>
    <rect x="660" y="120" width="420" height="270" fill="#0A0A0A"/>
    <line x1="660" y1="120" x2="1080" y2="390" stroke="#404040" stroke-width="1.5"/>
    <line x1="1080" y1="120" x2="660" y2="390" stroke="#404040" stroke-width="1.5"/>
    <rect x="770" y="185" width="200" height="140" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
    <text x="110" y="550" fill="#57534E" font-family="sans-serif" font-size="22">Minimalist digital monograph for an international</text>
    <text x="110" y="585" fill="#57534E" font-family="sans-serif" font-size="22">architectural practice based in Zurich and Tokyo.</text>
    <text x="110" y="750" fill="#0A0A0A" font-family="monospace" font-size="16" font-weight="700">01 / PORTFOLIO SYSTEM — 2026</text>
    <circle cx="870" cy="645" r="120" fill="none" stroke="#0A0A0A" stroke-width="3"/>
    <circle cx="910" cy="645" r="120" fill="none" stroke="#78716C" stroke-width="1.5"/>
  </svg>`)}`,
  verve: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
    <rect width="1200" height="900" fill="#111111"/>
    <rect x="80" y="80" width="1040" height="740" fill="none" stroke="#2E2E2E" stroke-width="1.5"/>
    <text x="600" y="190" text-anchor="middle" fill="#A3A3A3" font-family="monospace" font-size="15" letter-spacing="6">CONTEMPORARY GASTRONOMY</text>
    <text x="600" y="320" text-anchor="middle" fill="#FFFFFF" font-family="serif" font-size="84" font-weight="700" letter-spacing="2">VERVE TABLE</text>
    <line x1="420" y1="380" x2="780" y2="380" stroke="#FFFFFF" stroke-width="1.5"/>
    <rect x="260" y="440" width="680" height="240" fill="#1A1A1A" stroke="#333333" stroke-width="1"/>
    <text x="600" y="525" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="24" font-weight="600">Interactive Tasting Menu &amp; Table Reservation Engine</text>
    <text x="600" y="575" text-anchor="middle" fill="#8A8A8A" font-family="sans-serif" font-size="18">Real-time seating availability, sommelier pairings, and private dining inquiries.</text>
    <rect x="470" y="610" width="260" height="44" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
    <text x="600" y="638" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-size="14" letter-spacing="2">RESERVE EXPERIENCE</text>
  </svg>`)}`,
  nexus: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
    <rect width="1200" height="900" fill="#FAFAFA"/>
    <rect x="60" y="60" width="1080" height="780" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="2"/>
    <rect x="60" y="60" width="260" height="780" fill="#0A0A0A"/>
    <text x="100" y="130" fill="#FFFFFF" font-family="sans-serif" font-size="22" font-weight="800" letter-spacing="2">FINLEDGER</text>
    <rect x="100" y="190" width="180" height="12" fill="#262626"/>
    <rect x="100" y="225" width="140" height="12" fill="#262626"/>
    <rect x="100" y="260" width="160" height="12" fill="#262626"/>
    <text x="380" y="150" fill="#737373" font-family="monospace" font-size="14" letter-spacing="2">WEB APPLICATION</text>
    <text x="380" y="220" fill="#0A0A0A" font-family="sans-serif" font-size="48" font-weight="800" letter-spacing="-1">Institutional Treasury Portal</text>
    <rect x="380" y="280" width="320" height="180" fill="#F5F5F5" stroke="#E5E5E5" stroke-width="1.5"/>
    <text x="410" y="330" fill="#737373" font-family="monospace" font-size="14">SETTLEMENT VOLUME</text>
    <text x="410" y="400" fill="#0A0A0A" font-family="monospace" font-size="44" font-weight="700">$48.2M</text>
    <rect x="740" y="280" width="320" height="180" fill="#0A0A0A"/>
    <text x="770" y="330" fill="#A3A3A3" font-family="monospace" font-size="14">UPTIME SLA</text>
    <text x="770" y="400" fill="#FFFFFF" font-family="monospace" font-size="44" font-weight="700">99.99%</text>
    <rect x="380" y="500" width="680" height="260" fill="#FFFFFF" stroke="#E5E5E5" stroke-width="1.5"/>
    <polyline points="420,700 530,640 640,660 750,570 860,590 1010,530" fill="none" stroke="#0A0A0A" stroke-width="4"/>
  </svg>`)}`,
};

const DEFAULT_PUBLIC_SETTINGS: Record<string, string> = {
  hero_heading: 'We build digital experiences.',
  hero_description:
    'We design and develop modern websites that help businesses stand out, connect with customers, and grow online.',
  hero_primary_cta_label: 'Explore Our Work',
  hero_primary_cta_url: '#work',
  hero_secondary_cta_label: 'Start a Project',
  hero_secondary_cta_url: '#order',
  work_title: 'PIVO Work',
  work_description: "A selection of projects we've designed and built.",
  order_title: "Let's Build Something.",
  order_description:
    "Tell us about your project. We'll review your requirements and get back to you.",
  form_label_name: 'Full Name',
  form_label_phone: 'Phone Number',
  form_label_email: 'Email Address',
  form_label_project_type: 'Project Type',
  form_label_budget: 'Budget Range',
  form_label_description: 'Project Description',
  form_label_reference: 'Reference Website',
  form_label_notes: 'Additional Notes',
  form_submit_label: 'Submit Project Request',
  form_project_types: JSON.stringify([
    'Business Website',
    'Restaurant Website',
    'E-commerce Website',
    'Portfolio Website',
    'Landing Page',
    'Web Application',
    'Other',
  ]),
  form_budget_ranges: JSON.stringify([
    'Under $100',
    '$100–$300',
    '$300–$500',
    '$500–$1,000',
    '$1,000+',
    'Not Decided Yet',
  ]),
  form_success_message:
    "Thank you for your request! We've received your project details and will contact you soon.",
  footer_description:
    'PIVO is an independent web development agency crafting minimalist, high-performance websites and digital products for forward-thinking brands.',
  footer_copyright: '© 2026 PIVO Agency. All rights reserved.',
  contact_email: 'hello@pivo.agency',
  contact_phone: '+1 (555) 234-5678',
  contact_location: 'New York · London · Cairo',
  seo_title: 'PIVO — Digital Web Development Agency & Portfolio',
  seo_description:
    'We design and develop modern websites that help businesses stand out, connect with customers, and grow online.',
};

const DEFAULT_PRIVATE_SETTINGS: Record<string, string> = {
  notify_email_enabled: 'false',
  notify_recipient_email: 'hanysteven512@gmail.com',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: 'notifications@pivo.agency',
  notify_telegram_enabled: 'false',
  telegram_bot_token: '',
  telegram_chat_id: '',
};

// Precomputed scrypt salted hash for initial setup credential so plaintext never appears in source files
const INITIAL_SALT = '7f9a2b4c8d1e3f5a6b0c9d8e7f6a5b4c';
const INITIAL_SCRYPT_HASH =
  '86d0e75c92f49064917e390881b923d35b3232ada6c11ef4cf0c43fcd339be6ec79453ddeb4b8d5f8bc2abcb84fcc622c0dbc84338d9d3f97b50dbfe60c892be';

let seedPromise: Promise<void> | null = null;

export function computePasswordHash(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }
  seedPromise = (async () => {
    try {
      // 1. Seed initial admin credential if table is empty
      const existingCreds = await db.select().from(adminCredentials).limit(1);
      if (existingCreds.length === 0) {
        let salt = INITIAL_SALT;
        let hash = INITIAL_SCRYPT_HASH;
        if (process.env.INITIAL_ADMIN_PASSWORD) {
          salt = crypto.randomBytes(16).toString('hex');
          hash = computePasswordHash(process.env.INITIAL_ADMIN_PASSWORD, salt);
        }
        await db.insert(adminCredentials).values({
          passwordHash: hash,
          passwordSalt: salt,
          mustChangePassword: true,
          recoveryEmail: 'hanysteven512@gmail.com',
        });
      }

      // 2. Seed website settings if empty
      const existingSettings = await db.select().from(websiteSettings).limit(1);
      if (existingSettings.length === 0) {
        const rows = [
          ...Object.entries(DEFAULT_PUBLIC_SETTINGS).map(([k, v]) => ({
            settingKey: k,
            settingValue: v,
            isPublic: true,
          })),
          ...Object.entries(DEFAULT_PRIVATE_SETTINGS).map(([k, v]) => ({
            settingKey: k,
            settingValue: v,
            isPublic: false,
          })),
        ];
        await db.insert(websiteSettings).values(rows).onConflictDoNothing();
      }

      // 3. Seed navigation links if empty
      const existingLinks = await db.select().from(navigationLinks).limit(1);
      if (existingLinks.length === 0) {
        await db.insert(navigationLinks).values([
          {
            label: 'Work',
            destinationUrl: '#work',
            placement: 'header',
            displayOrder: 1,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: 'Order',
            destinationUrl: '#order',
            placement: 'header',
            displayOrder: 2,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: 'Explore Our Work',
            destinationUrl: '#work',
            placement: 'hero',
            displayOrder: 1,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: 'Start a Project',
            destinationUrl: '#order',
            placement: 'hero',
            displayOrder: 2,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: 'Work',
            destinationUrl: '#work',
            placement: 'footer',
            displayOrder: 1,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: 'Order',
            destinationUrl: '#order',
            placement: 'footer',
            displayOrder: 2,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: 'hello@pivo.agency',
            destinationUrl: 'mailto:hello@pivo.agency',
            placement: 'contact',
            displayOrder: 1,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: '+1 (555) 234-5678',
            destinationUrl: 'tel:+15552345678',
            placement: 'contact',
            displayOrder: 2,
            isEnabled: true,
            openInNewTab: false,
          },
          {
            label: 'X / Twitter',
            destinationUrl: 'https://x.com',
            placement: 'social',
            displayOrder: 1,
            isEnabled: true,
            openInNewTab: true,
          },
          {
            label: 'LinkedIn',
            destinationUrl: 'https://linkedin.com',
            placement: 'social',
            displayOrder: 2,
            isEnabled: true,
            openInNewTab: true,
          },
          {
            label: 'GitHub',
            destinationUrl: 'https://github.com',
            placement: 'social',
            displayOrder: 3,
            isEnabled: true,
            openInNewTab: true,
          },
          {
            label: 'Instagram',
            destinationUrl: '',
            placement: 'social',
            displayOrder: 4,
            isEnabled: true,
            openInNewTab: true,
          },
        ]);
      }

      // 4. Seed initial media & demonstration projects if empty
      const existingProjects = await db.select().from(projects).limit(1);
      if (existingProjects.length === 0) {
        const insertedMedia = await db
          .insert(media)
          .values([
            {
              fileName: 'kinetix-atelier-showcase.svg',
              mimeType: 'image/svg+xml',
              sizeBytes: DEMO_SVGS.kinetix.length,
              storagePath: '/media/kinetix-atelier-showcase.svg',
              publicUrl: DEMO_SVGS.kinetix,
              dataUrl: DEMO_SVGS.kinetix,
            },
            {
              fileName: 'aura-monolith-architecture.svg',
              mimeType: 'image/svg+xml',
              sizeBytes: DEMO_SVGS.aura.length,
              storagePath: '/media/aura-monolith-architecture.svg',
              publicUrl: DEMO_SVGS.aura,
              dataUrl: DEMO_SVGS.aura,
            },
            {
              fileName: 'verve-table-gastronomy.svg',
              mimeType: 'image/svg+xml',
              sizeBytes: DEMO_SVGS.verve.length,
              storagePath: '/media/verve-table-gastronomy.svg',
              publicUrl: DEMO_SVGS.verve,
              dataUrl: DEMO_SVGS.verve,
            },
            {
              fileName: 'finledger-treasury-portal.svg',
              mimeType: 'image/svg+xml',
              sizeBytes: DEMO_SVGS.nexus.length,
              storagePath: '/media/finledger-treasury-portal.svg',
              publicUrl: DEMO_SVGS.nexus,
              dataUrl: DEMO_SVGS.nexus,
            },
          ])
          .returning();

        // Update publicUrl to point to the persistent server media endpoint `/api/media/file/:id`
        for (const item of insertedMedia) {
          await db
            .update(media)
            .set({ publicUrl: `/api/media/file/${item.id}` })
            .where(eq(media.id, item.id));
        }

        await db.insert(projects).values([
          {
            title: 'Kinetix Atelier — Luxury Menswear Storefront (Demo Project)',
            description:
              'Headless e-commerce experience engineered with sub-second page transitions, editorial lookbooks, and global multi-currency checkout.',
            category: 'E-commerce Website',
            imageUrl: insertedMedia[0] ? `/api/media/file/${insertedMedia[0].id}` : DEMO_SVGS.kinetix,
            destinationUrl: 'https://example.com/kinetix-atelier',
            isPublished: true,
            isDemo: true,
            displayOrder: 1,
          },
          {
            title: 'Aura Monolith — Spatial Architecture Monograph (Demo Project)',
            description:
              'Minimalist digital portfolio and project archive for an international architectural practice operating across Zurich and Tokyo.',
            category: 'Portfolio Website',
            imageUrl: insertedMedia[1] ? `/api/media/file/${insertedMedia[1].id}` : DEMO_SVGS.aura,
            destinationUrl: 'https://example.com/aura-architecture',
            isPublished: true,
            isDemo: true,
            displayOrder: 2,
          },
          {
            title: 'Verve Table — Contemporary Fine Dining & Reservations (Demo Project)',
            description:
              'Interactive seasonal tasting menu and real-time table reservation platform with sommelier pairing guides and private dining booking.',
            category: 'Restaurant Website',
            imageUrl: insertedMedia[2] ? `/api/media/file/${insertedMedia[2].id}` : DEMO_SVGS.verve,
            destinationUrl: 'https://example.com/verve-table',
            isPublished: true,
            isDemo: true,
            displayOrder: 3,
          },
        ]);
      }
    } catch (error) {
      seedPromise = null;
      console.error('Database seed check failed:', error);
      throw new Error('Failed to initialize application data.', { cause: error });
    }
  })();

  return seedPromise;
}

// ============================================================================
// PUBLIC WEBSITE QUERIES
// ============================================================================

export async function getPublicSiteData() {
  try {
    await ensureSeeded();
    const [publishedProjects, pubSettingsRows, enabledLinks] = await Promise.all([
      db
        .select()
        .from(projects)
        .where(eq(projects.isPublished, true))
        .orderBy(asc(projects.displayOrder), desc(projects.createdAt)),
      db
        .select()
        .from(websiteSettings)
        .where(eq(websiteSettings.isPublic, true)),
      db
        .select()
        .from(navigationLinks)
        .where(eq(navigationLinks.isEnabled, true))
        .orderBy(asc(navigationLinks.displayOrder), asc(navigationLinks.id)),
    ]);

    const settings: Record<string, string> = { ...DEFAULT_PUBLIC_SETTINGS };
    for (const row of pubSettingsRows) {
      settings[row.settingKey] = row.settingValue;
    }

    return {
      projects: publishedProjects,
      settings,
      links: enabledLinks,
    };
  } catch (error) {
    console.error('Database query failed in getPublicSiteData:', error);
    throw new Error('Unable to load portfolio content right now.', { cause: error });
  }
}

export async function createVisitorOrder(input: {
  customerName: string;
  phone: string;
  email: string;
  projectType: string;
  budgetRange: string;
  projectDescription: string;
  referenceUrl: string;
  additionalNotes: string;
}) {
  try {
    await ensureSeeded();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    const orderCode = `PIVO-${year}-${randomSuffix}`;

    const [created] = await db
      .insert(orders)
      .values({
        orderCode,
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        projectType: input.projectType,
        budgetRange: input.budgetRange,
        projectDescription: input.projectDescription,
        referenceUrl: input.referenceUrl,
        additionalNotes: input.additionalNotes,
        status: 'New',
        isRead: false,
        adminNotes: '',
      })
      .returning();

    return created;
  } catch (error) {
    console.error('Database query failed in createVisitorOrder:', error);
    throw new Error('Failed to save project order. Please try again.', { cause: error });
  }
}

// ============================================================================
// ADMIN AUTHENTICATION & SECURITY QUERIES
// ============================================================================

export async function getAdminCredentialRecord() {
  try {
    await ensureSeeded();
    const [cred] = await db.select().from(adminCredentials).limit(1);
    return cred;
  } catch (error) {
    console.error('Database query failed in getAdminCredentialRecord:', error);
    throw new Error('Authentication service unavailable.', { cause: error });
  }
}

export async function updateAdminPassword(newPassword: string, recoveryEmail?: string) {
  try {
    await ensureSeeded();
    const [cred] = await db.select().from(adminCredentials).limit(1);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = computePasswordHash(newPassword, salt);

    if (cred) {
      await db
        .update(adminCredentials)
        .set({
          passwordHash: hash,
          passwordSalt: salt,
          mustChangePassword: false,
          ...(recoveryEmail !== undefined ? { recoveryEmail } : {}),
          updatedAt: new Date(),
        })
        .where(eq(adminCredentials.id, cred.id));
    }
  } catch (error) {
    console.error('Database query failed in updateAdminPassword:', error);
    throw new Error('Failed to update administrator password.', { cause: error });
  }
}

export async function createAdminSessionRecord(params: {
  tokenHash: string;
  authMethod: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
}) {
  try {
    const [session] = await db
      .insert(adminSessions)
      .values({
        tokenHash: params.tokenHash,
        authMethod: params.authMethod,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        expiresAt: params.expiresAt,
      })
      .returning();
    return session;
  } catch (error) {
    console.error('Database query failed in createAdminSessionRecord:', error);
    throw new Error('Failed to create administrator session.', { cause: error });
  }
}

export async function verifyAdminSessionToken(tokenHash: string) {
  try {
    const now = new Date();
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(eq(adminSessions.tokenHash, tokenHash))
      .limit(1);

    if (!session) return null;
    if (new Date(session.expiresAt) <= now) {
      await db.delete(adminSessions).where(eq(adminSessions.id, session.id));
      return null;
    }
    return session;
  } catch (error) {
    console.error('Database query failed in verifyAdminSessionToken:', error);
    throw new Error('Failed to verify session.', { cause: error });
  }
}

export async function deleteAdminSessionByHash(tokenHash: string) {
  try {
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
  } catch (error) {
    console.error('Database query failed in deleteAdminSessionByHash:', error);
    throw new Error('Failed to terminate session.', { cause: error });
  }
}

export async function logSecurityEvent(eventType: string, description: string, ipAddress: string) {
  try {
    await db.insert(securityLogs).values({
      eventType,
      description,
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to record security log:', error);
  }
}

export async function getRecentSecurityLogs() {
  try {
    return await db
      .select()
      .from(securityLogs)
      .orderBy(desc(securityLogs.createdAt))
      .limit(30);
  } catch (error) {
    console.error('Database query failed in getRecentSecurityLogs:', error);
    throw new Error('Failed to load security logs.', { cause: error });
  }
}

export async function getActiveAdminSessions() {
  try {
    const now = new Date();
    return await db
      .select({
        id: adminSessions.id,
        authMethod: adminSessions.authMethod,
        ipAddress: adminSessions.ipAddress,
        userAgent: adminSessions.userAgent,
        expiresAt: adminSessions.expiresAt,
        createdAt: adminSessions.createdAt,
      })
      .from(adminSessions)
      .where(gt(adminSessions.expiresAt, now))
      .orderBy(desc(adminSessions.createdAt));
  } catch (error) {
    console.error('Database query failed in getActiveAdminSessions:', error);
    throw new Error('Failed to load active sessions.', { cause: error });
  }
}

// ============================================================================
// ADMIN PORTFOLIO / WORK QUERIES
// ============================================================================

export async function getAllProjectsAdmin() {
  try {
    await ensureSeeded();
    return await db
      .select()
      .from(projects)
      .orderBy(asc(projects.displayOrder), desc(projects.createdAt));
  } catch (error) {
    console.error('Database query failed in getAllProjectsAdmin:', error);
    throw new Error('Failed to load projects.', { cause: error });
  }
}

export async function createProjectAdmin(data: {
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  destinationUrl: string;
  isPublished: boolean;
  isDemo?: boolean;
  displayOrder: number;
}) {
  try {
    const [created] = await db
      .insert(projects)
      .values({
        title: data.title,
        description: data.description,
        category: data.category,
        imageUrl: data.imageUrl,
        destinationUrl: data.destinationUrl,
        isPublished: data.isPublished,
        isDemo: data.isDemo ?? false,
        displayOrder: data.displayOrder,
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in createProjectAdmin:', error);
    throw new Error('Failed to create project.', { cause: error });
  }
}

export async function updateProjectAdmin(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    category: string;
    imageUrl: string;
    destinationUrl: string;
    isPublished: boolean;
    isDemo: boolean;
    displayOrder: number;
  }>
) {
  try {
    const [updated] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in updateProjectAdmin:', error);
    throw new Error('Failed to update project.', { cause: error });
  }
}

export async function deleteProjectAdmin(id: number) {
  try {
    await db.delete(projects).where(eq(projects.id, id));
  } catch (error) {
    console.error('Database query failed in deleteProjectAdmin:', error);
    throw new Error('Failed to delete project.', { cause: error });
  }
}

export async function reorderProjectsAdmin(orderedIds: number[]) {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(projects)
        .set({ displayOrder: i + 1, updatedAt: new Date() })
        .where(eq(projects.id, orderedIds[i]));
    }
  } catch (error) {
    console.error('Database query failed in reorderProjectsAdmin:', error);
    throw new Error('Failed to reorder projects.', { cause: error });
  }
}

// ============================================================================
// ADMIN ORDERS QUERIES
// ============================================================================

export async function getAllOrdersAdmin() {
  try {
    await ensureSeeded();
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  } catch (error) {
    console.error('Database query failed in getAllOrdersAdmin:', error);
    throw new Error('Failed to load orders.', { cause: error });
  }
}

export async function updateOrderAdmin(
  id: number,
  data: Partial<{
    status: string;
    isRead: boolean;
    adminNotes: string;
  }>
) {
  try {
    const [updated] = await db
      .update(orders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in updateOrderAdmin:', error);
    throw new Error('Failed to update order.', { cause: error });
  }
}

export async function deleteOrderAdmin(id: number) {
  try {
    await db.delete(orders).where(eq(orders.id, id));
  } catch (error) {
    console.error('Database query failed in deleteOrderAdmin:', error);
    throw new Error('Failed to delete order.', { cause: error });
  }
}

// ============================================================================
// ADMIN WEBSITE SETTINGS & NOTIFICATION SETTINGS QUERIES
// ============================================================================

export async function getAllSettingsAdmin() {
  try {
    await ensureSeeded();
    const rows = await db.select().from(websiteSettings);
    const publicSettings: Record<string, string> = { ...DEFAULT_PUBLIC_SETTINGS };
    const privateSettings: Record<string, string> = { ...DEFAULT_PRIVATE_SETTINGS };

    for (const row of rows) {
      if (row.isPublic) {
        publicSettings[row.settingKey] = row.settingValue;
      } else {
        privateSettings[row.settingKey] = row.settingValue;
      }
    }

    // Never return raw passwords or bot tokens in plain text to client; mask them
    const maskedNotificationConfig = {
      notify_email_enabled: privateSettings.notify_email_enabled === 'true',
      notify_recipient_email: privateSettings.notify_recipient_email || '',
      smtp_host: privateSettings.smtp_host || '',
      smtp_port: privateSettings.smtp_port || '587',
      smtp_user: privateSettings.smtp_user || '',
      smtp_from: privateSettings.smtp_from || 'notifications@pivo.agency',
      smtp_pass_configured: Boolean(privateSettings.smtp_pass && privateSettings.smtp_pass.length > 0),
      notify_telegram_enabled: privateSettings.notify_telegram_enabled === 'true',
      telegram_chat_id: privateSettings.telegram_chat_id || '',
      telegram_bot_token_configured: Boolean(
        privateSettings.telegram_bot_token && privateSettings.telegram_bot_token.length > 0
      ),
    };

    return {
      publicSettings,
      notificationConfig: maskedNotificationConfig,
    };
  } catch (error) {
    console.error('Database query failed in getAllSettingsAdmin:', error);
    throw new Error('Failed to load website settings.', { cause: error });
  }
}

export async function getRawPrivateNotificationSettings() {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(websiteSettings)
      .where(eq(websiteSettings.isPublic, false));
    const map: Record<string, string> = { ...DEFAULT_PRIVATE_SETTINGS };
    for (const row of rows) {
      map[row.settingKey] = row.settingValue;
    }
    return map;
  } catch (error) {
    console.error('Database query failed in getRawPrivateNotificationSettings:', error);
    throw new Error('Failed to load notification configuration.', { cause: error });
  }
}

export async function upsertSettingsBatch(
  updates: Record<string, string>,
  isPublic: boolean
) {
  try {
    for (const [key, value] of Object.entries(updates)) {
      await db
        .insert(websiteSettings)
        .values({
          settingKey: key,
          settingValue: String(value),
          isPublic,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: websiteSettings.settingKey,
          set: {
            settingValue: String(value),
            isPublic,
            updatedAt: new Date(),
          },
        });
    }
  } catch (error) {
    console.error('Database query failed in upsertSettingsBatch:', error);
    throw new Error('Failed to save settings.', { cause: error });
  }
}

// ============================================================================
// ADMIN MEDIA LIBRARY QUERIES
// ============================================================================

export async function getAllMediaAdmin() {
  try {
    await ensureSeeded();
    const [items, allProjects] = await Promise.all([
      db
        .select({
          id: media.id,
          fileName: media.fileName,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          storagePath: media.storagePath,
          publicUrl: media.publicUrl,
          uploadedAt: media.uploadedAt,
        })
        .from(media)
        .orderBy(desc(media.uploadedAt)),
      db.select().from(projects),
    ]);

    return items.map((item) => {
      const usedByProjects = allProjects
        .filter((p) => p.imageUrl === item.publicUrl || p.imageUrl === `/api/media/file/${item.id}`)
        .map((p) => ({ id: p.id, title: p.title, isPublished: p.isPublished }));
      return {
        ...item,
        usedByProjects,
      };
    });
  } catch (error) {
    console.error('Database query failed in getAllMediaAdmin:', error);
    throw new Error('Failed to load media library.', { cause: error });
  }
}

export async function getMediaById(id: number) {
  try {
    const [item] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    return item || null;
  } catch (error) {
    console.error('Database query failed in getMediaById:', error);
    throw new Error('Failed to retrieve media item.', { cause: error });
  }
}

export async function createMediaItemAdmin(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
}) {
  try {
    const storagePath = `/media/${Date.now()}-${params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const [inserted] = await db
      .insert(media)
      .values({
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        storagePath,
        publicUrl: '',
        dataUrl: params.dataUrl,
      })
      .returning();

    const finalPublicUrl = `/api/media/file/${inserted.id}`;
    const [updated] = await db
      .update(media)
      .set({ publicUrl: finalPublicUrl })
      .where(eq(media.id, inserted.id))
      .returning();

    return updated;
  } catch (error) {
    console.error('Database query failed in createMediaItemAdmin:', error);
    throw new Error('Failed to store uploaded image.', { cause: error });
  }
}

export async function replaceMediaItemAdmin(
  id: number,
  params: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    dataUrl: string;
  }
) {
  try {
    const [updated] = await db
      .update(media)
      .set({
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        dataUrl: params.dataUrl,
        uploadedAt: new Date(),
      })
      .where(eq(media.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in replaceMediaItemAdmin:', error);
    throw new Error('Failed to replace media file.', { cause: error });
  }
}

export async function deleteMediaItemAdmin(id: number) {
  try {
    await db.delete(media).where(eq(media.id, id));
  } catch (error) {
    console.error('Database query failed in deleteMediaItemAdmin:', error);
    throw new Error('Failed to delete media file.', { cause: error });
  }
}

// ============================================================================
// ADMIN NAVIGATION LINKS QUERIES
// ============================================================================

export async function getAllNavigationLinksAdmin() {
  try {
    await ensureSeeded();
    return await db
      .select()
      .from(navigationLinks)
      .orderBy(asc(navigationLinks.placement), asc(navigationLinks.displayOrder), asc(navigationLinks.id));
  } catch (error) {
    console.error('Database query failed in getAllNavigationLinksAdmin:', error);
    throw new Error('Failed to load navigation links.', { cause: error });
  }
}

export async function createNavigationLinkAdmin(data: {
  label: string;
  destinationUrl: string;
  placement: string;
  displayOrder: number;
  isEnabled: boolean;
  openInNewTab: boolean;
}) {
  try {
    const [created] = await db.insert(navigationLinks).values(data).returning();
    return created;
  } catch (error) {
    console.error('Database query failed in createNavigationLinkAdmin:', error);
    throw new Error('Failed to create navigation link.', { cause: error });
  }
}

export async function updateNavigationLinkAdmin(
  id: number,
  data: Partial<{
    label: string;
    destinationUrl: string;
    placement: string;
    displayOrder: number;
    isEnabled: boolean;
    openInNewTab: boolean;
  }>
) {
  try {
    const [updated] = await db
      .update(navigationLinks)
      .set(data)
      .where(eq(navigationLinks.id, id))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in updateNavigationLinkAdmin:', error);
    throw new Error('Failed to update navigation link.', { cause: error });
  }
}

export async function deleteNavigationLinkAdmin(id: number) {
  try {
    await db.delete(navigationLinks).where(eq(navigationLinks.id, id));
  } catch (error) {
    console.error('Database query failed in deleteNavigationLinkAdmin:', error);
    throw new Error('Failed to delete navigation link.', { cause: error });
  }
}

export async function reorderNavigationLinksAdmin(orderedIds: number[]) {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(navigationLinks)
        .set({ displayOrder: i + 1 })
        .where(eq(navigationLinks.id, orderedIds[i]));
    }
  } catch (error) {
    console.error('Database query failed in reorderNavigationLinksAdmin:', error);
    throw new Error('Failed to reorder navigation links.', { cause: error });
  }
}
