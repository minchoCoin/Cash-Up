import React from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

type LayoutProps = {
  title?: string;
  showBack?: boolean;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
};

export const Layout: React.FC<LayoutProps> = ({ title, showBack, children, rightSlot, className }) => {
  const navigate = useNavigate();

  return (
    <div className={clsx('app-shell px-4 pb-16 pt-4', className)}>
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack ? (
            <button
              aria-label="뒤로가기"
              onClick={() => navigate(-1)}
              className="rounded-full bg-white/70 px-3 py-2 text-sm text-beach-navy shadow"
            >
              ←
            </button>
          ) : (
            <div className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-beach-navy shadow">
              캐시업
            </div>
          )}
          {title && <h1 className="text-lg font-semibold text-beach-navy">{title}</h1>}
        </div>
        {rightSlot}
      </header>
      <main>{children}</main>
    </div>
  );
};
