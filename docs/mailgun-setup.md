# Mailgun Inbound Email Setup

This guide sets up `in.siteclause.io` as a receive-only subdomain so each
SiteClause project gets its own forwarding email address
(`sc-{id}@in.siteclause.io`).

---

## DNS Records to add for `in.siteclause.io`

Add these in Cloudflare (or your DNS provider):

| Type | Name | Value                          | Priority |
|------|------|--------------------------------|----------|
| MX   | in   | mxa.mailgun.org                | 10       |
| MX   | in   | mxb.mailgun.org                | 10       |
| TXT  | in   | `v=spf1 include:mailgun.org ~all` | —     |

> **Note:** These only affect the `in.siteclause.io` subdomain — your main
> `siteclause.io` domain and email are completely unaffected.

---

## Mailgun Setup Steps

1. **Sign up** at [mailgun.com](https://mailgun.com)
   - Free tier: 100 emails/day, no credit card needed

2. **Add domain:** `in.siteclause.io`
   - Go to Sending → Domains → Add New Domain
   - Enter `in.siteclause.io` and select **US** or **EU** region

3. **Add the DNS records** listed above in Cloudflare

4. **Verify the domain** in Mailgun dashboard (click Verify DNS)

5. **Create an Inbound Route:**
   - Go to Receiving → Routes → Create Route
   - **Expression:** `match_recipient("sc-.*@in.siteclause.io")`
   - **Action:** Forward → `https://siteclause.io/api/inbound-email`
   - **Priority:** 10
   - **Description:** SiteClause project email forwarding

6. **Add env var to Vercel** *(optional — for webhook signature verification)*:
   - `MAILGUN_WEBHOOK_SIGNING_KEY` = your signing key from Mailgun dashboard
     (Sending → Domain Settings → HTTP webhook signing key)

---

## Supabase SQL to run

Before emails can be saved, run these two SQL migrations in
**Supabase Dashboard → SQL Editor**:

### 1. `add-email-prefix.sql`
Adds the `email_prefix` column and backfills existing projects.

### 2. `add-email-policy.sql`
Adds RLS policies so the webhook can look up projects and insert correspondence
without an authenticated user session.

Both files are in `supabase/` in this repo.

---

## How it works

1. Someone sends an email to e.g. `sc-a1b2c3d4@in.siteclause.io`
2. Mailgun receives it and POSTs the parsed payload to `/api/inbound-email`
3. The webhook extracts the prefix (`sc-a1b2c3d4`), looks up the matching
   project in Supabase, and saves the email as a correspondence item
4. The correspondence appears in the project's Correspondence tab immediately

## Project email addresses

Each project's email is shown at the top of its Correspondence tab and can be
copied with one click. The format is:

```
sc-{first 8 chars of project UUID}@in.siteclause.io
```

Example: `sc-a1b2c3d4@in.siteclause.io`
