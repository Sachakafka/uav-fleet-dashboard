# OAuth Setup Checklist

## Critical: Do this first

### 1. Supabase Dashboard

Go to: https://app.supabase.com/project/citoiconzejdfjjefnbi/auth/url-configuration  
(Replace the project ID with yours if different.)

#### A. Redirect URLs (add all of these)
```
http://localhost:5173
http://localhost:5173/
https://uav-fleet-dashboard.vercel.app
https://uav-fleet-dashboard.vercel.app/
https://uav-fleet-dashboard-git-main-alexs-projects-043bd484.vercel.app
https://uav-fleet-dashboard-git-main-alexs-projects-043bd484.vercel.app/
```

#### B. Site URL
```
https://uav-fleet-dashboard.vercel.app
```

### 2. Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials

Open your OAuth 2.0 Client ID and add this to **Authorized redirect URIs**:

```
https://citoiconzejdfjjefnbi.supabase.co/auth/v1/callback
```
(Replace the project ref with your Supabase project ref.)

### 3. Vercel environment variables

Go to: https://vercel.com/alexs-projects-043bd484/uav-fleet-dashboard/settings/environment-variables

Confirm these exist:

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon key

(Do not commit real keys into the repo; set them in Vercel only.)

## After setup: test

1. **Clear browser data**
   - Open Chrome DevTools (F12)
   - Application → Storage → Clear site data
   - Or use a private/incognito window

2. **Open the Vercel URL**
   ```
   https://uav-fleet-dashboard.vercel.app
   ```

3. **Click "Sign in with Google"**
   - You should be sent to Google sign-in
   - After choosing an account you should return to the app
   - You should see the Dashboard, not the login page again

4. **Check the Console**
   - Open DevTools → Console
   - You should see something like:
     ```
     Initiating Google OAuth with redirect: https://uav-fleet-dashboard.vercel.app
     Auth event: SIGNED_IN Session: true
     Initial session check: true
     User logged in, redirecting to dashboard
     ```

## If it still fails

### Debug steps

1. **Check the URL hash**
   - After sign-in, does the URL have `#error` or `#access_token`?
   - If `#error`, note the error message

2. **Check the Network tab**
   - Look for a request to `/auth/v1/token`
   - Check the response for errors

3. **Check Supabase Logs**
   - Supabase Dashboard → Logs → Auth Logs
   - Look for error messages

### Common errors

| Error | Cause | Fix |
|-------|--------|-----|
| `redirect_uri_mismatch` | Redirect URL mismatch | Ensure Supabase and Google Console redirect URLs match exactly |
| `invalid_request` | OAuth config wrong | Recheck Google OAuth client settings |
| `access_denied` | User cancelled sign-in | Normal; try signing in again |
| Redirect loop | Redirect URL not set | Confirm Supabase Redirect URLs are saved |

## Completion checklist

- [ ] Supabase Redirect URLs added and saved
- [ ] Supabase Site URL set
- [ ] Google Cloud Console redirect URI added
- [ ] Vercel env vars set correctly
- [ ] Browser cache cleared
- [ ] Sign-in test passed
- [ ] Sign-out test passed
- [ ] Page refresh still shows signed-in state

## Deploying updates

After the above is done, push code changes:

```bash
git add .
git commit -m "fix: improve OAuth redirect handling and prevent infinite loop"
git push origin main
```

Wait for Vercel to finish deploying (about 1–2 minutes).
