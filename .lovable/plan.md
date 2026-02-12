
# Improve MasteryOverview UI and Fix Demo Data Distribution

## Overview

Two changes: (1) make the MasteryOverview panel properly scrollable with a sticky summary header, and (2) update the database demo data so students have a healthy mix of retention statuses instead of being overwhelmed with "Expired" badges.

## Current Problem

**UI**: The Knowledge Points list renders all 58 items without scroll constraints, overflowing the sidebar. The summary cards at the top scroll away.

**Data**: Current retention distribution is skewed:
- Ananya Reddy: 58/58 expired
- Vihaan Kumar: 43/58 expired
- Ishita Nair: 34/58 expired
- Arjun Deshmukh: 21/58 expired

This happens because `last_reviewed_at` dates are too old relative to the stability values.

## Changes

### 1. `src/components/mastery/MasteryOverview.tsx` -- UI improvements

- Keep the 4 summary cards (Overall, Mastered, Aging, Expired) at the top, always visible
- Wrap the Knowledge Points list in a `ScrollArea` with a max height so it scrolls independently
- Add compact styling to each KP row for better density (58 items is a lot)
- The summary cards stay outside the scroll area so they're always visible

### 2. Database Update -- Rebalance retention distribution

Update `last_reviewed_at` values across all 8 students so the retention mix is roughly:
- ~50-60% Current
- ~25-30% Aging
- ~10-15% Expired

This is done by bringing `last_reviewed_at` closer to the present for most records. The formula `R = e^(-t/S)` means:
- Current (R >= 0.8): need `t/S < 0.223`, so `t < 0.223 * S`
- Aging (0.5 <= R < 0.8): need `0.223 <= t/S < 0.693`
- Expired (R < 0.5): need `t/S >= 0.693`

The SQL will use each record's stability to compute appropriate `last_reviewed_at` dates with a seeded distribution per student profile:
- High performers (Aarav, Kavya): ~80% current, ~15% aging, ~5% expired
- Average (Priya, Rohan): ~50% current, ~35% aging, ~15% expired
- Struggling (Ananya, Ishita): ~30% current, ~40% aging, ~30% expired
- Decayed (Vihaan): ~20% current, ~50% aging, ~30% expired
- Mixed (Arjun): ~40% current, ~35% aging, ~25% expired
