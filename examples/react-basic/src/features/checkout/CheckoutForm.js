import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCheckout } from './useCheckout.js';
export function CheckoutForm() {
    const { isSubmitting, submitOrder } = useCheckout();
    return (_jsxs("form", { onSubmit: e => { e.preventDefault(); submitOrder(); }, className: "mt-8 p-4 bg-slate-800 rounded", children: [_jsx("h2", { className: "text-lg font-bold mb-2", children: "Checkout" }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "px-4 py-2 bg-cyan-600 rounded text-white", children: isSubmitting ? 'Processing...' : 'Place Order' })] }));
}
