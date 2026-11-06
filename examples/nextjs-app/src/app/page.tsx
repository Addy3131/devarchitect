import React from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { CartDrawer } from '@/features/cart/components/CartDrawer';

export default function HomePage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">DevArchitect Next.js Storefront</h1>
      <LoginForm />
      <CartDrawer />
    </main>
  );
}

