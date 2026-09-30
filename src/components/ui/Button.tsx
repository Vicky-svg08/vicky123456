import { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'primary', size = 'md', className = '', children, ...props }: Props) => {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl border transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-sans';

  const variants = {
    primary: 'bg-brand text-white border-transparent hover:bg-gray-800 active:scale-[0.98]',
    secondary: 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98]',
    ghost: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100 active:scale-[0.98]',
    danger: 'bg-red-50 text-red-700 border-transparent hover:bg-red-100 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-sm px-5 py-2.5 gap-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
