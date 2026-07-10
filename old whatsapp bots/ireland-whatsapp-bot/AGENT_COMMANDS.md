# 🎮 Agent Commands - Quick Reference

## 📋 Available Commands

Type these commands in the Railway logs or terminal where the bot is running:

### 1. Take Over a Conversation
```bash
takeover 353871234567
```
- Pauses bot for this customer
- Customer gets notified: "🧑‍💼 An agent has joined"
- You can now chat manually via WhatsApp

### 2. Release Back to Bot
```bash
release 353871234567
```
- Resumes bot automation
- Customer gets notified: "🤖 Agent has left"
- Bot continues normal operation

### 3. Check Status
```bash
status 353871234567
```
- Shows if takeover is active
- Displays agent name and timestamp
- Shows customer's current state

### 4. Send Test Message
```bash
send 353871234567 Your message here
```
- Sends a message to customer
- Useful for testing bot connection
- Works even without takeover

## 📝 Number Format

**✅ Correct:**
```
takeover 353871234567
release 447584100552
status 263771234567
```

**❌ Wrong:**
```
takeover +353 87 123 4567  ← No + or spaces
takeover 353-87-123-4567   ← No dashes
takeover (353) 871234567   ← No parentheses
```

## 🎯 Common Workflows

### Handle Complex Question
```bash
# 1. Customer asks complex question
# 2. Take over
takeover 353871234567

# 3. Chat via WhatsApp on bot's phone
# 4. When done, release
release 353871234567
```

### Check Multiple Customers
```bash
status 353871234567
status 447584100552
status 263771234567
```

### Emergency Broadcast
```bash
send 353871234567 URGENT: Collection delayed to tomorrow
send 447584100552 URGENT: Collection delayed to tomorrow
```

## 🚨 Important Notes

1. **Only use digits** - No country code symbols (+)
2. **No spaces or dashes** - Just continuous numbers
3. **One agent at a time** - Don't overlap takeovers
4. **Always release** - Don't leave customers in limbo
5. **Bot must be running** - Commands only work when bot is active

## 💡 Pro Tips

- **Use status first** - Check before taking over
- **Document complex cases** - Note special arrangements
- **Release promptly** - Don't keep customers waiting
- **Test with send** - Verify bot is working
- **Monitor logs** - Watch for customer messages

## 🔍 Example Session

```bash
# Check if customer is already in takeover
status 353871234567
📊 Status for 353871234567@s.whatsapp.net:
   Human Takeover: ❌ NO
   Current state: BOOKING_FLOW
   Current step: COLLECT_NAME

# Take over the conversation
takeover 353871234567
✅ Human takeover enabled for 353871234567@s.whatsapp.net
📤 Notification sent to customer

# [Chat with customer via WhatsApp]

# Check status again
status 353871234567
📊 Status for 353871234567@s.whatsapp.net:
   Human Takeover: ✅ YES
   Taken over by: Agent
   Taken over at: 2026-05-14T12:00:00Z
   Current state: BOOKING_FLOW
   Current step: COLLECT_NAME

# Release when done
release 353871234567
✅ Bot control restored for 353871234567@s.whatsapp.net
📤 Notification sent to customer
```

## 📞 Need Help?

- **Commands not working?** Check bot is connected
- **Wrong number format?** Use digits only
- **Customer confused?** They get automatic notifications
- **Lost track?** Use status command

---

**Print this page and keep it handy!** 📄
