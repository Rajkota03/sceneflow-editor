import React from 'react';
import { createRoot } from 'react-dom/client';
import ScreenplayEditor from './src/ScreenplayEditor.jsx';

function App() {
  return (
    <div>
      <h1>Screenplay Editor</h1>
      <ScreenplayEditor />
    </div>
  );
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);
