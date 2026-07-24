module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(503).json({ error: 'Stripe is not configured on this deployment.' });
  }

  const requestUrl = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const sessionId = requestUrl.searchParams.get('session_id') || '';
  if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return res.status(400).json({ error: 'A valid Stripe session ID is required.' });
  }

  try {
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );

    const data = await stripeResponse.json();
    if (!stripeResponse.ok) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : 'Stripe session verification failed.';
      return res.status(502).json({ error: message });
    }

    return res.status(200).json({
      paid: data.payment_status === 'paid',
      product: data.metadata && data.metadata.product
        ? data.metadata.product
        : null
    });
  } catch (error) {
    console.error('Stripe verification error:', error);
    return res.status(500).json({ error: 'Could not connect to Stripe.' });
  }
};
