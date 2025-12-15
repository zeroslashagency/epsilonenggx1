# 🔄 ROTATION PROFILE BUILDER - UI MOCKUP

## Desktop View (1920x1080)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Shifts          Rotation Profile Builder          [+ New Rotation]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  📋 Existing Rotation Profiles                                               │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 2-Week Rotation A/B                                   [✏️ Edit] [🗑️]  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Cycle: 2 weeks  │  Anchor: Nov 3, 2025  │  👥 12 employees assigned │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Week 1: General Shift No.1 (9:00 AM - 6:00 PM)  ■ #DFF0D8           │   │
│  │ Week 2: General Shift No.2 (9:00 AM - 7:00 PM)  ■ #D9EDF7           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 4-Week Rotational Pattern (Athul)                 [✏️ Edit] [🗑️]     │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Cycle: 4 weeks  │  Anchor: Nov 3, 2025  │  👥 1 employee assigned   │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Week 1: Rotational No.1 Pattern 1 (6:00 AM - 4:30 PM)  ■ #D4EDDA   │   │
│  │ Week 2: Rotational No.1 Pattern 2 (2:00 PM - 12:00 AM) ■ #D4EDDA   │   │
│  │ Week 3: Rotational No.1 Pattern 3 (9:00 PM - 7:00 AM)  ■ #D4EDDA   │   │
│  │ Week 4: Rotational No.1 Pattern 4 (9:00 AM - 7:00 PM)  ■ #D4EDDA   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 3-Week Rotational Pattern (Badal, Gopal)          [✏️ Edit] [🗑️]     │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Cycle: 3 weeks  │  Anchor: Nov 3, 2025  │  👥 2 employees assigned  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │ Week 1: Rotational No.2 Pattern 1 (6:00 AM - 6:00 PM)  ■ #F8D7DA   │   │
│  │ Week 2: Rotational No.2 Pattern 2 (6:00 PM - 6:00 AM)  ■ #F8D7DA   │   │
│  │ Week 3: Rotational No.2 Pattern 3 (8:00 AM - 8:00 PM)  ■ #F8D7DA   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## CREATE ROTATION PROFILE MODAL

### Desktop Modal (900x700)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Create Rotation Profile                                          [✕]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Profile Name *                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 2-Week Rotation A/B                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Cycle Length *                    Anchor Date (Start of Week 1) *     │
│  ┌──────────────────┐              ┌──────────────────────────────┐   │
│  │ 2 weeks      [▼]│              │ 📅 Nov 3, 2025 (Monday)      │   │
│  └──────────────────┘              └──────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Week Pattern Builder                                            │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                  │   │
│  │  Week 1 (Nov 3 - Nov 9)                                         │   │
│  │  ┌────────────────────────────────────────────────────────┐    │   │
│  │  │ Select Shift Template:                                 │    │   │
│  │  │ ┌──────────────────────────────────────────────────┐   │    │   │
│  │  │ │ General Shift No.1 (9:00 AM - 6:00 PM)       [▼]│   │    │   │
│  │  │ └──────────────────────────────────────────────────┘   │    │   │
│  │  │ ■ #DFF0D8 (Light Green)                                │    │   │
│  │  │ Preview: Mon-Sun → 9:00 AM - 6:00 PM (9 hrs)           │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  Week 2 (Nov 10 - Nov 16)                                       │   │
│  │  ┌────────────────────────────────────────────────────────┐    │   │
│  │  │ Select Shift Template:                                 │    │   │
│  │  │ ┌──────────────────────────────────────────────────┐   │    │   │
│  │  │ │ General Shift No.2 (9:00 AM - 7:00 PM)       [▼]│   │    │   │
│  │  │ └──────────────────────────────────────────────────┘   │    │   │
│  │  │ ■ #D9EDF7 (Light Blue)                                 │    │   │
│  │  │ Preview: Mon-Sun → 9:00 AM - 7:00 PM (10 hrs)          │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  [+ Add Week] (for longer cycles)                               │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 📅 Preview Calendar (Next 4 Weeks)                              │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Week 1 (Nov 3-9)   │ Week 2 (Nov 10-16) │ Week 1 (Nov 17-23) │  │   │
│  │ ■■■■■■■ #DFF0D8    │ ■■■■■■■ #D9EDF7    │ ■■■■■■■ #DFF0D8    │  │   │
│  │ 9:00 AM - 6:00 PM  │ 9:00 AM - 7:00 PM  │ 9:00 AM - 6:00 PM  │  │   │
│  │                    │                    │                    │  │   │
│  │ Week 2 (Nov 24-30) │                    │                    │  │   │
│  │ ■■■■■■■ #D9EDF7    │                    │                    │  │   │
│  │ 9:00 AM - 7:00 PM  │                    │                    │  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Notes (optional)                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Alternates between 9-hour and 10-hour shifts weekly             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│                                      [Cancel]  [Create Rotation]       │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4-WEEK ROTATION EXAMPLE (Rotational Shift No.1)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Create Rotation Profile - Rotational Shift No.1 (4 Patterns)     [✕]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Profile Name: 4-Week Rotational Pattern (Athul)                       │
│  Cycle Length: 4 weeks  │  Anchor: Nov 3, 2025                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Week 1 (Nov 3-9)                                                │   │
│  │ Rotational No.1 - Pattern 1: 6:00 AM → 4:30 PM (10.5 hrs)      │   │
│  │ ■ #D4EDDA                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Week 2 (Nov 10-16)                                              │   │
│  │ Rotational No.1 - Pattern 2: 2:00 PM → 12:00 AM (10 hrs) 🌙    │   │
│  │ ■ #D4EDDA                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Week 3 (Nov 17-23)                                              │   │
│  │ Rotational No.1 - Pattern 3: 9:00 PM → 7:00 AM (10 hrs) 🌙     │   │
│  │ ■ #D4EDDA                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Week 4 (Nov 24-30)                                              │   │
│  │ Rotational No.1 - Pattern 4: 9:00 AM → 7:00 PM (10 hrs)        │   │
│  │ ■ #D4EDDA                                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  📅 Preview: Repeats every 4 weeks starting Nov 3, 2025                │
│                                                                         │
│                                      [Cancel]  [Create Rotation]       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Mobile View (375x667)

```
┌─────────────────────────────┐
│ ← Rotation Profiles  [+ New]│
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ 2-Week Rotation A/B     │ │
│ │ ───────────────────────│ │
│ │ 🔄 2 weeks cycle        │ │
│ │ 📅 Start: Nov 3, 2025   │ │
│ │ 👥 12 employees         │ │
│ │                         │ │
│ │ Week 1: ■ General No.1  │ │
│ │ Week 2: ■ General No.2  │ │
│ │                         │ │
│ │ [✏️ Edit] [🗑️ Delete]    │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 4-Week Rotational       │ │
│ │ ───────────────────────│ │
│ │ 🔄 4 weeks cycle        │ │
│ │ 📅 Start: Nov 3, 2025   │ │
│ │ 👥 1 employee (Athul)   │ │
│ │                         │ │
│ │ W1: ■ Rot.1 Pat.1       │ │
│ │ W2: ■ Rot.1 Pat.2 🌙    │ │
│ │ W3: ■ Rot.1 Pat.3 🌙    │ │
│ │ W4: ■ Rot.1 Pat.4       │ │
│ │                         │ │
│ │ [✏️ Edit] [🗑️ Delete]    │ │
│ └─────────────────────────┘ │
│                             │
│ (Scroll for more...)        │
│                             │
└─────────────────────────────┘
```

---

## KEY FEATURES

✅ **Visual Week Builder** - Drag & drop week patterns  
✅ **Template Selection** - Choose from existing shift templates  
✅ **Cycle Length** - 2-week, 3-week, 4-week, custom  
✅ **Anchor Date** - Set starting Monday for cycle  
✅ **Preview Calendar** - See 4-week preview before saving  
✅ **Color Coding** - Visual color bars for each week  
✅ **Overnight Indicator** - 🌙 for shifts crossing midnight  
✅ **Employee Count** - Show assignments per rotation  
✅ **Mobile Responsive** - Compact cards on mobile  

---

## ROTATION LOGIC

**2-Week Rotation:**
- Week 1 (Nov 3-9): Template A
- Week 2 (Nov 10-16): Template B
- Week 3 (Nov 17-23): Template A (repeats)
- Week 4 (Nov 24-30): Template B (repeats)

**4-Week Rotation:**
- Week 1: Pattern 1
- Week 2: Pattern 2
- Week 3: Pattern 3
- Week 4: Pattern 4
- Week 5: Pattern 1 (cycle repeats)

---

## VALIDATION RULES

⚠️ **Minimum rest period:** 8 hours between shift end and next start  
⚠️ **Overnight flag:** Auto-detect if end_time < start_time  
⚠️ **Anchor date:** Must be a Monday  
⚠️ **Cycle length:** 1-12 weeks maximum  
⚠️ **Template required:** Each week must have a template assigned  
