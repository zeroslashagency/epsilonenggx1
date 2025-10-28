# 📧 ZOHO MAIL SMTP SETUP - STEP BY STEP

## 🎯 COMPLETE GUIDE TO CONFIGURE ZOHO MAIL FOR PASSWORD RESET EMAILS

---

## STEP 1: CREATE APP-SPECIFIC PASSWORD

**Zoho requires App-Specific Passwords for SMTP**

1. Go to: https://accounts.zoho.com/home#security/security

2. Scroll to **"App-Specific Passwords"** section

3. Click **"Generate New Password"**

4. Fill in the form:
   - **App Name:** `Supabase SMTP`
   - **Purpose:** Select **"Email Clients"**

5. Click **"Generate"**

6. **COPY THE PASSWORD**
   - It looks like: `abcdefghijklmnop` (16 characters)
   - **Save this - you can't see it again!**

---

## STEP 2: CONFIGURE SUPABASE

1. Go to: https://app.supabase.com/project/sxnaopzgaddvziplrlbe/settings/auth

2. Scroll down to **"SMTP Settings"**

3. Click **"Enable Custom SMTP"**

4. Fill in the form:

```
SMTP Host: smtp.zoho.com
SMTP Port: 587
SMTP User: your-email@zohomail.com (your full Zoho email)
SMTP Password: abcdefghijklmnop (the 16-char password from Step 1)
Sender Email: your-email@zohomail.com (same as SMTP User)
Sender Name: Your App Name (e.g., "Epsilon Scheduling")
```

**For custom domain (e.g., yourname@yourdomain.com):**
```
SMTP Host: smtp.zoho.com
SMTP Port: 587
SMTP User: yourname@yourdomain.com
SMTP Password: abcdefghijklmnop
Sender Email: yourname@yourdomain.com
Sender Name: Your App Name
```

5. Click **"Save"**

---

## STEP 3: TEST THE SETUP

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
- Make sure you're using the **App-Specific Password**, not your regular Zoho password
- Password should be 16 characters
- Copy it exactly as shown

### ❌ "Authentication failed" error

**Solution:**
- Verify you generated the password correctly
- Generate a new App-Specific Password
- Make sure SMTP User is your full email address
- Check if 2FA is enabled (required for App-Specific Passwords)

### ❌ "Relay access denied" error

**Solution:**
- Verify your Zoho account is active
- Make sure "From" email matches your Zoho email
- Check if your account has SMTP access enabled

### ❌ Emails not arriving

**Solution:**
- Check spam folder
- Wait 5 minutes (sometimes delayed)
- Check Supabase logs: https://app.supabase.com/project/sxnaopzgaddvziplrlbe/logs/edge-logs
- Try sending to a different email address
- Verify your Zoho account is not suspended

---

## 📊 ZOHO MAIL LIMITS

**Free Plan:**
- **5 GB storage**
- **5 email accounts**
- **25 MB attachment limit**
- **No daily sending limit specified** (reasonable use)

**Paid Plans (Mail Lite - $1/user/month):**
- **10 GB storage**
- **Unlimited email accounts**
- **250 MB attachment limit**
- **Higher sending limits**

**Zoho is very generous with sending limits compared to Gmail.**

---

## 🔒 SECURITY NOTES

✅ **App-Specific Passwords are safe** - they only work for SMTP
✅ **You can revoke** App-Specific Passwords anytime at: https://accounts.zoho.com/home#security/security
✅ **Each app should have its own** App-Specific Password
✅ **Never share** your App-Specific Password publicly

---

## 📧 ZOHO SMTP PORTS

Zoho supports multiple ports:

**Port 587 (Recommended - TLS/STARTTLS):**
```
Host: smtp.zoho.com
Port: 587
Security: TLS/STARTTLS
```

**Port 465 (SSL):**
```
Host: smtp.zoho.com
Port: 465
Security: SSL
```

**Port 25 (Not recommended):**
```
Host: smtp.zoho.com
Port: 25
Security: None/TLS
```

**Use Port 587 for best compatibility.**

---

## 🌍 ZOHO REGIONAL SMTP SERVERS

Zoho has regional servers. Use the one closest to you:

**India:**
```
smtp.zoho.in
```

**Europe:**
```
smtp.zoho.eu
```

**Australia:**
```
smtp.zoho.com.au
```

**China:**
```
smtp.zoho.com.cn
```

**Default (Global):**
```
smtp.zoho.com
```

---

## ✅ VERIFICATION

After setup, you should see in Supabase:
- ✅ "Custom SMTP enabled"
- ✅ Green checkmark next to SMTP settings

Test by sending a password reset email. You should receive it within 1-2 minutes.

---

## 🎯 QUICK REFERENCE

**Zoho SMTP Settings:**
```
Host: smtp.zoho.com (or smtp.zoho.in for India)
Port: 587
Security: TLS/STARTTLS
User: your-email@zohomail.com
Password: [16-char App-Specific Password]
```

**App-Specific Password Generator:**
https://accounts.zoho.com/home#security/security

**Supabase SMTP Settings:**
https://app.supabase.com/project/sxnaopzgaddvziplrlbe/settings/auth

---

## 💡 WHY CHOOSE ZOHO?

✅ **No daily sending limits** (reasonable use)
✅ **Better deliverability** than Gmail for business emails
✅ **Custom domain support** (even on free plan with setup)
✅ **Privacy-focused** (based in India, GDPR compliant)
✅ **Professional** email service
✅ **Generous free tier**

**Zoho is excellent for production applications.**
