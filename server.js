require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_RESTRICTED_KEY);

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Create a PaymentIntent with the requested amount and funding type metadata
app.post("/create-payment-intent", async (req, res) => {
  const { amount, currency, fundingType, cardNumber, expMonth, expYear } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  if (!["credit", "debit"].includes(fundingType)) {
    return res.status(400).json({ error: "Invalid funding type" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency || "brl",
      payment_method_types: ["card"],
      payment_method_data: {
        type: "card",
        card: {
          number: cardNumber,
          exp_month: parseInt(expMonth),
          exp_year: parseInt(expYear),
          ...(fundingType === "debit" && {
            funding_options: { preferred: "debit" },
          }),
        },
      },
      confirm: true,
      metadata: {
        required_funding_type: fundingType,
      },
    });

    res.json({ status: paymentIntent.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Retrieve payment intent to show result
app.get("/payment-intent/:id", async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(req.params.id);
    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      fundingType: paymentIntent.metadata.required_funding_type,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
