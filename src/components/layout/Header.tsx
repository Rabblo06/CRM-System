'use client';

import { useState } from 'react';
import { Bell, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HeaderProps {
  title?: string;
  onSearch?: (query: string) => void;
}

export function Header({ title, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  return (
    <header className="h-12 border-b flex items-center justify-between px-6 sticky top-0 z-20" style={{ borderColor: '#DFE3EB', backgroundColor: '#ffffff' }}>
      <div className="flex items-center gap-4">
        {title && <h1 className="text-sm font-semibold" style={{ color: '#2D3E50' }}>{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5" style={{ color: '#99ACC2' }} />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-8 w-56"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-1.5 rounded hover:bg-[#F0F3F7] transition-colors">
          <Bell className="w-4 h-4" style={{ color: '#516F90' }} />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#FF7A59' }}></span>
        </button>

        {/* Quick add */}
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add New</span>
        </Button>
      </div>
    </header>
  );
}
