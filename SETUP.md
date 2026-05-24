# George Rental — Setup Guide

## Step 1: Run the database schema

Go to **Supabase Dashboard → SQL Editor → New query**

Run these files IN ORDER:

### 1a. Main schema (tables, triggers, RLS, storage)
Copy and paste the contents of `supabase-schema.sql` → Run

### 1b. Patches (public store access + 50 stores seed data)
Copy and paste the contents of `supabase-patches.sql` → Run

---

## Step 2: Create your owner account

### Option A (recommended)
1. Go to **Supabase → Authentication → Users → Add user → Create new user**
2. Enter your email + password
3. Go to **SQL Editor** and run:
```sql
UPDATE public.profiles
SET role = 'owner', full_name = 'Your Name'
WHERE email = 'your@email.com';
```

### Option B (via SQL, no UI needed)
```sql
-- Run in SQL Editor
SELECT supabase_auth.create_user(
  '{"email": "owner@georgerental.lr", "password": "YourPassword123!", "user_metadata": {"role": "owner", "full_name": "George Kpoto"}}'::jsonb
);
```

---

## Step 3: Set up email notifications (SpaceMail SMTP)

### 3a. Configure SMTP in Supabase Auth

Go to **Supabase Dashboard → Authentication → SMTP Settings**:

- Enable Custom SMTP: **ON**
- Sender name: `George Rental`
- Sender email: `support@schoolsyncedu.com`
- Host: `mail.spacemail.com`
- Port: `587`
- Username: `support@schoolsyncedu.com`
- Password: *(your SpaceMail password)*

### 3b. Deploy the Edge Functions
Install Supabase CLI first:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
Get your project ref from: Supabase Dashboard → Settings → General → Reference ID

Deploy both functions:
```bash
supabase functions deploy notify-payment
supabase functions deploy notify-maintenance
```

### 3c. Set environment secrets

```bash
supabase secrets set SMTP_HOST=mail.spacemail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=support@schoolsyncedu.com
supabase secrets set SMTP_PASS=Blessing@0880
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set automatically.

### 3d. Create database webhooks
Go to **Supabase Dashboard → Database → Webhooks → Create a new hook**

**Webhook 1 — Payment notifications:**
- Name: `payment-notification`
- Table: `public.payments`
- Events: ✅ Insert  ✅ Update
- Type: Supabase Edge Functions
- Edge Function: `notify-payment`

**Webhook 2 — Maintenance notifications:**
- Name: `maintenance-notification`
- Table: `public.maintenance_requests`
- Events: ✅ Insert  ✅ Update
- Type: Supabase Edge Functions
- Edge Function: `notify-maintenance`

---

## Step 4: Add your Mapbox token (optional)

Edit `.env.local`:
```
VITE_MAPBOX_TOKEN=pk.eyJ1...your_token_here
```
Get a free token at https://mapbox.com → Sign up → Access tokens

Without a token, the Stores page falls back to a static SVG map.

---

## Email triggers summary

| Event | Who gets emailed | Subject |
|-------|-----------------|---------|
| Tenant submits payment | Owner | 💳 New payment submitted |
| Owner confirms payment | Tenant | ✅ Payment confirmed + receipt |
| Owner rejects payment | Tenant | ❌ Payment not confirmed |
| Tenant submits maintenance | Owner | 🔧 New maintenance request |
| Owner marks In Progress | Tenant | 🛠️ Maintenance update |
| Owner marks Resolved | Tenant | ✅ Maintenance resolved |

---

## Running the web app

```bash
cd C:\Users\eg821\Desktop\george_rental
npm run dev
# → http://localhost:5173
```

---

## Running the mobile app (tenant only)

The mobile app is at `C:\Users\eg821\Desktop\george_rental_mobile`

### Install Expo Go on your phone

- Android: search **Expo Go** on Google Play Store
- iOS: search **Expo Go** on the App Store

### Start the dev server

```bash
cd C:\Users\eg821\Desktop\george_rental_mobile
npm start
```

This opens a QR code in the terminal.

- **Android**: Open Expo Go → tap "Scan QR code" → scan it
- **iOS**: Open your Camera app → scan the QR code → tap the Expo Go prompt

The app will load on your phone. Any change you save in the code reloads instantly.

### Screens in the mobile app

| Screen      | Description                                        |
| ----------- | -------------------------------------------------- |
| Sign In     | Email + password login                             |
| Home        | Rent status card, quick actions, recent payments   |
| Pay Rent    | 3-step wizard: Method → Upload proof → Confirm     |
| Receipts    | Full payment history with receipt numbers          |
| Maintenance | Submit requests + track status                     |
| Profile     | Account info + sign out                            |
