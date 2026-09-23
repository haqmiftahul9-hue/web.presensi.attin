import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { SimPresProvider } from './store/simPresStore.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SimPresProvider>
      <App />
    </SimPresProvider>
  </React.StrictMode>,
)
