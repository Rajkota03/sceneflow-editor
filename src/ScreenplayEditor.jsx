import React, { useState } from 'react';
import fountain from 'fountain-js';
import './styles/screenplay.css';

function ScreenplayEditor() {
  const [text, setText] = useState('INT. ROOM - DAY\nA simple example.');
  const [html, setHtml] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    try {
      const parsed = fountain.parse(value);
      setHtml(parsed.html);
    } catch (err) {
      setHtml(`<pre>${err.message}</pre>`);
    }
  };

  return (
    <div className="screenplay-editor">
      <textarea value={text} onChange={handleChange} className="screenplay-input" />
      <div className="screenplay-preview" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default ScreenplayEditor;
