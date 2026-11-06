import { jsx as _jsx } from "react/jsx-runtime";
export function Header({ title }) {
    return (_jsx("header", { className: "border-b border-slate-800 p-4", children: _jsx("h1", { className: "text-xl font-bold", children: title }) }));
}
