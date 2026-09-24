import type { ButtonHTMLAttributes } from 'react';

type Kind = 'primary' | 'warn' | 'ghost' | 'ghost danger' | '';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
  small?: boolean;
}

export function Btn({ kind = '', small, className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={['btn', kind, small ? 'sm' : '', className].filter(Boolean).join(' ')} {...rest} />;
}
