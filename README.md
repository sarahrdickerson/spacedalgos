# Spaced Algos

**Stop re-learning the same problems from scratch.** Spaced Algos is a coding interview prep tool that uses spaced repetition to make sure you actually remember what you've studied — scheduling reviews at exactly the right time, before you forget.

---

## The Problem with Traditional Leetcode Grinding

Most people grind Leetcode by doing as many problems as possible. Then interview season hits and they realize they've forgotten half of them. They go back, re-learn, forget again. The cycle repeats.

Spaced repetition breaks this cycle. By reviewing problems at scientifically-timed intervals, you move them from short-term to long-term memory permanently — with far less total review time than re-doing them from scratch.

---

## How It Works

### 1. Pick a Problem List

Start with **Blind 75** — the most widely-used curated list of 75 essential coding interview problems. More lists coming soon.

### 2. Choose Your Pace

| Pace | New problems/day | Reviews/day |
|------|-----------------|-------------|
| Leisurely | 1 | 2 |
| Normal | 2 | 4 |
| Accelerated | 3 | 6 |
| Custom | You decide | You decide |

Your **Estimated First Pass** date is shown upfront so you know exactly when you'll have seen every problem at least once.

### 3. Log Your Attempts

After working through a problem, log how it went:

- ❌ **Again** — couldn't solve it or needed the solution
- 👍 **Good** — solved it but slow, messy, or needed hints
- ✅ **Easy** — solved it cleanly without help

You can also record how long it took and add notes.

### 4. Let the Algorithm Do the Scheduling

The algorithm calculates your next review date automatically. Grade something Easy and you won't see it for weeks. Grade it Again and it comes back the next day. As you keep succeeding, intervals grow until a problem only needs a quick quarterly check-in.

| Grade | Next interval |
|-------|--------------|
| First attempt (any grade) | 1 day |
| Again | ¼ of current interval (min 1 day) |
| Good | 2× current interval (max 30 days) |
| Easy | 2.3× current interval (max 90 days) |

**Example Good sequence:** 1 → 2 → 4 → 8 → 16 → 30 → 30 days (monthly maintenance)  
**Example Easy sequence:** 1 → 3 → 7 → 17 → 40 → 90 → 90 days (quarterly maintenance)

Problems have three stages — **Learning**, **Reinforcing**, and **Mastered** — as an at-a-glance indicator of how well you know each one.

---

## Features

### Dashboard
Your home base. See exactly what you need to do today and this week, your current streak, overall progress across the list, and your estimated first-pass completion date.

### Repetition Calendar
A visual month calendar showing:
- **Past attempts** — every problem you've logged, color-coded by grade
- **Upcoming reviews** — problems the algorithm has already scheduled
- **Projected new problems** — when future unseen problems will be introduced based on your pace

### Streak Tracking
A daily activity streak keeps you accountable. The flame stays lit as long as you complete at least one review per day. Calculations are timezone-aware so the streak never breaks unfairly after 6 PM.

### Problem History
Drill into any problem to see your full attempt history — every grade, time, and note you've recorded — and track how your performance has improved over time.

### Appearance
Light, dark, or system theme. Pick what works for you.

---

## Progress Labels

| Stage | Label | What it means |
|-------|-------|---------------|
| 1 | 🌱 Learning | You've seen it but are still building the pattern |
| 2 | 🔄 Reinforcing | You can solve it with some effort |
| 3 | ✅ Mastered | You can solve it cleanly and consistently |

The progress bar on your dashboard shows the breakdown at a glance.

---

## Why New Problems Only Appear When You're Caught Up

New problems are held back when you have overdue reviews. Reviews are always prioritized — there's no point learning new material if you're already forgetting existing material. Once your review queue is clear, new problems fill in up to your daily quota.

---

## Auth

Sign up with email and password or continue with Google. Email confirmation and password reset are supported.

---

## Privacy

Your data — attempts, progress, streaks, notes — is private to your account. You can permanently delete your account and all associated data at any time from the Settings page.