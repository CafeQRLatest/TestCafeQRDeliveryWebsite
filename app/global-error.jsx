'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body className="bg-stone-50 text-stone-900 font-sans">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-stone-900 mb-2">Application Error</h2>
          <p className="text-sm text-stone-500 max-w-md mb-6">
            {error?.message || 'An unexpected application error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="bg-[#f97316] text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:bg-[#ea580c] transition-all"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
