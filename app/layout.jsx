import './globals.css';

export const metadata = {
  title: 'CafeQR Delivery',
  description: 'Order food delivery and takeaway from your favourite restaurants',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="overflow-x-hidden w-full max-w-full">
      <head>
        <meta name="theme-color" content="#F97316" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-stone-50 overflow-x-hidden w-full max-w-full">{children}</body>
    </html>
  );
}
