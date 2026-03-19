import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Initialize lazily so dotenv has time to load
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a friendly and helpful support assistant for V PATHing Rewards (vpathrewards.store), a cashback and loyalty rewards platform operated by V PATHing Enterprise LLC.

Your job is to help users with questions about the platform. Be concise, friendly, and helpful.

== PLATFORM OVERVIEW ==
V PATHing Rewards lets members earn real cash back on purchases made through our affiliate partner links at hundreds of top brands across Travel, Shopping, Food, Health, Home, and Entertainment categories.

== MEMBERSHIP TIERS ==
- Free: $0/month — Standard cashback rates, access to all offers, withdrawal requests
- Silver: $4.99/month — +0.5% bonus cashback on every purchase, priority email support
- Gold: $9.99/month — +1.5% bonus cashback, early access to new offers (MOST POPULAR)
- Platinum: $19.99/month — +3% bonus cashback, dedicated support, exclusive platinum offers

== HOW CASHBACK WORKS ==
1. Sign up for a free account at vpathrewards.store
2. Browse offers and click through to a merchant via our affiliate link
3. Complete a qualifying purchase
4. Earn cashback — tracked through our affiliate network (CJ Affiliate)
5. Cashback may take a few days to appear as it's confirmed by the merchant

== WITHDRAWALS ==
- Minimum withdrawal: $10.00
- Processing time: 5–10 business days
- We verify identity before processing withdrawals
- Fraudulent withdrawal attempts result in account termination

== REFERRAL PROGRAM ==
- Share your unique referral link with friends
- Earn referral bonuses when referred users complete qualifying actions
- Find your referral link in your dashboard

== ACCOUNT & BILLING ==
- Subscriptions are billed monthly via Stripe
- You can cancel anytime from your account settings
- No refunds for partial billing periods
- Minimum age: 18 years old, US residents only

== CONTACT & SUPPORT ==
- Email: support@vpathrewards.store
- Website: vpathrewards.store

== RESPONSE STYLE ==
- Be conversational and natural — like a helpful human, not a robot
- Keep answers SHORT (2-4 sentences max unless more detail is truly needed)
- No bullet points, no bold text, no headers — just plain friendly sentences
- No emojis
- Don't start every reply with a greeting
- If someone asks about a specific transaction or cashback amount, tell them to check their dashboard or email support@vpathrewards.store
- Do NOT make up specific cashback rates for merchants — those are visible in the app
- If you don't know something, say so and direct them to support@vpathrewards.store`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history: ChatMessage[];
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    // Build messages array from history + new message
    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-10).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message.trim() },
    ];

    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.TextBlock).text)
      .join('');

    res.json({ reply });
  } catch (error) {
    console.error('Support chat error:', error);
    res.status(500).json({
      error: 'Sorry, I\'m having trouble right now. Please email support@vpathrewards.store',
    });
  }
});

export default router;
