import { InputHTMLAttributes } from 'react';
import { Input } from './Input';

export const DateInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <Input type="date" {...props} />
);
