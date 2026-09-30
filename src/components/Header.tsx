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
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-400/35 bg-indigo-500/10 text-indigo-200'>
          <svg viewBox='0 0 24 24' className='h-5 w-5' aria-hidden='true'>
            <path d='M6 5h12v14H6zM9 2v4M15 2v4M9 18v4M15 18v4M3 9h4M3 15h4M17 9h4M17 15h4' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' />
          </svg>
        </div>
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
        <a href='https://github.com/howyu/board-sight-pwa' target='_blank' rel='noopener noreferrer' className='hidden text-sm text-blue-400 transition-colors hover:text-blue-300 sm:inline'>
          GitHub
        </a>
      </div>
    </div>
  </header>
);

export default Header;
