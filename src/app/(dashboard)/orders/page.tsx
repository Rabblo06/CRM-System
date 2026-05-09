'use client';

import { useState } from 'react';
import { Plus, Package, Search, TrendingUp, DollarSign, ShoppingCart, CheckCircle2, Clock, XCircle, MoreHorizontal, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;
  customer: string;
  company: string;
  product: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  date: string;
  items: number;
}

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-1042', customer: 'Alice Johnson', company: 'TechCorp', product: 'Enterprise Plan — Annual', amount: 12000, currency: 'USD', status: 'delivered', date: '2026-03-10', items: 1 },
  { id: 'ORD-1041', customer: 'Bob Smith', company: 'Global Finance', product: 'Professional Plan + Add-ons', amount: 4800, currency: 'USD', status: 'processing', date: '2026-03-15', items: 3 },
  { id: 'ORD-1040', customer: 'Carol Williams', company: 'HealthFirst', product: 'Starter Plan — Monthly', amount: 299, currency: 'USD', status: 'pending', date: '2026-03-17', items: 1 },
  { id: 'ORD-1039', customer: 'David Brown', company: 'EduLearn', product: 'Team Plan x 20 seats', amount: 3600, currency: 'USD', status: 'shipped', date: '2026-03-14', items: 1 },
  { id: 'ORD-1038', customer: 'Eve Davis', company: 'RetailMax', product: 'Enterprise Plan — Annual', amount: 12000, currency: 'USD', status: 'cancelled', date: '2026-03-08', items: 1 },
  { id: 'ORD-1037', customer: 'Frank Miller', company: 'DevStudio', product: 'API Access — 500k calls', amount: 750, currency: 'USD', status: 'delivered', date: '2026-03-05', items: 2 },
];

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: '#E8882A', bg: '#FEF9EE', icon: Clock },
  processing: { label: 'Processing', color: '#4762D5', bg: '#E5F5F8', icon: ShoppingCart },
  shipped: { label: 'Shipped', color: '#555555', bg: '#EBF0F5', icon: Truck },
  delivered: { label: 'Delivered', color: '#4CAF8E', bg: '#E5F8F6', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: '#999999', bg: '#F1F1F1', icon: XCircle },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function OrdersPage() {
  const [orders] = useState<Order[]>(MOCK_ORDERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.customer.toLowerCase().includes(search.toLowerCase()) || o.product.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.amount, 0);
  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="p-6 space-y-5" style={{ backgroundColor: '#FAFAFA', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#333333' }}>Orders</h1>
          <p className="text-xs mt-0.5" style={{ color: '#999999' }}>Manage customer orders and subscriptions</p>
        </div>
        <Button className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          New Order
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue, 'USD'), icon: DollarSign, color: '#4CAF8E', bg: '#E5F8F6' },
          { label: 'Total Orders', value: String(orders.length), icon: Package, color: '#4762D5', bg: '#E5F5F8' },
          { label: 'Active Orders', value: String(pendingCount), icon: Clock, color: '#E8882A', bg: '#FEF9EE' },
          { label: 'Delivered', value: String(deliveredCount), icon: CheckCircle2, color: '#4762D5', bg: '#EEF0FB' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-[#EBEBEB] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
                <TrendingUp className="w-3.5 h-3.5" style={{ color: '#EBEBEB' }} />
              </div>
              <p className="text-xl font-bold" style={{ color: '#333333' }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#999999' }}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#B3B3B3' }} />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: statusFilter === s ? '#333333' : '#ffffff',
                color: statusFilter === s ? '#ffffff' : '#666666',
                border: '1px solid #EBEBEB',
              }}
            >
              {s === 'all' ? 'All' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #EBEBEB', backgroundColor: '#FAFAFA' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Order</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#999999' }}>Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((order, i) => {
              const sCfg = statusConfig[order.status];
              const StatusIcon = sCfg.icon;
              return (
                <tr
                  key={order.id}
                  className="transition-colors hover:bg-[#FAFAFA] cursor-pointer"
                  style={{ borderTop: i > 0 ? '1px solid #EBEBEB' : undefined }}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-medium" style={{ color: '#666666' }}>{order.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium" style={{ color: '#333333' }}>{order.customer}</p>
                    <p className="text-xs" style={{ color: '#999999' }}>{order.company}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: '#333333' }}>{order.product}</p>
                    <p className="text-xs" style={{ color: '#999999' }}>{order.items} item{order.items > 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold" style={{ color: '#333333' }}>{formatCurrency(order.amount, order.currency)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: sCfg.bg, color: sCfg.color }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {sCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: '#999999' }}>{order.date}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 rounded hover:bg-[#F1F1F1]">
                      <MoreHorizontal className="w-4 h-4" style={{ color: '#B3B3B3' }} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Package className="w-8 h-8 mx-auto mb-2" style={{ color: '#EBEBEB' }} />
                  <p className="text-sm" style={{ color: '#999999' }}>No orders found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
