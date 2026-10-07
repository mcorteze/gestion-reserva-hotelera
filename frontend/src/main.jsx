import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ProveedorSesion } from './contexto/Sesion.jsx';
import { ProveedorIdioma } from './contexto/Idioma.jsx';
import './estilos.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProveedorSesion>
        <ProveedorIdioma>
          <App />
        </ProveedorIdioma>
      </ProveedorSesion>
    </BrowserRouter>
  </React.StrictMode>
);
