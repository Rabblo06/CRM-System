'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Users, Building2, TrendingUp,
  CheckSquare, StickyNote, Zap, Settings, HelpCircle,
  Search, LayoutGrid, Plus, LogOut, ChevronDown,
  Activity, Calendar, Mail, Upload, Phone, MessageSquare,
  Ticket, Package, Filter, Inbox, X, GripVertical, Pin, PinOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';

/* ── Nav item type ──────────────────────────────────── */
type NavItem = {
  id: string;
  name: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

/* ── Workspace nav items (main section) ─────────────── */
const WORKSPACE_ITEMS: NavItem[] = [
  { id: 'dashboard',  name: 'Dashboards',  href: '/dashboard',  icon: LayoutDashboard, iconBg: '#E8E8E8', iconColor: '#555555' },
  { id: 'contacts',   name: 'People',      href: '/contacts',   icon: Users,           iconBg: '#E8E0FB', iconColor: '#7C3AED' },
  { id: 'companies',  name: 'Companies',   href: '/companies',  icon: Building2,       iconBg: '#DBEAFE', iconColor: '#2563EB' },
  { id: 'deals',      name: 'Opportunities', href: '/deals',    icon: TrendingUp,      iconBg: '#FEE2E2', iconColor: '#DC2626' },
  { id: 'tasks',      name: 'Tasks',       href: '/tasks',      icon: CheckSquare,     iconBg: '#D1FAE5', iconColor: '#059669' },
  { id: 'activities', name: 'Notes',       href: '/activities', icon: StickyNote,      iconBg: '#CFFAFE', iconColor: '#0891B2' },
  { id: 'inbox',      name: 'Workflows',   href: '/inbox',      icon: Zap,             iconBg: '#FEF3C7', iconColor: '#D97706' },
];

/* ── Other nav items ────────────────────────────────── */
const OTHER_ITEMS: NavItem[] = [
  { id: 'settings', name: 'Settings',      href: '/settings', icon: Settings,    iconBg: 'transparent', iconColor: '#666666' },
  { id: 'import',   name: 'Documentation', href: '/import',   icon: HelpCircle,  iconBg: 'transparent', iconColor: '#666666' },
];

/* ── All items (for mega menu) ──────────────────────── */
const ALL_MORE_ITEMS: NavItem[] = [
  { id: 'tickets',          name: 'Tickets',           href: '/tickets',          icon: Ticket,         iconBg: '#FEE2E2', iconColor: '#DC2626' },
  { id: 'orders',           name: 'Orders',            href: '/orders',           icon: Package,        iconBg: '#FEF3C7', iconColor: '#D97706' },
  { id: 'segments',         name: 'Segments',          href: '/segments',         icon: Filter,         iconBg: '#E8E0FB', iconColor: '#7C3AED' },
  { id: 'calls',            name: 'Calls',             href: '/calls',            icon: Phone,          iconBg: '#D1FAE5', iconColor: '#059669' },
  { id: 'meetings',         name: 'Meetings',          href: '/meetings',         icon: Calendar,       iconBg: '#DBEAFE', iconColor: '#2563EB' },
  { id: 'emails',           name: 'Email Templates',   href: '/emails',           icon: Mail,           iconBg: '#CFFAFE', iconColor: '#0891B2' },
  { id: 'message-templates',name: 'Msg Templates',     href: '/message-templates',icon: MessageSquare,  iconBg: '#E8E8E8', iconColor: '#555555' },
];

function NavLink({ item, isActive, badge = 0, small = false }: {
  item: NavItem; isActive: boolean; badge?: number; small?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2 rounded-sm transition-colors duration-100 group w-full"
      style={{
        padding: small ? '4px 8px' : '5px 8px',
        backgroundColor: isActive ? '#F1F1F1' : 'transparent',
        color: isActive ? '#333333' : '#444444',
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#F5F5F5';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
      }}
    >
      {/* Icon square */}
      <div
        className="flex items-center justify-center rounded-sm flex-shrink-0"
        style={{
          width: 16,
          height: 16,
          backgroundColor: item.iconBg === 'transparent' ? 'transparent' : item.iconBg,
        }}
      >
        <item.icon size={10} style={{ color: item.iconColor, strokeWidth: 2.5 }} />
      </div>
      <span className="flex-1 text-xs font-medium truncate">{item.name}</span>
      {badge > 0 && (
        <span
          className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
          style={{ backgroundColor: '#4762D5', fontSize: 9, minWidth: 15, height: 15, padding: '0 3px' }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

/* ── More drawer ────────────────────────────────────── */
function MoreDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-md shadow-xl py-2"
      style={{
        left: 176,
        bottom: 80,
        width: 220,
        border: '1px solid #EBEBEB',
        boxShadow: '0px 4px 20px rgba(0,0,0,0.12)',
      }}
    >
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#B3B3B3] mb-1">More</p>
      {ALL_MORE_ITEMS.map((item) => (
        <NavLink
          key={item.id}
          item={item}
          isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          small
        />
      ))}
    </div>
  );
}

/* ════════════════════════════
   SIDEBAR
════════════════════════════ */
export function Sidebar() {
  const pathname = usePathname();
  const [userEmail,    setUserEmail]    = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [userName,     setUserName]     = useState('');
  const [showMore,     setShowMore]     = useState(false);
  const [showLogout,   setShowLogout]   = useState(false);

  const { badges, markInboxRead, markTasksRead } = useNotificationBadges();

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        const email = user.email || '';
        const meta  = user.user_metadata || {};
        const name  = meta.full_name || meta.name || email.split('@')[0] || 'User';
        const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        setUserEmail(email);
        setUserName(name);
        setUserInitials(initials || email.slice(0, 2).toUpperCase());
      })
      .catch(() => {});
  }, []);

  const doSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const badgeFor = (id: string) => {
    if (id === 'inbox') return badges.inbox;
    if (id === 'tasks') return badges.tasks;
    return 0;
  };

  const workspaceLetter = userName ? userName[0].toUpperCase() : 'A';

  return (
    <>
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-30 bg-white select-none"
        style={{ width: 176, borderRight: '1px solid #EBEBEB' }}
      >
        {/* ── Workspace header row ── */}
        <div
          className="flex items-center px-2 py-2 gap-1 flex-shrink-0"
          style={{ borderBottom: '1px solid #EBEBEB', height: 40 }}
        >
          {/* Workspace avatar + name */}
          <button className="flex items-center gap-1.5 flex-1 min-w-0 rounded-sm px-1 py-0.5 hover:bg-[#F1F1F1] transition-colors">
            <div
              className="w-5 h-5 rounded-sm flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ backgroundColor: '#4762D5', fontSize: 10 }}
            >
              {workspaceLetter}
            </div>
            <span className="text-xs font-semibold text-[#333333] truncate flex-1">{userName || 'Workspace'}</span>
            <ChevronDown size={11} style={{ color: '#B3B3B3', flexShrink: 0 }} />
          </button>

          {/* Search + grid icons */}
          <button className="p-1 rounded-sm hover:bg-[#F1F1F1] transition-colors flex-shrink-0">
            <Search size={13} style={{ color: '#999999' }} />
          </button>
          <button className="p-1 rounded-sm hover:bg-[#F1F1F1] transition-colors flex-shrink-0">
            <LayoutGrid size={13} style={{ color: '#999999' }} />
          </button>
        </div>

        {/* ── New chat button ── */}
        <div className="px-2 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid #EBEBEB' }}>
          <button className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-xs font-medium text-[#555555] hover:bg-[#F1F1F1] transition-colors">
            <Plus size={13} style={{ color: '#999999' }} />
            New chat
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">

          {/* WORKSPACE section */}
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#B3B3B3]">
            Workspace
          </p>
          <div className="space-y-0.5 mb-3">
            {WORKSPACE_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                badge={badgeFor(item.id)}
              />
            ))}

            {/* More button */}
            <button
              onClick={() => setShowMore(v => !v)}
              className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 transition-colors"
              style={{
                backgroundColor: showMore ? '#F1F1F1' : 'transparent',
                color: '#666666',
              }}
              onMouseEnter={(e) => { if (!showMore) (e.currentTarget as HTMLElement).style.backgroundColor = '#F5F5F5'; }}
              onMouseLeave={(e) => { if (!showMore) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <span className="text-[#999999]" style={{ fontSize: 14, lineHeight: 1 }}>···</span>
              </div>
              <span className="text-xs font-medium">More</span>
            </button>
          </div>

          {/* OTHER section */}
          <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#B3B3B3]">
            Other
          </p>
          <div className="space-y-0.5">
            {OTHER_ITEMS.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </div>
        </nav>

        {/* ── User / footer ── */}
        <div
          className="flex items-center gap-2 px-2 py-2 flex-shrink-0"
          style={{ borderTop: '1px solid #EBEBEB' }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{ backgroundColor: '#4762D5', fontSize: 10 }}
          >
            {userInitials || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#333333] truncate leading-tight">{userName || '…'}</p>
          </div>
          <button
            onClick={() => setShowLogout(true)}
            className="flex-shrink-0 p-1 rounded-sm hover:bg-[#F1F1F1] transition-colors"
            title="Sign out"
          >
            <LogOut size={12} style={{ color: '#B3B3B3' }} />
          </button>
        </div>
      </aside>

      {/* More drawer */}
      {showMore && <MoreDrawer onClose={() => setShowMore(false)} />}

      {/* Logout confirmation */}
      {showLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-md shadow-xl w-[320px]" style={{ border: '1px solid #EBEBEB' }}>
            <div className="px-5 py-4 border-b border-[#EBEBEB]">
              <h2 className="text-sm font-semibold text-[#333333]">Sign out</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-[#666666]">Are you sure you want to sign out?</p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#EBEBEB]">
              <button onClick={() => setShowLogout(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#666666] border border-[#EBEBEB] rounded-sm hover:bg-[#F1F1F1]">
                Cancel
              </button>
              <button onClick={doSignOut}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-sm"
                style={{ backgroundColor: '#D45353' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#C04040')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#D45353')}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
