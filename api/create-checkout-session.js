// POST /api/create-checkout-session
// Body: { product: 'webapp-templates' }
// Returns: { url, id } — the frontend redirects the browser to `url`.

const Stripe = require('stripe');

const PRICES = {
  'webapp-templates': { amount: 900, name: 'Notepad→PDF — Pro Templates Unlock' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({ error: 'Stripe is not configured on this deployment.' });
    return;
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { product } = req.body || {};
    const priceInfo = PRICES[product];
    if (!priceInfo) {
      res.status(400).json({ error: 'Unknown product' });
      return;
    }

    // Works out this deployment's own URL so Stripe redirects back to the
    // right place, whether you're on the vercel.app domain or a custom one.
    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: priceInfo.name },
            unit_amount: priceInfo.amount,
          },
          quantity: 1,
        },
      ],
      metadata: { product },
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}&product=${product}`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
