import { FC } from 'react';

type GameMode = 'chess' | 'xiangqi';

interface HeaderProps {
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
}

const Header: FC<HeaderProps> = ({ gameMode, onGameModeChange }) => (
  <header className='w-full border-b border-gray-700/70 bg-gray-800 px-4 py-2.5'>
    <div className='container mx-auto flex items-center justify-between gap-3'>
      <div className='flex min-w-0 items-center gap-3'>
        <img
          src='./favicon.ico'
          alt='BoardSight'
          className='h-8 w-8 shrink-0 rounded-md'
        />
        <div className='min-w-0'>
          <div className='font-bold leading-tight text-gray-100'>BoardSight</div>
          <div className='hidden text-[10px] text-gray-400 sm:block'>See the board. Understand the pressure.</div>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <div className='flex rounded-lg bg-gray-900/70 p-1 shadow-inner'>
          <button
            onClick={() => onGameModeChange('chess')}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors sm:text-sm ${gameMode === 'chess' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            国际象棋
          </button>
          <button
            onClick={() => onGameModeChange('xiangqi')}
            className={`rounded-md px-3 py-1.5 text-xs transition-colors sm:text-sm ${gameMode === 'xiangqi' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            中国象棋
          </button>
        </div>
        <a href='https://github.com/howyu/board-sight' target='_blank' rel='noopener noreferrer' className='hidden text-sm text-blue-400 transition-colors hover:text-blue-300 sm:inline'>
          GitHub
        </a>
      </div>
    </div>
  </header>
);

export default Header;
