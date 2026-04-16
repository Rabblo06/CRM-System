'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  LayoutDashboard, Users, Building2, TrendingUp, Activity,
  CheckSquare, Mail, Upload, Settings, Calendar, Zap, LogOut,
  MoreHorizontal, Pin, PinOff, GripVertical, X, ChevronRight, Home,
  Ticket, Package, Filter, Inbox, Phone, MessageSquare,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── All CRM items by category ─────────────────────────── */
type NavItem = { id: string; name: string; href: string; icon: React.ElementType };

const ALL_ITEMS: NavItem[] = [
  { id: 'dashboard',          name: 'Dashboard',          href: '/dashboard',          icon: LayoutDashboard },
  { id: 'contacts',           name: 'Contacts',           href: '/contacts',           icon: Users },
  { id: 'companies',          name: 'Companies',          href: '/companies',          icon: Building2 },
  { id: 'deals',              name: 'Pipeline',           href: '/deals',              icon: TrendingUp },
  { id: 'tickets',            name: 'Tickets',            href: '/tickets',            icon: Ticket },
  { id: 'orders',             name: 'Orders',             href: '/orders',             icon: Package },
  { id: 'segments',           name: 'Segments (Lists)',   href: '/segments',           icon: Filter },
  { id: 'inbox',              name: 'Inbox',              href: '/inbox',              icon: Inbox },
  { id: 'calls',              name: 'Calls',              href: '/calls',              icon: Phone },
  { id: 'tasks',              name: 'Tasks',              href: '/tasks',              icon: CheckSquare },
  { id: 'activities',         name: 'Activities',         href: '/activities',         icon: Activity },
  { id: 'meetings',           name: 'Meetings',           href: '/meetings',           icon: Calendar },
  { id: 'emails',             name: 'Email Templates',    href: '/emails',             icon: Mail },
  { id: 'message-templates',  name: 'Message Templates',  href: '/message-templates',  icon: MessageSquare },
  { id: 'import',             name: 'Import / Export',    href: '/import',             icon: Upload },
  { id: 'settings',           name: 'Settings',           href: '/settings',           icon: Settings },
];

const CATEGORIES: { label: string; ids: string[] }[] = [
  { label: 'CRM',         ids: ['contacts', 'companies', 'deals', 'tickets', 'orders', 'segments', 'inbox', 'calls', 'tasks'] },
  { label: 'Marketing',   ids: ['emails', 'message-templates', 'import'] },
  { label: 'Meetings',    ids: ['meetings', 'activities'] },
  { label: 'Reports',     ids: ['dashboard'] },
  { label: 'Settings',    ids: ['settings'] },
];

const DEFAULT_PINS = ['dashboard', 'contacts', 'companies', 'deals', 'tasks'];

function itemById(id: string) { return ALL_ITEMS.find((i) => i.id === id)!; }

/* ── Sidebar nav link ───────────────────────────────────── */
function NavLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="group flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-150"
      style={isActive ? { backgroundColor: '#FF7A59', color: '#fff' } : { color: '#99ACC2' }}
      onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
      onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = '#99ACC2'; } }}
    >
      <item.icon size={15} style={{ color: isActive ? '#fff' : '#7C98B6', flexShrink: 0 }} />
      <span className="flex-1 truncate">{item.name}</span>
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
      <div className="bg-white rounded-[3px] shadow-xl w-[460px] max-h-[90vh] flex flex-col" style={{ border: '1px solid #dfe3eb' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dfe3eb]">
          <h2 className="text-base font-bold text-[#2d3e50]">Manage sidebar</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#f6f9fc] transition-colors">
            <X size={16} style={{ color: '#7c98b6' }} />
          </button>
        </div>

        {/* Pinned items — draggable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7c98b6] mb-3 px-2">Pinned items</p>
          <div className="space-y-1 mb-6">
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-[3px] border border-[#dfe3eb] bg-white hover:bg-[#f6f9fc] transition-colors cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={14} style={{ color: '#b0c1d4', flexShrink: 0 }} />
                  <item.icon size={14} style={{ color: '#425b76', flexShrink: 0 }} />
                  <span className="flex-1 text-sm font-medium text-[#2d3e50]">{item.name}</span>
                  <button onClick={() => togglePin(id)} className="p-1 rounded hover:bg-[#fff3f0] transition-colors" title="Unpin">
                    <Pin size={13} style={{ color: '#ff7a59' }} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Other items */}
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7c98b6] mb-3 px-2">All items</p>
          <div className="space-y-1">
            {ALL_ITEMS.filter((item) => !local.includes(item.id)).map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[3px] hover:bg-[#f6f9fc] transition-colors">
                <item.icon size={14} style={{ color: '#b0c1d4', flexShrink: 0 }} />
                <span className="flex-1 text-sm text-[#7c98b6]">{item.name}</span>
                <button onClick={() => togglePin(item.id)} className="p-1 rounded hover:bg-[#f0faf8] transition-colors" title="Pin">
                  <PinOff size={13} style={{ color: '#b0c1d4' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#dfe3eb]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#425b76] border border-[#dfe3eb] rounded-[3px] hover:bg-[#f6f9fc] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="px-5 py-2 text-sm font-bold text-white rounded-[3px] transition-colors"
            style={{ backgroundColor: '#ff7a59' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff8f73')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff7a59')}
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
  const pathname = usePathname();

  return (
    <div
      className="fixed top-0 left-64 h-full z-40 flex shadow-xl"
      style={{ width: 480 }}
    >
      {/* Category list */}
      <div className="w-44 h-full flex flex-col py-4 border-r border-[#dfe3eb]" style={{ backgroundColor: '#2d3e50' }}>
        <div className="px-4 pb-3 border-b mb-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7c98b6' }}>All features</span>
        </div>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => setActiveCategory(cat.label)}
            className="flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-all"
            style={{
              color: activeCategory === cat.label ? '#fff' : '#99ACC2',
              backgroundColor: activeCategory === cat.label ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            onMouseEnter={(e) => { if (activeCategory !== cat.label) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { if (activeCategory !== cat.label) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            {cat.label}
            <ChevronRight size={13} style={{ color: '#7c98b6' }} />
          </button>
        ))}
      </div>

      {/* Sub-items */}
      <div className="flex-1 h-full bg-white py-4 overflow-y-auto">
        <div className="px-4 pb-3 border-b border-[#dfe3eb] mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#7c98b6]">{activeCategory}</span>
        </div>
        {categoryItems.map((item) => {
          if (!item) return null;
          const isPinned = pinnedIds.includes(item.id);
          const isActive = typeof window !== 'undefined' && window.location.pathname.startsWith(item.href);
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f6f9fc] transition-colors group">
              <Link href={item.href} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                <item.icon size={15} style={{ color: isActive ? '#ff7a59' : '#425b76', flexShrink: 0 }} />
                <span className="text-sm font-medium text-[#2d3e50] truncate">{item.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => onTogglePin(item.id)}
                title={isPinned ? 'Unpin' : 'Pin to sidebar'}
                className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
                style={{ color: isPinned ? '#ff7a59' : '#b0c1d4' }}
              >
                {isPinned ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Backdrop */}
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
  const [showManageTip, setShowManageTip] = useState(false);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const pinnedItems = pinnedIds.map(itemById).filter(Boolean) as NavItem[];

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-30" style={{ backgroundColor: '#2D3E50' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF7A59' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base tracking-tight">CRM Pro</span>
            <p className="text-xs" style={{ color: '#7C98B6' }}>Sales Platform</p>
          </div>
        </div>

        {/* Pinned nav items */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {/* Home shortcut */}
          <NavLink item={itemById('dashboard')} isActive={pathname === '/dashboard'} onClick={() => setMegaOpen(false)} />

          {/* Separator */}
          {pinnedItems.filter((i) => i.id !== 'dashboard').length > 0 && (
            <div className="my-2 mx-3 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          )}

          {/* Pinned items (excluding dashboard which is always shown) */}
          <div className="space-y-0.5">
            {pinnedItems.filter((i) => i.id !== 'dashboard').map((item) => (
              <NavLink
                key={item.id}
                item={item}
                isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                onClick={() => setMegaOpen(false)}
              />
            ))}
          </div>

          {/* More button */}
          <div className="mt-2 mx-0">
            <button
              type="button"
              onClick={() => setMegaOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all"
              style={{
                color: megaOpen ? '#fff' : '#99ACC2',
                backgroundColor: megaOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (!megaOpen) { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
              onMouseLeave={(e) => { if (!megaOpen) { (e.currentTarget as HTMLElement).style.backgroundColor = ''; (e.currentTarget as HTMLElement).style.color = '#99ACC2'; } }}
            >
              <MoreHorizontal size={15} style={{ color: megaOpen ? '#fff' : '#7C98B6', flexShrink: 0 }} />
              <span className="flex-1">More</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* Manage sidebar */}
          <div className="relative px-3 pt-2">
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'; setShowManageTip(true); }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ''; setShowManageTip(false); }}
              className="flex items-center gap-2 px-3 py-2 w-full rounded-md transition-all"
              style={{ color: '#7c98b6' }}
            >
              <Settings size={14} style={{ color: '#7c98b6' }} />
              <span className="text-xs font-medium">Manage sidebar</span>
            </button>
            {showManageTip && (
              <div className="absolute bottom-10 left-5 bg-[#2d3e50] text-white text-xs px-2.5 py-1.5 rounded-[3px] whitespace-nowrap shadow-lg border" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                Manage sidebar
              </div>
            )}
          </div>

          {/* User row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#FF7A59' }}>
              {userInitials || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{userName || 'Loading…'}</p>
              <p className="text-xs truncate" style={{ color: '#7C98B6' }}>{userEmail}</p>
            </div>
            <button onClick={handleSignOut} title="Sign out" className="flex-shrink-0 p-1 rounded transition-colors hover:bg-white/10">
              <LogOut size={14} style={{ color: '#7C98B6' }} />
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
    </>
  );
}
