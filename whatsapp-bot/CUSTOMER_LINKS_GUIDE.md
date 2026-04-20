# Customer WhatsApp Links & QR Codes Guide

## 🎯 Two Types of QR Codes - Don't Confuse Them!

### 1. Setup QR Code (For You - ONE TIME)
- **Purpose:** Connect YOUR phone to the bot
- **Who scans:** YOU (business owner)
- **When:** Once during setup
- **Where:** In server terminal logs

### 2. Customer QR Code (For Customers - ALWAYS)
- **Purpose:** Let customers start chatting with bot
- **Who scans:** YOUR CUSTOMERS
- **When:** Anytime they want to contact you
- **Where:** On your website, flyers, social media

---

## 📱 How to Create Customer Links

### Method 1: Manual Link Creation

**Basic Link:**
```
https://wa.me/353XXXXXXXXX
```

**With Pre-filled Message:**
```
https://wa.me/353XXXXXXXXX?text=Hi
```

**Example:**
If your WhatsApp number is +353 87 123 4567:
```
https://wa.me/353871234567?text=Hi,%20I%20want%20to%20ship%20to%20Zimbabwe
```

### Method 2: Use the QR Generator Tool

1. Open `generate-customer-qr.html` in your browser
2. Enter your WhatsApp business number
3. Enter pre-filled message (optional)
4. Click "Generate"
5. Download QR code
6. Copy link

---

## 🌐 Where to Place Your Links

### On Your Website

**Header/Navigation:**
```html
<a href="https://wa.me/353871234567?text=Hi" 
   target="_blank" 
   style="background: #25D366; color: white; padding: 10px 20px; border-radius: 5px;">
   💬 Chat on WhatsApp
</a>
```

**Floating Button (Bottom Right):**
```html
<a href="https://wa.me/353871234567?text=Hi" 
   class="whatsapp-float" 
   target="_blank">
   <img src="whatsapp-icon.png" alt="WhatsApp">
</a>

<style>
.whatsapp-float {
    position: fixed;
    width: 60px;
    height: 60px;
    bottom: 40px;
    right: 40px;
    background-color: #25D366;
    color: white;
    border-radius: 50px;
    text-align: center;
    font-size: 30px;
    box-shadow: 2px 2px 3px #999;
    z-index: 100;
}
</style>
```

### On Facebook

1. Go to your Facebook page
2. Click "Edit Page Info"
3. Add WhatsApp number
4. Or post the link in your bio

### On Instagram

1. Go to your profile
2. Click "Edit Profile"
3. Add link in bio:
   ```
   📱 WhatsApp: wa.me/353871234567
   ```

### On Google My Business

1. Go to Google Business Profile
2. Add WhatsApp as contact method
3. Add link in description

---

## 🖼️ QR Code Usage

### Print Materials

**Business Cards:**
- Add QR code on back
- Text: "Scan to chat on WhatsApp"

**Flyers:**
- Large QR code at bottom
- Text: "Book your shipment via WhatsApp"

**Posters:**
- QR code with call-to-action
- Text: "Ship to Zimbabwe - Scan to start"

**Receipts:**
- Small QR code at bottom
- Text: "Questions? Scan to WhatsApp us"

### Digital Materials

**Email Signature:**
```
---
Zimbabwe Shipping
📱 WhatsApp: [QR Code Image]
Scan to chat instantly!
```

**Social Media Posts:**
- Share QR code image
- Caption: "Book your shipment in seconds! Scan to chat on WhatsApp"

---

## 💡 Best Practices

### Link Text Examples

**Call-to-Action Buttons:**
- "💬 Chat on WhatsApp"
- "📦 Book via WhatsApp"
- "💬 Get Instant Quote"
- "📱 Message Us Now"
- "🚀 Start Booking"

### Pre-filled Messages

**For General Inquiries:**
```
?text=Hi, I have a question about shipping
```

**For Booking:**
```
?text=Hi, I want to book a shipment to Zimbabwe
```

**For Pricing:**
```
?text=Hi, I need a quote for shipping
```

**For Tracking:**
```
?text=Hi, I want to track my shipment
```

---

## 📊 Tracking Link Performance

### Using UTM Parameters

Add tracking to your links:
```
https://wa.me/353871234567?text=Hi&utm_source=website&utm_medium=button&utm_campaign=whatsapp
```

This helps you track:
- Which links get most clicks
- Where customers come from
- Which campaigns work best

---

## 🎨 Customization Ideas

### Different Links for Different Pages

**Homepage:**
```
https://wa.me/353871234567?text=Hi, I'm interested in shipping to Zimbabwe
```

**Pricing Page:**
```
https://wa.me/353871234567?text=Hi, I'd like to know more about your prices
```

**Contact Page:**
```
https://wa.me/353871234567?text=Hi, I have a question
```

**Facebook Ad:**
```
https://wa.me/353871234567?text=Hi, I saw your Facebook ad
```

---

## ✅ Complete Setup Checklist

- [ ] Bot deployed and running on server
- [ ] YOU scanned setup QR code (one time)
- [ ] Bot connected to your WhatsApp number
- [ ] Generated customer WhatsApp link
- [ ] Generated customer QR code
- [ ] Added link to website
- [ ] Added QR code to business cards
- [ ] Added link to Facebook page
- [ ] Added link to Instagram bio
- [ ] Added link to email signature
- [ ] Tested link - opens WhatsApp correctly
- [ ] Tested bot - responds automatically

---

## 🎯 Example: Complete Implementation

**Your WhatsApp Number:** +353 87 123 4567

**Customer Link:**
```
https://wa.me/353871234567?text=Hi
```

**On Website:**
```html
<a href="https://wa.me/353871234567?text=Hi" 
   class="whatsapp-btn">
   💬 Book via WhatsApp
</a>
```

**On Business Card:**
[QR Code Image]
"Scan to book your shipment"

**On Facebook:**
"📱 Book instantly on WhatsApp: wa.me/353871234567"

**Result:**
- Customer clicks link or scans QR
- WhatsApp opens automatically
- Chat with your bot starts
- Bot sends welcome message
- Customer books shipment
- All saved to database

---

## 🎉 You're All Set!

Now you have:
1. ✅ Bot running 24/7 on server
2. ✅ Customer links ready to share
3. ✅ QR codes for print materials
4. ✅ Automatic responses
5. ✅ Database integration

**Customers can now reach you instantly via WhatsApp!** 🚀🇮🇪🇿🇼
