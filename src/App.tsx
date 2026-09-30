import { useState } from 'react';
import { Board } from './components/Board';
import { XiangqiBoard } from './components/XiangqiBoard';
import Header from './components/Header';

type GameMode = 'chess' | 'xiangqi';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('chess');

  return (
    <div className='min-h-screen w-full bg-gray-900 flex flex-col'>
      <Header gameMode={gameMode} onGameModeChange={setGameMode} />
      <main className='flex-1 flex flex-col items-center p-3 gap-3'>
        <div className='bg-gray-800 rounded-lg shadow-lg p-3 max-w-full'>
          {gameMode === 'chess' ? <Board /> : <XiangqiBoard />}
        </div>
      </main>
    </div>
  );
}

export default App;
