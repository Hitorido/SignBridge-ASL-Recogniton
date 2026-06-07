# Supabase Database Setup Instructions

## Step-by-Step Guide

### 1. Access Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in to your account
3. Select your SignBridge project

### 2. Navigate to SQL Editor

1. In the left sidebar, click **SQL Editor**
2. Click **New Query**

### 3. Copy and Paste the SQL Schema

1. Open `DATABASE_SCHEMA.sql` in this project
2. Copy ALL the content
3. Paste it into the Supabase SQL Editor query box

### 4. Execute the SQL

1. Click the **▶ Execute** button (or press Ctrl+Enter)
2. Your browser may ask for permission - allow it
3. Watch the execution - all queries should succeed ✅

### 5. Verify Tables Were Created

1. In the left sidebar, click **Database**
2. Under **public** schema, you should see:
   - ✅ users
   - ✅ signs
   - ✅ sign_history
   - ✅ conversations
   - ✅ messages
   - ✅ learning_progress
   - ✅ user_settings
   - ✅ feedback

If you see all 8 tables → **Setup is complete!** 🎉

---

## Database Tables Overview

### users

Extends Supabase's built-in auth.users

```sql
SELECT * FROM public.users;
```

| Column     | Type      | Purpose             |
| ---------- | --------- | ------------------- |
| id         | UUID      | User ID (from auth) |
| username   | VARCHAR   | Unique username     |
| full_name  | VARCHAR   | Display name        |
| avatar_url | TEXT      | Profile picture     |
| created_at | TIMESTAMP | Join date           |

### signs

Individual hand sign records

```sql
SELECT * FROM public.signs WHERE user_id = 'user_uuid';
```

| Column           | Type       | Purpose         |
| ---------------- | ---------- | --------------- |
| id               | UUID       | Unique sign ID  |
| user_id          | UUID       | Which user      |
| sign_letter      | VARCHAR(1) | Letter (A-Z)    |
| confidence_level | NUMERIC    | 0-100%          |
| duration_ms      | INTEGER    | Hold time in ms |
| created_at       | TIMESTAMP  | Record time     |

### sign_history

Words or phrases recorded as sign sequences

```sql
SELECT * FROM public.sign_history WHERE user_id = 'user_uuid' ORDER BY created_at DESC;
```

| Column           | Type    | Purpose                        |
| ---------------- | ------- | ------------------------------ |
| sequence         | TEXT    | "HELLO" (concatenated letters) |
| total_confidence | NUMERIC | Average confidence             |
| duration_ms      | INTEGER | Total phrase duration          |

### conversations

AI chat conversations with Gemini

```sql
SELECT * FROM public.conversations WHERE user_id = 'user_uuid';
```

### messages

Individual messages in conversations

```sql
SELECT * FROM public.messages WHERE conversation_id = 'conv_uuid';
```

### learning_progress

Track user's learning metrics

```sql
SELECT * FROM public.learning_progress WHERE user_id = 'user_uuid';
```

### user_settings

App preferences and settings

```sql
SELECT * FROM public.user_settings WHERE user_id = 'user_uuid';
```

### feedback

User feedback and bug reports

```sql
SELECT * FROM public.feedback ORDER BY is_resolved, created_at DESC;
```

---

## Testing the Database

### Insert a Test User

```sql
-- First, sign up a user using the app
-- Then run this to see their data:
SELECT * FROM public.users;
```

### Insert Test Sign Data

```sql
-- Replace user_id with actual UUID from users table
INSERT INTO public.signs (user_id, sign_letter, confidence_level, duration_ms)
VALUES ('YOUR_USER_ID', 'A', 95.5, 250);

-- Verify it was inserted:
SELECT * FROM public.signs WHERE user_id = 'YOUR_USER_ID';
```

### Check RLS Policies

```sql
-- See all policies
SELECT * FROM pg_policies;

-- Your user can only see their own data thanks to RLS
-- This query will return empty if you're logged in as different user:
SELECT * FROM public.signs;
```

---

## Enabling Row Level Security

RLS is **automatically enabled** by the SQL script. This means:

✅ Each user can ONLY see their own data
✅ API access is automatically restricted
✅ No need for manual filtering in your app

### Example: Only user's own data visible

```sql
-- When logged in as User A, this:
SELECT * FROM public.signs;

-- Only returns:
-- - Signs created by User A
-- Not signs from User B or others
```

---

## Troubleshooting

| Issue                     | Solution                                                 |
| ------------------------- | -------------------------------------------------------- |
| "Permission denied" error | Ensure logged-in user has identity matching RLS policies |
| Tables not showing        | Refresh the page or check SQL execution output           |
| RLS policies not working  | Ensure auth.uid() is set correctly in session            |
| Foreign key errors        | Run full SQL script to create tables in correct order    |

---

## Useful SQL Queries

### Get User Statistics

```sql
SELECT
  u.username,
  COUNT(s.id) as total_signs,
  COUNT(sh.id) as phrases_recorded,
  AVG(s.confidence_level) as avg_confidence,
  MAX(lp.streak_days) as best_streak
FROM public.users u
LEFT JOIN public.signs s ON u.id = s.user_id
LEFT JOIN public.sign_history sh ON u.id = sh.user_id
LEFT JOIN public.learning_progress lp ON u.id = lp.user_id
GROUP BY u.id, u.username;
```

### Export User's Complete History

```sql
SELECT
  sh.created_at,
  sh.sequence,
  sh.duration_ms,
  sh.total_confidence
FROM public.sign_history sh
WHERE sh.user_id = 'YOUR_USER_ID'
ORDER BY sh.created_at DESC;
```

### Get All Feedback

```sql
SELECT
  f.type,
  f.message,
  f.is_resolved,
  u.username,
  f.created_at
FROM public.feedback f
LEFT JOIN public.users u ON f.user_id = u.id
ORDER BY f.is_resolved, f.created_at DESC;
```

---

## Backup & Recovery

### Backup Your Data

In Supabase Dashboard:

1. Click **Settings** (bottom left)
2. Click **Backups**
3. Your backups are automatically created daily
4. Can restore from any point in time

### Export Data

```sql
-- Export as CSV
-- Use Supabase dashboard: Database → Tables → right-click table → Export
```

---

## Monitoring

Check your database usage in **Settings → Usage:**

- Database size
- Query count
- Realtime connections
- Total project size

---

## Security Notes

✅ All user data is encrypted at rest
✅ RLS policies prevent unauthorized access
✅ No raw passwords stored (Supabase handles auth)
✅ HTTPS for all connections
✅ Regular automated backups

---

## Next Steps

1. ✅ Create database tables (this page)
2. Test database with the app
3. Set up CI/CD environment variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Deploy app to production

---

**Your database is now ready to use!** 🎉
