'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-stone-900 mb-2">Something went wrong!</h2>
      <p className="text-sm text-stone-500 max-w-md mb-6">
        {error?.message || 'Failed to load page content. Please try again.'}
      </p>
      <button
        onClick={() => reset()}
        className="bg-[#f97316] text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:bg-[#ea580c] transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
