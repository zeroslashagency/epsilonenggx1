# IMPL-calendar-view-redesign: Calendar View & Sidebar Layout Fixes

## 1. Problem Statement
The "Calendar View" page currently suffers from layout and visual stacking issues:
1.  **Sidebar Overlap**: The "Shift Timeline" sticky header and content slide *underneath* the sidebar instead of being pushed to the right. This indicates a layout flow issue where the content container (`SidebarInset`) is not respecting the sidebar's width.
2.  **Z-Index Conflicts**: Previous attempts to fix this by adjusting z-indices resulted in elements either being on top of the sidebar or hidden behind it, without solving the underlying layout displacement.
3.  **Boxed Layout**: The user prefers a full-width/flush layout ("leave the box") rather than a card/container style for the timeline view, while maintaining sticky column functionality.
4.  **Sticky Column Integrity**: The "Staff Member" column must remain sticky on the left, and the timeline header must stay sticky on top.

## 2. Technical Requirements
1.  **Layout Architecture**:
    *   Ensure `AppSidebar` correctly reserves space in the document flow so `SidebarInset` is pushed to the right.
    *   Verify `SidebarProvider` and `Sidebar` configuration in `layout.tsx` and `app-sidebar.tsx`.
    *   Address any `overflow` or `position: absolute/fixed` properties that might break the standard flex flow.
2.  **Timeline Component Redesign**:
    *   **Container**: Remove the "box" styling (borders, shadows, padding) from `TimelineView`. The component should fill the available space entirely.
    *   **Scroll & Sticky**: Ensure sticky positioning works correctly by defining the correct scroll parent (likely `SidebarInset` or the page wrapper).
    *   **Z-Index Hierarchy**:
        *   **Sidebar**: `z-50` (Topmost)
        *   **Timeline Sticky Header**: `z-40` (Below Sidebar, Top of Content)
        *   **Sticky "Staff Member" Column**: `z-30` (Below Header)
        *   **Timeline Content**: `z-0`
3.  **Theme Compatibility**:
    *   Ensure all new styles work seamlessly in both Dark and Light modes (already partially implemented, but needs verification after z-index changes).

## 3. Implementation Plan

### Phase 1: Layout Core Fix (The "Behind" Issue)
*   **Goal**: Ensure the content starts *after* the sidebar, not *under* it.
*   **Action**: Inspect `app/(app)/layout.tsx` and `components/animate-ui/components/radix/sidebar.tsx`. Use `flex` layout properties effectively. If `Sidebar` is fixed, ensure the `sidebar-gap` div is functioning or add `margin-left` to `SidebarInset`.

### Phase 2: Component Refactor ("Leave the Box")
*   **Goal**: Simplify `TimelineView` visual hierarchy.
*   **Action**: 
    *   Remove `bg-white/gray-900`, `rounded-xl`, `border`, `shadow` from `TimelineView` container.
    *   Ensure `TimelineView` takes full height/width of the parent.

### Phase 3: Infinite/Sticky Scroll Tuning
*   **Goal**: "stick with that Staff Member".
*   **Action**:
    *   Verify `sticky left-0` on "Staff Member" column.
    *   Verify `sticky top-0` on timeline headers.
    *   **Optimization**: Ensure the `z-index` of these sticky elements is high enough to sit over the scrolling timeline cells but *low enough* (<50) to go under the Sidebar if the layout causes overlap (which Phase 1 should prevent, but as a failsafe).

### Phase 4: Verification
*   **Tests**:
    *   Scroll vertically: Header stays top.
    *   Scroll horizontally: "Staff Member" stays left.
    *   Open/Close Sidebar: Content adjusts width/position; Sidebar does not overlay content (content shrinks/moves).

## 4. Verification Checklist
- [ ] Sidebar pushes content to the right (no overlap).
- [ ] Timeline View has no outer border/box ("clean" look).
- [ ] "Staff Member" column is sticky.
- [ ] Header row is sticky.
- [ ] Sidebar z-index > Sticky Header z-index.
- [ ] Dark Mode text/bg colors are correct.
