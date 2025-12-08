# RapidRide - Next.js with Clerk Authentication

Modern ride-booking application built with Next.js 15 App Router and Clerk email magic link authentication.

## Features

- ✅ **Email Magic Link Authentication** - No password required, just click the link in your email
- ✅ **Protected Routes** - Booking page requires authentication
- ✅ **Clean UI** - Modern, responsive design matching RapidRide branding
- ✅ **Automatic Redirects** - Seamless navigation after login
- ✅ **No Phone OTP** - Uses Clerk's email-based flow only

## Setup Instructions

### 1. Install Dependencies

```bash
cd rapidride-nextjs
npm install
```

### 2. Configure Clerk

1. Sign up for a free account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your API keys from the Clerk Dashboard

### 3. Set Environment Variables

Create a `.env.local` file in the project root:

```bash
cp env.example .env.local
```

Edit `.env.local` and add your Clerk keys:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_key_here

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/booking
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/booking
```

### 4. Configure Clerk Dashboard

In your Clerk Dashboard, configure:

**Email Settings:**
- Enable "Email Magic Link" authentication
- Disable "Email OTP" if you don't want numeric codes
- Disable "Password" if you want magic link only

**URLs:**
- Set the redirect URL to: `http://localhost:3000/booking`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How Authentication Works

1. User enters their email on the login page
2. Clerk sends a magic link to their email
3. User clicks the link in their email
4. User is authenticated and redirected to `/booking`
5. The booking page is protected - unauthenticated users are redirected to login

## Project Structure

```
rapidride-nextjs/
├── app/
│   ├── booking/
│   │   └── page.tsx          # Protected booking page
│   ├── layout.tsx             # Root layout with ClerkProvider
│   ├── page.tsx               # Login page
│   └── globals.css            # Global styles
├── middleware.ts              # Clerk middleware for route protection
├── env.example                # Environment variables template
└── README.md                  # This file
```

## Testing

### Test Email Authentication

1. Navigate to `http://localhost:3000`
2. Enter your email address
3. Click "Continue"
4. Check your email for the magic link
5. Click the link to log in
6. You should be redirected to `/booking`

### Test Protected Routes

1. Try accessing `/booking` without being logged in
2. You should be redirected to the login page
3. After logging in, you should have access

## Key Differences from Legacy Setup

| Feature | Old (Static HTML + Firebase) | New (Next.js + Clerk) |
|---------|------------------------------|------------------------|
| Auth Method | Phone OTP | Email Magic Link |
| Framework | Static HTML | Next.js App Router |
| Auth Provider | Custom Firebase | Clerk |
| OTP Input | Manual numeric input | Click email link |
| Route Protection | Manual checks | Middleware-based |
| User Management | Custom backend | Clerk Dashboard |

## Troubleshooting

### "Invalid publishable key" Error

- Make sure you've created `.env.local` from `env.example`
- Verify your Clerk keys are correct
- Restart the dev server after changing env vars

### Email Not Sending

- Check Clerk Dashboard → Email Settings
- Verify "Email Magic Link" is enabled
- Check your spam folder
- In development, emails may take a few minutes

### Redirect Not Working

- Verify `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/booking` in `.env.local`
- Check Clerk Dashboard → Paths for correct redirect URLs
- Clear browser cache and cookies

## Next Steps

- Integrate with your existing backend API
- Add the map and ride booking interface to `/booking`
- Customize the Clerk components with your branding
- Deploy to production (Vercel recommended)

## Support

For Clerk-specific issues, see [Clerk Documentation](https://clerk.com/docs)
For Next.js issues, see [Next.js Documentation](https://nextjs.org/docs)
