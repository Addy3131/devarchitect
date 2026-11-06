import React from 'react';
import { useCheckout } from './useCheckout.js';

export function CheckoutForm() {
  const { isSubmitting, submitOrder } = useCheckout();

  return (
    <form onSubmit={e => { e.preventDefault(); submitOrder(); }} className="mt-8 p-4 bg-slate-800 rounded">
      <h2 className="text-lg font-bold mb-2">Checkout</h2>
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-cyan-600 rounded text-white"
      >
        {isSubmitting ? 'Processing...' : 'Place Order'}
      </button>
    </form>
  );
}

