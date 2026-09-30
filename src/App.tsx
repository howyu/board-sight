import { useState } from 'react';
import { Board } from './components/Board';
import { XiangqiBoard } from './components/XiangqiBoard';
import Header from './components/Header';

type GameMode = 'chess' | 'xiangqi';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('chess');

  return (
    <div className='min-h-screen w-full bg-gray-900 flex flex-col'>
      <Header />
      <main className='flex-1 flex flex-col items-center p-4 gap-4'>
        <div className='flex rounded-lg bg-gray-800 p-1 shadow'>
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
        <div className='bg-gray-800 rounded-lg shadow-lg p-4 max-w-full'>
          {gameMode === 'chess' ? <Board /> : <XiangqiBoard />}
        </div>
      </main>
    </div>
  );
}

export default App;
