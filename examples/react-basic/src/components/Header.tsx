import React from 'react';

export function Header({ title }: { title: string }) {
  return (
    <header className="border-b border-slate-800 p-4">
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  );
}

