import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import './index.css'
import App from './App.jsx'
import QuoteBuilder from './QuoteBuilder.jsx'
import { DataProvider } from './DataContext.jsx'
import Nav from './components/Nav.jsx'
import PriceLists from './pages/PriceLists.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataProvider>
    <BrowserRouter>
      <Nav />

      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/quote" element={<QuoteBuilder />} />
        <Route path="/pricelists" element={<PriceLists />} />
        <Route path="/search" element={<Navigate to="/" replace />} />
      </Routes>

    </BrowserRouter>
    </DataProvider>
  </StrictMode>,
)