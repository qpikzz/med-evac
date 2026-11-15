# TASK-15-11-26-3 — Header Profile Dropdown Redesign

## Solution Idea

Replace the role-based header switcher with a profile-aware trigger pill that stays pinned to the far-right grid column. The pill uses a 30×30 avatar, a two-line display name/role stack, and a fixed 14×14 `lucide-react` `ChevronDown` whose rotation is owned by CSS transform from its center. The popover opens right-aligned with saved profiles, an active checkmark, a hairline divider, `"Добавить аккаунт"`, and `"Выйти из аккаунта"`.

## ToDo Checklist

- [x] Rebuild trigger pill to 40px height with fixed 30px avatar and two-line label stack.
- [x] Replace ASCII caret with centered rotating `ChevronDown` icon.
- [x] Right-align popover and render saved profiles with the active checkmark.
- [x] Add divider plus `"Добавить аккаунт"` and `"Выйти из аккаунта"` actions.
- [x] Wire account switching, add-account, and logout flows through `App.tsx`.

## Task Report

Redesigned the top-right profile switcher as a 40px pill with a 30×30 avatar, two-line name/role stack, and a fixed 14×14 `lucide-react` chevron that rotates via a centered CSS transform instead of swapping ASCII characters. The right-aligned popover lists all saved profiles with an active checkmark, a hairline divider, `"Добавить аккаунт"`, and `"Выйти из аккаунта"`, with account switching routed through the PIN gate and logout clearing the active session.
