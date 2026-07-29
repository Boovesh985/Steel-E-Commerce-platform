import apiClient from './client';

export const paymentsApi = {
  // { orderId } — backend computes the amount server-side from the order
  // and returns a Razorpay order id (and whatever amount/currency it used).
  createOrder: (orderId) => apiClient.post('/payments/create-order', { orderId }).then((r) => r.data),

  verify: (payload) => apiClient.post('/payments/verify', payload).then((r) => r.data),
};

// The backend doesn't expose an endpoint for the Razorpay publishable key —
// it's a public key, safe to ship in the frontend build via env var.
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

let razorpayScriptPromise = null;
export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

/**
 * Orchestrates a full Razorpay checkout flow:
 * 1. POST /payments/create-order with the internal orderId to get a Razorpay order id.
 * 2. Loads checkout.js and opens the payment sheet.
 * 3. POST /payments/verify with the signature on success.
 *
 * @param {Object} params
 * @param {string} params.orderId - Internal AMK order ID.
 * @param {number} params.amount - Order total in rupees, used only for display in the checkout sheet.
 * @param {Object} params.customer - { name, email, contact }.
 * @param {Function} params.onSuccess - Called with the verification response.
 * @param {Function} params.onFailure - Called with { message, error? }.
 */
export async function startRazorpayCheckout({ orderId, amount, customer, onSuccess, onFailure }) {
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    onFailure?.({ message: 'Unable to load the payment gateway. Check your connection and try again.' });
    return;
  }

  try {
    const { razorpayOrderId, amount: paiseAmount, currency } = await paymentsApi.createOrder(orderId);

    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: paiseAmount ?? Math.round(Number(amount) * 100),
      currency: currency || 'INR',
      name: 'AMK Steels Marketplace',
      description: `Payment for order #${orderId}`,
      order_id: razorpayOrderId,
      prefill: {
        name: customer?.name,
        email: customer?.email,
        contact: customer?.contact,
      },
      theme: { color: '#1A56DB' },
      handler: async (response) => {
        try {
          const verification = await paymentsApi.verify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId,
          });
          onSuccess?.(verification);
        } catch (err) {
          onFailure?.({ message: 'Payment verification failed.', error: err });
        }
      },
      modal: {
        ondismiss: () => onFailure?.({ message: 'Payment was cancelled.' }),
      },
    });

    rzp.on('payment.failed', (response) => {
      onFailure?.({ message: response.error?.description || 'Payment failed.', error: response.error });
    });

    rzp.open();
  } catch (err) {
    onFailure?.({ message: 'Could not initiate payment.', error: err });
  }
}
