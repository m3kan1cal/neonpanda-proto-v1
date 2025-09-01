import React from 'react';

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
  const baseClasses = `
    w-full px-8 py-3 rounded-lg
    font-rajdhani font-semibold text-lg uppercase tracking-wide
    cursor-pointer transition-all duration-300
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-0 outline-none
    active:outline-none focus-visible:outline-none
    border-0 focus:border-0 active:border-0
  `;

  const variantClasses = {
    primary: `
      bg-transparent border-2 border-synthwave-neon-pink text-synthwave-neon-pink
      hover:bg-synthwave-neon-pink hover:text-synthwave-bg-primary hover:-translate-y-1
      hover:shadow-neon-pink active:translate-y-0
      active:bg-synthwave-neon-pink active:text-synthwave-bg-primary active:border-synthwave-neon-pink
      disabled:hover:bg-transparent disabled:hover:text-synthwave-neon-pink
      disabled:hover:translate-y-0 disabled:hover:shadow-none
    `,
    secondary: `
      bg-transparent border-2 border-synthwave-neon-cyan/30 text-synthwave-neon-cyan
      hover:bg-synthwave-neon-cyan/10 hover:border-synthwave-neon-cyan hover:text-white hover:-translate-y-1
      hover:shadow-lg hover:shadow-synthwave-neon-cyan/30 active:translate-y-0
      disabled:hover:bg-transparent disabled:hover:text-synthwave-neon-cyan
      disabled:hover:translate-y-0 disabled:hover:shadow-none
    `,
    link: `
      bg-transparent border-none text-synthwave-neon-cyan p-2
      hover:text-white hover:bg-synthwave-neon-cyan/10 hover:-translate-y-1
      rounded-md active:translate-y-0
      disabled:hover:bg-transparent disabled:hover:text-synthwave-neon-cyan
      disabled:hover:translate-y-0
    `
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
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
