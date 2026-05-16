# 🧑‍💼 Human Takeover Feature - Complete Guide

## 🎯 What Is Human Takeover?

Human Takeover allows your agents to **pause the bot** and have a **direct conversation** with a customer. When enabled:
- ✅ Bot stops responding automatically
- ✅ Agent can chat freely with the customer
- ✅ Customer is notified an agent has joined
- ✅ Agent can release the conversation back to the bot

## 🚀 How It Works

### Step 1: Customer Contacts Bot
Customer sends a message to the bot number and gets automated responses.

### Step 2: Agent Takes Over
When an agent needs to intervene:
1. Agent opens the Railway logs or terminal where bot is running
2. Agent types: `takeover 353871234567` (customer's number, no + or spaces)
3. Bot pauses automated responses
4. Customer receives: "🧑‍💼 An agent has joined the conversation"

### Step 3: Agent Chats with Customer
- Agent uses WhatsApp on the bot's phone to respond
- All messages from agent appear as coming from the bot number
- Bot remains silent (no automated responses)
- Customer sees they're chatting with a human

### Step 4: Agent Releases Control
When conversation is done:
1. Agent types: `release 353871234567`
2. Bot resumes automated responses
3. Customer receives: "🤖 Agent has left the conversation"

## 📋 Commands Reference

### From Railway Logs / Terminal:

```bash
# Enable human takeover for a customer
takeover 353871234567

# Release customer back to bot
release 353871234567

# Check takeover status
status 353871234567

# Send a test message
send 353871234567 Hello from agent!
```

**Important:** Use digits only, no `+` or spaces!

## 🎬 Example Workflow

### Scenario: Customer Has Complex Question

```
Customer: "I need to ship 5 drums but 2 are oversized, can you help?"
Bot: [Automated response about standard drums]

Customer: "No, I need custom pricing for oversized items"
Bot: [Automated response doesn't understand]

--- AGENT INTERVENES ---

Agent (in terminal): takeover 353871234567
Bot → Customer: "🧑‍💼 An agent has joined the conversation"

Agent (via WhatsApp): "Hi! I'm here to help with your oversized drums. 
Can you tell me the dimensions?"

Customer: "They're 150cm tall and 80cm wide"

Agent: "Perfect! For oversized items, the price is €120 per drum. 
Would you like to proceed?"

Customer: "Yes please!"

Agent: "Great! I'll create a custom booking for you. 
You'll receive a confirmation shortly."

Agent (in terminal): release 353871234567
Bot → Customer: "🤖 Agent has left the conversation. Type 'menu' for options."
```

## 🔧 Technical Details

### What Happens During Takeover?

1. **Session Flag Set**: `humanTakeover: true` in customer's session
2. **Bot Pauses**: All automated responses are suppressed
3. **Messages Still Logged**: Bot sees messages but doesn't respond
4. **Agent Responds Manually**: Via WhatsApp on bot's phone
5. **Session Preserved**: Customer's booking data, state, etc. remain intact

### Session Data Structure

```javascript
{
  phoneNumber: "353871234567@s.whatsapp.net",
  state: "BOOKING_FLOW",
  step: "COLLECT_NAME",
  humanTakeover: true,        // ← Takeover flag
  takenOverBy: "Agent",       // ← Agent identifier
  takenOverAt: "2026-05-14T12:00:00Z",  // ← Timestamp
  bookingData: { ... },       // ← Preserved
  lastActivity: "2026-05-14T12:05:00Z"
}
```

## 📊 Monitoring Takeover Status

### Check Active Takeovers

```bash
# In Railway logs, type:
status 353871234567
```

**Output:**
```
📊 Status for 353871234567@s.whatsapp.net:
   Human Takeover: ✅ YES
   Taken over by: Agent
   Taken over at: 2026-05-14T12:00:00Z
   Current state: BOOKING_FLOW
   Current step: COLLECT_NAME
```

### View All Sessions (Future Enhancement)

Currently, you can check individual sessions. To see all active takeovers, you'd need to query the database:

```sql
SELECT 
  phone_number,
  session_data->>'humanTakeover' as takeover_active,
  session_data->>'takenOverBy' as agent,
  session_data->>'takenOverAt' as takeover_time
FROM bot_sessions
WHERE bot_source = 'whatsapp-bot-ireland'
  AND session_data->>'humanTakeover' = 'true';
```

## 🎯 Best Practices

### When to Use Takeover

✅ **Good Use Cases:**
- Customer has complex/custom requirements
- Bot doesn't understand customer's question
- Customer is frustrated with automated responses
- Need to negotiate pricing or terms
- Sensitive customer service issues
- VIP customers requiring personal attention

❌ **Don't Use For:**
- Simple questions bot can handle
- Standard bookings (let bot complete them)
- Just to say "hello" (bot does this well)

### Agent Guidelines

1. **Always Notify Customer**: Bot automatically sends takeover notification
2. **Be Clear You're Human**: Start with "Hi! I'm [Name] from Zimbabwe Shipping"
3. **Resolve Quickly**: Don't keep customer in limbo
4. **Always Release**: Don't forget to release control when done
5. **Document Complex Cases**: Note any special arrangements

### Timing Considerations

- **Session Timeout**: 30 minutes of inactivity
- **Takeover Duration**: No limit, but release when done
- **Multiple Agents**: Only one agent per customer at a time
- **After Hours**: Bot continues 24/7, takeover available anytime

## 🚨 Troubleshooting

### Problem: Takeover Command Not Working

**Symptoms:**
- Type `takeover 353871234567` but nothing happens
- Error message appears

**Solutions:**
1. Check number format (digits only, no + or spaces)
2. Verify bot is connected (check Railway logs)
3. Ensure you're in the correct terminal/log view
4. Try `status` command first to verify connection

### Problem: Customer Still Getting Bot Responses

**Symptoms:**
- Takeover enabled but bot still responds
- Customer confused about who they're talking to

**Solutions:**
1. Verify takeover is active: `status 353871234567`
2. Check session data in database
3. Restart bot if session is corrupted
4. Re-enable takeover after restart

### Problem: Can't Release Customer

**Symptoms:**
- Type `release` but customer stays in takeover mode
- Bot doesn't resume responses

**Solutions:**
1. Check number format is correct
2. Verify session exists: `status 353871234567`
3. Manually update database if needed:
   ```sql
   UPDATE bot_sessions
   SET session_data = jsonb_set(
     session_data, 
     '{humanTakeover}', 
     'false'
   )
   WHERE phone_number = '353871234567@s.whatsapp.net';
   ```

### Problem: Lost Track of Active Takeovers

**Solution:**
Query database for all active takeovers:
```sql
SELECT 
  phone_number,
  session_data->>'takenOverBy' as agent,
  session_data->>'takenOverAt' as since,
  updated_at
FROM bot_sessions
WHERE bot_source = 'whatsapp-bot-ireland'
  AND session_data->>'humanTakeover' = 'true'
ORDER BY updated_at DESC;
```

## 📱 Customer Experience

### What Customer Sees

**Before Takeover:**
```
Customer: "I have a question"
Bot: "Hello! 👋 Zimbabwe Shipping - Ireland..."
```

**During Takeover:**
```
Bot: "🧑‍💼 An agent has joined the conversation
You are now chatting with a human agent. The bot is paused."

Agent: "Hi! I'm Sarah from Zimbabwe Shipping. How can I help?"
Customer: "I need custom pricing"
Agent: "Of course! Let me help you with that..."
```

**After Release:**
```
Bot: "🤖 Agent has left the conversation
You are now chatting with the automated bot again. Type 'menu' to see options."

Customer: "menu"
Bot: "Hello! 👋 Zimbabwe Shipping - Ireland
Main Menu: 1️⃣ Book a Shipment..."
```

## 🔐 Security Considerations

### Access Control

- **Terminal Access**: Only authorized agents should have Railway log access
- **WhatsApp Access**: Only authorized agents should have bot phone access
- **Session Data**: Contains customer PII, handle with care
- **Audit Trail**: All takeovers are logged with timestamps

### Data Privacy

- Customer conversations are stored in `bot_sessions` table
- Sessions expire after 24 hours of inactivity
- Takeover timestamps are recorded for audit purposes
- GDPR compliance: Customers can request data deletion

## 📈 Future Enhancements

### Planned Features:

1. **Web Dashboard**: View and manage takeovers from admin panel
2. **Multiple Agents**: Assign specific agents to customers
3. **Agent Notifications**: Alert agents when customer needs help
4. **Takeover Queue**: Manage multiple customers waiting for agents
5. **Auto-Release**: Automatically release after X minutes of inactivity
6. **Agent Metrics**: Track response times, resolution rates
7. **Canned Responses**: Quick replies for common questions
8. **Transfer Between Agents**: Hand off customers to specialists

### Integration Ideas:

- **Slack Integration**: Receive customer messages in Slack
- **CRM Integration**: Sync conversations to CRM system
- **Analytics Dashboard**: Track takeover frequency, duration
- **Customer Satisfaction**: Survey after agent interaction

## 📞 Support

### Need Help?

- **Technical Issues**: Check Railway logs for errors
- **Feature Requests**: Document in project issues
- **Training**: Share this guide with new agents

### Quick Reference Card

```
┌─────────────────────────────────────────┐
│  HUMAN TAKEOVER QUICK REFERENCE         │
├─────────────────────────────────────────┤
│  takeover 353871234567  → Take control  │
│  release 353871234567   → Give back     │
│  status 353871234567    → Check status  │
│  send 353871234567 Hi!  → Send message  │
└─────────────────────────────────────────┘
```

---

**Last Updated:** May 14, 2026  
**Version:** 1.0.0  
**Feature Status:** ✅ Active and Ready
