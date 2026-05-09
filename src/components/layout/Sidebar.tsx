'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  LayoutDashboard, Users, Building2, TrendingUp, Activity,
  CheckSquare, Mail, Upload, Settings, Calendar, LogOut,
  MoreHorizontal, Pin, PinOff, GripVertical, X, ChevronRight,
  Ticket, Package, Filter, Inbox, Phone, MessageSquare, Search,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNotificationBadges } from '@/hooks/useNotificationBadges';

/* ── Types ──────────────────────────────────────────────── */
type NavItem = { id: string; name: string; href: string; icon: React.ElementType };

const ALL_ITEMS: NavItem[] = [
  { id: 'dashboard',         name: 'Dashboard',         href: '/dashboard',         icon: LayoutDashboard },
  { id: 'contacts',          name: 'Contacts',          href: '/contacts',          icon: Users },
  { id: 'companies',         name: 'Companies',         href: '/companies',         icon: Building2 },
  { id: 'deals',             name: 'Pipeline',          href: '/deals',             icon: TrendingUp },
  { id: 'tickets',           name: 'Tickets',           href: '/tickets',           icon: Ticket },
  { id: 'orders',            name: 'Orders',            href: '/orders',            icon: Package },
  { id: 'segments',          name: 'Segments',          href: '/segments',          icon: Filter },
  { id: 'inbox',             name: 'Inbox',             href: '/inbox',             icon: Inbox },
  { id: 'calls',             name: 'Calls',             href: '/calls',             icon: Phone },
  { id: 'tasks',             name: 'Tasks',             href: '/tasks',             icon: CheckSquare },
  { id: 'activities',        name: 'Activities',        href: '/activities',        icon: Activity },
  { id: 'meetings',          name: 'Meetings',          href: '/meetings',          icon: Calendar },
  { id: 'emails',            name: 'Email Templates',   href: '/emails',            icon: Mail },
  { id: 'message-templates', name: 'Msg Templates',     href: '/message-templates', icon: MessageSquare },
  { id: 'import',            name: 'Import / Export',   href: '/import',            icon: Upload },
  { id: 'settings',          name: 'Settings',          href: '/settings',          icon: Settings },
];

const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: 'CRM',       ids: ['contacts', 'companies', 'deals', 'tickets', 'orders', 'segments', 'inbox', 'calls', 'tasks'] },
  { label: 'Marketing', ids: ['emails', 'message-templates', 'import'] },
  { label: 'Meetings',  ids: ['meetings', 'activities'] },
  { label: 'Reports',   ids: ['dashboard'] },
  { label: 'Settings',  ids: ['settings'] },
];

const DEFAULT_PINS = ['dashboard', 'contacts', 'companies', 'deals', 'tasks'];

function itemById(id: string) { return ALL_ITEMS.find((i) => i.id === id)!; }

/* ── Nav link ───────────────────────────────────────────── */
function NavLink({
  item, isActive, badge = 0, onClick,
}: { item: NavItem; isActive: boolean; badge?: number; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="group flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors duration-100"
      style={
        isActive
          ? { backgroundColor: '#EBEBEB', color: '#333333' }
          : { color: '#666666' }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F1F1';
          (e.currentTarget as HTMLElement).style.color = '#333333';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.backgroundColor = '';
          (e.currentTarget as HTMLElement).style.color = '#666666';
        }
      }}
    >
      <item.icon
        size={14}
        style={{ color: isActive ? '#4762D5' : '#999999', flexShrink: 0, strokeWidth: 2 }}
      />
      <span className="flex-1 truncate">{item.name}</span>
      {badge > 0 && (
        <span
          className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
          style={{
            backgroundColor: '#4762D5',
            fontSize: 9,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

/* ── Manage Sidebar Modal ───────────────────────────────── */
function ManageSidebarModal({
  pins, onClose, onSave,
}: { pins: string[]; onClose: () => void; onSave: (pins: string[]) => void }) {
  const [local, setLocal] = useState([...pins]);
  const dragIdx = useRef<number | null>(null);

  const onDragStart = (i: number) => { dragIdx.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = [...local];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setLocal(next);
  };
  const onDragEnd = () => { dragIdx.current = null; };
  const togglePin = (id: string) => {
    setLocal((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-md shadow-xl w-[460px] max-h-[90vh] flex flex-col" style={{ border: '1px solid #EBEBEB' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EBEBEB]">
          <h2 className="text-sm font-semibold text-[#333333]">Manage sidebar</h2>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-[#F1F1F1] transition-colors">
            <X size={14} style={{ color: '#999999' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-[#999999] mb-2 px-2">Pinned</p>
          <div className="space-y-0.5 mb-5">
            {local.map((id, i) => {
              const item = itemById(id);
              if (!item) return null;
              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDragEnd={onDragEnd}
                  className="flex items-center gap-2 px-3 py-2 rounded-sm border border-[#EBEBEB] bg-white hover:bg-[#F1F1F1] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={12} style={{ color: '#D6D6D6', flexShrink: 0 }} />
                  <item.icon size={13} style={{ color: '#666666', flexShrink: 0 }} />
                  <span className="flex-1 text-xs font-medium text-[#333333]">{item.name}</span>
                  <button onClick={() => togglePin(id)} className="p-1 rounded-sm hover:bg-[#EBEBEB] transition-colors" title="Unpin">
                    <Pin size={12} style={{ color: '#4762D5' }} />
                  </button>
                </div>
              );
            })}
          </div>

          <p className="text-xs font-medium uppercase tracking-wider text-[#999999] mb-2 px-2">All items</p>
          <div className="space-y-0.5">
            {ALL_ITEMS.filter((item) => !local.includes(item.id)).map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-sm hover:bg-[#F1F1F1] transition-colors">
                <item.icon size={13} style={{ color: '#B3B3B3', flexShrink: 0 }} />
                <span className="flex-1 text-xs text-[#666666]">{item.name}</span>
                <button onClick={() => togglePin(item.id)} className="p-1 rounded-sm hover:bg-[#EBEBEB] transition-colors" title="Pin">
                  <PinOff size={12} style={{ color: '#B3B3B3' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EBEBEB]">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-[#666666] border border-[#EBEBEB] rounded-sm hover:bg-[#F1F1F1] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-sm transition-colors"
            style={{ backgroundColor: '#4762D5' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3A52C0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4762D5')}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Mega Menu ──────────────────────────────────────────── */
function MegaMenu({ pinnedIds, onTogglePin, onClose }: {
  pinnedIds: string[]; onTogglePin: (id: string) => void; onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState('CRM');
  const categoryItems = CATEGORIES.find((c) => c.label === activeCategory)?.ids.map(itemById) ?? [];

  return (
    <div className="fixed top-0 left-[220px] h-full z-40 flex shadow-xl" style={{ width: 400 }}>
      {/* Category list */}
      <div className="w-36 h-full flex flex-col py-3 border-r border-[#EBEBEB] bg-[#FAFAFA]">
        <div className="px-3 pb-2 mb-1 border-b border-[#EBEBEB]">
          <span className="text-xs font-medium uppercase tracking-wider text-[#999999]">All features</span>
        </div>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => setActiveCategory(cat.label)}
            className="flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors"
            style={{
              color: activeCategory === cat.label ? '#333333' : '#666666',
              backgroundColor: activeCategory === cat.label ? '#EBEBEB' : 'transparent',
            }}
            onMouseEnter={(e) => { if (activeCategory !== cat.label) (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F1F1'; }}
            onMouseLeave={(e) => { if (activeCategory !== cat.label) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            {cat.label}
            <ChevronRight size={11} style={{ color: '#B3B3B3' }} />
          </button>
        ))}
      </div>

      {/* Sub-items */}
      <div className="flex-1 h-full bg-white py-3 overflow-y-auto border-r border-[#EBEBEB]">
        <div className="px-3 pb-2 mb-1 border-b border-[#EBEBEB]">
          <span className="text-xs font-medium uppercase tracking-wider text-[#999999]">{activeCategory}</span>
        </div>
        {categoryItems.map((item) => {
          if (!item) return null;
          const isPinned = pinnedIds.includes(item.id);
          return (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#F1F1F1] transition-colors group">
              <Link href={item.href} onClick={onClose} className="flex items-center gap-2 flex-1 min-w-0">
                <item.icon size={13} style={{ color: '#666666', flexShrink: 0 }} />
                <span className="text-xs font-medium text-[#333333] truncate">{item.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => onTogglePin(item.id)}
                title={isPinned ? 'Unpin' : 'Pin to sidebar'}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-sm transition-all"
                style={{ color: isPinned ? '#4762D5' : '#B3B3B3' }}
              >
                {isPinned ? <Pin size={11} /> : <PinOff size={11} />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

/* ════════════════════════════
   SIDEBAR
════════════════════════════ */
export function Sidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [userName, setUserName] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINS);
  const [megaOpen, setMegaOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) return;
        const email = user.email || '';
        const meta = user.user_metadata || {};
        const name = meta.full_name || meta.name || email.split('@')[0] || 'User';
        const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
        setUserEmail(email);
        setUserName(name);
        setUserInitials(initials || email.slice(0, 2).toUpperCase());
        if (meta.sidebar_pins && Array.isArray(meta.sidebar_pins)) {
          setPinnedIds(meta.sidebar_pins);
        }
      })
      .catch(() => {});
  }, []);

  const savePins = useCallback(async (pins: string[]) => {
    setPinnedIds(pins);
    await supabase.auth.updateUser({ data: { sidebar_pins: pins } });
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      supabase.auth.updateUser({ data: { sidebar_pins: next } });
      return next;
    });
  }, []);

  const doSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const { badges, markInboxRead, markTasksRead, markMeetingsRead } = useNotificationBadges();

  const badgeFor = (id: string) => {
    if (id === 'inbox') return badges.inbox;
    if (id === 'tasks') return badges.tasks;
    if (id === 'meetings') return badges.meetings;
    return 0;
  };

  const markReadFor = (id: string) => {
    if (id === 'inbox') markInboxRead();
    else if (id === 'tasks') markTasksRead();
    else if (id === 'meetings') markMeetingsRead();
  };

  const pinnedItems = pinnedIds.map(itemById).filter(Boolean) as NavItem[];

  return (
    <>
      <aside
        className="fixed left-0 top-0 h-full flex flex-col z-30 bg-white"
        style={{ width: 220, borderRight: '1px solid #EBEBEB' }}
      >
        {/* Workspace header */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 cursor-pointer group"
          style={{ borderBottom: '1px solid #EBEBEB' }}
        >
          {/* Workspace logo */}
          <div
            className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0 text-white text-xs font-bold select-none"
            style={{ backgroundColor: '#4762D5', fontSize: 10 }}
          >
            C
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#333333] truncate leading-tight">CRM Pro</p>
            <p className="text-[10px] text-[#999999] truncate leading-tight">Workspace</p>
          </div>
          <ChevronDown size={12} style={{ color: '#B3B3B3', flexShrink: 0 }} />
        </div>

        {/* Search */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid #EBEBEB' }}>
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-[#999999] transition-colors hover:bg-[#F1F1F1]"
            style={{ border: '1px solid #EBEBEB' }}
          >
            <Search size={12} style={{ color: '#B3B3B3' }} />
            <span>Search...</span>
            <span className="ml-auto text-[10px] text-[#B3B3B3] font-mono">⌘K</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {/* Pinned items */}
          <div className="space-y-0.5">
            {pinnedItems.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                badge={badgeFor(item.id)}
                onClick={() => { setMegaOpen(false); markReadFor(item.id); }}
              />
            ))}
          </div>

          {/* More */}
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setMegaOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors"
              style={{
                color: megaOpen ? '#333333' : '#666666',
                backgroundColor: megaOpen ? '#EBEBEB' : 'transparent',
              }}
              onMouseEnter={(e) => { if (!megaOpen) { (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F1F1'; (e.currentTarget as HTMLElement).style.color = '#333333'; } }}
              onMouseLeave={(e) => { if (!megaOpen) { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = '#666666'; } }}
            >
              <MoreHorizontal size={14} style={{ color: megaOpen ? '#666666' : '#999999', flexShrink: 0 }} />
              <span>More</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #EBEBEB' }}>
          {/* Manage sidebar */}
          <div className="px-2 pt-1.5">
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 w-full rounded-sm transition-colors text-xs text-[#999999] hover:bg-[#F1F1F1] hover:text-[#666666]"
            >
              <Settings size={13} style={{ color: '#B3B3B3' }} />
              <span className="font-medium">Manage sidebar</span>
            </button>
          </div>

          {/* User row */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 select-none"
              style={{ backgroundColor: '#4762D5', fontSize: 10 }}
            >
              {userInitials || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#333333] truncate leading-tight">{userName || '…'}</p>
              <p className="text-[10px] text-[#999999] truncate leading-tight">{userEmail}</p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign out"
              className="flex-shrink-0 p-1 rounded-sm hover:bg-[#F1F1F1] transition-colors"
            >
              <LogOut size={12} style={{ color: '#B3B3B3' }} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mega menu */}
      {megaOpen && (
        <MegaMenu
          pinnedIds={pinnedIds}
          onTogglePin={togglePin}
          onClose={() => setMegaOpen(false)}
        />
      )}

      {/* Manage sidebar modal */}
      {manageOpen && (
        <ManageSidebarModal
          pins={pinnedIds}
          onClose={() => setManageOpen(false)}
          onSave={savePins}
        />
      )}

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-md shadow-xl w-[360px]" style={{ border: '1px solid #EBEBEB' }}>
            <div className="px-5 py-4 border-b border-[#EBEBEB]">
              <h2 className="text-sm font-semibold text-[#333333]">Sign out</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-[#666666]">
                Are you sure you want to sign out of your CRM session?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#EBEBEB]">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#666666] border border-[#EBEBEB] rounded-sm hover:bg-[#F1F1F1] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={doSignOut}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-sm transition-colors"
                style={{ backgroundColor: '#D45353' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C04040')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D45353')}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
