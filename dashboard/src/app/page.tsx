'use client';

import React from 'react';
import { useUserStatus, useLogs } from './hooks';

export default function Dashboard() {
  const { data, loading, error } = useUserStatus();
  const { logs } = useLogs();

  const handleGlobalSync = async () => {
    try {
      await fetch('/api/sync', { method: 'POST' });
      alert('Global resync triggered in background.');
    } catch (e) {
      alert('Failed to trigger sync.');
    }
  };

  if (loading) return <div style={{ color: 'var(--accent)', padding: '2rem' }}>INITIALIZING_SYSTEM_INTERFACE...</div>;
  
  if (error || !data) return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2 style={{ color: 'var(--error)', letterSpacing: '2px' }}>UNAUTHORIZED_ACCESS</h2>
      <p style={{ margin: '1rem 0', color: 'var(--text-dim)' }}>Please connect your account to access the command center.</p>
      <a href="/api/auth/google" style={{ 
        background: 'var(--accent)', 
        color: 'var(--bg)', 
        padding: '0.8rem 1.5rem', 
        fontWeight: 'bold',
        display: 'inline-block',
        marginTop: '1rem'
      }}>
        SIGN_IN_WITH_GOOGLE
      </a>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'calc(var(--spacing) * 2)' }}>
      
      {/* SECTION: SYSTEM OVERVIEW */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing)' }}>
        <div className="terminal-border" style={{ padding: 'var(--spacing)', background: 'var(--surface)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>CONNECTED_NODES</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{data.syncs?.length || 0}</p>
        </div>
        <div className="terminal-border" style={{ padding: 'var(--spacing)', background: 'var(--surface)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>WORKSPACE_STATUS</h3>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: data.workspace?.isProvisioned ? 'var(--success)' : 'var(--error)' }}>
            {data.workspace?.isProvisioned ? 'READY' : 'PROVISIONING_REQUIRED'}
          </p>
        </div>
        <div className="terminal-border" style={{ padding: 'var(--spacing)', background: 'var(--surface)' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>ACTIVE_USER</h3>
          <p style={{ fontSize: '1rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.user.email}</p>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing)' }}>
        
        {/* LEFT COLUMN: ACTIVE CONNECTIONS */}
        <div className="terminal-border" style={{ padding: 'var(--spacing)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', letterSpacing: '1px' }}>ACTIVE_CONNECTIONS</h2>
            <a href="/api/auth/google" style={{ fontSize: '0.7rem', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '4px 8px' }}>+ NEW_NODE</a>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.syncs?.map((sync: any) => (
              <ConnectionCard 
                key={sync.email}
                type="GMAIL_NODE" 
                label="Direct Sync" 
                id={sync.email} 
                status="CONNECTED" 
                lastSync={sync.lastProcessedMessageId || 'INITIALIZING'} 
              />
            ))}
            {data.workspace && (
              <ConnectionCard 
                type="NOTION_HUB" 
                label={data.workspace.name || 'Notion Workspace'} 
                id="Operational Output" 
                status={data.workspace.isProvisioned ? 'OPERATIONAL' : 'PROVISIONING'} 
                lastSync="V1.0_CORE" 
              />
            )}
            {(!data.syncs?.length && !data.workspace) && (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>
                NO_ACTIVE_CONNECTIONS_FOUND
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT LOGS */}
        <div className="terminal-border" style={{ padding: 'var(--spacing)', background: 'var(--surface)' }}>
          <h2 style={{ fontSize: '1rem', letterSpacing: '1px', marginBottom: 'var(--spacing)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>LOG_STREAM</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.length > 0 ? logs.map((log: any, i: number) => (
              <LogEntry key={i} time={new Date(log.time).toLocaleTimeString()} msg={log.msg} />
            )) : (
              <div style={{ opacity: 0.3 }}>AWAITING_LOG_STREAM...</div>
            )}
          </div>
        </div>

      </div>

      {/* ACTION PANEL */}
      <section className="terminal-border" style={{ 
        padding: 'var(--spacing)', 
        background: 'var(--accent-muted)', 
        border: '1px solid var(--accent)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ fontSize: '1rem', color: 'var(--accent)' }}>CRITICAL_SYSTEM_ACTION</h2>
          <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Trigger a manual global resync across all accounts.</p>
        </div>
        <button 
          onClick={handleGlobalSync}
          style={{ 
            background: 'var(--accent)', 
            color: 'var(--bg)', 
            padding: '0.8rem 1.5rem', 
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
          TRIGGER_GLOBAL_SYNC
        </button>
      </section>

    </div>
  );
}

function ConnectionCard({ type, label, id, status, lastSync }: any) {
  const isSyncing = status === 'SYNCING' || status === 'PROVISIONING';
  return (
    <div style={{ 
      padding: '1rem', 
      border: '1px solid var(--border)', 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <div style={{ fontSize: '0.65rem', opacity: 0.5, marginBottom: '0.2rem' }}>{type}</div>
        <div style={{ fontWeight: 'bold' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{id}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ 
          fontSize: '0.7rem', 
          color: isSyncing ? 'var(--accent)' : 'var(--success)',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          justifyContent: 'flex-end'
        }}>
          {isSyncing && <div className="spinner" />}
          {status}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
          SYNC_REF: {lastSync}
        </div>
      </div>
      <style jsx>{`
        .spinner {
          width: 8px;
          height: 8px;
          border: 1px solid var(--accent);
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function LogEntry({ time, msg }: { time: string; msg: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <span style={{ color: 'var(--accent)', opacity: 0.7 }}>[{time}]</span>
      <span style={{ color: 'var(--text)' }}>{msg}</span>
    </div>
  );
}
