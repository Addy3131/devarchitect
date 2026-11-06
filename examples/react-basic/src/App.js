import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from './components/Header.js';
import { ProductCard } from './components/ProductCard.js';
import { CheckoutForm } from './features/checkout/CheckoutForm.js';
import { useProducts } from './hooks/useProducts.js';
export default function App() {
    const { products, loading } = useProducts();
    return (_jsxs("div", { className: "min-h-screen bg-slate-900 text-white", children: [_jsx(Header, { title: "DevArchitect React Store" }), _jsxs("main", { className: "container mx-auto p-4", children: [loading ? _jsx("p", { children: "Loading products..." }) : (_jsx("div", { className: "grid grid-cols-3 gap-4", children: products.map(p => (_jsx(ProductCard, { product: p }, p.id))) })), _jsx(CheckoutForm, {})] })] }));
}
