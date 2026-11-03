import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HashRouter } from 'react-router-dom';
import { flushClaudeUsage } from './utils/claudeUsageReport';
import OtaGate from './components/OtaGate';

flushClaudeUsage(); // 지난번에 못 보낸 Claude 사용량을 보낸다

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <OtaGate>
      <HashRouter>
        <App />
      </HashRouter>
    </OtaGate>
  </React.StrictMode>
);
