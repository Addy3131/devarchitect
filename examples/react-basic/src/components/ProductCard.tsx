import React from 'react';
import { formatCurrency } from '../utils/formatCurrency.js';

export interface Product {
  id: string;
  name: string;
  price: number;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="p-4 border border-slate-700 rounded-lg">
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-cyan-400">{formatCurrency(product.price)}</p>
    </div>
  );
}

