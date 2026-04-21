# Railway Deployment Checklist

## Pre-Deployment

- [ ] Code committed to GitHub repository
- [ ] Railway account created and linked to GitHub
- [ ] PostgreSQL database provisioned on Railway

## Environment Setup

- [ ] `DATABASE_URL` - Automatically set by Railway PostgreSQL
- [ ] `RAILWAY_PUBLIC_DOMAIN` - Automatically set by Railway
- [ ] `SESSION_PATH` - Set to `/app/data/whatsapp-session` (optional, has default)
- [ ] `LOG_LEVEL` - Set to `info` or `debug` (optional, defaults to `info`)

## Deployment

- [ ] Repository connected to Railway project
- [ ] Dockerfile detected by Railway
- [ ] Build completed successfully
- [ ] Service started and running

## First Connection

- [ ] Check Railway logs for QR code URL
- [ ] Open QR code URL: `https://your-app.railway.app/qr-code`
- [ ] Download QR code image
- [ ] Scan QR code with WhatsApp within 60 seconds
- [ ] Wait for "✅ WhatsApp Bot Connected Successfully!" in logs
- [ ] Verify "🔒 Session saved" message appears
- [ ] Confirm old QR codes cleaned up (🧹 messages in logs)

## Post-Connection Verification

- [ ] Bot shows as connected in logs
- [ ] No repeated disconnection/reconnection cycles
- [ ] Test message sent to bot
- [ ] Bot responds to test message
- [ ] Session persists after Railway restart

## Expected Behavior

### Normal Logs
```
🚀 Starting Zimbabwe Shipping WhatsApp Bot (Ireland)...
🌐 QR Code Server started on port 3000
📥 Download QR code at: https://your-app.railway.app/qr-code
🔗 New QR code received from WhatsApp
📸 QR code saved to: /app/data/qr-code-latest.png
✅ WhatsApp Bot Connected Successfully!
🇮🇪 Zimbabwe Shipping Ireland Bot is now active
🔒 Session saved - no QR code needed on restart!
🧹 Cleaned up QR code: qr-code-latest.png
```

### Expected Sync Errors (Non-Critical)
```
failed to sync state from version
tried remove, but no previous op
```
**These are normal and don't indicate a problem.**

### Concerning Logs
```
Connection closed. Status: 401
Max reconnection attempts reached
Error in connectToWhatsApp: [error]
```
**These require investigation.**

## Monitoring

- [ ] Railway logs accessible and readable
- [ ] Health endpoint responding: `https://your-app.railway.app/health`
- [ ] Info endpoint working: `https://your-app.railway.app/`
- [ ] No error alerts from Railway

## Troubleshooting Resources

If issues occur, check:
1. `README.md` - General documentation
2. `SYNC_ERRORS_GUIDE.md` - Understanding sync errors
3. Railway logs - Real-time debugging
4. Database connection - Verify PostgreSQL is running

## Success Criteria

✅ Bot connects successfully after QR scan
✅ Session persists across restarts
✅ Bot responds to WhatsApp messages
✅ No repeated disconnections
✅ QR codes cleaned up after connection
✅ Logs show healthy operation

## Restart Testing

- [ ] Restart Railway service
- [ ] Verify bot reconnects without QR code
- [ ] Confirm session loaded from database
- [ ] Test message handling still works

## Production Ready

- [ ] All checklist items completed
- [ ] Bot stable for 24 hours
- [ ] Message handling tested
- [ ] Reconnection tested
- [ ] Team notified of deployment

## Notes

- QR code expires in 60 seconds - scan quickly
- Sync errors are normal and expected
- Bot auto-reconnects up to 5 times
- Session stored in PostgreSQL for persistence
- Old QR codes automatically cleaned up

## Support

For issues:
1. Check Railway logs first
2. Review troubleshooting guides
3. Verify environment variables
4. Contact development team

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Railway Project:** _____________
**Status:** _____________
