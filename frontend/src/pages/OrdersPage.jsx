import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../api/orderApi';
import { formatCurrency, formatDate } from '../utils/formatters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Alert from '../components/common/Alert';

export default function OrdersPage() {
  const { isAuthenticated, openAuthModal } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let active = true;
    async function loadOrders() {
      setLoading(true);
      setError('');
      try {
        const data = await orderApi.getMyOrders();
        if (active) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load orders:', err);
          setError('Could not retrieve your orders. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white border border-neutral-900 text-center">
        <h2 className="text-base font-black uppercase tracking-wider text-black">Sign in required</h2>
        <p className="text-xs text-neutral-500 mt-2 mb-6">
          Sign in with your email & OTP to view your previous order history.
        </p>
        <button
          onClick={() => openAuthModal('email')}
          className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 border border-black bg-black text-white text-[10px] font-mono uppercase tracking-wider">
            Confirmed
          </span>
        );
      case 'INVENTORY_RESERVED':
        return (
          <span className="px-2 py-0.5 border border-neutral-400 bg-neutral-100 text-neutral-800 text-[10px] font-mono uppercase tracking-wider">
            Reserved
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 border border-neutral-300 text-neutral-600 text-[10px] font-mono uppercase tracking-wider">
            Pending
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 border border-red-500 text-red-600 text-[10px] font-mono uppercase tracking-wider">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 border border-neutral-300 text-neutral-700 text-[10px] font-mono uppercase tracking-wider">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            Order History
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            RECORDED PURCHASES & SETTLEMENTS
          </p>
        </div>

        <Link
          to="/"
          className="text-xs font-bold uppercase tracking-wider text-neutral-600 hover:text-black flex items-center gap-1 transition"
        >
          <span>Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error && <Alert type="error" message={error} className="mb-6" onClose={() => setError('')} />}

      {/* Loading state */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <LoadingSpinner size="lg" color="black" />
          <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-4">
            Loading order records...
          </p>
        </div>
      ) : orders.length === 0 ? (
        /* Empty state */
        <div className="py-20 bg-white border border-dashed border-neutral-300 text-center p-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800">No Orders Placed</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            You haven't placed any orders yet. Discover our catalog to start shopping.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        /* Orders List */
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.orderId}
              className="bg-white border border-neutral-200 transition hover:border-black"
            >
              {/* Order Card Header */}
              <div className="px-6 py-4 bg-neutral-50/70 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="uppercase text-[11px] font-bold">Order:</span>
                    <span className="font-mono font-bold text-black">{order.orderId}</span>
                  </div>
                  <span className="text-neutral-300">|</span>
                  <div className="text-neutral-500 font-mono text-[11px]">
                    {formatDate(order.createdAt)}
                  </div>
                </div>

                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Items List */}
              <div className="p-6 divide-y divide-neutral-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => {
                    const displayName = item.productName || item.productId;
                    return (
                      <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Product Image Thumbnail */}
                          <Link
                            to={`/product/${item.productId}`}
                            className="w-12 h-12 sm:w-14 sm:h-14 bg-neutral-50 border border-neutral-200 shrink-0 flex items-center justify-center p-1 overflow-hidden hover:border-black transition"
                          >
                            {item.primaryImageUrl ? (
                              <img
                                src={item.primaryImageUrl}
                                alt={displayName}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-5 h-5 text-neutral-300" />
                            )}
                          </Link>

                          {/* Product Info */}
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/product/${item.productId}`}
                              className="text-xs font-bold text-neutral-900 hover:text-black hover:underline line-clamp-1 transition"
                            >
                              {displayName}
                            </Link>
                            <p className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                              QTY {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-black font-mono">
                            {formatCurrency(item.subtotal || item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-neutral-400 py-2">Item details logged.</p>
                )}
              </div>

              {/* Order Card Footer */}
              <div className="px-6 py-4 bg-white border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {order.shippingAddress && (
                  <div className="text-neutral-600 max-w-md">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-neutral-400 block mb-0.5">Shipping Destination</span>
                    <span className="line-clamp-1 text-xs">{order.shippingAddress}</span>
                  </div>
                )}

                <div className="flex items-baseline gap-2 sm:ml-auto">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total:</span>
                  <span className="text-base font-black text-black font-mono">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
