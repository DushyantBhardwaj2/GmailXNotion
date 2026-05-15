import React from 'react';

export default function Connect() {
  return (
    <div style={{ maxWidth: '600px', margin: '100px auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing)' }}>
      <div className="terminal-border" style={{ padding: '2rem', background: 'var(--surface)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', letterSpacing: '2px', marginBottom: '1rem', color: 'var(--accent)' }}>INITIALIZE_ONBOARDING</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Connect your workspace nodes to the Opportunity Tracker core.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Step 
            number="01" 
            title="AUTHORIZE_GMAIL" 
            description="Grant read-only access to identify career opportunities." 
            status="COMPLETED"
          />
          <Step 
            number="02" 
            title="CONNECT_NOTION" 
            description="Authorize the workspace where databases will be provisioned." 
            status="PENDING"
          />
          <Step 
            number="03" 
            title="PROVISION_WORKSPACE" 
            description="Auto-generate Accounts, Feeds, and Email databases." 
            status="LOCKED"
          />
        </div>

        <button style={{ 
          marginTop: '2rem',
          background: 'var(--accent)', 
          color: 'var(--bg)', 
          width: '100%',
          padding: '1rem', 
          fontWeight: 'bold',
          letterSpacing: '1px'
        }}>
          PROCEED_TO_NOTION_AUTH
        </button>
      </div>
    </div>
  );
}

function Step({ number, title, description, status }: any) {
  const isCompleted = status === 'COMPLETED';
  const isPending = status === 'PENDING';
  
  return (
    <div style={{ 
      display: 'flex', 
      gap: '1rem', 
      textAlign: 'left', 
      padding: '1rem', 
      border: '1px solid var(--border)',
      opacity: status === 'LOCKED' ? 0.3 : 1
    }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isCompleted ? 'var(--success)' : 'var(--accent)' }}>
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{description}</div>
      </div>
      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', alignSelf: 'center', color: isCompleted ? 'var(--success)' : 'inherit' }}>
        {status}
      </div>
    </div>
  );
}
