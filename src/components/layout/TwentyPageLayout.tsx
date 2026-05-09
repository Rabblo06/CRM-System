'use client';

import React, { useState } from 'react';
import { ChevronDown, Filter, SlidersHorizontal, Settings2, MoreHorizontal } from 'lucide-react';

interface TwentyPageLayoutProps {
  /** Page icon element */
  icon: React.ReactNode;
  /** Page title e.g. "Companies" */
  title: string;
  /** Label for the primary action button e.g. "+ New Company" */
  actionLabel?: string;
  /** Called when the action button is clicked */
  onAction?: () => void;
  /** Extra elements rendered to the right of the action button */
  actionExtra?: React.ReactNode;
  /** View tab label e.g. "All Companies" */
  viewLabel?: string;
  /** Count shown next to the view tab */
  viewCount?: number;
  /** Called when Filter is clicked */
  onFilter?: () => void;
  /** Called when Sort is clicked */
  onSort?: () => void;
  /** Extra toolbar elements (e.g. search bar) rendered in the view bar */
  toolbar?: React.ReactNode;
  /** The main page content */
  children: React.ReactNode;
}

export function TwentyPageLayout({
  icon,
  title,
  actionLabel,
  onAction,
  actionExtra,
  viewLabel,
  viewCount,
  onFilter,
  onSort,
  toolbar,
  children,
}: TwentyPageLayoutProps) {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Title bar ── */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 40, borderBottom: '1px solid #EBEBEB' }}
      >
        {/* Left: icon + title */}
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0">{icon}</span>
          <span className="text-sm font-semibold text-[#333333]">{title}</span>
        </div>

        {/* Right: action button + extras */}
        <div className="flex items-center gap-2">
          {actionLabel && (
            <button
              onClick={onAction}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#333333] rounded-sm transition-colors hover:bg-[#F1F1F1]"
              style={{ border: '1px solid #EBEBEB' }}
            >
              {actionLabel}
            </button>
          )}
          {actionExtra}
          <button className="p-1 rounded-sm hover:bg-[#F1F1F1] transition-colors">
            <MoreHorizontal size={14} style={{ color: '#999999' }} />
          </button>
          <span className="text-xs text-[#B3B3B3] font-mono select-none hidden md:inline">| Ctrl K</span>
        </div>
      </div>

      {/* ── View / filter bar ── */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ height: 36, borderBottom: '1px solid #EBEBEB' }}
      >
        {/* Left: view tab */}
        <div className="flex items-center gap-1">
          {toolbar ? (
            toolbar
          ) : (
            <button className="flex items-center gap-1.5 text-xs font-medium text-[#333333] hover:bg-[#F1F1F1] px-2 py-1 rounded-sm transition-colors">
              <span className="text-[#999999]">≡</span>
              <span>{viewLabel || title}</span>
              {viewCount !== undefined && (
                <span className="text-[#999999]">· {viewCount}</span>
              )}
              <ChevronDown size={11} style={{ color: '#999999' }} />
            </button>
          )}
        </div>

        {/* Right: Filter / Sort / Options */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onFilter}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#666666] hover:bg-[#F1F1F1] rounded-sm transition-colors"
          >
            <Filter size={11} style={{ color: '#999999' }} />
            Filter
          </button>
          <button
            onClick={onSort}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#666666] hover:bg-[#F1F1F1] rounded-sm transition-colors"
          >
            <SlidersHorizontal size={11} style={{ color: '#999999' }} />
            Sort
          </button>
          <div className="relative">
            <button
              onClick={() => setShowOptions(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-[#666666] hover:bg-[#F1F1F1] rounded-sm transition-colors"
            >
              <Settings2 size={11} style={{ color: '#999999' }} />
              Options
            </button>
            {showOptions && (
              <div
                className="absolute right-0 top-full mt-1 z-50 bg-white rounded-sm shadow-lg py-1"
                style={{ border: '1px solid #EBEBEB', minWidth: 160 }}
              >
                <button className="w-full px-3 py-1.5 text-xs text-left text-[#333333] hover:bg-[#F1F1F1]">
                  Hide fields
                </button>
                <button className="w-full px-3 py-1.5 text-xs text-left text-[#333333] hover:bg-[#F1F1F1]">
                  Group by
                </button>
                <button className="w-full px-3 py-1.5 text-xs text-left text-[#333333] hover:bg-[#F1F1F1]">
                  Export
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
