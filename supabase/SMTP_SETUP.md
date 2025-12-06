# SMTP Setup for Invoice Emails

## Overview
The invoice email system uses your SMTP settings to send PDF invoices to customers.

## Setting Up SMTP Secrets

You need to set the following secrets in Supabase Edge Functions. These should match your SMTP settings from Supabase Auth > Email > SMTP Settings.

### Using Supabase CLI

```bash
# Set your SMTP credentials (use the same values from Supabase SMTP Settings)
supabase secrets set SMTP_HOST=your-smtp-host.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USERNAME=your-smtp-username
supabase secrets set SMTP_PASSWORD=your-smtp-password
supabase secrets set SMTP_FROM_EMAIL=invoices@yourdomain.com
supabase secrets set SMTP_FROM_NAME="Zimbabwe Shipping"
```

### Common SMTP Providers

#### Gmail (for testing)
```bash
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USERNAME=your-email@gmail.com
supabase secrets set SMTP_PASSWORD=your-app-password
```
Note: For Gmail, you need to create an "App Password" in your Google Account settings.

#### SendGrid
```bash
supabase secrets set SMTP_HOST=smtp.sendgrid.net
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USERNAME=apikey
supabase secrets set SMTP_PASSWORD=your-sendgrid-api-key
```

#### Mailgun
```bash
supabase secrets set SMTP_HOST=smtp.mailgun.org
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USERNAME=postmaster@your-domain.mailgun.org
supabase secrets set SMTP_PASSWORD=your-mailgun-password
```

#### Amazon SES
```bash
supabase secrets set SMTP_HOST=email-smtp.us-east-1.amazonaws.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USERNAME=your-ses-smtp-username
supabase secrets set SMTP_PASSWORD=your-ses-smtp-password
```

## Deploy the Edge Function

After setting secrets, deploy the function:

```bash
supabase functions deploy send-invoice-email
```

## Testing

1. Go to Admin Dashboard > Payments & Invoices
2. Find a completed payment
3. Click "Invoice" button
4. Click "Send to Customer"
5. Check the customer's email for the invoice

## Troubleshooting

### Email not sending?
1. Check Supabase Edge Function logs: `supabase functions logs send-invoice-email`
2. Verify SMTP credentials are correct
3. Make sure your SMTP provider allows sending from the FROM_EMAIL address
4. Check if your SMTP provider requires TLS (port 465) or STARTTLS (port 587)

### Common Errors
- **"Email service not configured"**: SMTP secrets not set
- **"Authentication failed"**: Wrong username/password
- **"Connection refused"**: Wrong host or port
- **"Sender not authorized"**: FROM_EMAIL not verified with your SMTP provider
