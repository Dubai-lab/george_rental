# George Rental — Setup Guide

## Step 1: Create the Supabase project and run the database schema

1. Create a new project at https://supabase.com/dashboard
2. Go to **SQL Editor → New query**, paste the whole of `supabase-schema.sql` → **Run**.
   The result grid should list 10 tables, all with `rls_on = true`.
3. *(Optional)* paste and run `supabase-seed-stores.sql` to load the original
   list of 50 stores across the 4 areas. Skip this to add stores by hand on the
   Stores page (the live project was started with only the 5 Red Light stores).

Both files are safe to run more than once. **Keep them in git** — they are the
only copy of the database structure.

---

## Step 2: Create your owner account

1. Go to **Supabase → Authentication → Users → Add user → Create new user**
2. Enter your email + password and tick **Auto Confirm User**
3. Go to **SQL Editor** and run:
```sql
UPDATE public.profiles
SET role = 'owner', full_name = 'Your Name'
WHERE email = 'your@email.com';
```
It must report **1 row** updated. Every account starts as a tenant; this is the
only way to make an owner.

---

## Step 2b: Point the app at the new project

Get the values from **Supabase → Project Settings → API**.

**Local** — create `.env.local` in this folder:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Vercel** — Project → Settings → Environment Variables: set the same two
variables (replace the old project's values), then **Redeploy**.

**Supabase → Authentication → URL Configuration**
- Site URL: your Vercel URL (e.g. `https://your-app.vercel.app`)
- Redirect URLs: add `https://your-app.vercel.app/**` and `http://localhost:5173/**`

Without the redirect URLs, tenant invite links and password-reset links will not work.

---

## Step 3: Set up email notifications (Gmail SMTP)

### 3a. Configure SMTP in Supabase Auth

Go to **Supabase Dashboard → Authentication → SMTP Settings**:

- Enable Custom SMTP: **ON**
- Sender name: `George Rental`
- Sender email: `eg8217178@gmail.com`
- Host: `smtp.gmail.com`
- Port: `465`
- Username: `eg8217178@gmail.com`
- Password: *(your Gmail app password)*

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
supabase functions deploy notify-enquiry
supabase functions deploy notify-rent-due
```

### 3c. Set environment secrets

```bash
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=465
supabase secrets set SMTP_USER=eg8217178@gmail.com
supabase secrets set SMTP_PASS=<your Gmail app password>
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set automatically.

### 3d. No webhooks needed

The app calls the email functions itself after each action, and every function
checks who is calling (owner / the tenant concerned). Do **not** create database
webhooks for them.

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
