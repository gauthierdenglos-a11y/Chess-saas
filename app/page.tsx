'use client';

import ChessBoard from './components/ChessBoard';

export default function Home() {
  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold text-white">Mon SaaS d'Échecs</h1>
      <ChessBoard boardWidth={500} />
    </div>
  );
}
