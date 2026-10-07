import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom"

import './index.css'
import App from './App.jsx'
import QuoteBuilder from './QuoteBuilder.jsx'
import { DataProvider } from './DataContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataProvider>
    <BrowserRouter>

      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/quote" element={<QuoteBuilder />} />
      </Routes>

    </BrowserRouter>
    </DataProvider>
  </StrictMode>,
)