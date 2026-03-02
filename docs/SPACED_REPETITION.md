# Spaced Repetition System

## Overview

This application uses a spaced repetition algorithm to help users retain algorithmic problem-solving skills over time. The system tracks user progress through **stages** and schedules reviews at increasing intervals based on performance **grades**.

## Grades

When logging a solve attempt, users choose one of three grades:

| Grade | Label | Meaning | Effect |
|-------|-------|---------|--------|
| **0** | ❌ Again | Failed to solve or struggled significantly even with hints | Decreases stage, shortens interval (0.3x multiplier) |
| **1** | 👍 Good | Solved with some effort or needed hints | Normal progression, standard interval (1.0x multiplier) |
| **2** | ✅ Easy | Solved confidently without hints | Faster progression, longer interval (1.5x multiplier) |

## Stages

Problems progress through three stages representing mastery level:

| Stage | Label | Base Interval | Description |
|-------|-------|---------------|-------------|
| **1** | 🌱 Learning | ~2 days | Just learning the problem, short review cycles |
| **2** | 🔄 Reinforcing | ~5 days | Solidifying understanding, medium review cycles |
| **3** | ✅ Mastered | ~12 days | Confident mastery, long review cycles |

### Stage Progression Logic

#### Moving Up Stages

- **Grade 1 (Good)**: Advances by 1 stage
  - Stage 1 → Stage 2
  - Stage 2 → Stage 3
  - Stage 3 → Stays at Stage 3

- **Grade 2 (Easy)**: Advances by 1 stage (faster growth via interval multiplier)
  - Stage 1 → Stage 2
  - Stage 2 → Stage 3
  - Stage 3 → Stays at Stage 3

#### Moving Down Stages

- **Grade 0 (Again)**: Drops by 1 stage (minimum Stage 1)
  - Stage 3 → Stage 2
  - Stage 2 → Stage 1
  - Stage 1 → Stays at Stage 1

**Note**: First attempt always starts at Stage 1, even if failed.

## Interval Calculations

The interval (days until next review) is calculated using:

```
interval = base_interval × stage_multiplier × grade_multiplier
```

### Base Intervals by Stage

- Stage 1: **2 days**
- Stage 2: **5 days**
- Stage 3: **12 days**

### Grade Multipliers

- Grade 0 (Again): **0.3x** - Review very soon
- Grade 1 (Good): **1.0x** - Standard interval
- Grade 2 (Easy): **1.5x** - Extended interval

### Interval Growth

For subsequent reviews (after the first attempt), the interval grows based on previous interval:

- **Success (Grade 1 or 2)**: `previous_interval × 1.3 × grade_multiplier`
  - Stage 3 applies an additional 1.6x multiplier
  
- **Failure (Grade 0)**: `previous_interval × 0.3` (shrinks interval)

**Minimum interval**: 1 day (intervals are always at least 1 day)

## Example Scenarios

### Scenario 1: Steady Progress

1. **First attempt** - Grade 1 (Good)
   - Stage: 0 → 1
   - Interval: 2 days
   - Next review: 2 days from now

2. **Second attempt** - Grade 1 (Good)
   - Stage: 1 → 2
   - Interval: 2 × 1.3 × 1.0 = 2.6 → 3 days
   - Next review: 3 days from now

3. **Third attempt** - Grade 1 (Good)
   - Stage: 2 → 3
   - Interval: 3 × 1.3 × 1.0 = 3.9 → 4 days
   - Next review: 4 days from now

4. **Fourth attempt** - Grade 1 (Good)
   - Stage: 3 (stays)
   - Interval: 4 × 1.6 × 1.3 × 1.0 = 8.32 → 9 days
   - Next review: 9 days from now

### Scenario 2: Quick Mastery

1. **First attempt** - Grade 2 (Easy)
   - Stage: 0 → 1
   - Interval: 2 × 1.5 = 3 days
   - Next review: 3 days from now

2. **Second attempt** - Grade 2 (Easy)
   - Stage: 1 → 2
   - Interval: 3 × 1.3 × 1.5 = 5.85 → 6 days
   - Next review: 6 days from now

3. **Third attempt** - Grade 2 (Easy)
   - Stage: 2 → 3
   - Interval: 6 × 1.3 × 1.5 = 11.7 → 12 days
   - Next review: 12 days from now

### Scenario 3: Struggle and Recovery

1. **First attempt** - Grade 1 (Good)
   - Stage: 0 → 1
   - Interval: 2 days
   - Next review: 2 days from now

2. **Second attempt** - Grade 1 (Good)
   - Stage: 1 → 2
   - Interval: 2 × 1.3 = 2.6 → 3 days
   - Next review: 3 days from now

3. **Third attempt** - Grade 0 (Again) - Forgot!
   - Stage: 2 → 1 (dropped)
   - Interval: 3 × 0.3 = 0.9 → 1 day
   - Next review: 1 day from now

4. **Fourth attempt** - Grade 1 (Good) - Reviewed quickly
   - Stage: 1 → 2
   - Interval: 1 × 1.3 = 1.3 → 2 days
   - Next review: 2 days from now

## Statistics Tracked

For each problem, the system tracks:

- **stage**: Current mastery stage (1-3)
- **last_attempt_at**: Timestamp of most recent attempt
- **last_success_at**: Timestamp of most recent successful attempt (Grade ≥ 1)
- **next_review_at**: Scheduled next review date
- **attempt_count**: Total number of attempts
- **success_count**: Number of successful attempts (Grade ≥ 1)
- **fail_count**: Number of failed attempts (Grade 0)
- **interval_days**: Current interval in days

## Best Practices

### For Users

1. **Be honest with grading**: Choose the grade that accurately reflects your performance
   - Don't mark "Easy" just to skip reviews - you'll forget and have to re-learn
   - Don't mark "Again" unnecessarily - it resets your progress

2. **Review on schedule**: Try to review problems close to their due date
   - Overdue problems indicate gaps in retention
   - Early reviews don't reinforce learning as effectively

3. **Trust the algorithm**: The spaced repetition system is designed to optimize retention
   - Longer intervals feel uncomfortable but are backed by research
   - Short intervals at the start help build initial understanding

### For Developers

1. **Tuning parameters**: The base intervals and multipliers can be adjusted
   - Located in `/app/api/problems/[problemKey]/attempts/route.ts`
   - Test changes with sample data before deploying

2. **Stage count**: Currently fixed at 3 stages
   - Could be expanded to 4-5 stages for more granular progression
   - Would require updating UI labels and database constraints

3. **Interval caps**: Consider adding maximum intervals
   - Example: Cap Stage 3 at 30 days to prevent extremely long gaps
   - Balances retention with regular practice

## Algorithm Credits

Inspired by:
- **SuperMemo SM-2**: Original spaced repetition algorithm
- **Anki**: Popular spaced repetition software
- **RemNote**: Modern knowledge management with spaced repetition

## Future Enhancements

Potential improvements to the system:

1. **Ease factor**: Track how easy/hard each problem is individually
2. **Lapse tracking**: Count how many times a problem was marked "Again"
3. **Optimal review time**: Suggest best time of day based on user patterns
4. **Category-specific intervals**: Different intervals for different problem types
5. **Confidence ratings**: Allow users to rate confidence separately from performance
6. **Review queue**: Prioritize overdue problems in suggested practice sessions
