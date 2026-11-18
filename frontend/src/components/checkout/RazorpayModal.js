/**
 * Launches native In-Page Razorpay Checkout Modal (Zero external redirects)
 * @param {Object} params
 * @param {Object} params.order { orderId, totalAmount, razorpayOrderId }
 * @param {Object} params.user { fullName, email, phoneNumber }
 * @param {Function} params.onSuccess (paymentResponse) => void
 * @param {Function} params.onFailure (error) => void
 */
export function openRazorpayCheckout({ order, user, onSuccess, onFailure }) {
  if (typeof window === 'undefined' || !window.Razorpay) {
    console.error('Razorpay SDK is not loaded on window.');
    if (onFailure) {
      onFailure(new Error('Payment gateway SDK not loaded. Please refresh the page.'));
    }
    return;
  }

  // Calculate amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(Number(order.totalAmount || 0) * 100);

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_demo1234567890',
    amount: amountInPaise,
    currency: 'INR',
    name: 'Apex E-Commerce',
    description: `Order #${order.orderId}`,
    prefill: {
      name: user?.fullName || '',
      email: user?.email || '',
      contact: user?.phoneNumber || ''
    },
    theme: {
      color: '#4F46E5' // Brand indigo
    },
    handler: function (response) {
      // response contains { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      if (onSuccess) {
        onSuccess(response);
      }
    },
    modal: {
      ondismiss: function () {
        if (onFailure) {
          onFailure({ message: 'Checkout cancelled by user' });
        }
      }
    }
  };

  try {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (err) {
      console.error('Razorpay payment failed:', err);
      if (onFailure) {
        onFailure(err.error || err);
      }
    });
    rzp.open();
  } catch (error) {
    console.error('Failed to open Razorpay modal:', error);
    if (onFailure) {
      onFailure(error);
    }
  }
}
