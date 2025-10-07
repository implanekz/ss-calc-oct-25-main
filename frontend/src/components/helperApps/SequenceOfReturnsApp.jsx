import React from 'react';

const iframeStyle = {
  width: '100%',
  minHeight: '900px',
  border: 'none',
  borderRadius: '16px',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
};

const containerStyle = {
  padding: '24px',
  maxWidth: '1200px',
  margin: '0 auto',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const headerStyle = {
  marginBottom: '18px',
};

const paragraphStyle = {
  color: '#475569',
  margin: 0,
  maxWidth: '760px',
};

const SequenceOfReturnsApp = () => (
  <div style={containerStyle}>
    <header style={headerStyle}>
      <h1 style={{ marginBottom: '8px', color: '#0f172a' }}>Sequence of Returns Simulator</h1>
      <p style={paragraphStyle}>
        Shuffle historical returns, apply guardrail strategies, and see how the order of gains and losses shapes a
        retirement income plan. Use this to create wake-up calls about timing risk before diving into the full Social
        Security analysis.
      </p>
    </header>
    <iframe
      title="Sequence of Returns Risk"
      src="/sequence-risk-app/index.html"
      style={iframeStyle}
    />
  </div>
);

export default SequenceOfReturnsApp;
