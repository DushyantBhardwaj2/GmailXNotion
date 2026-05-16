import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opportunity Mail Tracker | Command Center",
  description: "Advanced email intelligence and Notion integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="grid-bg">
        <div className="scanline" />
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header style={{ 
            padding: 'var(--spacing)', 
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(5, 5, 5, 0.8)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--accent)' }}>
                OPPORTUNITY_TRACKER_V1.0
              </h1>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                STATUS: [ <span style={{ color: 'var(--success)' }}>OPERATIONAL</span> ]
              </span>
            </div>
            <nav style={{ display: 'flex', gap: 'var(--spacing)', fontSize: '0.8rem' }}>
              <a href="#" style={{ borderBottom: '1px solid var(--accent)' }}>DASHBOARD</a>
              <a href="#" style={{ opacity: 0.5 }}>LOGS</a>
              <a href="#" style={{ opacity: 0.5 }}>SETTINGS</a>
            </nav>
          </header>
          
          <div style={{ flex: 1, padding: 'var(--spacing)' }}>
            {children}
          </div>

          <footer style={{ 
            padding: 'var(--spacing)', 
            borderTop: '1px solid var(--border)', 
            fontSize: '0.7rem', 
            color: 'var(--text-dim)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>SYSTEM_TIME: [ONLINE]</span>
            <span>CORE_SYNC_ACTIVE: TRUE</span>
          </footer>
        </main>
      </body>
    </html>
  );
}
