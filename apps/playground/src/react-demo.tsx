import React from 'react';
import { createRoot } from 'react-dom/client';
import { AutomatosChat } from '@automatos/widget-sdk/react';

function App() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>React Component</h2>
        <p style={{ color: '#666', fontSize: 14 }}>
          The <code>&lt;AutomatosChat /&gt;</code> component mounts the chat widget.
        </p>
      </div>
      <AutomatosChat
        apiKey="ak_pub_test_123"
        baseUrl="http://localhost:8000"
        position="bottom-right"
        theme="light"
        greeting="Hi from React! How can I help?"
      />
    </div>
  );
}

const root = document.getElementById('react-root');
if (root) {
  createRoot(root).render(<App />);
}
