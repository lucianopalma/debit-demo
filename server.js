require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_RESTRICTED_KEY);

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Return publishable key for Stripe.js initialisation
app.get("/config", (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Create and confirm a PaymentIntent using the payment method from the Payment Element
app.post("/create-payment-intent", async (req, res) => {
  const { amount, currency, fundingType, paymentMethodId } = req.body;

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
      payment_method: paymentMethodId,
      confirm: true,
      //...(fundingType === "debit" && {
      //  payment_method_data: {
      //    card: {
      //      funding_options: { preferred: "debit" },
      //    },
      //  },
      //}),
      metadata: {
        required_funding_type: fundingType,
      },
    });

    res.json({ status: paymentIntent.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create and confirm a PaymentIntent using raw card data (no Payment Element)
app.post("/create-payment-intent-raw", async (req, res) => {
  const { amount, currency, fundingType, sendFundingType, cardNumber, cardExpMonth, cardExpYear, cardCvc } = req.body;

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
          exp_month: parseInt(cardExpMonth),
          exp_year: parseInt(cardExpYear),
          cvc: cardCvc,
          ...(sendFundingType && {
            funding_options: {
              preferred: fundingType,
            },
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
