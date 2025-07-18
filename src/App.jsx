import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import fountain from 'fountain-js';

export default function App() {
  const [text, setText] = useState('INT. HOUSE - DAY\nA script example.');
  const [html, setHtml] = useState('');

  useEffect(() => {
    fountain.parse(text, res => setHtml(res.html.script));
  }, [text]);

  return (
    <div className="container">
      <div className="editor-pane">
        <Editor
          height="80vh"
          language="markdown"
          theme="vs-light"
          value={text}
          onChange={value => setText(value ?? '')}
          options={{ fontFamily: 'Courier New, monospace', fontSize: 14 }}
        />
      </div>
      <div
        className="preview-pane"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
