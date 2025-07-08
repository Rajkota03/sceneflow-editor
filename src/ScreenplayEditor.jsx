import React, { useState } from 'react';
import fountain from 'fountain-js';

export default function ScreenplayEditor() {
  const [script, setScript] = useState(`INT. BEDROOM - NIGHT\nA man stands quietly.`);
  const [parsedHtml, setParsedHtml] = useState('');

  const handleChange = (e) => {
    const text = e.target.value;
    setScript(text);

    fountain.parse(text, (result) => {
      setParsedHtml(result.html.script);
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Courier Prime, monospace' }}>
      <textarea
        value={script}
        onChange={handleChange}
        style={{
          width: '50%',
          padding: '1rem',
          fontSize: '16px',
          lineHeight: '1.5',
          border: '1px solid #ccc',
        }}
      />
      <div
        style={{
          width: '50%',
          padding: '1rem',
          borderLeft: '1px solid #ddd',
          overflowY: 'auto',
          background: '#fff',
        }}
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
    </div>
  );
}
