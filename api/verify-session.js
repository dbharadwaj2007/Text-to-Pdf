// GET /api/verify-session?session_id=cs_test_...
// Called by the frontend after Stripe redirects back, to confirm the
// payment actually went through before unlocking Pro templates.

const Stripe = require('stripe');

module.exports = async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(200).json({ paid: false });
    return;
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { session_id } = req.query;
    if (!session_id) {
      res.status(400).json({ error: 'session_id required' });
      return;
    }
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.status(200).json({
      paid: session.payment_status === 'paid',
      product: session.metadata?.product,
    });
  } catch (err) {
    res.status(400).json({ paid: false, error: 'Invalid session' });
  }
};
