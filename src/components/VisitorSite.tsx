import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, CheckCircle2, ExternalLink, Loader2, Menu, X } from 'lucide-react';
import { NavigationLink, Project } from '../types.ts';
import { PivoLogo } from './PivoLogo.tsx';

interface VisitorSiteProps {
  previewOverride?: {
    settings?: Record<string, string>;
    projects?: Project[];
    links?: NavigationLink[];
  };
}

export const VisitorSite: React.FC<VisitorSiteProps> = ({ previewOverride }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState<boolean>(!previewOverride);
  const [loadError, setLoadError] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  // Order Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [projectType, setProjectType] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderCode: string;
    createdAt: string;
  } | null>(null);

  const fetchSiteData = async () => {
    if (previewOverride) return;
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/public/site');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Unable to load website content.');
      }
      const data = await res.json();
      setProjects(Array.isArray(data.projects) ? data.projects : []);
      setSettings(data.settings || {});
      setLinks(Array.isArray(data.links) ? data.links : []);
    } catch (err: any) {
      setLoadError(err.message || 'Network error while loading website.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteData();
  }, []);

  const activeSettings = previewOverride?.settings || settings;
  const activeProjects = previewOverride?.projects || projects;
  const activeLinks = previewOverride?.links || links;

  // Sync SEO title and meta description dynamically
  useEffect(() => {
    if (activeSettings.seo_title) {
      document.title = activeSettings.seo_title;
    }
    if (activeSettings.seo_description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', activeSettings.seo_description);
      }
    }
  }, [activeSettings.seo_title, activeSettings.seo_description]);

  const headerLinks = useMemo(() => {
    const filtered = activeLinks.filter(
      (l) => l.placement === 'header' && l.isEnabled && l.destinationUrl.trim() !== ''
    );
    if (filtered.length > 0) return filtered;
    return [
      {
        id: -1,
        label: 'Work',
        destinationUrl: '#work',
        placement: 'header' as const,
        displayOrder: 1,
        isEnabled: true,
        openInNewTab: false,
      },
      {
        id: -2,
        label: 'Order',
        destinationUrl: '#order',
        placement: 'header' as const,
        displayOrder: 2,
        isEnabled: true,
        openInNewTab: false,
      },
    ];
  }, [activeLinks]);

  const footerNavLinks = useMemo(() => {
    const filtered = activeLinks.filter(
      (l) => l.placement === 'footer' && l.isEnabled && l.destinationUrl.trim() !== ''
    );
    if (filtered.length > 0) return filtered;
    return [
      {
        id: -3,
        label: 'Work',
        destinationUrl: '#work',
        placement: 'footer' as const,
        displayOrder: 1,
        isEnabled: true,
        openInNewTab: false,
      },
      {
        id: -4,
        label: 'Order',
        destinationUrl: '#order',
        placement: 'footer' as const,
        displayOrder: 2,
        isEnabled: true,
        openInNewTab: false,
      },
    ];
  }, [activeLinks]);

  // Hide optional social media links when no URL has been configured
  const socialLinks = useMemo(
    () =>
      activeLinks.filter(
        (l) => l.placement === 'social' && l.isEnabled && l.destinationUrl.trim() !== ''
      ),
    [activeLinks]
  );

  const contactLinks = useMemo(
    () =>
      activeLinks.filter(
        (l) => l.placement === 'contact' && l.isEnabled && l.destinationUrl.trim() !== ''
      ),
    [activeLinks]
  );

  const projectCategories = useMemo(() => {
    const cats = new Set<string>();
    activeProjects.forEach((p) => {
      if (p.category && p.category.trim()) {
        cats.add(p.category.trim());
      }
    });
    return ['All', ...Array.from(cats)];
  }, [activeProjects]);

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') return activeProjects;
    return activeProjects.filter((p) => p.category.trim() === selectedCategory);
  }, [activeProjects, selectedCategory]);

  const projectTypesOptions = useMemo(() => {
    try {
      const parsed = JSON.parse(activeSettings.form_project_types || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
    return [
      'Business Website',
      'Restaurant Website',
      'E-commerce Website',
      'Portfolio Website',
      'Landing Page',
      'Web Application',
      'Other',
    ];
  }, [activeSettings.form_project_types]);

  const budgetRangesOptions = useMemo(() => {
    try {
      const parsed = JSON.parse(activeSettings.form_budget_ranges || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
    return [
      'Under $100',
      '$100–$300',
      '$300–$500',
      '$500–$1,000',
      '$1,000+',
      'Not Decided Yet',
    ];
  }, [activeSettings.form_budget_ranges]);

  const handleLinkAction = (
    e: React.MouseEvent<HTMLAnchorElement>,
    url: string,
    openInNewTab = false
  ) => {
    setMobileMenuOpen(false);
    if (!url) {
      e.preventDefault();
      return;
    }
    if (url.startsWith('#') && !openInNewTab) {
      e.preventDefault();
      const targetId = url.slice(1);
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const validateOrderForm = () => {
    const errors: Record<string, string> = {};
    if (!customerName.trim() || customerName.trim().length < 2) {
      errors.customerName = 'Please enter your full name.';
    }
    const cleanedPhone = phone.trim();
    const digitsOnly = cleanedPhone.replace(/\D/g, '');
    if (
      !cleanedPhone ||
      !/^[+\d\s\-().]{6,25}$/.test(cleanedPhone) ||
      digitsOnly.length < 6 ||
      digitsOnly.length > 16
    ) {
      errors.phone = 'Please enter a valid international or local phone number (6–16 digits).';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!projectDescription.trim() || projectDescription.trim().length < 10) {
      errors.projectDescription =
        'Please describe your project requirements (at least 10 characters).';
    }
    if (referenceUrl.trim()) {
      try {
        const parsed = new URL(referenceUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors.referenceUrl = 'Reference website must start with http:// or https://.';
        }
      } catch {
        errors.referenceUrl = 'Please enter a valid URL (e.g., https://example.com).';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingOrder) return;
    setSubmitError('');

    if (!validateOrderForm()) {
      return;
    }

    setSubmittingOrder(true);
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          projectType,
          budgetRange,
          projectDescription: projectDescription.trim(),
          referenceUrl: referenceUrl.trim(),
          additionalNotes: additionalNotes.trim(),
          website_honeypot: honeypot,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body.error || 'Could not submit your project request. Please check your details.'
        );
      }

      // Only clear the form AFTER server confirms that the order was saved
      setSubmittedOrder({
        orderCode: body.orderCode,
        createdAt: body.createdAt,
      });
      setCustomerName('');
      setPhone('');
      setEmail('');
      setProjectType('');
      setBudgetRange('');
      setProjectDescription('');
      setReferenceUrl('');
      setAdditionalNotes('');
      setFieldErrors({});
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const isValidExternalUrl = (url: string) => {
    if (!url || !url.trim()) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-950">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Single brand wordmark */}
          <a
            href="/"
            className="inline-flex items-center whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950"
            aria-label="PIVO Home"
          >
            <PivoLogo className="h-7" />
          </a>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600"
          >
            {headerLinks.map((link) => (
              <a
                key={link.id}
                href={link.destinationUrl}
                target={link.openInNewTab ? '_blank' : undefined}
                rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                onClick={(e) => handleLinkAction(e, link.destinationUrl, link.openInNewTab)}
                className="hover:text-neutral-950 transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-neutral-950"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Zone 3: 1 primary action + mobile menu button */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={activeSettings.hero_secondary_cta_url || '#order'}
              onClick={(e) =>
                handleLinkAction(e, activeSettings.hero_secondary_cta_url || '#order', false)
              }
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {activeSettings.hero_secondary_cta_label || 'Start a Project'}
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 text-neutral-950 border border-neutral-200 hover:bg-neutral-100 transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white px-6 py-6 space-y-4">
            <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation">
              {headerLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.destinationUrl}
                  target={link.openInNewTab ? '_blank' : undefined}
                  rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                  onClick={(e) => handleLinkAction(e, link.destinationUrl, link.openInNewTab)}
                  className="text-base font-semibold text-neutral-900 hover:text-neutral-600 py-2 border-b border-neutral-100"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="pt-2">
              <a
                href={activeSettings.hero_secondary_cta_url || '#order'}
                onClick={(e) =>
                  handleLinkAction(e, activeSettings.hero_secondary_cta_url || '#order', false)
                }
                className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors"
              >
                {activeSettings.hero_secondary_cta_label || 'Start a Project'}
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* B. Hero Section */}
        <section className="border-b border-neutral-200 py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-stretch">
              {/* Left Column: Typographic Hierarchy & CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-mono tracking-widest uppercase text-neutral-500 mb-6">
                    DIGITAL WEB DEVELOPMENT AGENCY
                  </p>
                  <h1
                    className="text-4xl sm:text-6xl lg:text-[4rem] font-extrabold tracking-tight text-neutral-950 leading-[1.06] mb-6"
                    style={{ textWrap: 'balance' }}
                  >
                    {activeSettings.hero_heading || 'We build digital experiences.'}
                  </h1>
                  <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-2xl mb-10">
                    {activeSettings.hero_description ||
                      'We design and develop modern websites that help businesses stand out, connect with customers, and grow online.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href={activeSettings.hero_primary_cta_url || '#work'}
                    onClick={(e) =>
                      handleLinkAction(e, activeSettings.hero_primary_cta_url || '#work', false)
                    }
                    className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors duration-150 whitespace-nowrap shrink-0"
                  >
                    {activeSettings.hero_primary_cta_label || 'Explore Our Work'}
                  </a>
                  <a
                    href={activeSettings.hero_secondary_cta_url || '#order'}
                    onClick={(e) =>
                      handleLinkAction(e, activeSettings.hero_secondary_cta_url || '#order', false)
                    }
                    className="inline-flex items-center justify-center px-7 py-4 text-sm font-semibold text-neutral-950 bg-white border border-neutral-300 hover:border-neutral-950 transition-colors duration-150 whitespace-nowrap shrink-0"
                  >
                    {activeSettings.hero_secondary_cta_label || 'Start a Project'}
                  </a>
                </div>
              </motion.div>

              {/* Right Column: Minimalist Architectural Showcase Frame */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5 flex"
              >
                <div className="w-full bg-neutral-950 text-white p-8 sm:p-10 flex flex-col justify-between border border-neutral-950 min-h-[360px]">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-6">
                    <PivoLogo inverted className="h-5" />
                    <span className="text-xs font-mono text-neutral-400 tabular-nums">
                      EST. 2026
                    </span>
                  </div>

                  <div className="my-8 space-y-4">
                    <p className="text-xs font-mono text-neutral-400 tracking-wider uppercase">
                      CORE DISCIPLINES
                    </p>
                    <ul className="space-y-3 text-base sm:text-lg font-medium text-neutral-100">
                      <li className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                        <span>01. Custom Web Architecture</span>
                        <span className="text-xs font-mono text-neutral-400">FULL-STACK</span>
                      </li>
                      <li className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                        <span>02. E-Commerce &amp; Digital Flagships</span>
                        <span className="text-xs font-mono text-neutral-400">CONVERSION</span>
                      </li>
                      <li className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                        <span>03. Brand Identity &amp; Design Systems</span>
                        <span className="text-xs font-mono text-neutral-400">EDITORIAL</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 pt-2">
                    <span>MONOCHROME PRECISION</span>
                    <span>RESPONSIVE BY DEFAULT</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* C. PIVO Work Section */}
        <section id="work" className="py-20 lg:py-28 border-b border-neutral-200 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <h2
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-950 mb-3"
                  style={{ textWrap: 'balance' }}
                >
                  {activeSettings.work_title || 'PIVO Work'}
                </h2>
                <p className="text-base sm:text-lg text-neutral-600 max-w-2xl">
                  {activeSettings.work_description ||
                    "A selection of projects we've designed and built."}
                </p>
              </div>

              {/* Interactive Category Filter Controls */}
              {projectCategories.length > 2 && (
                <div
                  className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 border border-neutral-200"
                  role="group"
                  aria-label="Filter projects by category"
                >
                  {projectCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-neutral-950 text-white'
                          : 'text-neutral-600 hover:text-neutral-950'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="border border-neutral-200 bg-white">
                    <div className="aspect-[4/3] bg-neutral-100 animate-pulse" />
                    <div className="p-6 space-y-3">
                      <div className="h-3 w-28 bg-neutral-200 animate-pulse" />
                      <div className="h-6 w-3/4 bg-neutral-200 animate-pulse" />
                      <div className="h-4 w-full bg-neutral-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="border border-neutral-300 bg-neutral-50 p-10 text-center">
                <p className="text-base font-medium text-neutral-900 mb-2">{loadError}</p>
                <button
                  type="button"
                  onClick={fetchSiteData}
                  className="mt-2 px-5 py-2.5 text-xs font-semibold bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                >
                  Retry Loading Projects
                </button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="border border-neutral-200 bg-neutral-50 p-16 text-center">
                <p className="text-lg font-semibold text-neutral-900 mb-2">
                  No published projects to display yet.
                </p>
                <p className="text-sm text-neutral-600 max-w-md mx-auto">
                  Our latest client case studies and web launches will appear here once published.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProjects.map((project, index) => {
                  const hasValidUrl = isValidExternalUrl(project.destinationUrl);
                  const imageFailed = brokenImages[project.id];

                  const cardInner = (
                    <>
                      <div className="relative aspect-[4/3] w-full bg-neutral-950 overflow-hidden border-b border-neutral-200">
                        {!imageFailed && project.imageUrl ? (
                          <img
                            src={project.imageUrl}
                            alt={project.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenImages((prev) => ({ ...prev, [project.id]: true }))
                            }
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                        ) : (
                          /* Zero-Broken-Image Policy Resilient Fallback */
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-neutral-950 text-white text-center">
                            <PivoLogo inverted className="h-6 mb-3 opacity-80" />
                            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                              {project.category || 'DIGITAL CASE STUDY'}
                            </span>
                            <span className="mt-2 text-sm font-semibold text-neutral-200 line-clamp-1">
                              {project.title}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between bg-white">
                        <div>
                          {/* Zero-Pill Metadata Discipline: Unboxed text with middot separator */}
                          <div className="flex items-center gap-2 text-xs font-mono text-neutral-500 mb-2.5">
                            <span className="tabular-nums">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            {project.category && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{project.category}</span>
                              </>
                            )}
                            {project.isDemo && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Demonstration</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-xl font-bold text-neutral-950 group-hover:text-neutral-700 transition-colors">
                              {project.title}
                            </h3>
                            {hasValidUrl && (
                              <ArrowUpRight className="w-5 h-5 text-neutral-400 group-hover:text-neutral-950 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 mt-1" />
                            )}
                          </div>

                          <p className="text-sm text-neutral-600 leading-relaxed">
                            {project.description}
                          </p>
                        </div>

                        {hasValidUrl && (
                          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-950">
                            <span>Visit Live Project</span>
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                          </div>
                        )}
                      </div>
                    </>
                  );

                  if (hasValidUrl) {
                    return (
                      <a
                        key={project.id}
                        href={project.destinationUrl.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col border border-neutral-200 hover:border-neutral-950 transition-colors duration-150 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950"
                      >
                        {cardInner}
                      </a>
                    );
                  }

                  return (
                    <div
                      key={project.id}
                      className="flex flex-col border border-neutral-200 bg-white"
                    >
                      {cardInner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* D. Order Section */}
        <section id="order" className="py-20 lg:py-28 bg-neutral-50 scroll-mt-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="mb-12">
              <p className="text-xs font-mono tracking-widest uppercase text-neutral-500 mb-3">
                PROJECT INQUIRY
              </p>
              <h2
                className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-950 mb-4"
                style={{ textWrap: 'balance' }}
              >
                {activeSettings.order_title || "Let's Build Something."}
              </h2>
              <p className="text-base sm:text-lg text-neutral-600">
                {activeSettings.order_description ||
                  "Tell us about your project. We'll review your requirements and get back to you."}
              </p>
            </div>

            {submittedOrder ? (
              <div className="bg-white border border-neutral-950 p-8 sm:p-12">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-7 h-7 text-neutral-950 shrink-0 mt-0.5" />
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-neutral-950">Request Received</h3>
                    <p className="text-base text-neutral-700 leading-relaxed">
                      {activeSettings.form_success_message ||
                        "Thank you for your request! We've received your project details and will contact you soon."}
                    </p>
                    <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-600 border-t border-neutral-200">
                      <span>
                        REFERENCE ID: <strong className="text-neutral-950">{submittedOrder.orderCode}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        SUBMITTED: {new Date(submittedOrder.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setSubmittedOrder(null)}
                        className="px-5 py-2.5 text-xs font-semibold text-neutral-950 border border-neutral-300 hover:border-neutral-950 transition-colors"
                      >
                        Submit Another Request
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleOrderSubmit}
                noValidate
                className="bg-white border border-neutral-200 p-8 sm:p-12 space-y-6"
              >
                {/* Honeypot anti-spam field */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website_honeypot">Website</label>
                  <input
                    id="website_honeypot"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {submitError && (
                  <div
                    role="alert"
                    className="p-4 bg-red-50 border border-red-200 text-sm text-red-800 font-medium"
                  >
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* 1. Full Name */}
                  <div>
                    <label
                      htmlFor="order-name"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                    >
                      {activeSettings.form_label_name || 'Full Name'} <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="order-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (fieldErrors.customerName) {
                          setFieldErrors((prev) => ({ ...prev, customerName: '' }));
                        }
                      }}
                      placeholder="Jane Doe"
                      className={`w-full px-4 py-3 text-sm bg-white border ${
                        fieldErrors.customerName ? 'border-red-600' : 'border-neutral-300'
                      } focus:border-neutral-950 focus:outline-none transition-colors`}
                    />
                    {fieldErrors.customerName && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">
                        {fieldErrors.customerName}
                      </p>
                    )}
                  </div>

                  {/* 2. Phone Number */}
                  <div>
                    <label
                      htmlFor="order-phone"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                    >
                      {activeSettings.form_label_phone || 'Phone Number'}{' '}
                      <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="order-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) {
                          setFieldErrors((prev) => ({ ...prev, phone: '' }));
                        }
                      }}
                      placeholder="+1 (555) 000-0000"
                      className={`w-full px-4 py-3 text-sm bg-white border ${
                        fieldErrors.phone ? 'border-red-600' : 'border-neutral-300'
                      } focus:border-neutral-950 focus:outline-none transition-colors`}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">{fieldErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* 3. Email Address */}
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="order-email"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                    >
                      {activeSettings.form_label_email || 'Email Address'}{' '}
                      <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="order-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: '' }));
                        }
                      }}
                      placeholder="name@company.com"
                      className={`w-full px-4 py-3 text-sm bg-white border ${
                        fieldErrors.email ? 'border-red-600' : 'border-neutral-300'
                      } focus:border-neutral-950 focus:outline-none transition-colors`}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                    )}
                  </div>

                  {/* 4. Project Type */}
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="order-type"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                    >
                      {activeSettings.form_label_project_type || 'Project Type'}
                    </label>
                    <select
                      id="order-type"
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white border border-neutral-300 focus:border-neutral-950 focus:outline-none transition-colors"
                    >
                      <option value="">Select project type (optional)</option>
                      {projectTypesOptions.map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 5. Budget Range */}
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="order-budget"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                    >
                      {activeSettings.form_label_budget || 'Budget Range'}
                    </label>
                    <select
                      id="order-budget"
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-white border border-neutral-300 focus:border-neutral-950 focus:outline-none transition-colors"
                    >
                      <option value="">Select budget range (optional)</option>
                      {budgetRangesOptions.map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 6. Project Description */}
                <div>
                  <label
                    htmlFor="order-description"
                    className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                  >
                    {activeSettings.form_label_description || 'Project Description'}{' '}
                    <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="order-description"
                    rows={4}
                    required
                    value={projectDescription}
                    onChange={(e) => {
                      setProjectDescription(e.target.value);
                      if (fieldErrors.projectDescription) {
                        setFieldErrors((prev) => ({ ...prev, projectDescription: '' }));
                      }
                    }}
                    placeholder="Tell us about your goals, target audience, required pages or features, and timeline..."
                    className={`w-full px-4 py-3 text-sm bg-white border ${
                      fieldErrors.projectDescription ? 'border-red-600' : 'border-neutral-300'
                    } focus:border-neutral-950 focus:outline-none transition-colors`}
                  />
                  {fieldErrors.projectDescription && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {fieldErrors.projectDescription}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* 7. Reference Website */}
                  <div>
                    <label
                      htmlFor="order-reference"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                    >
                      {activeSettings.form_label_reference || 'Reference Website'}
                    </label>
                    <input
                      id="order-reference"
                      type="url"
                      value={referenceUrl}
                      onChange={(e) => {
                        setReferenceUrl(e.target.value);
                        if (fieldErrors.referenceUrl) {
                          setFieldErrors((prev) => ({ ...prev, referenceUrl: '' }));
                        }
                      }}
                      placeholder="https://example.com (optional)"
                      className={`w-full px-4 py-3 text-sm bg-white border ${
                        fieldErrors.referenceUrl ? 'border-red-600' : 'border-neutral-300'
                      } focus:border-neutral-950 focus:outline-none transition-colors`}
                    />
                    {fieldErrors.referenceUrl && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">
                        {fieldErrors.referenceUrl}
                      </p>
                    )}
                  </div>

                  {/* 8. Additional Notes */}
                  <div>
                    <label
                      htmlFor="order-notes"
                      className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2"
                    >
                      {activeSettings.form_label_notes || 'Additional Notes'}
                    </label>
                    <input
                      id="order-notes"
                      type="text"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="Preferred contact time or special requests (optional)"
                      className="w-full px-4 py-3 text-sm bg-white border border-neutral-300 focus:border-neutral-950 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-xs text-neutral-500">
                    Fields marked with <span className="text-red-600">*</span> are required.
                  </p>
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {submittingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {submittingOrder
                        ? 'Submitting Request...'
                        : activeSettings.form_submit_label || 'Submit Project Request'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* E. Minimal Footer (strictly zero admin links) */}
      <footer className="bg-white border-t border-neutral-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-neutral-200">
            <div className="md:col-span-5 space-y-4">
              <PivoLogo className="h-6" />
              <p className="text-sm text-neutral-600 max-w-sm leading-relaxed">
                {activeSettings.footer_description ||
                  'PIVO is an independent web development agency crafting minimalist, high-performance websites and digital products for forward-thinking brands.'}
              </p>
              {activeSettings.contact_location && (
                <p className="text-xs font-mono text-neutral-500 pt-1">
                  {activeSettings.contact_location}
                </p>
              )}
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                Navigation
              </h3>
              <ul className="space-y-2.5 text-sm text-neutral-600">
                {footerNavLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.destinationUrl}
                      target={link.openInNewTab ? '_blank' : undefined}
                      rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                      onClick={(e) => handleLinkAction(e, link.destinationUrl, link.openInNewTab)}
                      className="hover:text-neutral-950 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-950">
                Contact &amp; Connect
              </h3>
              <ul className="space-y-2.5 text-sm text-neutral-600">
                {contactLinks.length > 0 ? (
                  contactLinks.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.destinationUrl}
                        target={link.openInNewTab ? '_blank' : undefined}
                        rel={link.openInNewTab ? 'noopener noreferrer' : undefined}
                        className="hover:text-neutral-950 transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))
                ) : (
                  <>
                    {activeSettings.contact_email && (
                      <li>
                        <a
                          href={`mailto:${activeSettings.contact_email}`}
                          className="hover:text-neutral-950 transition-colors"
                        >
                          {activeSettings.contact_email}
                        </a>
                      </li>
                    )}
                    {activeSettings.contact_phone && (
                      <li>
                        <a
                          href={`tel:${activeSettings.contact_phone.replace(/\s+/g, '')}`}
                          className="hover:text-neutral-950 transition-colors"
                        >
                          {activeSettings.contact_phone}
                        </a>
                      </li>
                    )}
                  </>
                )}
              </ul>

              {socialLinks.length > 0 && (
                <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-neutral-700">
                  {socialLinks.map((social, idx) => (
                    <React.Fragment key={social.id}>
                      {idx > 0 && (
                        <span className="text-neutral-300" aria-hidden="true">
                          ·
                        </span>
                      )}
                      <a
                        href={social.destinationUrl}
                        target={social.openInNewTab ? '_blank' : undefined}
                        rel={social.openInNewTab ? 'noopener noreferrer' : undefined}
                        className="hover:text-neutral-950 transition-colors inline-flex items-center gap-1"
                      >
                        <span>{social.label}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
            <p>{activeSettings.footer_copyright || '© 2026 PIVO Agency. All rights reserved.'}</p>
            <p className="font-mono">CRAFTED BY PIVO</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
