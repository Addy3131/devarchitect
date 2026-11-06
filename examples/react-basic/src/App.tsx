import React from 'react';
import { Header } from './components/Header.js';
import { ProductCard } from './components/ProductCard.js';
import { CheckoutForm } from './features/checkout/CheckoutForm.js';
import { useProducts } from './hooks/useProducts.js';

export default function App() {
  const { products, loading } = useProducts();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header title="DevArchitect React Store" />
      <main className="container mx-auto p-4">
        {loading ? <p>Loading products...</p> : (
          <div className="grid grid-cols-3 gap-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <CheckoutForm />
      </main>
    </div>
  );
}

