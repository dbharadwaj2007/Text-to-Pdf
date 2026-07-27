// GET /api/config
// Tells the frontend whether Stripe is set up on this deployment.
// The frontend uses this to decide whether to show a real "Continue to
// Stripe" button or the "checkout not connected" fallback message.

module.exports = async (req, res) => {
  const paymentsEnabled = !!process.env.STRIPE_SECRET_KEY;
  res.status(200).json({ paymentsEnabled });
};
