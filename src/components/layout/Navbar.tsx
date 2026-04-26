'use client';

import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  
  let title = 'Dashboard';
  if (pathname.includes('/products')) title = 'Products';
  else if (pathname.includes('/categories')) title = 'Categories';
  else if (pathname.includes('/orders')) title = 'Orders';
  else if (pathname.includes('/banners')) title = 'Banners';
  else if (pathname.includes('/coupons')) title = 'Coupons';
  else if (pathname.includes('/testimonials')) title = 'Testimonials';
  else if (pathname.includes('/customers')) title = 'Customers';

  return (
    <header className="bg-white border-b border-slate-200 h-[100px] flex items-center justify-between px-8 z-40 sticky top-0 shrink-0">
      <div className="flex flex-col justify-center">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-tight">{title}</h1>
        <p className="text-[15px] text-slate-500 font-medium mt-1">Welcome back, System Admin</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[14px] bg-[#3b60f6] text-white flex items-center justify-center text-xl font-bold shadow-sm">
            S
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-slate-900 leading-tight">System Admin</span>
            <span className="text-[13px] text-slate-500 font-medium">Administrator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
