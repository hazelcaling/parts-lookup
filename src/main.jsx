import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import './index.css'
import './App.css'
import App from './App.jsx'
import { DataProvider, LoadingScreen } from './DataContext.jsx'
import Nav from './components/Nav.jsx'

// The Quote Builder, Price Lists, Purchase Order and Order Confirmation pages load only when opened, so the main page starts faster
const QuoteBuilder = lazy(() => import('./QuoteBuilder.jsx'))
const PriceLists = lazy(() => import('./pages/PriceLists.jsx'))
const PurchaseOrder = lazy(() => import('./pages/PurchaseOrder.jsx'))
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataProvider>
    <BrowserRouter>
      <Nav />

      <Suspense fallback={<LoadingScreen message="Loading page…" />}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/quote" element={<QuoteBuilder />} />
        <Route path="/pricelists" element={<PriceLists />} />
        <Route path="/po" element={<PurchaseOrder />} />
        <Route path="/order-confirmation" element={<OrderConfirmation />} />
        <Route path="/search" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

    </BrowserRouter>
    </DataProvider>
  </StrictMode>,
)