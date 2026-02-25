import './globals.css';

export const metadata = {
  title: 'MedVerify - Medication Authentication',
  description: 'Verify medication authenticity in East Africa',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
