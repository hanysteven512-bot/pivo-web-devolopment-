import React, { useEffect, useMemo, useRef, useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Globe,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Link2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import {
  ActiveSession,
  MediaItem,
  NavigationLink,
  NotificationConfig,
  Order,
  Project,
  SecurityLog,
} from '../types.ts';
import { PivoLogo } from './PivoLogo.tsx';
import { VisitorSite } from './VisitorSite.tsx';

type AdminTab =
  | 'overview'
  | 'work'
  | 'orders'
  | 'cms'
  | 'media'
  | 'navigation'
  | 'social'
  | 'security';

export const AdminDashboard: React.FC = () => {
  // Authentication & Session State
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);

  // Login Form State
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);

  // First-time / Change Password Form State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [recoveryEmailInput, setRecoveryEmailInput] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [liveAlertOrder, setLiveAlertOrder] = useState<{
    id: number;
    orderCode: string;
    customerName: string;
    createdAt: string;
  } | null>(null);

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [publicSettings, setPublicSettings] = useState<Record<string, string>>({});
  const [savedPublicSettings, setSavedPublicSettings] = useState<Record<string, string>>({});
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
    notify_email_enabled: false,
    notify_recipient_email: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_from: 'notifications@pivo.agency',
    smtp_pass_configured: false,
    notify_telegram_enabled: false,
    telegram_chat_id: '',
    telegram_bot_token_configured: false,
  });
  const [smtpPasswordInput, setSmtpPasswordInput] = useState('');
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [linksList, setLinksList] = useState<NavigationLink[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Manage Work State
  const [workSearch, setWorkSearch] = useState('');
  const [workFilter, setWorkFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
  const [previewingProject, setPreviewingProject] = useState<Partial<Project> | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  // Orders Management State
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderSort, setOrderSort] = useState<'newest' | 'oldest'>('newest');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNotesDraft, setOrderNotesDraft] = useState('');
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [copiedOrderCode, setCopiedOrderCode] = useState<string>('');

  // CMS Editor State
  const [cmsPreviewMode, setCmsPreviewMode] = useState(false);
  const [savingCms, setSavingCms] = useState(false);
  const [projectTypesText, setProjectTypesText] = useState('');
  const [budgetRangesText, setBudgetRangesText] = useState('');

  // Media Library State
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [replacingMediaId, setReplacingMediaId] = useState<number | null>(null);
  const [deletingMediaItem, setDeletingMediaItem] = useState<MediaItem | null>(null);
  const [copiedMediaUrl, setCopiedMediaUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  // Links Management State
  const [editingLink, setEditingLink] = useState<Partial<NavigationLink> | null>(null);
  const [deletingLink, setDeletingLink] = useState<NavigationLink | null>(null);
  const [savingLink, setSavingLink] = useState(false);

  // Notification Settings State
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [testingChannel, setTestingChannel] = useState<'email' | 'telegram' | null>(null);

  useEffect(() => {
    document.title = 'PIVO Admin Dashboard';
    checkSession();
  }, []);

  const showBanner = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const checkSession = async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch('/api/admin/auth/session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(true);
        setMustChangePassword(Boolean(data.mustChangePassword));
        setRecoveryEmail(data.recoveryEmail || '');
        setRecoveryEmailInput(data.recoveryEmail || '');
        setCurrentSession(data.currentSession || null);
        setActiveSessions(data.activeSessions || []);
        setSecurityLogs(data.securityLogs || []);
        await loadAllAdminData();
      } else {
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const loadAllAdminData = async () => {
    setLoadingData(true);
    try {
      const [projRes, ordRes, setRes, medRes, lnkRes] = await Promise.all([
        fetch('/api/admin/projects', { credentials: 'include' }),
        fetch('/api/admin/orders', { credentials: 'include' }),
        fetch('/api/admin/settings', { credentials: 'include' }),
        fetch('/api/admin/media', { credentials: 'include' }),
        fetch('/api/admin/links', { credentials: 'include' }),
      ]);

      if (projRes.ok) setProjects(await projRes.json());
      if (ordRes.ok) {
        const ordList: Order[] = await ordRes.json();
        setOrders(ordList);
        if (selectedOrder) {
          const updatedSel = ordList.find((o) => o.id === selectedOrder.id);
          if (updatedSel) setSelectedOrder(updatedSel);
        }
      }
      if (setRes.ok) {
        const sData = await setRes.json();
        const pub = sData.publicSettings || {};
        setPublicSettings(pub);
        setSavedPublicSettings(pub);
        if (sData.notificationConfig) {
          setNotificationConfig(sData.notificationConfig);
        }
        try {
          const pt = JSON.parse(pub.form_project_types || '[]');
          setProjectTypesText(Array.isArray(pt) ? pt.join('\n') : '');
        } catch {
          setProjectTypesText('');
        }
        try {
          const br = JSON.parse(pub.form_budget_ranges || '[]');
          setBudgetRangesText(Array.isArray(br) ? br.join('\n') : '');
        } catch {
          setBudgetRangesText('');
        }
      }
      if (medRes.ok) setMediaList(await medRes.json());
      if (lnkRes.ok) setLinksList(await lnkRes.json());
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  // Real-time SSE connection for incoming visitor orders while dashboard is open
  useEffect(() => {
    if (!authenticated || mustChangePassword) return;

    const eventSource = new EventSource('/api/admin/notifications/stream', {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NEW_ORDER' && payload.order) {
          setLiveAlertOrder(payload.order);
          fetch('/api/admin/orders', { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : null))
            .then((list) => {
              if (Array.isArray(list)) setOrders(list);
            });
        }
      } catch {
        // ignore parse error
      }
    };

    return () => {
      eventSource.close();
    };
  }, [authenticated, mustChangePassword]);

  // ============================================================================
  // AUTHENTICATION HANDLERS
  // ============================================================================

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) {
      setLoginError('Please enter your administrator password.');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: loginPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Invalid password.');
      }

      // If mustChangePassword is true, keep the entered password in currentPasswordInput so first-time change is seamless
      if (body.mustChangePassword) {
        setCurrentPasswordInput(loginPassword);
      }
      setLoginPassword('');
      setAuthenticated(true);
      setMustChangePassword(Boolean(body.mustChangePassword));
      setRecoveryEmail(body.recoveryEmail || '');
      setRecoveryEmailInput(body.recoveryEmail || '');
      await checkSession();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleRecoverySignIn = async () => {
    setLoggingIn(true);
    setLoginError('');
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/admin/auth/google-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Google recovery authentication failed.');
      }
      setAuthenticated(true);
      setMustChangePassword(false);
      await checkSession();
    } catch (err: any) {
      setLoginError(err.message || 'Google Sign-In could not be completed.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAuthenticated(false);
      setMustChangePassword(false);
      setCurrentSession(null);
      setLoginPassword('');
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg(null);

    if (newPasswordInput.length < 6) {
      setPasswordChangeMsg({
        type: 'error',
        text: 'New password must be at least 6 characters long.',
      });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeMsg({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput,
          recoveryEmail: recoveryEmailInput,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to update password.');
      }

      setMustChangePassword(false);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordChangeMsg({
        type: 'success',
        text: 'Administrator password updated and salted hash saved.',
      });
      await checkSession();
    } catch (err: any) {
      setPasswordChangeMsg({
        type: 'error',
        text: err.message || 'Password update failed.',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // ============================================================================
  // COMPUTED METRICS & FILTERS
  // ============================================================================

  const unreadOrders = useMemo(() => orders.filter((o) => !o.isRead), [orders]);
  const publishedProjectsCount = useMemo(
    () => projects.filter((p) => p.isPublished).length,
    [projects]
  );
  const draftProjectsCount = useMemo(
    () => projects.filter((p) => !p.isPublished).length,
    [projects]
  );

  const filteredWorkProjects = useMemo(() => {
    return projects.filter((p) => {
      if (workFilter === 'published' && !p.isPublished) return false;
      if (workFilter === 'draft' && p.isPublished) return false;
      if (workSearch.trim()) {
        const q = workSearch.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, workFilter, workSearch]);

  const filteredOrdersList = useMemo(() => {
    const list = orders.filter((o) => {
      if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        return (
          o.orderCode.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q) ||
          o.projectType.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return orderSort === 'newest' ? tB - tA : tA - tB;
    });
  }, [orders, orderStatusFilter, orderSearch, orderSort]);

  // ============================================================================
  // PORTFOLIO / MANAGE WORK HANDLERS
  // ============================================================================

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSavingProject(true);
    try {
      const isEdit = Boolean(editingProject.id);
      const url = isEdit ? `/api/admin/projects/${editingProject.id}` : '/api/admin/projects';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editingProject.title || '',
          description: editingProject.description || '',
          category: editingProject.category || '',
          imageUrl: editingProject.imageUrl || '',
          destinationUrl: editingProject.destinationUrl || '',
          isPublished: editingProject.isPublished ?? true,
          isDemo: editingProject.isDemo ?? false,
          displayOrder: editingProject.displayOrder ?? projects.length + 1,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to save project.');

      setEditingProject(null);
      await loadAllAdminData();
      showBanner('success', isEdit ? 'Project updated.' : 'New project created.');
    } catch (err: any) {
      showBanner('error', err.message || 'Error saving project.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleToggleProjectPublish = async (project: Project) => {
    try {
      const res = await fetch(`/api/admin/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isPublished: !project.isPublished }),
      });
      if (!res.ok) throw new Error('Failed to update publication status.');
      await loadAllAdminData();
      showBanner(
        'success',
        !project.isPublished
          ? `"${project.title}" published to public website.`
          : `"${project.title}" moved to drafts.`
      );
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  const handleMoveProjectOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= projects.length) return;
    const copy = [...projects];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setProjects(copy);

    try {
      await fetch('/api/admin/projects/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderedIds: copy.map((p) => p.id) }),
      });
      await loadAllAdminData();
    } catch {
      showBanner('error', 'Failed to save new project order.');
    }
  };

  const confirmDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      const res = await fetch(`/api/admin/projects/${deletingProject.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete project.');
      setDeletingProject(null);
      await loadAllAdminData();
      showBanner('success', 'Project permanently deleted.');
    } catch (err: any) {
      showBanner('error', err.message || 'Delete failed.');
    }
  };

  const handleDirectProjectImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProject) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      try {
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Image upload failed.');
        setEditingProject((prev) => (prev ? { ...prev, imageUrl: body.publicUrl } : null));
        await loadAllAdminData();
        showBanner('success', 'Project cover image uploaded and linked.');
      } catch (err: any) {
        showBanner('error', err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // ORDERS HANDLERS
  // ============================================================================

  const handleOpenOrderDetail = async (order: Order) => {
    setSelectedOrder(order);
    setOrderNotesDraft(order.adminNotes || '');
    if (!order.isRead) {
      try {
        await fetch(`/api/admin/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isRead: true }),
        });
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, isRead: true } : o))
        );
      } catch {
        // ignore
      }
    }
  };

  const handleUpdateOrderField = async (
    orderId: number,
    updates: Partial<{ status: Order['status']; isRead: boolean; adminNotes: string }>
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const updated = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(updated.error || 'Failed to update order.');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
      }
      showBanner('success', 'Order updated.');
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  const confirmDeleteOrder = async () => {
    if (!deletingOrder) return;
    try {
      const res = await fetch(`/api/admin/orders/${deletingOrder.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete order.');
      if (selectedOrder?.id === deletingOrder.id) {
        setSelectedOrder(null);
      }
      setDeletingOrder(null);
      await loadAllAdminData();
      showBanner('success', 'Order deleted.');
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  const handleCopyOrderDetails = (order: Order) => {
    const summary = [
      `Order ID: ${order.orderCode}`,
      `Status: ${order.status}`,
      `Customer: ${order.customerName}`,
      `Phone: ${order.phone}`,
      `Email: ${order.email}`,
      `Project Type: ${order.projectType || 'Not specified'}`,
      `Budget Range: ${order.budgetRange || 'Not specified'}`,
      `Reference Website: ${order.referenceUrl || 'None'}`,
      `Submitted: ${new Date(order.createdAt).toLocaleString()}`,
      `Description: ${order.projectDescription}`,
      `Additional Notes: ${order.additionalNotes || 'None'}`,
      `Internal Admin Notes: ${order.adminNotes || 'None'}`,
    ].join('\n');
    navigator.clipboard.writeText(summary);
    setCopiedOrderCode(order.orderCode);
    setTimeout(() => setCopiedOrderCode(''), 2500);
  };

  const handleExportOrdersCsv = () => {
    const headers = [
      'Order ID',
      'Customer Name',
      'Phone',
      'Email',
      'Project Type',
      'Budget Range',
      'Status',
      'Read',
      'Reference URL',
      'Project Description',
      'Additional Notes',
      'Internal Notes',
      'Created At',
    ];
    const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredOrdersList.map((o) =>
      [
        o.orderCode,
        o.customerName,
        o.phone,
        o.email,
        o.projectType,
        o.budgetRange,
        o.status,
        o.isRead ? 'Yes' : 'No',
        o.referenceUrl,
        o.projectDescription,
        o.additionalNotes,
        o.adminNotes,
        new Date(o.createdAt).toISOString(),
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivo-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // EDIT WEBSITE (CMS) HANDLERS
  // ============================================================================

  const handleSavePublicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCms(true);
    try {
      const typesArray = projectTypesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const budgetsArray = budgetRangesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...publicSettings,
        form_project_types: JSON.stringify(typesArray),
        form_budget_ranges: JSON.stringify(budgetsArray),
      };

      const res = await fetch('/api/admin/settings/public', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settings: payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to save website content.');

      setPublicSettings(payload);
      setSavedPublicSettings(payload);
      showBanner('success', 'Website content saved and published to visitor site.');
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setSavingCms(false);
    }
  };

  const handleCancelCmsChanges = () => {
    setPublicSettings(savedPublicSettings);
    try {
      const pt = JSON.parse(savedPublicSettings.form_project_types || '[]');
      setProjectTypesText(Array.isArray(pt) ? pt.join('\n') : '');
    } catch {
      setProjectTypesText('');
    }
    try {
      const br = JSON.parse(savedPublicSettings.form_budget_ranges || '[]');
      setBudgetRangesText(Array.isArray(br) ? br.join('\n') : '');
    } catch {
      setBudgetRangesText('');
    }
    showBanner('success', 'Reverted unsaved changes.');
  };

  // ============================================================================
  // MEDIA LIBRARY HANDLERS
  // ============================================================================

  const handleMediaUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const res = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Upload failed.');
        await loadAllAdminData();
        showBanner('success', `Uploaded "${file.name}" to Media Library.`);
      } catch (err: any) {
        showBanner('error', err.message);
      } finally {
        setUploadingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReplaceMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingMediaId) return;
    const targetId = replacingMediaId;
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result || '');
        const res = await fetch(`/api/admin/media/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            dataUrl,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Replace failed.');
        await loadAllAdminData();
        showBanner('success', `Replaced media item #${targetId} with "${file.name}".`);
      } catch (err: any) {
        showBanner('error', err.message);
      } finally {
        setUploadingMedia(false);
        setReplacingMediaId(null);
        if (replaceInputRef.current) replaceInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmDeleteMedia = async () => {
    if (!deletingMediaItem) return;
    try {
      const res = await fetch(`/api/admin/media/${deletingMediaItem.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete media file.');
      setDeletingMediaItem(null);
      await loadAllAdminData();
      showBanner('success', 'Media item deleted.');
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  // ============================================================================
  // NAVIGATION & SOCIAL LINKS HANDLERS
  // ============================================================================

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setSavingLink(true);
    try {
      const isEdit = Boolean(editingLink.id);
      const url = isEdit ? `/api/admin/links/${editingLink.id}` : '/api/admin/links';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          label: editingLink.label || '',
          destinationUrl: editingLink.destinationUrl || '',
          placement: editingLink.placement || 'header',
          displayOrder: editingLink.displayOrder ?? 1,
          isEnabled: editingLink.isEnabled ?? true,
          openInNewTab: editingLink.openInNewTab ?? false,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to save link.');
      setEditingLink(null);
      await loadAllAdminData();
      showBanner('success', isEdit ? 'Link updated.' : 'New link added.');
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setSavingLink(false);
    }
  };

  const handleToggleLinkEnabled = async (link: NavigationLink) => {
    try {
      const res = await fetch(`/api/admin/links/${link.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isEnabled: !link.isEnabled }),
      });
      if (!res.ok) throw new Error('Failed to update link status.');
      await loadAllAdminData();
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  const handleMoveLinkOrder = async (
    placementGroup: NavigationLink[],
    index: number,
    direction: 'up' | 'down'
  ) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= placementGroup.length) return;
    const copy = [...placementGroup];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);

    try {
      await fetch('/api/admin/links/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderedIds: copy.map((l) => l.id) }),
      });
      await loadAllAdminData();
    } catch {
      showBanner('error', 'Failed to reorder links.');
    }
  };

  const confirmDeleteLink = async () => {
    if (!deletingLink) return;
    try {
      const res = await fetch(`/api/admin/links/${deletingLink.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete link.');
      setDeletingLink(null);
      await loadAllAdminData();
      showBanner('success', 'Link removed.');
    } catch (err: any) {
      showBanner('error', err.message);
    }
  };

  // ============================================================================
  // NOTIFICATION SETTINGS HANDLERS
  // ============================================================================

  const handleSaveNotificationsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotifications(true);
    try {
      const res = await fetch('/api/admin/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...notificationConfig,
          smtp_pass: smtpPasswordInput,
          telegram_bot_token: telegramTokenInput,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to save notification settings.');
      setSmtpPasswordInput('');
      setTelegramTokenInput('');
      await loadAllAdminData();
      showBanner('success', 'Notification configuration saved.');
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleTestNotificationChannel = async (channel: 'email' | 'telegram') => {
    setTestingChannel(channel);
    try {
      const res = await fetch('/api/admin/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channel }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Notification test failed.');
      showBanner('success', body.message || 'Test notification delivered.');
    } catch (err: any) {
      showBanner('error', err.message);
    } finally {
      setTestingChannel(null);
    }
  };

  // ============================================================================
  // RENDER STATES: LOADING / LOGIN / MANDATORY PASSWORD CHANGE
  // ============================================================================

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm font-mono">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>VERIFYING ADMINISTRATOR SESSION...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between p-6">
        <div className="max-w-7xl w-full mx-auto py-4 flex items-center justify-between">
          <PivoLogo inverted className="h-6" />
          <span className="text-xs font-mono text-neutral-400 tracking-widest">
            RESTRICTED ADMIN CONSOLE
          </span>
        </div>

        <div className="max-w-md w-full mx-auto bg-neutral-900 border border-neutral-800 p-8 sm:p-10">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-white text-neutral-950 mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-2">
              Administrator Sign In
            </h1>
            <p className="text-sm text-neutral-400">
              Enter your administrator password to access PIVO portfolio and order controls.
            </p>
          </div>

          {loginError && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-red-950/80 border border-red-800 text-xs text-red-200 font-medium"
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2"
              >
                Administrator Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                autoFocus
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full px-4 py-3 text-sm bg-neutral-950 border border-neutral-700 text-white focus:border-white focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 px-6 text-sm font-bold bg-white text-neutral-950 hover:bg-neutral-200 disabled:opacity-60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loggingIn ? 'Verifying...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setShowRecoveryInfo((prev) => !prev)}
              className="text-xs font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Forgot password or need account recovery?
            </button>

            {showRecoveryInfo && (
              <div className="mt-4 p-4 bg-neutral-950 border border-neutral-800 space-y-3">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Verify ownership using your authorized administrator Google account to recover
                  access and reset your password.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleRecoverySignIn}
                  disabled={loggingIn}
                  className="w-full py-2.5 px-4 text-xs font-semibold bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 transition-colors"
                >
                  Verify &amp; Recover via Google Account
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl w-full mx-auto py-4 text-center text-xs font-mono text-neutral-600">
          PROTECTED SESSION · HTTP-ONLY COOKIE AUTHENTICATION
        </div>
      </div>
    );
  }

  // Mandatory First-Time Password Change Gate
  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-neutral-900 border border-neutral-800 p-8 sm:p-10">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
            <PivoLogo inverted className="h-6" />
            <span className="text-xs font-mono text-amber-400">FIRST-TIME SECURITY SETUP</span>
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-2">
            Update Initial Setup Password
          </h1>
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            For security compliance, the initial setup credential can only be used once. Please
            choose a new strong administrator password before accessing the dashboard.
          </p>

          {passwordChangeMsg && (
            <div
              className={`mb-6 p-3.5 border text-xs font-medium ${
                passwordChangeMsg.type === 'error'
                  ? 'bg-red-950/80 border-red-800 text-red-200'
                  : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              }`}
            >
              {passwordChangeMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Current (Initial) Password
              </label>
              <input
                type="password"
                required
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-3 text-sm bg-neutral-950 border border-neutral-700 text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                New Administrator Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-3 text-sm bg-neutral-950 border border-neutral-700 text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-4 py-3 text-sm bg-neutral-950 border border-neutral-700 text-white focus:border-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1.5">
                Authorized Recovery Google Email
              </label>
              <input
                type="email"
                value={recoveryEmailInput}
                onChange={(e) => setRecoveryEmailInput(e.target.value)}
                placeholder="admin@yourdomain.com"
                className="w-full px-4 py-3 text-sm bg-neutral-950 border border-neutral-700 text-white focus:border-white focus:outline-none"
              />
            </div>

            <div className="pt-3 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-3 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-3 text-sm font-bold bg-white text-neutral-950 hover:bg-neutral-200 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {changingPassword ? 'Saving New Password...' : 'Save Password & Continue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN AUTHENTICATED ADMIN DASHBOARD
  // ============================================================================

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'work', label: 'Manage Work', icon: <FolderKanban className="w-4 h-4" /> },
    {
      id: 'orders',
      label: 'Orders',
      icon: <Inbox className="w-4 h-4" />,
      badge: unreadOrders.length > 0 ? unreadOrders.length : undefined,
    },
    { id: 'cms', label: 'Edit Website', icon: <FileText className="w-4 h-4" /> },
    { id: 'media', label: 'Media Library', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'navigation', label: 'Navigation & Links', icon: <Link2 className="w-4 h-4" /> },
    { id: 'social', label: 'Contact & Social Links', icon: <Share2 className="w-4 h-4" /> },
    { id: 'security', label: 'Account & Security', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-neutral-950 text-white border-r border-neutral-800 z-30">
        <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-800">
          <PivoLogo inverted className="h-5" />
          <span className="text-[11px] font-mono text-neutral-400">ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-neutral-950 font-semibold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap">
                  {item.icon}
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-bold tabular-nums ${
                      active ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <span>Open Public Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-xs bg-neutral-950 text-white flex flex-col z-10">
            <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-800">
              <PivoLogo inverted className="h-5" />
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 text-sm font-medium ${
                      active ? 'bg-white text-neutral-950 font-semibold' : 'text-neutral-300'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 text-xs font-mono font-bold bg-white text-neutral-950 tabular-nums">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, Notification + Primary Action on Right */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 border border-neutral-200 text-neutral-900"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-neutral-500 flex items-center gap-2">
              <span>PIVO Admin</span>
              <span>/</span>
              <span className="font-bold text-neutral-950">
                {navItems.find((i) => i.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadAllAdminData}
              className="p-2 text-neutral-600 hover:text-neutral-950 border border-neutral-200 hover:border-neutral-400 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>

            {/* In-Dashboard Notification Bell & Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border border-neutral-200 hover:border-neutral-950 bg-white transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
                {unreadOrders.length > 0 && (
                  <span className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-neutral-950 text-white tabular-nums">
                    {unreadOrders.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-950 shadow-xl z-50">
                  <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Unread Project Orders ({unreadOrders.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-neutral-400 hover:text-neutral-950"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                    {unreadOrders.length === 0 ? (
                      <div className="p-6 text-center text-xs text-neutral-500">
                        All project requests have been reviewed.
                      </div>
                    ) : (
                      unreadOrders.map((ord) => (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false);
                            setActiveTab('orders');
                            handleOpenOrderDetail(ord);
                          }}
                          className="w-full text-left p-4 hover:bg-neutral-50 transition-colors flex items-start justify-between gap-3"
                        >
                          <div>
                            <p className="text-xs font-mono font-bold text-neutral-950">
                              {ord.orderCode}
                            </p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {ord.customerName}
                            </p>
                            <p className="text-xs text-neutral-500 tabular-nums mt-0.5">
                              {new Date(ord.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <span className="text-xs font-semibold underline text-neutral-950">
                            Open
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Live Real-Time Order Arrival Alert */}
        {liveAlertOrder && (
          <div className="bg-neutral-950 text-white px-6 py-3.5 flex items-center justify-between gap-4 border-b border-neutral-800">
            <div className="flex items-center gap-3 text-sm">
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>New Order Received:</strong> {liveAlertOrder.orderCode} from{' '}
                <strong>{liveAlertOrder.customerName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const found = orders.find((o) => o.id === liveAlertOrder.id);
                  setActiveTab('orders');
                  if (found) handleOpenOrderDetail(found);
                  setLiveAlertOrder(null);
                }}
                className="px-3 py-1 text-xs font-bold bg-white text-neutral-950 hover:bg-neutral-200"
              >
                Review Order
              </button>
              <button
                type="button"
                onClick={() => setLiveAlertOrder(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Action Feedback Banner */}
        {statusBanner && (
          <div
            className={`px-6 py-3 text-xs font-semibold flex items-center justify-between border-b ${
              statusBanner.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-neutral-900 text-white border-neutral-900'
            }`}
          >
            <span>{statusBanner.text}</span>
            <button type="button" onClick={() => setStatusBanner(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Viewport Workspace */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto">
          {/* ================================================================
              TAB 1: OVERVIEW
             ================================================================ */}
          {activeTab === 'overview' && (
            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                    Agency Overview
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    Real-time summary of published portfolio work and incoming client project requests.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProject({
                        title: '',
                        description: '',
                        category: 'Business Website',
                        imageUrl: mediaList[0]?.publicUrl || '',
                        destinationUrl: '',
                        isPublished: true,
                        isDemo: false,
                        displayOrder: projects.length + 1,
                      });
                      setActiveTab('work');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Project</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white text-neutral-950 border border-neutral-300 hover:border-neutral-950 transition-colors cursor-pointer"
                  >
                    <Inbox className="w-4 h-4" />
                    <span>Review Orders</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-neutral-200 p-6">
                  <p className="text-xs font-mono uppercase text-neutral-500 mb-2">
                    PUBLISHED PROJECTS
                  </p>
                  <p className="text-4xl font-extrabold font-mono tabular-nums text-neutral-950">
                    {publishedProjectsCount}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">Visible on public visitor site</p>
                </div>

                <div className="bg-white border border-neutral-200 p-6">
                  <p className="text-xs font-mono uppercase text-neutral-500 mb-2">
                    DRAFT PROJECTS
                  </p>
                  <p className="text-4xl font-extrabold font-mono tabular-nums text-neutral-950">
                    {draftProjectsCount}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">Hidden from public visitors</p>
                </div>

                <div className="bg-white border border-neutral-200 p-6">
                  <p className="text-xs font-mono uppercase text-neutral-500 mb-2">
                    TOTAL ORDERS RECEIVED
                  </p>
                  <p className="text-4xl font-extrabold font-mono tabular-nums text-neutral-950">
                    {orders.length}
                  </p>
                  <p className="text-xs text-neutral-500 mt-2">Stored permanently in PostgreSQL</p>
                </div>

                <div className="bg-neutral-950 text-white border border-neutral-950 p-6">
                  <p className="text-xs font-mono uppercase text-neutral-400 mb-2">
                    UNREAD / NEW ORDERS
                  </p>
                  <p className="text-4xl font-extrabold font-mono tabular-nums text-white">
                    {unreadOrders.length}
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">Awaiting administrator review</p>
                </div>
              </div>

              {/* Notification Channels Status Bar */}
              <div className="bg-white border border-neutral-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-neutral-950">
                    Administrator Notification Status
                  </h2>
                  <p className="text-xs text-neutral-600">
                    In-dashboard real-time notifications are <strong>Active</strong>.{' '}
                    {notificationConfig.notify_email_enabled &&
                    notificationConfig.smtp_pass_configured
                      ? `Email alerts active (${notificationConfig.notify_recipient_email}). `
                      : 'Email notifications require SMTP setup. '}
                    {notificationConfig.notify_telegram_enabled &&
                    notificationConfig.telegram_bot_token_configured
                      ? 'Telegram bot alerts active.'
                      : 'Telegram notifications require bot configuration.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className="px-4 py-2 text-xs font-semibold border border-neutral-300 hover:border-neutral-950 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Configure Channels
                </button>
              </div>

              {/* Recent Project Requests */}
              <div className="bg-white border border-neutral-200">
                <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
                  <h2 className="text-base font-bold text-neutral-950">Recent Project Requests</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-neutral-950 underline cursor-pointer"
                  >
                    View All Orders
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="p-12 text-center text-sm text-neutral-500">
                    No project orders have been submitted yet. Submit a test inquiry on the public
                    website to see it arrive here in real time.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-mono uppercase text-neutral-500">
                          <th className="py-3 px-4">Order ID</th>
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Project Type</th>
                          <th className="py-3 px-4">Budget</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 text-sm">
                        {orders.slice(0, 6).map((ord) => (
                          <tr
                            key={ord.id}
                            className={`hover:bg-neutral-50 ${!ord.isRead ? 'font-semibold bg-neutral-50/60' : ''}`}
                          >
                            <td className="py-3.5 px-4 font-mono text-xs tabular-nums">
                              {ord.orderCode}
                              {!ord.isRead && (
                                <span className="ml-2 text-[10px] font-mono uppercase text-amber-700">
                                  · UNREAD
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">{ord.customerName}</td>
                            <td className="py-3.5 px-4 text-neutral-600">
                              {ord.projectType || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs tabular-nums">
                              {ord.budgetRange || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-neutral-500 tabular-nums">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono">{ord.status}</td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('orders');
                                  handleOpenOrderDetail(ord);
                                }}
                                className="text-xs font-bold underline text-neutral-950 cursor-pointer"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 2: MANAGE WORK
             ================================================================ */}
          {activeTab === 'work' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                    Manage PIVO Work
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    Create, edit, reorder, publish, or unpublish portfolio projects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingProject({
                      title: '',
                      description: '',
                      category: 'Business Website',
                      imageUrl: mediaList[0]?.publicUrl || '',
                      destinationUrl: '',
                      isPublished: true,
                      isDemo: false,
                      displayOrder: projects.length + 1,
                    })
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-neutral-200 p-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={workSearch}
                    onChange={(e) => setWorkSearch(e.target.value)}
                    placeholder="Search projects by title, category, or description..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 border border-neutral-200">
                  {(['all', 'published', 'draft'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setWorkFilter(status)}
                      className={`px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                        workFilter === status
                          ? 'bg-neutral-950 text-white'
                          : 'text-neutral-600 hover:text-neutral-950'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project Editor Form Modal / Panel */}
              {editingProject && (
                <div className="bg-white border-2 border-neutral-950 p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                    <h2 className="text-lg font-extrabold text-neutral-950">
                      {editingProject.id ? `Edit Project #${editingProject.id}` : 'Create New Project'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="p-1 text-neutral-500 hover:text-neutral-950"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProject} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">
                          Project Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingProject.title || ''}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, title: e.target.value })
                          }
                          placeholder="e.g., Kinetix Atelier Storefront"
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">
                          Category / Type
                        </label>
                        <input
                          type="text"
                          value={editingProject.category || ''}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, category: e.target.value })
                          }
                          placeholder="e.g., E-commerce Website"
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">
                        Project Description *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={editingProject.description || ''}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, description: e.target.value })
                        }
                        placeholder="Concise summary of the project architecture and client impact..."
                        className="w-full px-4 py-2.5 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">
                          External Destination URL (Leave blank for non-clickable card)
                        </label>
                        <input
                          type="url"
                          value={editingProject.destinationUrl || ''}
                          onChange={(e) =>
                            setEditingProject({
                              ...editingProject,
                              destinationUrl: e.target.value,
                            })
                          }
                          placeholder="https://client-website.com"
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-900 mb-2">
                          Cover Image URL or Upload *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={editingProject.imageUrl || ''}
                            onChange={(e) =>
                              setEditingProject({ ...editingProject, imageUrl: e.target.value })
                            }
                            placeholder="/api/media/file/1 or https://..."
                            className="flex-1 px-4 py-2.5 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                          />
                          <label className="px-3.5 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                              onChange={handleDirectProjectImageUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setMediaPickerOpen((prev) => !prev)}
                            className="px-3.5 py-2.5 text-xs font-bold border border-neutral-300 hover:border-neutral-950 shrink-0"
                          >
                            Media Library
                          </button>
                        </div>
                      </div>
                    </div>

                    {mediaPickerOpen && (
                      <div className="p-4 bg-neutral-50 border border-neutral-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase">
                            Select Image from Media Library
                          </span>
                          <button
                            type="button"
                            onClick={() => setMediaPickerOpen(false)}
                            className="text-xs underline"
                          >
                            Close
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto">
                          {mediaList.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setEditingProject({ ...editingProject, imageUrl: m.publicUrl });
                                setMediaPickerOpen(false);
                              }}
                              className="border border-neutral-300 hover:border-neutral-950 bg-white p-1.5 text-left"
                            >
                              <img
                                src={m.publicUrl}
                                alt={m.fileName}
                                className="w-full aspect-[4/3] object-cover bg-neutral-900 mb-1"
                              />
                              <p className="text-[11px] truncate font-mono">{m.fileName}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProject.isPublished ?? true}
                          onChange={(e) =>
                            setEditingProject({
                              ...editingProject,
                              isPublished: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-neutral-950"
                        />
                        <span>Publish immediately on visitor website</span>
                      </label>

                      <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProject.isDemo ?? false}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, isDemo: e.target.checked })
                          }
                          className="w-4 h-4 accent-neutral-950"
                        />
                        <span>Mark as Demonstration Project</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setPreviewingProject(editingProject)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border border-neutral-300 hover:border-neutral-950"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview Card</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingProject(null)}
                          className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingProject}
                          className="px-6 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-60 cursor-pointer"
                        >
                          {savingProject ? 'Saving...' : 'Save Project'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Project Card Preview Modal */}
              {previewingProject && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
                  <div className="bg-white border border-neutral-950 max-w-md w-full p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                      <span className="text-xs font-mono font-bold uppercase">
                        PUBLIC CARD PREVIEW
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewingProject(null)}
                        className="text-neutral-500 hover:text-neutral-950"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="border border-neutral-200">
                      <div className="aspect-[4/3] bg-neutral-950 overflow-hidden">
                        {previewingProject.imageUrl && (
                          <img
                            src={previewingProject.imageUrl}
                            alt={previewingProject.title || 'Preview'}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-mono text-neutral-500 mb-1">
                          01 · {previewingProject.category || 'Uncategorized'}
                          {previewingProject.isDemo ? ' · Demonstration' : ''}
                        </p>
                        <h3 className="text-lg font-bold text-neutral-950 mb-1.5">
                          {previewingProject.title || 'Untitled Project'}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {previewingProject.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Project Confirmation Modal */}
              {deletingProject && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
                  <div className="bg-white border border-neutral-950 max-w-md w-full p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-base font-bold text-neutral-950">
                          Delete Project Permanently?
                        </h3>
                        <p className="text-sm text-neutral-600 mt-1">
                          Are you sure you want to delete{' '}
                          <strong>{deletingProject.title}</strong>? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setDeletingProject(null)}
                        className="px-4 py-2 text-xs font-semibold border border-neutral-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteProject}
                        className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Projects List Table */}
              <div className="bg-white border border-neutral-200 divide-y divide-neutral-200">
                {filteredWorkProjects.length === 0 ? (
                  <div className="p-12 text-center text-sm text-neutral-500">
                    No portfolio projects match the current filter.
                  </div>
                ) : (
                  filteredWorkProjects.map((project, idx) => (
                    <div
                      key={project.id}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-neutral-50/70 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-28 aspect-[4/3] bg-neutral-950 border border-neutral-200 shrink-0 overflow-hidden">
                          <img
                            src={project.imageUrl}
                            alt={project.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-500">
                            <span className="tabular-nums">Order #{project.displayOrder}</span>
                            <span>·</span>
                            <span>{project.category || 'Uncategorized'}</span>
                            <span>·</span>
                            <span
                              className={
                                project.isPublished
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-amber-700 font-bold'
                              }
                            >
                              {project.isPublished ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                            {project.isDemo && (
                              <>
                                <span>·</span>
                                <span>DEMO</span>
                              </>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-neutral-950">{project.title}</h3>
                          <p className="text-xs text-neutral-600 max-w-xl line-clamp-2">
                            {project.description}
                          </p>
                          {project.destinationUrl ? (
                            <p className="text-xs font-mono text-neutral-500 truncate max-w-md">
                              URL: {project.destinationUrl}
                            </p>
                          ) : (
                            <p className="text-xs font-mono text-neutral-400">
                              No destination URL (Non-clickable card)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveProjectOrder(idx, 'up')}
                          disabled={idx === 0}
                          className="p-2 border border-neutral-200 hover:border-neutral-950 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveProjectOrder(idx, 'down')}
                          disabled={idx === filteredWorkProjects.length - 1}
                          className="p-2 border border-neutral-200 hover:border-neutral-950 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleProjectPublish(project)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-neutral-200 hover:border-neutral-950 cursor-pointer"
                        >
                          {project.isPublished ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Unpublish</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Publish</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProject(project)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-neutral-200 hover:border-neutral-950 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProject(project)}
                          className="p-2 text-red-600 border border-neutral-200 hover:border-red-600 cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 3: ORDERS MANAGEMENT
             ================================================================ */}
          {activeTab === 'orders' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                    Project Orders
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    Review visitor inquiries, update statuses, record private notes, and export CSV.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportOrdersCsv}
                  disabled={filteredOrdersList.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV ({filteredOrdersList.length})</span>
                </button>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white border border-neutral-200 p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order ID, customer name, email, phone, or project type..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3.5 py-2 text-xs font-semibold border border-neutral-300 bg-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select
                    value={orderSort}
                    onChange={(e) => setOrderSort(e.target.value as 'newest' | 'oldest')}
                    className="px-3.5 py-2 text-xs font-semibold border border-neutral-300 bg-white"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
              </div>

              {/* Selected Order Detail Drawer / Panel */}
              {selectedOrder && (
                <div className="bg-white border-2 border-neutral-950 p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
                        <span>{selectedOrder.orderCode}</span>
                        <span>·</span>
                        <span className="tabular-nums">
                          {new Date(selectedOrder.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-neutral-950 mt-1">
                        {selectedOrder.customerName}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateOrderField(selectedOrder.id, {
                            isRead: !selectedOrder.isRead,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-semibold border border-neutral-300 hover:border-neutral-950"
                      >
                        {selectedOrder.isRead ? 'Mark as Unread' : 'Mark as Read'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyOrderDetails(selectedOrder)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-neutral-300 hover:border-neutral-950"
                      >
                        {copiedOrderCode === selectedOrder.orderCode ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Details</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(null)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-950"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 text-sm">
                      <p className="text-xs font-mono uppercase text-neutral-500">
                        CUSTOMER CONTACT
                      </p>
                      <p className="font-semibold">{selectedOrder.customerName}</p>
                      <p className="text-neutral-700">{selectedOrder.email}</p>
                      <p className="text-neutral-700 font-mono tabular-nums">
                        {selectedOrder.phone}
                      </p>
                      <div className="pt-2 flex flex-wrap gap-2">
                        <a
                          href={`mailto:${selectedOrder.email}?subject=${encodeURIComponent(
                            `Regarding your PIVO Project Request (${selectedOrder.orderCode})`
                          )}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-neutral-950 text-white"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </a>
                        <a
                          href={`tel:${selectedOrder.phone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-neutral-300 hover:border-neutral-950"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${selectedOrder.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-neutral-300 hover:border-neutral-950"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className="text-xs font-mono uppercase text-neutral-500">
                        PROJECT PARAMETERS
                      </p>
                      <p>
                        <span className="text-neutral-500">Type:</span>{' '}
                        <strong>{selectedOrder.projectType || 'Not specified'}</strong>
                      </p>
                      <p>
                        <span className="text-neutral-500">Budget:</span>{' '}
                        <strong className="font-mono">{selectedOrder.budgetRange || 'Not specified'}</strong>
                      </p>
                      <p>
                        <span className="text-neutral-500">Reference URL:</span>{' '}
                        {selectedOrder.referenceUrl ? (
                          <a
                            href={selectedOrder.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-mono text-xs break-all"
                          >
                            {selectedOrder.referenceUrl}
                          </a>
                        ) : (
                          'None'
                        )}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-mono uppercase text-neutral-500">
                        ORDER STATUS
                      </label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) =>
                          handleUpdateOrderField(selectedOrder.id, {
                            status: e.target.value as Order['status'],
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-sm font-bold border border-neutral-950 bg-white"
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-mono uppercase text-neutral-500 mb-1">
                          PROJECT DESCRIPTION
                        </p>
                        <div className="p-4 bg-neutral-50 border border-neutral-200 text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                          {selectedOrder.projectDescription}
                        </div>
                      </div>
                      {selectedOrder.additionalNotes && (
                        <div>
                          <p className="text-xs font-mono uppercase text-neutral-500 mb-1">
                            ADDITIONAL VISITOR NOTES
                          </p>
                          <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 whitespace-pre-wrap">
                            {selectedOrder.additionalNotes}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-mono uppercase text-neutral-500">
                        INTERNAL ADMINISTRATOR NOTES (PRIVATE)
                      </label>
                      <textarea
                        rows={4}
                        value={orderNotesDraft}
                        onChange={(e) => setOrderNotesDraft(e.target.value)}
                        placeholder="Add private internal notes, call summaries, or quote figures..."
                        className="w-full p-3 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                      />
                      <div className="flex justify-between items-center pt-1">
                        <button
                          type="button"
                          onClick={() => setDeletingOrder(selectedOrder)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete Order
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateOrderField(selectedOrder.id, {
                              adminNotes: orderNotesDraft,
                            })
                          }
                          className="px-4 py-2 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 cursor-pointer"
                        >
                          Save Internal Notes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Order Confirmation Modal */}
              {deletingOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
                  <div className="bg-white border border-neutral-950 max-w-md w-full p-6 space-y-4">
                    <h3 className="text-base font-bold text-neutral-950">
                      Delete Order {deletingOrder.orderCode}?
                    </h3>
                    <p className="text-sm text-neutral-600">
                      This will permanently remove the submission from{' '}
                      <strong>{deletingOrder.customerName}</strong>.
                    </p>
                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setDeletingOrder(null)}
                        className="px-4 py-2 text-xs font-semibold border border-neutral-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteOrder}
                        className="px-4 py-2 text-xs font-bold bg-red-600 text-white"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Table */}
              <div className="bg-white border border-neutral-200 overflow-x-auto">
                {filteredOrdersList.length === 0 ? (
                  <div className="p-12 text-center text-sm text-neutral-500">
                    No orders match your current search or filter criteria.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-mono uppercase text-neutral-500">
                        <th className="py-3.5 px-4">Order ID</th>
                        <th className="py-3.5 px-4">Customer Name</th>
                        <th className="py-3.5 px-4">Phone</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Project Type</th>
                        <th className="py-3.5 px-4">Budget</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-sm">
                      {filteredOrdersList.map((ord) => (
                        <tr
                          key={ord.id}
                          onClick={() => handleOpenOrderDetail(ord)}
                          className={`hover:bg-neutral-50 cursor-pointer ${
                            !ord.isRead ? 'bg-neutral-50/80 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                            {ord.orderCode}
                            {!ord.isRead && (
                              <span className="ml-1.5 text-[10px] font-mono text-amber-700">
                                · NEW
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">{ord.customerName}</td>
                          <td className="py-3.5 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                            {ord.phone}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                            {ord.email}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {ord.projectType || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs tabular-nums whitespace-nowrap">
                            {ord.budgetRange || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-neutral-500 tabular-nums whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                            {ord.status}
                          </td>
                          <td
                            className="py-3.5 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenOrderDetail(ord)}
                              className="text-xs font-bold underline text-neutral-950 mr-3"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingOrder(ord)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 4: EDIT WEBSITE CONTENT (CMS)
             ================================================================ */}
          {activeTab === 'cms' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                    Edit Website Content
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    Customize every public heading, description, form field label, dropdown option,
                    and SEO tag.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCmsPreviewMode((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border border-neutral-300 hover:border-neutral-950 bg-white cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{cmsPreviewMode ? 'Back to Editor' : 'Live Website Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCmsChanges}
                    className="px-4 py-2.5 text-xs font-semibold border border-neutral-300 bg-white hover:border-neutral-950 cursor-pointer"
                  >
                    Reset Changes
                  </button>
                </div>
              </div>

              {cmsPreviewMode ? (
                <div className="border-2 border-neutral-950 bg-white">
                  <div className="bg-neutral-950 text-white px-4 py-2 text-xs font-mono flex items-center justify-between">
                    <span>LIVE PREVIEW (UNSAVED EDITS INCLUDED)</span>
                    <button
                      type="button"
                      onClick={() => setCmsPreviewMode(false)}
                      className="underline"
                    >
                      Exit Preview
                    </button>
                  </div>
                  <VisitorSite
                    previewOverride={{
                      settings: {
                        ...publicSettings,
                        form_project_types: JSON.stringify(
                          projectTypesText
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        ),
                        form_budget_ranges: JSON.stringify(
                          budgetRangesText
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean)
                        ),
                      },
                      projects: projects.filter((p) => p.isPublished),
                      links: linksList.filter((l) => l.isEnabled),
                    }}
                  />
                </div>
              ) : (
                <form onSubmit={handleSavePublicSettings} className="space-y-8">
                  {/* Hero Section Settings */}
                  <div className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-5">
                    <h2 className="text-base font-extrabold uppercase tracking-wider border-b border-neutral-200 pb-3">
                      1. Hero Section
                    </h2>
                    <div className="grid grid-cols-1 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Hero Main Heading
                        </label>
                        <input
                          type="text"
                          value={publicSettings.hero_heading || ''}
                          onChange={(e) =>
                            setPublicSettings({ ...publicSettings, hero_heading: e.target.value })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Hero Supporting Description
                        </label>
                        <textarea
                          rows={2}
                          value={publicSettings.hero_description || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              hero_description: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300 focus:border-neutral-950 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                            Primary CTA Label
                          </label>
                          <input
                            type="text"
                            value={publicSettings.hero_primary_cta_label || ''}
                            onChange={(e) =>
                              setPublicSettings({
                                ...publicSettings,
                                hero_primary_cta_label: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                            Primary CTA Destination
                          </label>
                          <input
                            type="text"
                            value={publicSettings.hero_primary_cta_url || ''}
                            onChange={(e) =>
                              setPublicSettings({
                                ...publicSettings,
                                hero_primary_cta_url: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                            Secondary CTA Label
                          </label>
                          <input
                            type="text"
                            value={publicSettings.hero_secondary_cta_label || ''}
                            onChange={(e) =>
                              setPublicSettings({
                                ...publicSettings,
                                hero_secondary_cta_label: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                            Secondary CTA Destination
                          </label>
                          <input
                            type="text"
                            value={publicSettings.hero_secondary_cta_url || ''}
                            onChange={(e) =>
                              setPublicSettings({
                                ...publicSettings,
                                hero_secondary_cta_url: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Work & Order Section Headings */}
                  <div className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-5">
                    <h2 className="text-base font-extrabold uppercase tracking-wider border-b border-neutral-200 pb-3">
                      2. Work &amp; Order Section Headings
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Work Section Title
                        </label>
                        <input
                          type="text"
                          value={publicSettings.work_title || ''}
                          onChange={(e) =>
                            setPublicSettings({ ...publicSettings, work_title: e.target.value })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Work Section Description
                        </label>
                        <input
                          type="text"
                          value={publicSettings.work_description || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              work_description: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Order Section Title
                        </label>
                        <input
                          type="text"
                          value={publicSettings.order_title || ''}
                          onChange={(e) =>
                            setPublicSettings({ ...publicSettings, order_title: e.target.value })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Order Section Description
                        </label>
                        <input
                          type="text"
                          value={publicSettings.order_description || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              order_description: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Form Labels, Options, and Success Message */}
                  <div className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-5">
                    <h2 className="text-base font-extrabold uppercase tracking-wider border-b border-neutral-200 pb-3">
                      3. Order Form Labels &amp; Dropdown Options
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                          Name Field Label
                        </label>
                        <input
                          type="text"
                          value={publicSettings.form_label_name || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              form_label_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                          Phone Field Label
                        </label>
                        <input
                          type="text"
                          value={publicSettings.form_label_phone || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              form_label_phone: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                          Email Field Label
                        </label>
                        <input
                          type="text"
                          value={publicSettings.form_label_email || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              form_label_email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                          Project Type Label
                        </label>
                        <input
                          type="text"
                          value={publicSettings.form_label_project_type || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              form_label_project_type: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                          Budget Field Label
                        </label>
                        <input
                          type="text"
                          value={publicSettings.form_label_budget || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              form_label_budget: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                          Submit Button Text
                        </label>
                        <input
                          type="text"
                          value={publicSettings.form_submit_label || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              form_submit_label: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Project Type Options (One per line)
                        </label>
                        <textarea
                          rows={6}
                          value={projectTypesText}
                          onChange={(e) => setProjectTypesText(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Budget Range Options (One per line)
                        </label>
                        <textarea
                          rows={6}
                          value={budgetRangesText}
                          onChange={(e) => setBudgetRangesText(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm font-mono border border-neutral-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                        Form Submission Success Message
                      </label>
                      <input
                        type="text"
                        value={publicSettings.form_success_message || ''}
                        onChange={(e) =>
                          setPublicSettings({
                            ...publicSettings,
                            form_success_message: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                      />
                    </div>
                  </div>

                  {/* Footer, Contact & SEO */}
                  <div className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-5">
                    <h2 className="text-base font-extrabold uppercase tracking-wider border-b border-neutral-200 pb-3">
                      4. Footer, Contact &amp; SEO Metadata
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Footer Agency Description
                        </label>
                        <textarea
                          rows={2}
                          value={publicSettings.footer_description || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              footer_description: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          Footer Copyright Text
                        </label>
                        <input
                          type="text"
                          value={publicSettings.footer_copyright || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              footer_copyright: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          SEO Page Title
                        </label>
                        <input
                          type="text"
                          value={publicSettings.seo_title || ''}
                          onChange={(e) =>
                            setPublicSettings({ ...publicSettings, seo_title: e.target.value })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-neutral-700 mb-1.5">
                          SEO Meta Description
                        </label>
                        <input
                          type="text"
                          value={publicSettings.seo_description || ''}
                          onChange={(e) =>
                            setPublicSettings({
                              ...publicSettings,
                              seo_description: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-sm border border-neutral-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-4">
                    <button
                      type="button"
                      onClick={handleCancelCmsChanges}
                      className="px-5 py-3 text-xs font-semibold border border-neutral-300 bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingCms}
                      className="px-8 py-3 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-60 cursor-pointer"
                    >
                      {savingCms ? 'Saving Changes...' : 'Save Website Content'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 5: MEDIA LIBRARY
             ================================================================ */}
          {activeTab === 'media' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                    Media Library
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    Persistent database-backed image storage. Upload, preview, replace, or copy URLs.
                  </p>
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 cursor-pointer">
                    {uploadingMedia ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploadingMedia ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={handleMediaUploadFile}
                      className="hidden"
                    />
                  </label>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    onChange={handleReplaceMediaFile}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Delete Media Confirmation Modal (with In-Use Warning) */}
              {deletingMediaItem && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
                  <div className="bg-white border border-neutral-950 max-w-md w-full p-6 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="text-base font-bold text-neutral-950">
                          Delete "{deletingMediaItem.fileName}"?
                        </h3>
                        {deletingMediaItem.usedByProjects &&
                        deletingMediaItem.usedByProjects.length > 0 ? (
                          <div className="mt-2 p-3 bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1">
                            <p className="font-bold">
                              Warning: This image is currently referenced by{' '}
                              {deletingMediaItem.usedByProjects.length} project(s):
                            </p>
                            <ul className="list-disc pl-4">
                              {deletingMediaItem.usedByProjects.map((p) => (
                                <li key={p.id}>
                                  {p.title} ({p.isPublished ? 'Published' : 'Draft'})
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-600 mt-1">
                            This image is not currently used by any project.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setDeletingMediaItem(null)}
                        className="px-4 py-2 text-xs font-semibold border border-neutral-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteMedia}
                        className="px-4 py-2 text-xs font-bold bg-red-600 text-white"
                      >
                        Delete Image
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {mediaList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-neutral-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[4/3] bg-neutral-950 border-b border-neutral-200 overflow-hidden">
                        <img
                          src={`${item.publicUrl}?t=${new Date(item.uploadedAt).getTime()}`}
                          alt={item.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-1.5">
                        <p className="text-sm font-bold text-neutral-950 truncate">
                          {item.fileName}
                        </p>
                        <p className="text-xs font-mono text-neutral-500 tabular-nums">
                          {item.mimeType} · {(item.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                        {item.usedByProjects && item.usedByProjects.length > 0 ? (
                          <p className="text-xs text-emerald-700 font-medium">
                            Used in {item.usedByProjects.length} project(s)
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-400">Unused</p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(item.publicUrl);
                          setCopiedMediaUrl(item.publicUrl);
                          setTimeout(() => setCopiedMediaUrl(''), 2000);
                        }}
                        className="flex-1 py-2 px-3 text-xs font-semibold border border-neutral-300 hover:border-neutral-950 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {copiedMediaUrl === item.publicUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setReplacingMediaId(item.id);
                          replaceInputRef.current?.click();
                        }}
                        className="py-2 px-3 text-xs font-semibold border border-neutral-300 hover:border-neutral-950 cursor-pointer"
                      >
                        Replace
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingMediaItem(item)}
                        className="p-2 text-red-600 border border-neutral-200 hover:border-red-600 cursor-pointer"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 6 & 7: NAVIGATION & LINKS / CONTACT & SOCIAL LINKS
             ================================================================ */}
          {(activeTab === 'navigation' || activeTab === 'social') && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                    {activeTab === 'navigation'
                      ? 'Navigation & Section Links'
                      : 'Contact & Social Media Links'}
                  </h1>
                  <p className="text-sm text-neutral-600 mt-1">
                    {activeTab === 'navigation'
                      ? 'Configure header links, hero CTA links, and footer navigation links.'
                      : 'Configure agency contact links and social profiles. Empty social URLs are automatically hidden.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingLink({
                      label: '',
                      destinationUrl: '',
                      placement: activeTab === 'navigation' ? 'header' : 'social',
                      displayOrder: linksList.length + 1,
                      isEnabled: true,
                      openInNewTab: activeTab === 'social',
                    })
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Link</span>
                </button>
              </div>

              {editingLink && (
                <div className="bg-white border-2 border-neutral-950 p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                    <h2 className="text-base font-extrabold">
                      {editingLink.id ? 'Edit Link' : 'Add New Link'}
                    </h2>
                    <button type="button" onClick={() => setEditingLink(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveLink} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">
                          Link Label *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingLink.label || ''}
                          onChange={(e) =>
                            setEditingLink({ ...editingLink, label: e.target.value })
                          }
                          placeholder="e.g., Work or LinkedIn"
                          className="w-full px-3.5 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">
                          Destination URL (#section, https://, mailto:, tel:)
                        </label>
                        <input
                          type="text"
                          value={editingLink.destinationUrl || ''}
                          onChange={(e) =>
                            setEditingLink({ ...editingLink, destinationUrl: e.target.value })
                          }
                          placeholder="#work or https://linkedin.com/..."
                          className="w-full px-3.5 py-2 text-sm border border-neutral-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1">Placement</label>
                        <select
                          value={editingLink.placement || 'header'}
                          onChange={(e) =>
                            setEditingLink({
                              ...editingLink,
                              placement: e.target.value as NavigationLink['placement'],
                            })
                          }
                          className="w-full px-3.5 py-2 text-sm border border-neutral-300 bg-white"
                        >
                          <option value="header">Header Navigation</option>
                          <option value="hero">Hero CTA Buttons</option>
                          <option value="footer">Footer Navigation</option>
                          <option value="contact">Footer Contact Links</option>
                          <option value="social">Social Media Links</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editingLink.isEnabled ?? true}
                          onChange={(e) =>
                            setEditingLink({ ...editingLink, isEnabled: e.target.checked })
                          }
                          className="w-4 h-4 accent-neutral-950"
                        />
                        <span>Enabled</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editingLink.openInNewTab ?? false}
                          onChange={(e) =>
                            setEditingLink({ ...editingLink, openInNewTab: e.target.checked })
                          }
                          className="w-4 h-4 accent-neutral-950"
                        />
                        <span>Open in new tab</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setEditingLink(null)}
                        className="px-4 py-2 text-xs font-semibold border border-neutral-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingLink}
                        className="px-6 py-2 text-xs font-bold bg-neutral-950 text-white"
                      >
                        {savingLink ? 'Saving...' : 'Save Link'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {deletingLink && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
                  <div className="bg-white border border-neutral-950 max-w-md w-full p-6 space-y-4">
                    <h3 className="text-base font-bold">Delete Link "{deletingLink.label}"?</h3>
                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setDeletingLink(null)}
                        className="px-4 py-2 text-xs font-semibold border border-neutral-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteLink}
                        className="px-4 py-2 text-xs font-bold bg-red-600 text-white"
                      >
                        Remove Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === 'navigation'
                ? (['header', 'hero', 'footer'] as const)
                : (['contact', 'social'] as const)
              ).map((placementKey) => {
                const group = linksList.filter((l) => l.placement === placementKey);
                return (
                  <div key={placementKey} className="bg-white border border-neutral-200">
                    <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                      <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-800">
                        {placementKey.toUpperCase()} LINKS ({group.length})
                      </h2>
                    </div>
                    {group.length === 0 ? (
                      <div className="p-6 text-xs text-neutral-500">
                        No links configured in this placement.
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-200">
                        {group.map((link, idx) => (
                          <div
                            key={link.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-neutral-950">
                                  {link.label}
                                </span>
                                <span className="text-xs font-mono text-neutral-500">
                                  · {link.isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                {link.openInNewTab && (
                                  <span className="text-xs font-mono text-neutral-500">
                                    · New Tab
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-neutral-500 mt-0.5">
                                {link.destinationUrl || '(No URL configured — hidden on public site)'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveLinkOrder(group, idx, 'up')}
                                disabled={idx === 0}
                                className="p-1.5 border border-neutral-200 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveLinkOrder(group, idx, 'down')}
                                disabled={idx === group.length - 1}
                                className="p-1.5 border border-neutral-200 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleLinkEnabled(link)}
                                className="px-3 py-1.5 text-xs font-semibold border border-neutral-200 hover:border-neutral-950"
                              >
                                {link.isEnabled ? 'Disable' : 'Enable'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingLink(link)}
                                className="px-3 py-1.5 text-xs font-semibold border border-neutral-200 hover:border-neutral-950"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingLink(link)}
                                className="p-1.5 text-red-600 border border-neutral-200 hover:border-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ================================================================
              TAB 8: ACCOUNT & SECURITY + NOTIFICATIONS CONFIG
             ================================================================ */}
          {activeTab === 'security' && (
            <div className="space-y-10">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
                  Account, Notifications &amp; Security
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Manage your administrator password, external notification channels, active
                  sessions, and security audit logs.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Change Password Card */}
                <div className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
                    <KeyRound className="w-4 h-4" />
                    <h2 className="text-base font-extrabold uppercase tracking-wider">
                      Change Administrator Password
                    </h2>
                  </div>

                  {passwordChangeMsg && (
                    <div
                      className={`p-3 text-xs font-medium border ${
                        passwordChangeMsg.type === 'error'
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {passwordChangeMsg.text}
                    </div>
                  )}

                  <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPasswordInput}
                        onChange={(e) => setCurrentPasswordInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-neutral-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                        New Password (min 6 characters)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-neutral-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-neutral-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-neutral-700 mb-1">
                        Recovery Google Email
                      </label>
                      <input
                        type="email"
                        value={recoveryEmailInput}
                        onChange={(e) => setRecoveryEmailInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-neutral-300"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="px-6 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      {changingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                </div>

                {/* External Notification Integrations (Email & Telegram) */}
                <div className="bg-white border border-neutral-200 p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
                    <Bell className="w-4 h-4" />
                    <h2 className="text-base font-extrabold uppercase tracking-wider">
                      Order Notification Channels
                    </h2>
                  </div>

                  <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-700">
                    <strong>In-Dashboard Notifications:</strong> Active (Real-Time SSE Badge + Alert
                    Banner). Configure optional Email (SMTP) or Telegram Bot delivery below.
                  </div>

                  <form onSubmit={handleSaveNotificationsConfig} className="space-y-5">
                    {/* Email SMTP Section */}
                    <div className="space-y-3 border-b border-neutral-200 pb-4">
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={notificationConfig.notify_email_enabled}
                            onChange={(e) =>
                              setNotificationConfig({
                                ...notificationConfig,
                                notify_email_enabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-neutral-950"
                          />
                          <span>Enable Email Notifications (SMTP)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleTestNotificationChannel('email')}
                          disabled={testingChannel === 'email'}
                          className="px-3 py-1 text-xs font-semibold border border-neutral-300 hover:border-neutral-950"
                        >
                          {testingChannel === 'email' ? 'Sending...' : 'Test Email'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="email"
                          value={notificationConfig.notify_recipient_email}
                          onChange={(e) =>
                            setNotificationConfig({
                              ...notificationConfig,
                              notify_recipient_email: e.target.value,
                            })
                          }
                          placeholder="Recipient Email"
                          className="px-3 py-2 text-xs border border-neutral-300"
                        />
                        <input
                          type="text"
                          value={notificationConfig.smtp_host}
                          onChange={(e) =>
                            setNotificationConfig({
                              ...notificationConfig,
                              smtp_host: e.target.value,
                            })
                          }
                          placeholder="SMTP Host (e.g. smtp.gmail.com)"
                          className="px-3 py-2 text-xs border border-neutral-300"
                        />
                        <input
                          type="text"
                          value={notificationConfig.smtp_port}
                          onChange={(e) =>
                            setNotificationConfig({
                              ...notificationConfig,
                              smtp_port: e.target.value,
                            })
                          }
                          placeholder="SMTP Port (587)"
                          className="px-3 py-2 text-xs border border-neutral-300"
                        />
                        <input
                          type="text"
                          value={notificationConfig.smtp_user}
                          onChange={(e) =>
                            setNotificationConfig({
                              ...notificationConfig,
                              smtp_user: e.target.value,
                            })
                          }
                          placeholder="SMTP Username"
                          className="px-3 py-2 text-xs border border-neutral-300"
                        />
                        <input
                          type="password"
                          value={smtpPasswordInput}
                          onChange={(e) => setSmtpPasswordInput(e.target.value)}
                          placeholder={
                            notificationConfig.smtp_pass_configured
                              ? 'SMTP Password (Configured — enter to replace)'
                              : 'SMTP Password / App Password'
                          }
                          className="px-3 py-2 text-xs border border-neutral-300 sm:col-span-2"
                        />
                      </div>
                    </div>

                    {/* Telegram Bot Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={notificationConfig.notify_telegram_enabled}
                            onChange={(e) =>
                              setNotificationConfig({
                                ...notificationConfig,
                                notify_telegram_enabled: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-neutral-950"
                          />
                          <span>Enable Telegram Bot Notifications</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleTestNotificationChannel('telegram')}
                          disabled={testingChannel === 'telegram'}
                          className="px-3 py-1 text-xs font-semibold border border-neutral-300 hover:border-neutral-950"
                        >
                          {testingChannel === 'telegram' ? 'Sending...' : 'Test Telegram'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="password"
                          value={telegramTokenInput}
                          onChange={(e) => setTelegramTokenInput(e.target.value)}
                          placeholder={
                            notificationConfig.telegram_bot_token_configured
                              ? 'Bot Token (Stored on server — enter to replace)'
                              : 'Telegram Bot Token'
                          }
                          className="px-3 py-2 text-xs border border-neutral-300"
                        />
                        <input
                          type="text"
                          value={notificationConfig.telegram_chat_id}
                          onChange={(e) =>
                            setNotificationConfig({
                              ...notificationConfig,
                              telegram_chat_id: e.target.value,
                            })
                          }
                          placeholder="Destination Chat ID"
                          className="px-3 py-2 text-xs border border-neutral-300"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingNotifications}
                      className="px-6 py-2.5 text-xs font-bold bg-neutral-950 text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      {savingNotifications ? 'Saving...' : 'Save Notification Settings'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Active Sessions & Security Audit Logs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-neutral-200 p-6 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider border-b border-neutral-200 pb-3">
                    Active Administrator Sessions ({activeSessions.length})
                  </h2>
                  <div className="divide-y divide-neutral-100 text-xs">
                    {activeSessions.map((sess) => (
                      <div key={sess.id} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-neutral-900">
                            Session #{sess.id}{' '}
                            {currentSession?.id === sess.id ? '(Current Session)' : ''}
                          </p>
                          <p className="text-neutral-500 font-mono">
                            Method: {sess.authMethod} · IP: {sess.ipAddress || 'local'}
                          </p>
                        </div>
                        <span className="font-mono text-neutral-500 tabular-nums">
                          Expires {new Date(sess.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 p-6 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider border-b border-neutral-200 pb-3">
                    Recent Security Audit Logs
                  </h2>
                  <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 text-xs">
                    {securityLogs.length === 0 ? (
                      <p className="text-neutral-500 py-4">No security events logged yet.</p>
                    ) : (
                      securityLogs.map((log) => (
                        <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                          <div>
                            <span className="font-mono font-bold text-neutral-950">
                              {log.eventType}
                            </span>
                            <p className="text-neutral-600">{log.description}</p>
                          </div>
                          <span className="font-mono text-[11px] text-neutral-400 tabular-nums shrink-0">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
