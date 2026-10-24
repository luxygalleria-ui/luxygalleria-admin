'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient, { isUnauthenticated, getApiBaseUrl } from '../../services/apiClient';
import { getAdminToken, clearAdminSession } from '../../lib/auth';

interface RecentOrder {
  _id: string;
  user?: { name: string; email: string };
  total: number;
  orderStatus: string;
  createdAt: string;
}

// null = the API did not send this field (older backend), shown as "—" rather than a misleading 0
type Num = number | null;
interface DashboardStats {
  totalRevenue: Num;
  totalOrders: Num;
  totalProducts: Num;
  totalCategories: Num;
  totalBrands: Num;
  totalBanners: Num;
  totalCustomers: Num;
  paidOrders: Num;
  averageOrderValue: Num;
  cancelledPaidAmount: Num;
  cancelledPaidOrders: Num;
  ordersByStatus: Record<string, number> | null;
  paymentsByStatus: Record<string, number> | null;
  revenueByDay: { date: string; revenue: number; orders: number }[] | null;
  recentOrders: RecentOrder[];
  orderDataSource: string | null; // 'local' or 'history-readonly'
}

const num = (...values: unknown[]): Num => {
  for (const v of values) if (v !== undefined && v !== null && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const inr = (v: Num) => (v === null ? '—' : `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const count = (v: Num) => (v === null ? '—' : v.toLocaleString('en-IN'));

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // No usable session: redirect quietly rather than firing a request that
    // can only come back 401.
    if (!getAdminToken()) {
      clearAdminSession();
      router.replace('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/dashboard/stats');
        if (res.data && res.data.success) {
          const raw = res.data.data || {};
          const safeRecentOrders: RecentOrder[] = Array.isArray(raw.recentOrders)
            ? raw.recentOrders
            : Array.isArray(raw.recent_orders)
            ? raw.recent_orders
            : [];

          const normalized: DashboardStats = {
            totalRevenue: num(raw.totalRevenue, raw.total_revenue),
            totalOrders: num(raw.totalOrders, raw.total_orders),
            totalProducts: num(raw.totalProducts, raw.total_products),
            totalCategories: num(raw.totalCategories, raw.total_categories),
            totalBrands: num(raw.totalBrands),
            totalBanners: num(raw.totalBanners, raw.total_banners),
            totalCustomers: num(raw.totalCustomers, raw.total_customers),
            paidOrders: num(raw.paidOrders),
            averageOrderValue: num(raw.averageOrderValue),
            cancelledPaidAmount: num(raw.cancelledPaidAmount),
            cancelledPaidOrders: num(raw.cancelledPaidOrders),
            ordersByStatus: raw.ordersByStatus && typeof raw.ordersByStatus === 'object' ? raw.ordersByStatus : null,
            paymentsByStatus: raw.paymentsByStatus && typeof raw.paymentsByStatus === 'object' ? raw.paymentsByStatus : null,
            revenueByDay: Array.isArray(raw.revenueByDay) ? raw.revenueByDay : null,
            recentOrders: safeRecentOrders,
            orderDataSource: typeof raw.orderDataSource === 'string' ? raw.orderDataSource : null,
          };
          setStats(normalized);
        }
      } catch (err) {
        if (!isUnauthenticated(err)) {
          console.error('Failed to fetch dashboard stats', err);
          const e = err as { response?: { status?: number; data?: { message?: string } } };
          setError(e.response
            ? `The API returned HTTP ${e.response.status}${e.response.data?.message ? `: ${e.response.data.message}` : ''}.`
            : `Cannot reach the API at ${getApiBaseUrl()}. Check that the backend is running and NEXT_PUBLIC_API_URL is correct.`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [router]);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'bg-[#dcfce7] text-[#16a34a]';
      case 'processing': return 'bg-[#e0e7ff] text-[#4f46e5]';
      case 'shipped': return 'bg-[#dbeafe] text-[#2563eb]';
      case 'cancelled': return 'bg-[#fee2e2] text-[#dc2626]';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const cards = [
    {
      label: 'Total Revenue',
      value: stats ? inr(stats.totalRevenue) : '—',
      note: stats && stats.paidOrders !== null ? `${count(stats.paidOrders)} paid order${stats.paidOrders === 1 ? '' : 's'} · avg ${inr(stats.averageOrderValue)}` : undefined,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
      ),
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#16a34a]'
    },
    {
      label: 'Total Orders',
      value: stats ? count(stats.totalOrders) : '—',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
      ),
      iconBg: 'bg-[#e0f2fe]',
      iconColor: 'text-[#0284c7]'
    },
    {
      label: 'Products',
      value: stats ? count(stats.totalProducts) : '—',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
      ),
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d97706]'
    },
    {
      label: 'Categories',
      value: stats ? count(stats.totalCategories) : '—',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
      ),
      iconBg: 'bg-[#f3e8ff]',
      iconColor: 'text-[#9333ea]'
    },
    {
      label: 'Brands',
      value: stats ? count(stats.totalBrands) : '—',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
      ),
      iconBg: 'bg-[#e0e7ff]',
      iconColor: 'text-[#4f46e5]'
    },
    {
      label: 'Banners',
      value: stats ? count(stats.totalBanners) : '—',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
      ),
      iconBg: 'bg-[#fae8ff]',
      iconColor: 'text-[#c026d3]'
    },
    {
      label: 'Customers',
      value: stats ? count(stats.totalCustomers) : '—',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
      ),
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#d97706]'
    }
  ];

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto mt-2 pb-12 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto mt-2 pb-12">
      {error && (
        <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Dashboard statistics could not be loaded.</strong> {error}
        </div>
      )}

      {stats?.orderDataSource === 'history-readonly' && (
        <p className="mb-4 text-[13px] font-medium text-slate-500">
          Orders, revenue and customers: production history (read-only). Catalogue counts: this database.
        </p>
      )}

      {/* Responsive Stats Grid: 1 col on mobile, 2 col on tablet, 4 col on large desktop (7 cards: 4 + 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 sm:gap-5 border border-slate-100/60">
            <div className={`w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-[16px] sm:rounded-[18px] ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}>
              {card.icon}
            </div>
            <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
              <span className="text-[14px] sm:text-[15px] font-semibold text-slate-500 truncate">{card.label}</span>
              <span className="text-[24px] sm:text-[28px] lg:text-[32px] font-bold text-[#111827] leading-none truncate">{card.value}</span>
              {card.note && <span className="text-[12px] font-medium text-slate-400 leading-snug">{card.note}</span>}
            </div>
          </div>
        ))}
      </div>

      {stats && (
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <OrderStatusPanel stats={stats} />
          <RevenueChart days={stats.revenueByDay} />
        </div>
      )}

      {/* Recent Transactions Section */}
      <div className="mt-6 sm:mt-8 bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-7 lg:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-[18px] sm:text-[20px] font-bold text-[#111827]">Recent Transactions</h2>
          <a href="/dashboard/orders" className="text-[14px] sm:text-[15px] font-bold text-[#3b60f6] hover:text-blue-700 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors">
            View All
          </a>
        </div>

        {/* Desktop Table View (visible on md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 rounded-l-[12px] w-[18%]">Order ID</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 w-[26%]">Customer</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 w-[18%]">Amount</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 w-[18%]">Status</th>
                <th className="py-4 px-6 text-[14px] font-bold text-slate-500 rounded-r-[12px] w-[20%]">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                stats.recentOrders.map((order) => (
                  <tr key={order._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-6 text-[15px] font-bold text-[#111827]">#{order._id.substring(0, 8)}</td>
                    <td className="py-5 px-6 text-[15px] font-medium text-slate-600">{order.user?.name || 'Unknown'}</td>
                    <td className="py-5 px-6 text-[15px] font-bold text-[#111827]">{inr(num(order.total))}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold uppercase ${getStatusStyle(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-[15px] font-medium text-slate-500">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No recent transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (visible on mobile screens below md) */}
        <div className="block md:hidden space-y-3">
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            stats.recentOrders.map((order) => (
              <div key={order._id} className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-[#111827]">#{order._id.substring(0, 8)}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${getStatusStyle(order.orderStatus)}`}>
                    {order.orderStatus}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium truncate max-w-[200px]">{order.user?.name || 'Unknown'}</span>
                  <span className="font-bold text-[#111827]">{inr(num(order.total))}</span>
                </div>
                <div className="text-[12px] text-slate-400">
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">No recent transactions</div>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS: [string, string, string][] = [
  ['processing', 'Processing', 'bg-[#4f46e5]'],
  ['shipped', 'Shipped', 'bg-[#2563eb]'],
  ['delivered', 'Delivered', 'bg-[#16a34a]'],
  ['cancelled', 'Cancelled', 'bg-[#dc2626]'],
];
const PAYMENT_LABELS: [string, string][] = [['completed', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ['refunded', 'Refunded']];

function OrderStatusPanel({ stats }: { stats: DashboardStats }) {
  const byStatus = stats.ordersByStatus;
  const total = byStatus ? Object.values(byStatus).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
  return (
    <section className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60">
      <h2 className="text-[18px] sm:text-[20px] font-bold text-[#111827] mb-5">Orders by status</h2>
      {!byStatus ? (
        <p className="text-sm text-slate-500">Not provided by the API.</p>
      ) : (
        <ul className="space-y-3">
          {STATUS_LABELS.map(([key, label, bar]) => {
            const n = Number(byStatus[key]) || 0;
            return (
              <li key={key}>
                <div className="flex justify-between text-[14px] font-semibold text-slate-600 mb-1">
                  <span>{label}</span>
                  <span className="text-[#111827]">{n.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden="true">
                  <div className={`h-full ${bar} rounded-full`} style={{ width: total ? `${(n / total) * 100}%` : '0%' }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {stats.paymentsByStatus && (
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          {PAYMENT_LABELS.map(([key, label]) => (
            <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-600">
              {label} <span className="text-[#111827]">{(Number(stats.paymentsByStatus![key]) || 0).toLocaleString('en-IN')}</span>
            </span>
          ))}
        </div>
      )}
      {stats.cancelledPaidOrders ? (
        <p className="mt-4 text-[12px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          {stats.cancelledPaidOrders} paid order{stats.cancelledPaidOrders === 1 ? ' was' : 's were'} cancelled ({inr(stats.cancelledPaidAmount)}), not counted in revenue; refund pending.
        </p>
      ) : null}
    </section>
  );
}

function RevenueChart({ days }: { days: DashboardStats['revenueByDay'] }) {
  const max = days ? Math.max(0, ...days.map((d) => d.revenue)) : 0;
  const total = days ? days.reduce((a, d) => a + d.revenue, 0) : 0;
  const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return (
    <section className="lg:col-span-2 bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <h2 className="text-[18px] sm:text-[20px] font-bold text-[#111827]">Revenue, last 30 days</h2>
        {days && <span className="text-[14px] font-semibold text-slate-500">{inr(total)} · paid, not cancelled</span>}
      </div>
      {!days ? (
        <p className="text-sm text-slate-500">Not provided by the API.</p>
      ) : max === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No paid orders in the last 30 days.</p>
      ) : (
        <>
          <div className="flex items-end gap-[3px] h-[160px]" role="img" aria-label={`Daily revenue for the last 30 days, total ${inr(total)}`}>
            {days.map((d) => (
              <div key={d.date} className="flex-1 h-full flex items-end" title={`${label(d.date)}: ${inr(d.revenue)} (${d.orders} order${d.orders === 1 ? '' : 's'})`}>
                <div className={`w-full rounded-t-[4px] ${d.revenue ? 'bg-[#8b5e34]' : 'bg-slate-100'}`} style={{ height: d.revenue ? `${Math.max(4, (d.revenue / max) * 100)}%` : '2px' }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[11px] font-medium text-slate-400">
            <span>{label(days[0].date)}</span>
            <span>{label(days[days.length - 1].date)}</span>
          </div>
        </>
      )}
    </section>
  );
}
