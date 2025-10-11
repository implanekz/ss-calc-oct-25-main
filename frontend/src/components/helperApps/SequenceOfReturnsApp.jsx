import React from 'react';

const iframeStyle = {
  width: '100%',
  height: 'calc(100vh - 56px)',
  border: 'none',
  borderRadius: '16px',
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
};

const containerStyle = {
  padding: '0',
  maxWidth: '1200px',
  margin: '0 auto',
  fontFamily: 'Inter, system-ui, sans-serif',
};

const SequenceOfReturnsApp = () => (
  <div style={containerStyle}>
    <iframe
      title="Sequence of Returns Risk"
      src="/sequence-risk-app/index.html"
      style={iframeStyle}
    />
  </div>
);

export default SequenceOfReturnsApp;
