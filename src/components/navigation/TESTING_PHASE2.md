# Phase 2 Testing Guide: Mobile Bottom Navigation

## 🎯 What We're Testing

Phase 2 introduces the **mobile-first bottom navigation bar** with:
- ✅ 4-tab thumb-friendly navigation
- ✅ "More" slide-up menu for overflow items
- ✅ Badge indicators for new content
- ✅ Semantic color glow effects
- ✅ Haptic feedback on mobile devices
- ✅ Full accessibility support

---

## 📱 Quick Test Setup

### Option 1: Temporary Route (Recommended)

1. Open `src/App.jsx`

2. Add the test route temporarily:

```jsx
import { MobileNavTest } from './components/navigation/MobileNavTest';

// Inside your Routes component:
<Route path="/test-mobile-nav" element={<MobileNavTest />} />
```

3. Navigate to `/test-mobile-nav` in your browser

4. Open Chrome DevTools and switch to mobile emulation (iPhone 13 Pro or similar)

### Option 2: Integration Test

1. Wrap your app with `NavigationProvider` in `src/App.jsx`:

```jsx
import { NavigationProvider, BottomNav, MoreMenu } from './components/navigation';

function App() {
  return (
    <NavigationProvider>
      {/* Your existing app content */}

      {/* Add mobile navigation */}
      <BottomNav />
      <MoreMenu />
    </NavigationProvider>
  );
}
```

2. View your app on mobile or in mobile emulator

---

## ✅ Test Checklist

### Visual Tests

- [ ] **Bottom nav appears only on mobile** (< 768px width)
- [ ] **4 primary tabs display** (Home, Training, Progress, Workouts OR More)
- [ ] **"More" button shows as 5th tab**
- [ ] **Active tab has colored glow effect**
- [ ] **Active tab shows top indicator bar**
- [ ] **Icons are sized correctly** (24x24px)
- [ ] **Labels are readable** (uppercase, tracking-wide)
- [ ] **Badge indicators display** (pink circles with counts)
- [ ] **Safe area padding present** (iPhone notch spacing)

### Interaction Tests

- [ ] **Tapping a tab navigates to correct route**
- [ ] **Active state updates on navigation**
- [ ] **Tapping "More" opens slide-up menu**
- [ ] **Backdrop overlay appears behind menu**
- [ ] **Tapping backdrop closes menu**
- [ ] **Menu items are tappable** (48px+ touch targets)
- [ ] **Disabled items are visually distinct** (50% opacity)
- [ ] **Haptic feedback triggers on tap** (mobile only)

### More Menu Tests

- [ ] **Menu slides up smoothly** (300ms animation)
- [ ] **Backdrop fades in** (200ms animation)
- [ ] **Menu has rounded top corners**
- [ ] **Handle bar is visible at top**
- [ ] **Close button works**
- [ ] **Escape key closes menu** (keyboard users)
- [ ] **Scrollable if items overflow** (max 85vh)
- [ ] **Sections are properly grouped** ("Your Training" / "Account & Help")
- [ ] **Active item has visual indicator**

### Context-Aware Tests

Test with different authentication/coach states:

#### Not Authenticated
- [ ] Only "Home" tab is visible
- [ ] "More" menu shows only public pages (About, Help, etc.)
- [ ] Coach-required items are hidden

#### Authenticated (No Coach)
- [ ] "Home" routes to coach selection
- [ ] Coach-specific tabs are hidden
- [ ] "More" menu shows account settings

#### Full Coach Context
- [ ] All 4 primary tabs visible
- [ ] "More" menu shows all contextual items
- [ ] Badge counts appear on relevant tabs
- [ ] Routes include userId and coachId params

### Badge Tests

- [ ] **Workouts badge shows count** (if newItemCounts.workouts > 0)
- [ ] **Conversations badge shows count**
- [ ] **Memories badge shows count** (in More menu)
- [ ] **Reports badge shows count** (in More menu)
- [ ] **Badge shows "99+" for counts > 99**
- [ ] **Badge is visible and readable** (18px min height)

### Accessibility Tests

- [ ] **All tabs have aria-label** (includes badge count in label)
- [ ] **Active tab has aria-current="page"**
- [ ] **More menu has role="dialog"**
- [ ] **Menu has aria-modal="true"**
- [ ] **Keyboard navigation works** (Tab, Shift+Tab, Enter)
- [ ] **Escape closes More menu**
- [ ] **Focus management is correct** (returns to trigger after close)
- [ ] **Screen reader announces properly**

### Responsive Tests

Test at these breakpoints:

- [ ] **320px** (iPhone SE) - Items don't overflow, labels readable
- [ ] **375px** (iPhone 12/13 Mini) - Proper spacing
- [ ] **390px** (iPhone 14 Pro) - Optimal layout
- [ ] **414px** (iPhone 14 Pro Max) - No excessive spacing
- [ ] **768px+** (Tablet/Desktop) - Bottom nav hidden entirely

### Performance Tests

- [ ] **Animation is smooth** (60fps slide-up)
- [ ] **No layout shift** (fixed positioning stable)
- [ ] **Backdrop renders efficiently**
- [ ] **No visible lag on tap**

---

## 🐛 Common Issues & Fixes

### Bottom nav doesn't appear
- **Check:** Is viewport < 768px? (Use Chrome DevTools mobile emulator)
- **Check:** Is `BottomNav` component rendered in your app?
- **Check:** Is `md:hidden` class working? (Tailwind may not be compiled)

### More menu doesn't open
- **Check:** Is `NavigationProvider` wrapping your app?
- **Check:** Is `MoreMenu` component rendered?
- **Check:** Check browser console for errors

### Active state not working
- **Check:** Are you using React Router's `useLocation`?
- **Check:** Is `isRouteActive` utility working correctly?
- **Check:** Does the route match your current path?

### Badges not showing
- **Check:** Is `newItemCounts` populated in `NavigationContext`?
- **Check:** Are API endpoints returning count data?
- **Check:** Is badge logic in `getItemBadge` working?

### Safe area not working on iPhone
- **Check:** Does your app have `viewport-fit=cover` meta tag?
- **Check:** Are you testing on actual device or simulator?
- **Fix:** Add to `index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

---

## 🎨 Visual QA Checklist

Compare against design system:

- [ ] **Colors match brand** (Neon Pink #FF0080, Cyan #00FFFF, Purple #8B5CF6)
- [ ] **Glassmorphism effect present** (backdrop-blur-xl)
- [ ] **Border glow is subtle** (20% opacity on inactive, 30% on active)
- [ ] **Shadow is visible** (cyan glow on bottom nav, colored shadows on items)
- [ ] **Typography is correct** (Russo for headers, Rajdhani for labels)
- [ ] **Spacing is consistent** (gap-1 for icon-label, py-2 for tabs)

---

## 📊 Success Metrics

Phase 2 is complete when:

- ✅ All test checklist items pass
- ✅ No console errors or warnings
- ✅ Navigation works across all context states
- ✅ Mobile experience is thumb-friendly
- ✅ Accessibility requirements met
- ✅ Performance is smooth (60fps animations)
- ✅ Works on actual mobile devices (iOS Safari, Chrome Android)

---

## 🚀 Next Steps

After Phase 2 testing is complete:

1. **Phase 3**: Desktop Sidebar Navigation
2. **Phase 4**: Enhanced Quick Actions (FAB)
3. **Phase 5**: Full App Integration
4. **Phase 6**: Polish & Deployment

---

## 💡 Tips

- **Use Chrome DevTools mobile emulator** for quick testing
- **Test on actual devices** before marking complete (iOS Safari has quirks)
- **Take screenshots** of any visual issues
- **Test with different badge counts** (0, 1, 5, 99, 100+)
- **Test with long coach names** to verify truncation
- **Test network delay** for loading states

---

## 📝 Report Issues

If you find bugs, note:
1. Device/browser used
2. Viewport size
3. Authentication state
4. Steps to reproduce
5. Expected vs. actual behavior
6. Screenshots if applicable

