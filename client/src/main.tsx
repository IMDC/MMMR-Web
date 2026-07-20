import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useAuthStore } from './store/authStore';
import './styles/index.css';

// Restore any existing session before the app renders protected routes.
useAuthStore.getState().checkSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
