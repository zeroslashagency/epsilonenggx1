# 📧 GMAIL SMTP SETUP - STEP BY STEP

## 🎯 COMPLETE GUIDE TO CONFIGURE GMAIL FOR PASSWORD RESET EMAILS

---

## STEP 1: ENABLE 2-FACTOR AUTHENTICATION ON GMAIL

**You MUST have 2FA enabled to create App Passwords**

1. Go to: https://myaccount.google.com/security
2. Scroll to "How you sign in to Google"
3. Click **"2-Step Verification"**
4. Click **"Get Started"**
5. Follow the prompts to set up 2FA (use phone number)
6. Complete the setup

---

## STEP 2: CREATE APP PASSWORD

1. Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords

2. You'll see "App passwords" section

3. Click **"Select app"** dropdown
   - Choose **"Mail"**

4. Click **"Select device"** dropdown
   - Choose **"Other (Custom name)"**
   - Type: **"Supabase SMTP"**

5. Click **"Generate"**

6. **COPY THE 16-CHARACTER PASSWORD**
   - It looks like: `abcd efgh ijkl mnop`
   - **Save this - you can't see it again!**

---

## STEP 3: CONFIGURE SUPABASE

1. Go to: https://app.supabase.com/project/sxnaopzgaddvziplrlbe/settings/auth

2. Scroll down to **"SMTP Settings"**

3. Click **"Enable Custom SMTP"**

4. Fill in the form:

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com (your full Gmail address)
SMTP Password: abcd efgh ijkl mnop (the 16-char password from Step 2)
Sender Email: your-email@gmail.com (same as SMTP User)
Sender Name: Your App Name (e.g., "Epsilon Scheduling")
```

5. Click **"Save"**

---

## STEP 4: TEST THE SETUP

1. **Wait 2-3 minutes** for settings to propagate

2. In your app:
   - Go to Settings → Users
   - Select user: mrak9668@gmail.com
   - Click Security tab
   - Click **"Send reset email"**

3. **Check email:**
   - Check inbox
   - Check spam folder
   - Email should arrive within 1-2 minutes

---

## 🔧 TROUBLESHOOTING

### ❌ "Invalid credentials" error

**Solution:**
- Make sure you're using the **App Password**, not your regular Gmail password
- App Password should be 16 characters with spaces
- Copy it exactly as shown (with or without spaces - both work)

### ❌ "Authentication failed" error

**Solution:**
- Verify 2FA is enabled on your Google account
- Generate a new App Password
- Make sure SMTP User is your full email (e.g., `user@gmail.com`)

### ❌ Emails not arriving

**Solution:**
- Check spam folder
- Wait 5 minutes (sometimes delayed)
- Check Supabase logs: https://app.supabase.com/project/sxnaopzgaddvziplrlbe/logs/edge-logs
- Try sending to a different email address

### ❌ "Less secure app access" message

**Solution:**
- This is old - ignore it
- Use App Passwords instead (Step 2 above)

---

## 📊 GMAIL LIMITS

- **500 emails per day** (free Gmail account)
- **2,000 emails per day** (Google Workspace account)
- No hourly limits

**This is plenty for most applications.**

---

## 🔒 SECURITY NOTES

✅ **App Passwords are safe** - they only work for SMTP, not full account access
✅ **You can revoke** App Passwords anytime at: https://myaccount.google.com/apppasswords
✅ **Each app should have its own** App Password
✅ **Never share** your App Password publicly

---

## ✅ VERIFICATION

After setup, you should see in Supabase:
- ✅ "Custom SMTP enabled"
- ✅ Green checkmark next to SMTP settings

Test by sending a password reset email. You should receive it within 1-2 minutes.

---

## 🎯 QUICK REFERENCE

**Gmail SMTP Settings:**
```
Host: smtp.gmail.com
Port: 587
Security: TLS/STARTTLS
User: your-email@gmail.com
Password: [16-char App Password]
```

**App Password Generator:**
https://myaccount.google.com/apppasswords

**Supabase SMTP Settings:**
https://app.supabase.com/project/sxnaopzgaddvziplrlbe/settings/auth
