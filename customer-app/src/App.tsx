import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import OrderStatusPage from './pages/OrderStatusPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/order/:orderId" element={<OrderStatusPage />} />
      </Routes>
    </BrowserRouter>
  )
}
