// app/loading.jsx — Shown while Next.js is compiling the page (first request)
export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fffdfa',
      gap: '16px'
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: '4px solid #fed7aa',
        borderTop: '4px solid #f97316',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#9a3412', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em' }}>
        LOADING…
      </p>
    </div>
  );
}
