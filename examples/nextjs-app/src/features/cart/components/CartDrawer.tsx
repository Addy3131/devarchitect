'use client';
import React from 'react';
import { cn } from '@/lib/utils';

export function CartDrawer() {
  return (
    <aside className={cn('p-4 border border-slate-800 rounded max-w-sm')}>
      <h3 className="font-semibold mb-2">Shopping Cart</h3>
      <p className="text-slate-400">Cart is empty.</p>
    </aside>
  );
}

