import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'MMM d, yyyy HH:mm');
  } catch {
    return 'Invalid date';
  }
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function getDaysInStage(createdAt: string): number {
  const created = parseISO(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'text-red-400 bg-red-400/10';
    case 'high':
      return 'text-orange-400 bg-orange-400/10';
    case 'medium':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'low':
      return 'text-slate-400 bg-slate-400/10';
    default:
      return 'text-slate-400 bg-slate-400/10';
  }
}

export function getLeadStatusColor(status: string): string {
  switch (status) {
    case 'new':
      return 'text-blue-400 bg-blue-400/10';
    case 'contacted':
      return 'text-purple-400 bg-purple-400/10';
    case 'qualified':
      return 'text-green-400 bg-green-400/10';
    case 'unqualified':
      return 'text-red-400 bg-red-400/10';
    case 'converted':
      return 'text-indigo-400 bg-indigo-400/10';
    default:
      return 'text-slate-400 bg-slate-400/10';
  }
}

export function parseCSVValue(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[\d\s\+\-\(\)]{7,20}$/.test(phone);
}
