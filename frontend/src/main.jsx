import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PreferencesProvider } from './context/PreferencesContext.jsx'
import './index.css'
import './styles/dark-theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </React.StrictMode>,
)
