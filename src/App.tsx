import { useState } from 'react';
import { Board } from './components/Board';
import { XiangqiBoard } from './components/XiangqiBoard';
import Header from './components/Header';

type GameMode = 'chess' | 'xiangqi';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('chess');

  return (
    <div className='min-h-screen w-full bg-[#0b1120] flex flex-col'>
      <Header />
      <main className='flex-1 flex flex-col items-center gap-5 p-4 sm:p-6'>
        <div className='flex rounded-xl border border-slate-700/70 bg-slate-900/80 p-1 shadow-lg'>
          <button
            onClick={() => setGameMode('chess')}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${gameMode === 'chess' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            国际象棋
          </button>
          <button
            onClick={() => setGameMode('xiangqi')}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${gameMode === 'xiangqi' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            中国象棋
          </button>
        </div>
        <div className='max-w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-2xl sm:p-5'>
          {gameMode === 'chess' ? <Board /> : <XiangqiBoard />}
        </div>
      </main>
    </div>
  );
}

export default App;
