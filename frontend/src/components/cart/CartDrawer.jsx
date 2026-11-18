import React, { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, ExternalLink, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/userApi';
import { orderApi } from '../../api/orderApi';
import { paymentApi } from '../../api/paymentApi';
import { formatCurrency } from '../../utils/formatters';
import LoadingSpinner from '../common/LoadingSpinner';
import Alert from '../common/Alert';

export default function CartDrawer() {
  const { items, totalAmount, totalCount, isDrawerOpen, closeDrawer, updateQuantity, removeItem, clearCart, loading } =
    useCart();
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [error, setError] = useState('');

  // Fetch address from profile when authenticated
  useEffect(() => {
    if (isDrawerOpen && isAuthenticated) {
      userApi
        .getProfile()
        .then((profile) => {
          if (profile && profile.address) {
            setShippingAddress(profile.address);
          }
        })
        .catch((err) => console.warn('Could not load profile address', err));
    }
  }, [isDrawerOpen, isAuthenticated]);

  if (!isDrawerOpen) return null;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      closeDrawer();
      openAuthModal('email');
      return;
    }

    if (!shippingAddress.trim()) {
      setError('Please provide a delivery address before checkout.');
      return;
    }

    setError('');
    setCheckoutLoading(true);
    setCheckoutStatus('Creating order and reserving stock...');

    try {
      // 1. Create order
      const order = await orderApi.checkoutCart(shippingAddress);

      // 2. Fetch active Razorpay payment link from Payment Service
      setCheckoutStatus('Fetching secure Razorpay payment link...');
      const paymentDetails = await paymentApi.pollPaymentLink(order.orderId);

      if (paymentDetails && paymentDetails.paymentUrl) {
        clearCart();
        setCheckoutStatus('Redirecting to Razorpay payment gateway...');
        window.location.href = paymentDetails.paymentUrl;
      } else {
        throw new Error('Payment link not received. Please try again.');
      }
    } catch (err) {
      console.error('Cart checkout error:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to checkout cart. One or more items might be out of stock.'
      );
      setCheckoutLoading(false);
      setCheckoutStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/40 backdrop-blur-none transition-opacity"
      />

      {/* Slide-over panel: Full width on mobile, max-w-md on tablet/desktop */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-white border-l border-neutral-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-black shrink-0" />
              <h2 className="font-black text-xs sm:text-sm tracking-widest uppercase text-black">
                Shopping Cart
              </h2>
              <span className="text-xs font-mono font-bold bg-neutral-100 text-black px-2 py-0.5 rounded-full border border-neutral-200">
                {totalCount}
              </span>
            </div>
            <button
              onClick={closeDrawer}
              disabled={checkoutLoading}
              className="p-1.5 text-neutral-500 hover:text-black border border-transparent hover:border-black transition-colors"
              aria-label="Close cart"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-16">
                <p className="font-bold text-neutral-800 text-sm uppercase tracking-wider">Cart is Empty</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                  Add items from the catalog to start checkout.
                </p>
                <button
                  onClick={closeDrawer}
                  className="mt-6 px-5 py-2.5 border border-black text-black font-bold text-xs uppercase tracking-wider hover:bg-black hover:text-white transition"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-3 sm:gap-4 p-3 sm:p-4 border border-neutral-200 bg-white"
                >
                  <img
                    src={item.primaryImageUrl || 'https://via.placeholder.com/70'}
                    alt={item.productName}
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain bg-neutral-50 border border-neutral-100 p-1 shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/70?text=Item';
                    }}
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-tight line-clamp-2 break-words">
                        {item.productName}
                      </h4>
                      <p className="text-[11px] sm:text-xs font-mono text-neutral-500 mt-0.5">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-neutral-100">
                      {/* Quantity stepper with min(10, stock) cap */}
                      {(() => {
                        const maxLimit = Math.min(10, Number(item.availableStock ?? 10));
                        const isAtMax = item.quantity >= maxLimit;

                        return (
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-neutral-300">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                disabled={loading || checkoutLoading || item.quantity <= 1}
                                className="px-2 py-0.5 sm:px-2.5 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="px-2.5 py-0.5 sm:px-3 text-xs font-mono font-bold text-neutral-900 border-x border-neutral-300">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, Math.min(maxLimit, item.quantity + 1))}
                                disabled={loading || checkoutLoading || isAtMax}
                                className="px-2 py-0.5 sm:px-2.5 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            {isAtMax && (
                              <span className="text-[10px] font-mono text-neutral-400">
                                {Number(item.availableStock) < 10
                                  ? `(Max: ${item.availableStock})`
                                  : '(Max: 10)'}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Subtotal and Remove */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="font-bold text-xs text-neutral-900 font-mono">
                          {formatCurrency(item.subtotal || item.unitPrice * item.quantity)}
                        </span>
                        <button
                          type="button"
                          disabled={checkoutLoading}
                          onClick={() => removeItem(item.productId)}
                          className="text-neutral-400 hover:text-black p-1 transition disabled:opacity-30"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="border-t border-neutral-200 p-4 sm:p-6 bg-white space-y-3 sm:space-y-4">
              {/* Delivery Address (only for logged-in users) */}
              {isAuthenticated ? (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Delivery Shipping Address
                  </label>
                  <textarea
                    rows={2}
                    required
                    disabled={checkoutLoading}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Street address, City, PIN Code"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 focus:border-black focus:outline-none transition font-sans"
                  />
                </div>
              ) : (
                <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-700">
                  <p className="font-bold uppercase tracking-wider text-[11px]">Authentication Required</p>
                  <p className="text-neutral-500 text-[11px] mt-0.5">Please sign in with your email & OTP to place your order.</p>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span className="uppercase tracking-wider text-[11px]">Subtotal</span>
                  <span className="font-mono font-medium text-neutral-900">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-neutral-500">
                  <span className="uppercase tracking-wider text-[11px]">Shipping</span>
                  <span className="font-mono text-black font-semibold">FREE</span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex justify-between font-bold text-sm">
                  <span className="uppercase tracking-wider">Total Amount</span>
                  <span className="text-black font-mono font-black">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Action Button: Enforces Login */}
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    openAuthModal('email');
                  }}
                  className="w-full py-3 sm:py-3.5 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  <span>Sign In with OTP to Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutLoading || items.length === 0}
                  className="w-full py-3 sm:py-3.5 px-4 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                >
                  {checkoutLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" color="white" />
                      <span className="truncate max-w-[200px]">{checkoutStatus || 'Processing...'}</span>
                    </div>
                  ) : (
                    <>
                      <span>Proceed to Payment</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
