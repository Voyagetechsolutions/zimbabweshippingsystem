# 🎯 Agent Guide - Super Simple!

## ✅ NO RAILWAY NEEDED!

You can control everything **directly from WhatsApp**!

---

## 📱 How It Works

### **You Have the Bot's Phone**

The bot runs on a WhatsApp number. You (the agent) have access to that phone.

### **Two Ways to Use It:**

1. **Let bot handle everything** (most of the time)
2. **Take over when needed** (rare cases)

---

## 🎬 Step-by-Step Example

### **Scenario: Customer Needs Custom Pricing**

#### **Step 1: You See the Conversation**
On the bot's WhatsApp, you see:
```
Customer (353871234567): "I need custom pricing for oversized drums"
Bot: "Here's our standard pricing..."
Customer: "No! I need CUSTOM pricing!"
```

#### **Step 2: You Take Over (In WhatsApp)**
**On the bot's WhatsApp**, send a message to **yourself**:
```
/takeover 353871234567
```

**What happens:**
- Bot pauses for that customer
- Customer gets: "🧑‍💼 An agent has joined the conversation"
- You get: "✅ Takeover enabled for 353871234567"

#### **Step 3: You Chat with Customer**
Now just chat normally in WhatsApp:
```
You → Customer: "Hi! I'm Sarah from Zimbabwe Shipping. 
I can help with custom pricing for oversized drums..."

Customer → You: "Great! They're 150cm tall..."

You → Customer: "Perfect! For that size, it's €120 per drum..."
```

#### **Step 4: You Release (In WhatsApp)**
When done, send to **yourself** again:
```
/release 353871234567
```

**What happens:**
- Bot resumes for that customer
- Customer gets: "🤖 Agent has left the conversation"
- You get: "✅ Bot control restored for 353871234567"

---

## 📋 The 3 Commands

### **1. Take Over**
```
/takeover 353871234567
```
- Pauses bot for that customer
- You can now chat with them

### **2. Release**
```
/release 353871234567
```
- Bot resumes for that customer
- Back to automation

### **3. Check Status**
```
/status 353871234567
```
- Shows if takeover is active
- Shows customer's current state

### **4. Help**
```
/help
```
- Shows list of commands

---

## 🎯 Where to Type Commands?

### **In WhatsApp!**

1. Open WhatsApp on the bot's phone
2. Go to your own chat (the bot talking to itself)
3. Type the command
4. Send!

**That's it!** No Railway, no terminal, no technical stuff!

---

## 💡 Real Example

```
┌─────────────────────────────────────────────────┐
│         BOT'S WHATSAPP (Your Phone)             │
├─────────────────────────────────────────────────┤
│                                                  │
│  Chat: Customer (353871234567)                  │
│  ┌────────────────────────────────────────┐    │
│  │ Customer: I need custom pricing         │    │
│  │ Bot: Here's standard pricing...         │    │
│  │ Customer: No! CUSTOM pricing!           │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Chat: Me (Bot's own number)                    │
│  ┌────────────────────────────────────────┐    │
│  │ Me: /takeover 353871234567              │    │
│  │ Bot: ✅ Takeover enabled                │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Chat: Customer (353871234567)                  │
│  ┌────────────────────────────────────────┐    │
│  │ Bot: 🧑‍💼 An agent has joined           │    │
│  │ Me: Hi! I'm Sarah, I can help...       │    │
│  │ Customer: Great! I need...              │    │
│  │ Me: Perfect! The price is...            │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  Chat: Me (Bot's own number)                    │
│  ┌────────────────────────────────────────┐    │
│  │ Me: /release 353871234567               │    │
│  │ Bot: ✅ Bot control restored            │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🚨 Important Notes

### **Number Format:**
- ✅ **Correct:** `/takeover 353871234567` (Ireland)
- ✅ **Correct:** `/takeover 27615321107` (Zimbabwe)
- ❌ **Wrong:** `/takeover +353 87 123 4567` (has + and spaces)
- ❌ **Wrong:** `/takeover 0871234567` (missing country code)
- ❌ **Wrong:** `/takeover 353-87-123-4567` (has dashes)

**Use digits only, no + or spaces!**  
**Always include country code:**
- Zimbabwe: `27` (e.g., `27615321107`)
- Ireland: `353` (e.g., `353871234567`)
- UK: `44` (e.g., `447123456789`)

### **One Command Per Message:**
- ✅ **Correct:** Send one command, wait for confirmation
  ```
  /takeover 27615321107
  ```
  (wait for "✅ Takeover enabled")

- ❌ **Wrong:** Multiple commands in one message
  ```
  /takeover 27615321107 /release 27615321107
  ```

### **Where to Send Commands:**
Send commands to **yourself** (the bot's own chat)

### **Where to Chat with Customer:**
In the customer's chat (normal WhatsApp)

---

## 🎯 Quick Checklist

### **When Customer Needs Help:**
- [ ] See customer's message on bot's WhatsApp
- [ ] Go to your own chat (bot's number)
- [ ] Type: `/takeover 353871234567`
- [ ] Go back to customer's chat
- [ ] Chat normally
- [ ] When done, go to your own chat
- [ ] Type: `/release 353871234567`
- [ ] Done!

---

## 💡 Pro Tips

1. **Save the bot's number** in your contacts as "Bot Commands"
2. **Pin the bot's chat** for quick access
3. **Copy/paste numbers** to avoid typos
4. **Always release** when done chatting

---

## 🎉 That's It!

**No Railway needed!**  
**No technical knowledge needed!**  
**Just WhatsApp commands!**

---

## 📞 Need Help?

### **Forgot a command?**
Send `/help` to yourself in WhatsApp

### **Command not working?**
- Check number format (digits only)
- Make sure you're sending to yourself
- Try again

### **Still stuck?**
Contact dev team

---

**Print this page and keep it handy!** 📄
