'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const CHECKOUT_TABS = [
  { name: 'Shipping & Delivery', href: '/dashboard/checkout/shipping' },
  { name: 'Store Pickup', href: '/dashboard/checkout/pickup' },
  { name: 'Chocolate Shipping', href: '/dashboard/checkout/chocolate' },
  { name: 'Tax & Pricing', href: '/dashboard/checkout/tax' },
];

export default function CheckoutSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Checkout &amp; Fulfillment Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Saved here, applied by the server to every new checkout. Existing orders keep the amounts they were placed with.</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Checkout settings sections">
        {CHECKOUT_TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${active ? 'bg-[#8B5E34] text-white border-[#8B5E34]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {t.name}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
