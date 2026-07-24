function getOrigin(req) {
  const suppliedOrigin = req.headers.origin;
  if (suppliedOrigin && /^https?:\/\//i.test(suppliedOrigin)) return suppliedOrigin;

  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${protocol}://${host}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!secretKey || !priceId) {
    return res.status(503).json({ error: 'Stripe is not configured on this deployment.' });
  }

  const origin = getOrigin(req);
  if (!origin || origin.endsWith('://')) {
    return res.status(400).json({ error: 'Could not determine the site address.' });
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('line_items[0][price]', priceId);
  form.set('line_items[0][quantity]', '1');
  form.set('success_url', `${origin}/?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${origin}/?checkout=cancelled`);
  form.set('metadata[product]', 'webapp-templates');
  form.set('allow_promotion_codes', 'true');

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });

    const data = await stripeResponse.json();
    if (!stripeResponse.ok || !data.url) {
      const message = data && data.error && data.error.message
        ? data.error.message
        : 'Stripe did not create a checkout session.';
      return res.status(502).json({ error: message });
    }

    return res.status(200).json({ url: data.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({ error: 'Could not connect to Stripe.' });
  }
};
