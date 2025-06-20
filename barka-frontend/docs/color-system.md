# Barka Color System Documentation

## Overview

The Barka frontend application uses a comprehensive color system based on a carefully curated palette that reflects the brand's professional and warm aesthetic. The color system is built using CSS custom properties and Tailwind CSS for consistent application across all components.

## Color Palette

### Primary Colors

#### Brown Sugar (#c57b57)
- **Usage**: Primary CTA buttons, brand elements, navigation highlights
- **Shades**: 50-900 (lightest to darkest)
- **CSS Variable**: `--primary`
- **Tailwind Classes**: `bg-brown_sugar-{shade}`, `text-brown_sugar-{shade}`, `border-brown_sugar-{shade}`

#### Rich Black (#001011)
- **Usage**: Text color for light mode, dark backgrounds
- **Shades**: 50-900
- **CSS Variable**: `--foreground` (light mode)
- **Tailwind Classes**: `bg-rich_black-{shade}`, `text-rich_black-{shade}`

#### Seasalt (#f4f7f5)
- **Usage**: Text color for dark mode, light backgrounds
- **Shades**: 50-900
- **CSS Variable**: `--foreground` (dark mode)
- **Tailwind Classes**: `bg-seasalt-{shade}`, `text-seasalt-{shade}`

### Semantic Colors

#### Hunter Green (#436436)
- **Usage**: Success states, confirmation buttons, positive actions
- **Shades**: 50-900
- **CSS Variable**: `--success`
- **Tailwind Classes**: `bg-hunter_green-{shade}`, `text-hunter_green-{shade}`

#### Chocolate Cosmos (#5c1a1b)
- **Usage**: Error states, destructive buttons, warnings
- **Shades**: 50-900
- **CSS Variable**: `--destructive`
- **Tailwind Classes**: `bg-chocolate_cosmos-{shade}`, `text-chocolate_cosmos-{shade}`

## CSS Variables

### Light Mode
```css
:root {
  /* Primary - Brown Sugar */
  --primary: 19 38% 56%;               /* brown_sugar-500 #c57b57 */
  --primary-foreground: 244 247 245;   /* seasalt-50 #f4f7f5 */
  
  /* Success - Hunter Green */
  --success: 142 29% 31%;              /* hunter_green-500 #436436 */
  --success-foreground: 244 247 245;   /* seasalt-50 #f4f7f5 */
  
  /* Destructive - Chocolate Cosmos */
  --destructive: 359 54% 23%;          /* chocolate_cosmos-900 #5c1a1b */
  --destructive-foreground: 244 247 245; /* seasalt-50 #f4f7f5 */
  
  /* Background & Text */
  --background: 244 247 245;           /* seasalt-50 #f4f7f5 */
  --foreground: 180 100% 3%;           /* rich_black-900 #001011 */
}
```

### Dark Mode
```css
.dark {
  /* Primary - Brown Sugar (lighter for dark mode) */
  --primary: 19 42% 60%;               /* brown_sugar-400 #d2bab0 */
  --primary-foreground: 180 100% 3%;   /* rich_black-900 #001011 */
  
  /* Success - Hunter Green (lighter for dark mode) */
  --success: 142 29% 45%;              /* hunter_green-400 #57b67a */
  --success-foreground: 180 100% 3%;   /* rich_black-900 #001011 */
  
  /* Destructive - Chocolate Cosmos (lighter for dark mode) */
  --destructive: 359 54% 35%;          /* chocolate_cosmos-800 #952929 */
  --destructive-foreground: 244 247 245; /* seasalt-50 #f4f7f5 */
  
  /* Background & Text */
  --background: 180 100% 3%;           /* rich_black-900 #001011 */
  --foreground: 244 247 245;           /* seasalt-50 #f4f7f5 */
}
```

## Component Usage

### Buttons
```tsx
// Primary button (Brown Sugar)
<Button variant="default">Primary Action</Button>

// Success button (Hunter Green)
<Button variant="success">Confirm</Button>

// Destructive button (Chocolate Cosmos)
<Button variant="destructive">Delete</Button>
```

### Badges
```tsx
// Primary badge
<Badge variant="default">Primary</Badge>

// Success badge
<Badge variant="success">Active</Badge>

// Destructive badge
<Badge variant="destructive">Error</Badge>
```

### Alerts
```tsx
// Default alert
<Alert variant="default">Information</Alert>

// Success alert
<Alert variant="success">Success message</Alert>

// Destructive alert
<Alert variant="destructive">Error message</Alert>
```

## Design Guidelines

### Color Hierarchy
1. **Primary (Brown Sugar)**: Main brand actions, CTAs, navigation highlights
2. **Success (Hunter Green)**: Positive feedback, confirmations, success states
3. **Destructive (Chocolate Cosmos)**: Errors, warnings, destructive actions
4. **Neutral (Seasalt/Rich Black)**: Text, backgrounds, borders

### Accessibility
- All color combinations meet WCAG 2.1 AA contrast requirements
- Color is never the only means of conveying information
- Focus states use the ring color system for keyboard navigation

### Best Practices
- Use semantic color variables (`--primary`, `--success`, `--destructive`) instead of direct color values
- Prefer Tailwind utility classes over custom CSS when possible
- Use appropriate opacity modifiers for hover and disabled states
- Maintain consistent color usage across similar UI patterns

## Migration Notes

### From Previous Color System
- Orange colors (`#FF5C28`, `#FF7A4D`) → Brown Sugar palette
- Generic success/error colors → Hunter Green/Chocolate Cosmos
- Hardcoded hex values → CSS variables and Tailwind classes

### Updated Components
- ✅ Button component (added success variant)
- ✅ Badge component (added success variant)
- ✅ Alert component (added success variant)
- ✅ Fluid Stepper component (updated to use new palette)
- ✅ Client Table component (updated status colors)
- ✅ Chat Sidebar component (uses CSS variables)

## Future Enhancements

### Planned Additions
- Gradient utilities using the color palette
- Animation variants with color transitions
- Additional semantic color variants (warning, info)
- Color palette documentation in Storybook

### Maintenance
- Regular accessibility audits
- Color contrast validation in CI/CD
- Design token synchronization with design system
