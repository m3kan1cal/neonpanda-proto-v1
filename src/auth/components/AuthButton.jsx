import React from 'react';
import { buttonPatterns } from '../../utils/ui/uiPatterns';

const AuthButton = ({
  children,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled = false,
  loading = false,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: `${buttonPatterns.primary} w-full`,
    secondary: `${buttonPatterns.secondary} w-full`,
    link: `w-full bg-transparent border-none text-synthwave-neon-cyan px-4 py-2 hover:text-white hover:bg-synthwave-neon-cyan/15 hover:-translate-y-0.5 rounded-md active:translate-y-0 backdrop-blur-sm focus:ring-2 focus:ring-synthwave-neon-cyan/40 focus:ring-offset-0 focus:ring-offset-transparent transition-all duration-200 font-rajdhani font-medium uppercase tracking-wide disabled:hover:bg-transparent disabled:hover:text-synthwave-neon-cyan disabled:hover:translate-y-0 disabled:opacity-60 min-h-[48px] flex items-center justify-center`
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default AuthButton;
