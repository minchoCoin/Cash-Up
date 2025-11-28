import clsx from 'clsx';
import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

const baseClasses =
  'w-full rounded-xl px-4 py-3 font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'beach-gradient text-white shadow-lg focus:ring-beach-sea',
  secondary: 'bg-white text-beach-navy border border-beach-sky focus:ring-beach-sky',
  ghost: 'bg-transparent text-beach-navy focus:ring-beach-sea'
};

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className, ...props }) => {
  return <button className={clsx(baseClasses, variants[variant], className)} {...props} />;
};
