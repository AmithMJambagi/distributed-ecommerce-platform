import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ScrollToTop from './components/common/ScrollToTop';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartDrawer from './components/cart/CartDrawer';
import AuthModal from './components/auth/AuthModal';

import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const { isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 font-sans">
      {/* Scroll restoration */}
      <ScrollToTop />

      {/* Top Navbar */}
      <Navbar />

      {/* Main Routed Content */}
      <div className="flex-1">
        <Routes>
          {isAdmin ? (
            /* ADMIN ROUTE ISOLATION: Admin has ONLY Admin Console access */
            <>
              <Route path="/admin" element={<AdminPage />} />
              {/* Redirect any consumer route (/products, /orders, etc.) directly to /admin */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </>
          ) : (
            /* CUSTOMER STOREFRONT ROUTES */
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/order-success" element={<OrderSuccessPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>

      {/* Global Modals & Drawers - Cart is strictly customer-facing */}
      {!isAdmin && <CartDrawer />}
      <AuthModal />

      {/* Bottom Footer */}
      <Footer />
    </div>
  );
}
