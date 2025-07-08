import React, { useState } from 'react';
import fountain from 'fountain-js';
import './styles/screenplay.css';

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
    <div className="screenplay-editor" style={{ fontFamily: 'Courier Prime, monospace' }}>
      <textarea
        value={script}
        onChange={handleChange}
        className="screenplay-input"
      />
      <div
        className="screenplay-preview"
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
      />
    </div>
  );
}
