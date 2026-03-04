import React from 'react';

const AuthErrorMessage = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div className={`mt-2 text-synthwave-neon-cyan font-body text-sm ${className}`}>
      {error}
    </div>
  );
};

export default AuthErrorMessage;
