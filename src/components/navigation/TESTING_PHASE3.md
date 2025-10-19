# Phase 3: Desktop Sidebar Navigation - Testing Guide

**Component:** `SidebarNav.jsx`
**Phase:** 3 of 7
**Date:** October 16, 2025

---

## 🎯 Testing Overview

This guide helps you verify that the desktop sidebar navigation works correctly across all scenarios, devices, and user states.

---

## 🚀 Quick Start Testing

### Step 1: Open the App on Desktop

```
1. Open the app in Chrome
2. Ensure window width is ≥ 768px
3. Look for left sidebar
```

**Expected:** Left sidebar visible with NeonPanda logo at top

### Step 2: Resize to Mobile

```
1. Open Chrome DevTools (F12 or Cmd+Opt+I)
2. Toggle device toolbar (Cmd+Shift+M)
3. Select iPhone 13 Pro
```

**Expected:** Sidebar disappears, bottom navigation appears

### Step 3: Navigate Between Routes

```
1. Click on different nav items in sidebar
2. Observe active state changes
3. Check that content updates
```

**Expected:** Active item shows left pink/cyan/purple border, navigation works

---

## 📋 Comprehensive Test Plan

### 1. **Visual Appearance Tests**

#### Desktop View (≥ 768px)

**Test:** Sidebar Container
- [ ] Sidebar is visible on left side
- [ ] Sidebar is 256px (w-64) wide
- [ ] Sidebar spans full height (h-screen)
- [ ] Background is glassmorphism (`bg-card/95` + `backdrop-blur-xl`)
- [ ] Right border is visible (cyan, thin)
- [ ] Shadow effect visible on right edge

**Test:** Brand Section
- [ ] Logo visible at top
- [ ] "NeonPanda" title in Russo font, white, uppercase
- [ ] "Training AI" subtitle below in Rajdhani, muted, uppercase
- [ ] Logo is 40x40px
- [ ] Bottom border separates from navigation

**Test:** Navigation Section
- [ ] Primary items show first (Home, Training, Progress, Workouts)
- [ ] "Your Training" header shows if user has coach
- [ ] Contextual items show below header (Conversations, Memories, Reports)
- [ ] "Account & Help" header shows
- [ ] Utility items show below (Settings, Help, About, etc.)
- [ ] Section headers are muted, small, uppercase
- [ ] Spacing between sections is consistent (mb-6)

**Test:** Navigation Items
- [ ] Icons are 20x20px (w-5 h-5)
- [ ] Labels are in Rajdhani, medium weight, base size
- [ ] Badges show on items with counts (pink background)
- [ ] Hover changes background to `bg-card/60`
- [ ] Rounded corners are xl (12px)
- [ ] Vertical spacing is consistent (space-y-1)

**Test:** Active States
- [ ] Active item has left border (1px vertical, colored)
- [ ] Active item has 5% background tint
- [ ] Active item icon has glow effect
- [ ] Active item label is semibold
- [ ] Border color matches semantic color (pink/cyan/purple)

**Test:** Profile Section
- [ ] Profile section at bottom
- [ ] Top border separates from navigation
- [ ] Background is slightly darker (`bg-card/50`)
- [ ] Avatar is 40x40px circle with gradient
- [ ] User initial shows in avatar
- [ ] Email username shows (before @)
- [ ] Full email shows below (truncated if long)
- [ ] Chevron icon on right
- [ ] Hover changes background

#### Mobile View (< 768px)

**Test:** Sidebar Hidden
- [ ] Sidebar is completely hidden
- [ ] No sidebar takes up space
- [ ] Main content has no left margin
- [ ] Bottom navigation is visible instead

---

### 2. **Responsive Behavior Tests**

#### Breakpoint Transition

**Test:** Desktop → Mobile
```
1. Start at 1024px width (desktop)
2. Slowly resize to 768px
3. Continue to 767px
```

**Expected:**
- [ ] Sidebar visible until 767px
- [ ] Sidebar disappears at 767px
- [ ] Bottom nav appears at 767px
- [ ] Content margin adjusts smoothly
- [ ] No layout shift or flicker

**Test:** Mobile → Desktop
```
1. Start at 375px width (mobile)
2. Slowly resize to 768px
```

**Expected:**
- [ ] Bottom nav visible until 767px
- [ ] Sidebar appears at 768px
- [ ] Bottom nav disappears at 768px
- [ ] Content margin adds 256px on left
- [ ] Smooth transition

---

### 3. **Navigation Functionality Tests**

#### Item Click Behavior

**Test:** Navigate to Each Item
```
For each visible navigation item:
1. Click the item
2. Verify route changes
3. Verify active state updates
4. Verify content loads
```

**Items to Test:**
- [ ] Home (goes to `/` or `/coaches` or `/training-grounds`)
- [ ] Training (goes to `/training-grounds`)
- [ ] Progress (goes to `/training-grounds/reports`)
- [ ] Workouts (goes to `/training-grounds/workouts`)
- [ ] Conversations (goes to `/training-grounds/coach-conversations`)
- [ ] Memories (goes to `/training-grounds/manage-memories`)
- [ ] Reports (goes to `/training-grounds/reports/weekly`)
- [ ] Settings (goes to `/settings`)
- [ ] Help (goes to `/faqs`)
- [ ] About (goes to `/about`)

#### Active State Detection

**Test:** Active Highlighting
```
1. Navigate to /training-grounds
2. Check if "Training" item is active
3. Navigate to /training-grounds/workouts
4. Check if "Workouts" item is active
```

**Expected:**
- [ ] Correct item shows left border
- [ ] Correct item has background tint
- [ ] Correct item icon has glow
- [ ] Previous active item returns to inactive

---

### 4. **Context-Aware Tests**

#### Not Authenticated

**Test:** Public User
```
1. Log out (or open in incognito)
2. View sidebar
```

**Expected:**
- [ ] Only public items visible:
  - Home
  - About
  - Technology
  - FAQs
  - Changelog
- [ ] No "Your Training" section
- [ ] No contextual items
- [ ] Profile section may not show or shows generic

#### Authenticated, No Coach

**Test:** Logged In, No Coach
```
1. Sign in
2. Don't select a coach
3. View sidebar
```

**Expected:**
- [ ] Primary items visible (Home, Settings)
- [ ] Public items visible
- [ ] No "Your Training" section
- [ ] No contextual items (Conversations, Memories, etc.)
- [ ] Profile section shows user email

#### Authenticated + Coach Context

**Test:** Full Context
```
1. Sign in
2. Select a coach
3. Navigate to /training-grounds?userId=XXX&coachId=YYY
4. View sidebar
```

**Expected:**
- [ ] All primary items visible
- [ ] "Your Training" section visible
- [ ] All contextual items visible:
  - Conversations
  - Memories
  - Reports
- [ ] Badges show counts (if any)
- [ ] Profile section shows user email

---

### 5. **Badge & Count Tests**

**Test:** Badge Display
```
1. Have items with new counts (e.g., 5 new workouts)
2. View sidebar
```

**Expected:**
- [ ] Badge shows on correct items
- [ ] Badge is pink circular pill
- [ ] Badge shows count (e.g., "5")
- [ ] If count > 99, shows "99+"
- [ ] Badge positioned on right side (ml-auto)
- [ ] Badge has shadow effect

---

### 6. **Profile Section Tests**

**Test:** Profile Display
- [ ] Avatar shows user initial (first letter of email)
- [ ] Avatar has gradient background (cyan to pink)
- [ ] Avatar has ring border (2px, cyan/30)
- [ ] Username shows (email before @)
- [ ] Full email shows below
- [ ] Text truncates if too long (no overflow)

**Test:** Profile Click
```
1. Click profile section
2. Verify navigation
```

**Expected:**
- [ ] Navigates to `/settings`
- [ ] Settings item becomes active in nav
- [ ] Profile button shows hover state

---

### 7. **Scrolling Tests**

**Test:** Long Navigation List
```
1. Ensure you have many visible items (15+)
2. Sidebar height should force scrolling
```

**Expected:**
- [ ] Navigation section scrolls independently
- [ ] Brand section stays fixed at top
- [ ] Profile section stays fixed at bottom
- [ ] Scrollbar is cyan themed
- [ ] Scrollbar is 6px wide
- [ ] Smooth scrolling behavior

**Test:** Scroll Behavior
- [ ] Scrollbar only in nav section
- [ ] Brand and profile don't scroll
- [ ] Scroll position maintained on navigation
- [ ] Custom cyan scrollbar visible

---

### 8. **Interaction Tests**

#### Hover States

**Test:** Hover on Inactive Item
- [ ] Background changes to `bg-card/60`
- [ ] Text color changes (pink/cyan hover)
- [ ] Smooth 300ms transition
- [ ] Cursor is pointer

**Test:** Hover on Active Item
- [ ] Background shows tinted background
- [ ] Maintains active state styling
- [ ] Cursor is pointer

**Test:** Hover on Disabled Item
- [ ] No hover effect
- [ ] Cursor is not-allowed
- [ ] Opacity stays at 50%

#### Focus States

**Test:** Keyboard Navigation
```
1. Tab through sidebar items
2. Check focus indicators
```

**Expected:**
- [ ] Focus ring appears (2px inset)
- [ ] Focus ring color matches semantic color
- [ ] Tab order is logical (top to bottom)
- [ ] Enter key activates item

---

### 9. **Layout & Spacing Tests**

**Test:** Content Offset
- [ ] Main content has 256px left margin on desktop
- [ ] Content doesn't overlap sidebar
- [ ] Content flows properly
- [ ] No horizontal scroll

**Test:** Sidebar Positioning
- [ ] Sidebar is fixed (doesn't scroll with content)
- [ ] Sidebar starts at top (top: 0)
- [ ] Sidebar spans full height (h-screen)
- [ ] Z-index is 40 (above content, below modals)

---

### 10. **Integration Tests**

**Test:** Works with Mobile Nav
```
1. Resize between mobile and desktop multiple times
2. Navigate while resizing
```

**Expected:**
- [ ] No conflicts between mobile and desktop nav
- [ ] Only one navigation visible at a time
- [ ] State syncs between navigations
- [ ] No double-rendering

**Test:** Works with Top Navigation
- [ ] Old Navigation.jsx still shows
- [ ] No visual conflicts
- [ ] Both can be used
- [ ] Sidebar takes visual priority

**Test:** Works with Breadcrumbs
- [ ] Breadcrumbs still visible
- [ ] Breadcrumbs positioned correctly
- [ ] No overlap with sidebar

---

### 11. **Accessibility Tests**

**Test:** Screen Reader
```
1. Turn on VoiceOver (Mac) or NVDA (Windows)
2. Tab through sidebar
```

**Expected:**
- [ ] Sidebar labeled as "Desktop sidebar navigation"
- [ ] Items have descriptive ARIA labels
- [ ] Active items announced as "current page"
- [ ] Badge counts announced
- [ ] Profile section properly announced

**Test:** Keyboard Only
```
1. Use only keyboard (Tab, Enter, Shift+Tab)
2. Navigate through all items
```

**Expected:**
- [ ] Can reach all items with Tab
- [ ] Enter activates items
- [ ] Focus indicator always visible
- [ ] Logical tab order

**Test:** Color Contrast
- [ ] Text meets WCAG AA contrast (4.5:1)
- [ ] Icons meet contrast requirements
- [ ] Active states have sufficient contrast
- [ ] Focus indicators are visible

---

### 12. **Performance Tests**

**Test:** Initial Render
```
1. Open DevTools Performance tab
2. Record page load
3. Check render time
```

**Expected:**
- [ ] Sidebar renders in < 50ms
- [ ] No layout shift
- [ ] No flickering
- [ ] Smooth appearance

**Test:** Navigation Performance
```
1. Click through 10+ different items rapidly
2. Monitor frame rate
```

**Expected:**
- [ ] 60fps maintained
- [ ] No janky transitions
- [ ] Active state updates instantly
- [ ] No lag

---

### 13. **Error Handling Tests**

**Test:** No User
- [ ] Profile section gracefully handles no user
- [ ] Shows placeholder or hides

**Test:** No Coach Data
- [ ] Contextual items hidden
- [ ] No error thrown
- [ ] UI still functional

**Test:** Network Failure
- [ ] Sidebar still renders
- [ ] Static items work
- [ ] Graceful degradation

---

## 🎨 Visual Regression Testing

### Compare Screenshots

**Locations to Screenshot:**
1. Full sidebar (desktop, authenticated + coach)
2. Sidebar with no coach context
3. Sidebar hover state
4. Sidebar active state
5. Sidebar scrolled
6. Profile section
7. Brand section

**Compare:**
- [ ] Colors match design
- [ ] Spacing is consistent
- [ ] Typography is correct
- [ ] Borders are proper thickness
- [ ] Shadows render correctly

---

## 🐛 Known Issues & Workarounds

### Issue: Old Top Navigation Still Shows
**Status:** Expected
**Workaround:** Will be removed in Phase 5
**Impact:** Minor visual redundancy

### Issue: Logo is SVG Placeholder
**Status:** Expected
**Workaround:** Replace with actual logo asset
**Impact:** Branding not final

---

## ✅ Sign-Off Checklist

Before considering Phase 3 complete:

- [ ] All visual appearance tests pass
- [ ] All responsive behavior tests pass
- [ ] All navigation functionality tests pass
- [ ] All context-aware tests pass
- [ ] All badge tests pass
- [ ] All profile section tests pass
- [ ] All scrolling tests pass
- [ ] All interaction tests pass
- [ ] All layout tests pass
- [ ] All integration tests pass
- [ ] All accessibility tests pass
- [ ] All performance tests pass
- [ ] All error handling tests pass
- [ ] Visual regression approved

---

## 📝 Testing Notes

**Browser Support:**
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ⚠️ Mobile browsers (sidebar hidden, bottom nav shown)

**Device Testing:**
- ✅ Desktop: 1024px+
- ✅ Tablet: 768px - 1023px
- ✅ Mobile: < 768px

**User States:**
- ✅ Not authenticated
- ✅ Authenticated, no coach
- ✅ Authenticated + coach context

---

## 🔄 Regression Testing

When making changes, re-test:
1. Responsive breakpoint behavior
2. Active state detection
3. Context-aware visibility
4. Badge display
5. Profile section
6. Hover/focus states

---

## 🎯 Next Steps After Testing

Once all tests pass:
1. ✅ Mark Phase 3 as complete
2. ✅ Document any issues found
3. ✅ Prepare for Phase 4 (Enhanced Quick Actions)
4. ✅ Consider Phase 5 (Integration & Cleanup)

---

**Happy Testing!** 🐼⚡

