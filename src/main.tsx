import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from '@descope/react-sdk';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider projectId="P37sOCdLJjVCAuLgqv2zMvS61Xbo">
      <App />
    </AuthProvider>
  </StrictMode>,
);
