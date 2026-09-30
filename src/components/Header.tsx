import { FC } from 'react';

const LogoMark: FC = () => (
  <svg viewBox='0 0 40 40' aria-hidden='true' className='h-10 w-10 shrink-0'>
    <rect x='2' y='2' width='36' height='36' rx='11' fill='#111827' stroke='#475569' strokeWidth='1.5' />
    <path d='M10 29L20 10L30 29' fill='none' stroke='#e2e8f0' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' />
    <circle cx='20' cy='20' r='4.5' fill='#22d3ee' />
    <path d='M9 29H31' stroke='#a78bfa' strokeWidth='2.5' strokeLinecap='round' />
  </svg>
);

const Header: FC = () => (
  <header className='w-full border-b border-slate-800/80 bg-slate-950/95 px-4 py-3 backdrop-blur sm:px-6'>
    <div className='mx-auto flex w-full max-w-6xl items-center justify-between'>
      <div className='flex items-center gap-3'>
        <LogoMark />
        <div className='text-left'>
          <div className='text-lg font-semibold tracking-tight text-slate-100'>BoardSight</div>
          <div className='text-[11px] tracking-wide text-slate-400'>See the board. Understand the pressure.</div>
        </div>
      </div>
      <a href='https://github.com/howyu/board-sight-pwa' target='_blank' rel='noopener noreferrer' className='rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white'>
        GitHub
      </a>
    </div>
  </header>
);

export default Header;
