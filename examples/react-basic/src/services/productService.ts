import { Product } from '../components/ProductCard.js';

export async function fetchProducts(): Promise<Product[]> {
  return [
    { id: '1', name: 'DevArchitect Pro', price: 99 },
    { id: '2', name: 'DevArchitect Team', price: 299 },
  ];
}

