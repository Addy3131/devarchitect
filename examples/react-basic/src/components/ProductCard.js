import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatCurrency } from '../utils/formatCurrency.js';
export function ProductCard({ product }) {
    return (_jsxs("div", { className: "p-4 border border-slate-700 rounded-lg", children: [_jsx("h3", { className: "font-semibold", children: product.name }), _jsx("p", { className: "text-cyan-400", children: formatCurrency(product.price) })] }));
}
