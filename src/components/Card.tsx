import React from 'react';
import clsx from 'clsx';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={clsx('glass rounded-2xl p-4', className)}>{children}</div>
);
