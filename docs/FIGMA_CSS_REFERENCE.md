# Figma Design - CSS Reference Guide

## Extracted CSS Styles from Android XML

**Last Updated:** September 30, 2025
**Source:** Figma Design - Speaker Audio Control App UI

---

## 🎨 Background Gradients

### Main Radial Gradient
**Used in:** Settings Screen, Charging Screen, Battery Optimization, Ambient Sound screens

#### Android XML
```xml
<gradient
  android:type="radial"
  android:centerX="180"
  android:centerY="400"
  android:gradientRadius="90"
>
  <item android:color="#29313C" android:offset="0" />
  <item android:color="#0C1421" android:offset="1" />
</gradient>
```

#### CSS Equivalent
```css
.radial-gradient-dark {
  background: radial-gradient(
    circle at 50% 50%,
    #29313C 0%,
    #0C1421 100%
  );
}
```

#### Tailwind CSS (Next.js)
```tsx
className="bg-[radial-gradient(circle_at_50%_50%,#29313C_0%,#0C1421_100%)]"
```

#### Inline React Style
```tsx
style={{
  background: 'radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%)'
}}
```

---

## 🎨 Color Palette

### Primary Colors
```css
--color-dark-blue-grey: #29313C;  /* Gradient start */
--color-very-dark-blue: #0C1421;  /* Gradient end */
--color-purple-accent: #7c3aed;   /* Accent color (Windows tile) */
--color-dark-grey: #1f2937;       /* Theme color */
```

### Usage Examples

**Dark Mode Background:**
```css
.dark-background {
  background-color: #0C1421;
}
```

**Card Background:**
```css
.card-background {
  background-color: #29313C;
}
```

**Accent Elements:**
```css
.accent {
  background-color: #7c3aed;
}
```

---

## 📐 Layout Dimensions

### Screen Sizes (Cross-Platform)

#### Android XML
```xml
<RelativeLayout
  android:layout_width="360dp"
  android:layout_height="800dp"
/>
```

#### iOS Swift
```swift
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

#### CSS Variables
```css
/* Mobile viewport (360×800) */
--screen-width: 360px;
--screen-height: 800px;
```

**Platform Equivalents:**
- Android: `360dp × 800dp` (density-independent pixels)
- iOS: `360pt × 800pt` (points)
- Web: `360px × 800px` (CSS pixels)

### Component Dimensions

#### Status Bar
```css
.status-bar {
  width: 368px;
  height: 44px;
  margin-left: -12px;
  margin-top: -2px;
}
```

#### Home Indicator
```css
.home-indicator {
  width: 391px;
  height: 34px;
  margin-left: -15px;
  margin-bottom: 2px;
}
```

#### Headline
```css
.headline {
  width: 319px;
  height: 25px;
  margin-left: 22px;
  margin-top: 51px;
}
```

#### Notch
```css
.notch {
  width: 100%; /* Full width via alignParentLeft/Right */
  height: 30px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
```

**React/Tailwind Implementation:**
```tsx
<div className="w-full h-[30px] absolute top-0 left-0 right-0 bg-black">
  {/* iPhone X/11/12/13/14 notch area */}
</div>
```

**With Safe Area Support:**
```tsx
<div
  className="w-full absolute top-0 left-0 right-0 bg-black"
  style={{ height: 'max(30px, env(safe-area-inset-top))' }}
>
  {/* Adapts to device-specific notch height */}
</div>
```

#### Charging Icon
```css
.charging-icon {
  width: 57.5px;
  height: 31.83px;
  margin-left: 151px;
  margin-top: 375px;
}
```

#### Speaker Section
```css
.speaker-section {
  width: 265px;
  height: 283px;
  margin-left: 46px;
  margin-top: 117px;
}
```

**React/Tailwind Example:**
```tsx
<div className="w-[265px] h-[283px] ml-[46px] mt-[117px]">
  {/* Speaker controls and info */}
</div>
```

#### Status Icon
```css
.status-icon {
  width: 69px;
  height: 14px;
  position: absolute;
  top: 16px;
  right: 14px;
}
```

**React/Tailwind Example:**
```tsx
<div className="w-[69px] h-[14px] absolute top-[16px] right-[14px] flex items-center justify-end gap-1">
  {/* WiFi, battery, signal icons */}
  <WifiIcon className="w-4 h-4" />
  <BatteryIcon className="w-4 h-4" />
</div>
```

#### Indicator (Notification Dot)
```css
.indicator {
  width: 6px;
  height: 6px;
  position: absolute;
  top: 8px;
  right: 71px;
  border-radius: 50%; /* Make it circular */
}
```

**React/Tailwind Example:**
```tsx
{hasNotifications && (
  <div className="w-[6px] h-[6px] absolute top-[8px] right-[71px] bg-red-500 rounded-full" />
)}
```

**Usage Pattern:**
```tsx
// Notification indicator with animation
<div className="relative">
  <div className="w-[6px] h-[6px] absolute top-[8px] right-[71px] bg-red-500 rounded-full animate-pulse" />
</div>
```

#### Time Light (Status Bar Time)
```css
.time-light {
  width: 54px;
  height: 21px;
  position: absolute;
  top: 12px;
  left: 21px;
}
```

**React/Tailwind Example:**
```tsx
<div className="w-[54px] h-[21px] absolute top-[12px] left-[21px]">
  <span className="text-white text-sm font-semibold">9:41</span>
</div>
```

**Complete Status Bar Pattern:**
```tsx
// Combining Time Light, Status Icon, and Indicator
<div className="relative w-full h-[44px]">
  {/* Time (left) */}
  <div className="w-[54px] h-[21px] absolute top-[12px] left-[21px]">
    <span className="text-white text-sm font-semibold">
      {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
    </span>
  </div>

  {/* Status Icons (right) */}
  <div className="w-[69px] h-[14px] absolute top-[16px] right-[14px] flex items-center justify-end gap-1">
    <SignalIcon className="w-4 h-4 text-white" />
    <WifiIcon className="w-4 h-4 text-white" />
    <BatteryIcon className="w-4 h-4 text-white" />
  </div>

  {/* Notification Indicator (optional) */}
  {hasNotifications && (
    <div className="w-[6px] h-[6px] absolute top-[8px] right-[71px] bg-red-500 rounded-full animate-pulse" />
  )}
</div>
```

#### Group 42731 (Small Navigation Indicator)
```css
.group-42731-small {
  width: 31px;
  height: 9px;
  position: absolute;
  top: 87px;
  left: 23px;
}
```

**React/Tailwind Example:**
```tsx
{/* Small navigation indicator or breadcrumb */}
<div className="w-[31px] h-[9px] absolute top-[87px] left-[23px] bg-purple-500 rounded-full opacity-60" />
```

#### Frame 6164 (Content Card)
```css
.frame-6164 {
  width: 327px;
  height: 162px;
  position: absolute;
  top: 381px;
  left: 50%;
  transform: translateX(-50%); /* Center horizontally */
}
```

**React/Tailwind Example:**
```tsx
{/* Centered content card */}
<div className="w-[327px] h-[162px] absolute top-[381px] left-1/2 -translate-x-1/2">
  {/* Card content - speaker controls, audio info, etc. */}
</div>
```

**Practical Usage:**
```tsx
// Content card with gradient background
<div
  className="w-[327px] h-[162px] absolute top-[381px] left-1/2 -translate-x-1/2 rounded-2xl p-6 shadow-xl"
  style={{
    background: 'linear-gradient(135deg, rgba(41, 49, 60, 0.8) 0%, rgba(12, 20, 33, 0.9) 100%)',
    backdropFilter: 'blur(10px)'
  }}
>
  <h3 className="text-white text-lg font-semibold mb-4">Audio Control</h3>
  {/* Content */}
</div>
```

#### Group 42731 (Bottom Navigation)
```css
.group-42731-nav {
  width: 431px;
  height: 85px;
  position: absolute;
  top: 847px;
  left: -1px;
}
```

**React/Tailwind Example:**
```tsx
{/* Bottom navigation extending beyond screen edges */}
<div className="w-[431px] h-[85px] absolute top-[847px] -left-[1px]">
  {/* Navigation buttons, tabs, or controls */}
</div>
```

**Note:** This element at 847px top (extending beyond 800px viewport) suggests a scrollable content area or bottom sheet overlay.

---

## 🎯 Responsive Breakpoints

### Tailwind CSS Breakpoints
```css
/* Mobile-first approach */
/* Default: 0-639px (mobile) */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Media Query Equivalents
```css
/* Mobile */
@media (max-width: 639px) {
  .container {
    max-width: 360px;
  }
}

/* Tablet */
@media (min-width: 640px) and (max-width: 1023px) {
  .container {
    max-width: 768px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}
```

---

## 🖼️ Gradient Variations

### Linear Gradient (Alternative)
```css
.linear-gradient-dark {
  background: linear-gradient(
    135deg,
    #29313C 0%,
    #0C1421 100%
  );
}
```

### Angular Gradient (with Rotation)
```css
.rotated-gradient {
  background: radial-gradient(
    circle at 50% 50%,
    #29313C 0%,
    #0C1421 100%
  );
  transform: rotate(72.096deg) scale(1.934, 8.373);
  transform-origin: center;
}
```

**Note:** The Android XML includes complex transforms (`scaleX: 1.934`, `scaleY: 8.373`, `rotation: 72.096°`). For web, it's simpler to use the standard radial gradient without transforms.

---

## 🎨 Component Styling Examples

### Settings Screen Background
```tsx
// React Component
<div className="min-h-screen" style={{
  background: 'radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%)'
}}>
  {/* Content */}
</div>
```

### Card with Gradient Background
```tsx
<Card className="border-none" style={{
  background: 'radial-gradient(circle at 50% 50%, #29313C 20%, #0C1421 100%)',
  color: 'white'
}}>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Button with Gradient
```tsx
<Button
  className="border-none text-white"
  style={{
    background: 'linear-gradient(135deg, #29313C 0%, #1f2937 100%)'
  }}
>
  Click Me
</Button>
```

---

## 📱 Typography

### Settings Title (from Android XML)
```css
.settings-title {
  font-family: 'Inter', sans-serif;
  font-size: 22px; /* 22sp in Android */
  line-height: 27px; /* 27sp line height */
  color: #FFFFFF;
  font-weight: 400; /* Regular */
}
```

### Tailwind Equivalent
```tsx
<h1 className="font-inter text-[22px] leading-[27px] text-white">
  Settings
</h1>
```

### Inter Font Integration (Next.js)
```tsx
// Already implemented in layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ["latin"] });

// Usage in component
<div className={inter.className}>
  <h1>Settings</h1>
</div>
```

### Main Page Title (from Android XML)
```css
.main-page-title {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 30px; /* 30sp in Android */
  line-height: 36px; /* 36sp line height */
  color: #000000;
  font-weight: 400; /* Regular */
}
```

**Tailwind Equivalent:**
```tsx
<h1 className="font-['SF_Pro_Text'] text-[30px] leading-[36px] text-black">
  Main Page
</h1>
```

**CSS with System Font Stack:**
```css
.main-page-title {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  font-size: 30px;
  line-height: 36px;
  color: #000000;
}
```

### Record Button Label (from Android XML)
```css
.record-button-label {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 15px; /* 15sp in Android */
  line-height: 18px; /* 18sp line height */
  color: #000000;
  font-weight: 400; /* Regular */
}
```

**Tailwind Equivalent:**
```tsx
<button className="font-['SF_Pro_Text'] text-[15px] leading-[18px] text-black">
  Record Button
</button>
```

**React Component Example:**
```tsx
<button
  className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all"
  style={{
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    fontSize: '15px',
    lineHeight: '18px',
    color: '#ffffff'
  }}
>
  Record Button
</button>
```

### Next Recording Page Label (from Android XML)
```css
.next-record-label {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 15px; /* 15sp in Android */
  line-height: 18px; /* 18sp line height */
  color: #000000;
  font-weight: 400; /* Regular */
}
```

**Tailwind Equivalent:**
```tsx
<div className="font-['SF_Pro_Text'] text-[15px] leading-[18px] text-black">
  Next Recording Page
</div>
```

**Positioned Component:**
```tsx
{/* Next Recording Page label - positioned far right */}
<div
  className="w-[152px] h-[18px] absolute top-[594px] left-[385px]"
  style={{
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    fontSize: '15px',
    lineHeight: '18px',
    color: '#000000'
  }}
>
  Next Recording Page
</div>
```

**Navigation Link Pattern:**
```tsx
{/* As clickable navigation link */}
<Link
  href="/recording"
  className="absolute top-[594px] left-[385px] font-['SF_Pro_Text'] text-[15px] leading-[18px] text-black hover:text-blue-600 transition-colors"
>
  Next Recording Page →
</Link>
```

### Previous Recordings Label (from Android XML)
```css
.previous-recordings-label {
  font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 15px; /* 15sp in Android */
  line-height: 18px; /* 18sp line height */
  color: #000000;
  font-weight: 400; /* Regular */
}
```

**Tailwind Equivalent:**
```tsx
<div className="font-['SF_Pro_Text'] text-[15px] leading-[18px] text-black">
  Previous Recordings
</div>
```

**Positioned Component:**
```tsx
{/* Previous Recordings label - positioned at viewport edge */}
<div
  className="w-[149px] h-[18px] absolute top-[650px] left-[359px]"
  style={{
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
    fontSize: '15px',
    lineHeight: '18px',
    color: '#000000'
  }}
>
  Previous Recordings
</div>
```

**Navigation Link Pattern:**
```tsx
{/* As clickable navigation link */}
<Link
  href="/recordings/history"
  className="absolute top-[650px] left-[359px] font-['SF_Pro_Text'] text-[15px] leading-[18px] text-black hover:text-blue-600 transition-colors"
>
  Previous Recordings
</Link>
```

**Vertical Navigation Stack Pattern:**
```tsx
{/* Complete navigation stack with consistent spacing */}
<nav className="absolute right-0 top-[440px] space-y-[56px]">
  <Link href="/record" className="block font-['SF_Pro_Text'] text-[15px] leading-[18px]">
    Record Button
  </Link>
  <Link href="/recording/next" className="block font-['SF_Pro_Text'] text-[15px] leading-[18px]">
    Next Recording Page
  </Link>
  <Link href="/recordings/history" className="block font-['SF_Pro_Text'] text-[15px] leading-[18px]">
    Previous Recordings
  </Link>
</nav>
```

---

## 🎯 Implementation Guide

### Step 1: Add Custom Colors to Tailwind Config
```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        'figma-dark-blue-grey': '#29313C',
        'figma-very-dark-blue': '#0C1421',
        'figma-purple': '#7c3aed',
        'figma-dark-grey': '#1f2937',
      },
      backgroundImage: {
        'figma-radial': 'radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%)',
        'figma-linear': 'linear-gradient(135deg, #29313C 0%, #0C1421 100%)',
      }
    }
  }
}
```

### Step 2: Use in Components
```tsx
// With Tailwind classes
<div className="bg-figma-radial min-h-screen">
  <div className="bg-figma-dark-blue-grey p-6 rounded-lg">
    <h1 className="text-white text-2xl">Settings</h1>
  </div>
</div>

// With inline styles
<div style={{
  background: 'radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%)',
  minHeight: '100vh'
}}>
  {/* Content */}
</div>
```

### Step 3: Apply to Existing Components

#### Dashboard Background
```tsx
// src/app/dashboard/page.tsx
<div className="min-h-screen bg-[radial-gradient(circle_at_50%_50%,#29313C_0%,#0C1421_100%)]">
  {/* Dashboard content */}
</div>
```

#### Settings Modal
```tsx
// src/components/settings/settings-modal.tsx
<DialogContent
  className="max-w-4xl max-h-[80vh] overflow-y-auto"
  style={{
    background: 'radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%)',
    color: 'white'
  }}
>
  {/* Settings content */}
</DialogContent>
```

#### Cards with Dark Gradient
```tsx
<Card
  className="border-none"
  style={{
    background: 'linear-gradient(135deg, #29313C 0%, #1f2937 100%)'
  }}
>
  <CardHeader>
    <CardTitle className="text-white">Audio Settings</CardTitle>
  </CardHeader>
  <CardContent className="text-gray-200">
    {/* Content */}
  </CardContent>
</Card>
```

---

## 🌓 Dark Mode Integration

### Current Implementation (from layout.tsx)
```tsx
// Supports system/light/dark themes
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
/>
```

### Figma Dark Mode Class
```css
/* Add to globals.css */
.dark .figma-gradient {
  background: radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%);
}

.light .figma-gradient {
  background: radial-gradient(circle at 50% 50%, #e5e7eb 0%, #ffffff 100%);
}
```

### Usage
```tsx
<div className="figma-gradient min-h-screen">
  {/* Automatically switches based on theme */}
</div>
```

---

## 📊 Screens Using This Gradient

Based on uploaded Figma designs:
1. ✅ **Settings Screen** - Main settings interface
2. ✅ **Charging Screen** - Battery charging status
3. ✅ **Battery Optimization** - Power management screen
4. ✅ **Ambient Sound OFF** - Sound mode control

**Common Pattern:** All screens use the same radial gradient (#29313C → #0C1421) with consistent dimensions (360x800).

---

## 🎨 Complete Example Component

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FigmaStyledComponent() {
  return (
    <div
      className="min-h-screen p-6"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%)'
      }}
    >
      <div className="container mx-auto max-w-md">
        {/* Header matching Figma specs */}
        <h1
          className="font-inter text-[22px] leading-[27px] text-white mb-8"
          style={{
            marginLeft: '22px',
            marginTop: '51px'
          }}
        >
          Settings
        </h1>

        {/* Card with gradient */}
        <Card
          className="border-none shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #29313C 0%, #1f2937 100%)'
          }}
        >
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Audio Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="text-gray-200">
            <p>Your audio settings content here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 🔗 Related Documentation

- [Figma Design Reference](./FIGMA_DESIGN_REFERENCE.md) - Android XML specifications
- [UI Component Validation](./testing/UI_COMPONENT_VALIDATION.md) - Current UI implementation

---

## 📝 Notes

1. **Transform Complexity**: The Android XML includes complex transforms (`scaleX`, `scaleY`, `rotation`). For web, use simpler radial gradients for better performance.

2. **Color Accuracy**: Colors extracted directly from Figma XML are exact hex values.

3. **Responsive Adaptation**: Android `dp` units converted to CSS `px` for web equivalents.

4. **Font Matching**: Inter font is already configured in the project (layout.tsx).

5. **Dark Mode**: Current app supports system/light/dark themes. Figma designs use dark theme exclusively.

---

**CSS Reference Compiled By:** Figma XML Analysis
**Last Updated:** September 30, 2025
**Status:** Complete and ready to implement
