import api from './client';

export const paymentApi = {
  /**
   * Fetch payment details and the 10-minute active Razorpay hosted URL from Redis
   * @param {string} orderId
   */
  getPaymentDetails: async (orderId) => {
    const response = await api.get(`/api/v1/payments/${orderId}`);
    return response.data;
  },

  /**
   * Polls getPaymentDetails up to 3 times with a 3-second interval (max ~6-9s)
   * @param {string} orderId
   * @param {number} maxAttempts
   * @param {number} intervalMs
   */
  pollPaymentLink: async (orderId, maxAttempts = 3, intervalMs = 3000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const details = await paymentApi.getPaymentDetails(orderId);
        if (details && details.paymentUrl) {
          return details;
        }
      } catch (err) {
        // Payment record may still be in transit across Kafka Saga
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }
    throw new Error(
      'Payment could not be processed. Please ensure your total is under ₹5,00,000 (gateway limit) and try again shortly, or complete payment from your Orders page.'
    );
  }
};
