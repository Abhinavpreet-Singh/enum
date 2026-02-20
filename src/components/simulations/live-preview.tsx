"use client";

import { SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";

interface LivePreviewProps {
  files: Record<string, string>;
  simulationId: string;
}

export default function LivePreview({ files, simulationId }: LivePreviewProps) {
  // Convert files to Sandpack format
  const sandpackFiles: Record<string, string> = {};

  // For frontend-homepage-crash simulation
  if (simulationId === "frontend-homepage-crash") {
    // Create the app structure
    sandpackFiles["/App.tsx"] =
      files["App.tsx"] ||
      `import React from 'react';
import { Navigation } from './Nav';

export default function App() {
  return (
    <div>
      <Navigation />
      <main style={{ padding: '2rem' }}>
        <h1>Welcome</h1>
        <p>This is the homepage</p>
      </main>
    </div>
  );
}`;

    sandpackFiles["/Nav.tsx"] =
      files["Nav.tsx"] ||
      `import React, { useState, useEffect } from 'react';

export function Navigation() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  
  return (
    <nav style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem' }}>
      {isMobile ? (
        <button style={{ padding: '0.5rem 1rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px' }}>
          Menu
        </button>
      ) : (
        <ul style={{ listStyle: 'none', display: 'flex', gap: '1.5rem', margin: 0, padding: 0 }}>
          <li style={{ fontWeight: 500, cursor: 'pointer' }}>Home</li>
          <li style={{ fontWeight: 500, cursor: 'pointer' }}>About</li>
        </ul>
      )}
    </nav>
  );
}`;
  }

  // For memory-leak-event-listeners simulation
  if (simulationId === "memory-leak-event-listeners") {
    sandpackFiles["/App.tsx"] = `import React from 'react';
import { Dashboard } from './Dashboard';

export default function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <Dashboard />
    </div>
  );
}`;

    sandpackFiles["/Dashboard.tsx"] =
      files["Dashboard.tsx"] ||
      `import React, { useState, useEffect } from 'react';

export function Dashboard() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    
    const handleResize = () => {
      setWindowSize({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    // Initialize sizes
    handleResize();
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Dashboard</h1>
      <p style={{ marginBottom: '0.5rem' }}>Mouse: {mousePos.x}, {mousePos.y}</p>
      <p>Window: {windowSize.width} x {windowSize.height}</p>
      <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.375rem' }}>
        <p style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 600 }}>✓ Event listeners properly managed</p>
      </div>
    </div>
  );
}`;
  }

  // For infinite-loop-useeffect simulation
  if (simulationId === "infinite-loop-useeffect") {
    sandpackFiles["/App.tsx"] = `import React from 'react';
import { UserProfile } from './UserProfile';

export default function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <UserProfile />
    </div>
  );
}`;

    sandpackFiles["/UserProfile.tsx"] =
      files["UserProfile.tsx"] ||
      `import React, { useState, useEffect } from 'react';

export function UserProfile() {
  const [user, setUser] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUser({ name: 'John Doe', email: 'john@example.com' });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{user.name}</h1>
      <p style={{ color: '#6b7280' }}>{user.email}</p>
    </div>
  );
}`;
  }

  return (
    <SandpackProvider
      template="react-ts"
      files={sandpackFiles}
      theme="light"
      options={{
        externalResources: [],
        autorun: true,
        autoReload: true,
      }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        style={{
          height: "100%",
          border: "none",
        }}
      />
    </SandpackProvider>
  );
}
