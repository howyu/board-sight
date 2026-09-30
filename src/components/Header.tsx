import { FC } from 'react';

const Header: FC = () => (
  <header className='w-full py-4 px-6 bg-gray-800 flex justify-center'>
    <div className='flex justify-between items-center container'>
      <div className='flex items-center gap-2'>
        <img src='/favicon.ico' alt='BoardSight logo' className='w-8 h-8' />
        <div>
          <div className='font-bold text-gray-200'>BoardSight</div>
          <div className='text-[10px] text-gray-400'>See the board. Understand the pressure.</div>
        </div>
      </div>
      <a href='https://github.com/howyu/chess-attack-pwa' target='_blank' rel='noopener noreferrer' className='text-blue-400 hover:text-blue-300 transition-colors'>
        GitHub
      </a>
    </div>
  </header>
);

export default Header;
