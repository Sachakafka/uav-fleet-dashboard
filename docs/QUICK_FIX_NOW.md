# OAuth Redirect Loop — Quick Fix (3 minutes)

## Step 1: Supabase Dashboard (most important)

1. Open:
   ```
   https://app.supabase.com/project/citoiconzejdfjjefnbi/auth/url-configuration
   ```
   (Replace the project ID with yours if different.)

2. Find the **Redirect URLs** section.

3. Paste these URLs (one per line):
   ```
   http://localhost:5173
   http://localhost:5173/
   https://uav-fleet-dashboard.vercel.app
   https://uav-fleet-dashboard.vercel.app/
   https://uav-fleet-dashboard-git-main-alexs-projects-043bd484.vercel.app
   https://uav-fleet-dashboard-git-main-alexs-projects-043bd484.vercel.app/
   ```

4. Click **Save** (important).

5. Confirm **Site URL** is:
   ```
   https://uav-fleet-dashboard.vercel.app
   ```

## Step 2: Wait for Vercel deploy

Code is already pushed; Vercel will deploy automatically (about 1–2 minutes).

Check deploy status:
```
https://vercel.com/alexs-projects-043bd484/uav-fleet-dashboard
```

## Step 3: Test

1. **Clear browser data** (important)
   - Press F12 to open DevTools
   - Application → Storage → Clear site data
   - Or use an incognito/private window

2. **Open your site**
   ```
   https://uav-fleet-dashboard.vercel.app
   ```

3. Click **Sign in with Google**

4. You should be signed in successfully.

## If it still fails

### Check 1: Did Supabase save the Redirect URLs?
- Reopen Supabase URL Configuration.
- Confirm all URLs are in the list.
- If not, add them again and click **Save**.

### Check 2: Is the Vercel deploy finished?
- Open the Vercel dashboard.
- Confirm the latest commit is deployed.
- Status should be "Ready".

### Check 3: What does the browser Console show?
- Press F12 → Console tab.
- Share the error message or a screenshot.

## Need help?

If you followed all steps and it still fails, provide:
1. A screenshot of Supabase Redirect URLs.
2. A screenshot of Vercel deploy status.
3. The browser Console error message.

---

## Why does this happen?

In short:
1. After Google OAuth, the user is redirected back to your site.
2. Supabase only allows redirects to URLs in its allow list.
3. If the URL is not in the list, redirects can loop.
4. Adding the Vercel URLs to the list fixes it.

## When it’s working

- You can sign in with Google.
- After sign-in you stay on the Dashboard.
- Refreshing the page keeps you signed in.
- Sign out works as expected.
