# Simple Tooltip System

This system provides GitHub-style lightweight tooltips for icon buttons across the application using a simple, reliable CSS-only approach.

## Components

### 1. `SimpleTooltip.jsx`
- Pure CSS tooltip component using `group-hover` states
- Supports top, bottom, left, right positioning
- No JavaScript complexity - just reliable CSS hover
- Instant appearance with smooth opacity transition

### 2. `IconButton.jsx`
- Pre-styled button component with built-in SimpleTooltip support
- Multiple variants: `default` (pink), `cyan`, `active`, `small`
- Handles all button props including `type`, `disabled`, etc.
- Uses SimpleTooltip internally for consistent behavior

### 3. `FloatingIconButton`
- Uses browser `title` attribute for tooltips (simpler for fixed positioning)
- Maintains existing styling and behavior
- No custom tooltips due to positioning complexity

## Usage Examples

### Basic IconButton with Tooltip
```jsx
import IconButton from './shared/IconButton';

<IconButton
  variant="cyan"
  tooltip="Manage Workouts"
  tooltipPosition="bottom"  // Choose appropriate position
  onClick={handleClick}
>
  <WorkoutIconSmall />
</IconButton>
```

### Direct SimpleTooltip Usage
```jsx
import SimpleTooltip from './shared/SimpleTooltip';

<SimpleTooltip text="Custom Action" position="top">
  <button className="custom-button">
    <CustomIcon />
  </button>
</SimpleTooltip>
```

### Positioning Guidelines
```jsx
// Content area buttons (appear below)
tooltipPosition="bottom"

// Bottom navigation/input buttons (appear above)
tooltipPosition="top"

// Left sidebar buttons (appear to the right)
tooltipPosition="right"

// Right sidebar buttons (appear to the left)
tooltipPosition="left"
```

## Variants

- **`default`**: Pink theme (for standard actions)
- **`cyan`**: Cyan theme (for navigation/view actions)
- **`active`**: Active state styling (for selected items)
- **`small`**: Compact version for tight spaces

## Integration Status

✅ **WorkoutViewer buttons** - Using IconButton with tooltips
✅ **CoachConversations buttons** - Using IconButton with tooltips
✅ **FloatingMenuManager** - Using updated FloatingIconButton with tooltips

## Next Steps

To apply across the entire site:

1. **Find icon-only buttons**: Search for buttons with only SVG/icon content
2. **Replace with IconButton**: Import and use IconButton component
3. **Add tooltips**: Provide descriptive `tooltip` prop
4. **Choose variant**: Select appropriate color variant

## Benefits

- **Consistent styling** across all icon buttons
- **Better UX** with instant context hints
- **Lightweight** - no external dependencies
- **Accessible** - maintains keyboard navigation
- **Customizable** - easy to adjust positioning and styling
