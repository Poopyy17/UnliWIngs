// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import InitialChoice from '@/components/customer/InitialChoice';
import QrScanner from '@/components/customer/QrScanner';
import OrderMenu from '@/components/customer/OrderMenu';
import OrderSummary from '@/components/customer/OrderSummary';
import BillOut from '@/components/customer/BillOut';
import Dashboard from './components/admin/Dashboard';
import { OrderProvider } from '../context/orderContext';

const App = () => {
  return (
    <OrderProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin" element={<Dashboard />} />

            {/* Customer Routes */}
            <Route path="/" element={<InitialChoice />} />
            <Route path="/scan-qr" element={<QrScanner />} />
            <Route path="/order" element={<OrderMenu />} />
            <Route path="/summary" element={<OrderSummary />} />
            <Route path="/bill" element={<BillOut />} />
          </Routes>
        </div>
      </Router>
    </OrderProvider>
  );
};

export default App;
