import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id') || 'ORD-' + Math.random().toString(36).substring(2, 9).toUpperCase();
  const paymentId = searchParams.get('payment_id') || '';
  const amount = searchParams.get('amount');
  const status = (searchParams.get('status') || 'SUCCESS').toUpperCase();

  const isRefunded = status === 'REFUNDED';
  const isFailed = status === 'FAILED';
  const isSuccess = status === 'SUCCESS' || (!isRefunded && !isFailed);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-white">
      <div className="max-w-md w-full border border-neutral-900 p-8 text-center animate-in zoom-in-95 duration-200">
        {/* Status Tag */}
        <div className="mb-6">
          <span
            className={`inline-block px-3 py-1 text-xs font-mono font-bold uppercase tracking-widest border ${
              isSuccess
                ? 'bg-black text-white border-black'
                : isRefunded
                ? 'bg-neutral-100 text-neutral-800 border-neutral-400'
                : 'bg-red-50 text-red-700 border-red-500'
            }`}
          >
            {status}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black uppercase tracking-tight text-black">
          {isSuccess
            ? 'Payment Confirmed'
            : isRefunded
            ? 'Hold Expired & Refunded'
            : 'Payment Incomplete'}
        </h1>
        <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
          {isSuccess
            ? 'Your payment was successfully settled. Order allocation has been dispatched to warehouse inventory.'
            : isRefunded
            ? 'The 10-minute inventory hold expired before payment finalized. A 100% full refund was automatically issued to your account.'
            : 'Payment verification could not be verified. You can retry from your orders dashboard.'}
        </p>

        {/* Receipt Box */}
        <div className="my-8 p-4 bg-neutral-50 border border-neutral-200 text-left space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Order ID</span>
            <span className="font-bold text-black text-xs truncate max-w-[200px]">
              {orderId}
            </span>
          </div>

          {paymentId && (
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Razorpay Reference</span>
              <span className="text-neutral-800 text-xs truncate max-w-[200px]">
                {paymentId}
              </span>
            </div>
          )}

          {amount && (
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Settled Amount</span>
              <span className="font-black text-black text-sm">
                {formatCurrency(amount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Settlement Status</span>
            <span className="font-bold text-black uppercase">
              {status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <Link
            to="/"
            className="w-full py-3.5 px-4 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            to="/orders"
            className="w-full py-3 px-4 border border-black bg-white hover:bg-neutral-50 text-black font-bold text-xs uppercase tracking-wider transition block"
          >
            View Order History
          </Link>
        </div>
      </div>
    </div>
  );
}
