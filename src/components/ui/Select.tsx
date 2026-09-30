import { SelectHTMLAttributes } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = ({ className = '', children, ...props }: Props) => (
  <select
    className={`w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
    {...props}
  >
    {children}
  </select>
);
