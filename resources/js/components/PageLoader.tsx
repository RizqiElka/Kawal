import React from 'react';

export const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center loading-backdrop fade-in">
    <div className="flex flex-col items-center gap-3">
      <div className="loading-spinner" />
      <span className="loading-text">Memuat...</span>
    </div>
  </div>
);
