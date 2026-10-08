import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HashRouter } from 'react-router-dom';
import OtaGate from './components/OtaGate';

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
