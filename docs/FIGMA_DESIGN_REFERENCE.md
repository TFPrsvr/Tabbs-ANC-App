# Figma Design Reference

## Design Files

**Figma Link:** https://www.figma.com/design/hBf0GVtPluVmDMeDdjzPSh/Speaker-Audio-Control-App-UI--Community-

**Embed:** https://embed.figma.com/design/hBf0GVtPluVmDMeDdjzPSh/Speaker-Audio-Control-App-UI--Community-?node-id=0-1&embed-host=share

---

## Design System - Shared Elements

### Universal Background Gradient
All screens share the same radial gradient background:

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

**Gradient Properties:**
- Type: Radial
- Center: 180dp, 400dp (screen center)
- Radius: 90dp
- Start Color: #29313C (Dark blue-grey)
- End Color: #0C1421 (Very dark blue/black)
- Transform: Scaled (1.934x, 8.373y), Rotated (72.096°)

**CSS Equivalent:**
```css
background: radial-gradient(
  circle at 50% 50%,
  #29313C 0%,
  #0C1421 100%
);
```

### Universal Layout Container

#### Android XML
```xml
<RelativeLayout
  android:layout_width="360dp"
  android:layout_height="800dp"
  android:clipToOutline="true"
/>
```

#### iOS Swift
```swift
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

**Standard Screen Dimensions:**
- Width: 360dp/pt (mobile standard)
- Height: 800dp/pt
- Clip to outline: true
- Origin: (0, 0) top-left corner

**Platform Consistency:**
- Android uses `dp` (density-independent pixels)
- iOS uses `pt` (points)
- Web uses `px` (CSS pixels)
- All three translate to the same visual size: **360×800**

---

## Screen Inventory

### 1. Settings Screen Design Specification

#### Android XML Reference

**Screen Container:**
```xml
<RelativeLayout
  android:id="@+id/setting_scr"
  android:layout_width="360dp"
  android:layout_height="800dp"
  android:clipToOutline="true"
  android:background="@drawable/setting_scr"
/>
```

#### iOS Swift Reference

**Screen Container:**
```swift
// Settings Screen
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

#### Background Gradient
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

**Design Details:**
- Radial gradient from dark blue-grey (#29313C) to very dark blue (#0C1421)
- Centered gradient with 72.096° rotation
- Scale transforms: 1.934x horizontal, 8.373x vertical

#### Settings Title
```xml
<TextView
  android:id="@+id/settings"
  android:layout_width="96dp"
  android:layout_height="19dp"
  android:layout_marginLeft="61dp"
  android:layout_marginTop="49dp"
  android:text="Settings"
  android:textSize="22sp"
  android:textColor="#FFFFFF"
  android:fontFamily="Inter"
  android:lineHeight="27sp"
/>
```

**Typography:**
- Font: Inter
- Size: 22sp
- Color: White (#FFFFFF)
- Line Height: 27sp
- Position: 61dp from left, 49dp from top

### Additional Typography Styles

#### Main Page Title
**Dimensions:** 150dp × 36dp
**Position:** 112dp from left, 742dp from top (near bottom)

```xml
<TextView
  android:id="@+id/main_page"
  android:layout_width="150dp"
  android:layout_height="36dp"
  android:layout_alignParentLeft="true"
  android:layout_marginLeft="112dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="742dp"
  android:text="@string/main_page"
  android:textAppearance="@style/main_page"
  android:gravity="top"
/>
```

**Typography Style:**
```xml
<!-- styles.xml -->
<style name="main_page">
  <item name="android:textSize">30sp</item>
  <item name="android:textColor">#000000</item>
</style>

<!-- strings.xml -->
<string name="main_page">Main Page</string>
```

**Font Properties:**
- Font Family: SF Pro Text (Apple system font)
- Size: 30sp
- Color: #000000 (black)
- Line Height: 36sp (identical to box height)
- Gravity: top

**Purpose:** Navigation label or tab indicator for Main Page

#### Record Button Label
**Dimensions:** 104dp × 18dp
**Position:** 371dp from left, 440dp from top

```xml
<TextView
  android:id="@+id/record_butt"
  android:layout_width="104dp"
  android:layout_height="18dp"
  android:layout_alignParentLeft="true"
  android:layout_marginLeft="371dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="440dp"
  android:text="@string/record_butt"
  android:textAppearance="@style/record_butt"
  android:gravity="top"
/>
```

**Typography Style:**
```xml
<!-- styles.xml -->
<style name="record_butt">
  <item name="android:textSize">15sp</item>
  <item name="android:textColor">#000000</item>
</style>

<!-- strings.xml -->
<string name="record_butt">Record Button</string>
```

**Font Properties:**
- Font Family: SF Pro Text
- Size: 15sp
- Color: #000000 (black)
- Line Height: 18sp (identical to box height)
- Gravity: top

**Purpose:** Button label for recording functionality

**Visual Context:** Positioned at 371dp from left (right side of 360dp viewport - extends beyond screen edge, likely in meeting_rec container at 430dp width)

#### Next Recording Page Label
**Dimensions:** 152dp × 18dp
**Position:** 385dp from left, 594dp from top

```xml
<TextView
  android:id="@+id/next_record"
  android:layout_width="152dp"
  android:layout_height="18dp"
  android:layout_alignParentLeft="true"
  android:layout_marginLeft="385dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="594dp"
  android:text="@string/next_record"
  android:textAppearance="@style/next_record"
  android:gravity="top"
/>
```

**Typography Style:**
```xml
<!-- styles.xml -->
<style name="next_record">
  <item name="android:textSize">15sp</item>
  <item name="android:textColor">#000000</item>
</style>

<!-- strings.xml -->
<string name="next_record">Next Recording Page</string>
```

**Font Properties:**
- Font Family: SF Pro Text
- Size: 15sp
- Color: #000000 (black)
- Line Height: 18sp (identical to box height)
- Gravity: top

**Purpose:** Navigation label or notification for next recording page

**Visual Context:** Positioned at 385dp from left (far right, beyond 360dp viewport - in meeting_rec container at 430dp width), at 594dp from top

#### Previous Recordings Label
**Dimensions:** 149dp × 18dp
**Position:** 359dp from left, 650dp from top

```xml
<TextView
  android:id="@+id/previous_re"
  android:layout_width="149dp"
  android:layout_height="18dp"
  android:layout_alignParentLeft="true"
  android:layout_marginLeft="359dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="650dp"
  android:text="@string/previous_re"
  android:textAppearance="@style/previous_re"
  android:gravity="top"
/>
```

**Typography Style:**
```xml
<!-- styles.xml -->
<style name="previous_re">
  <item name="android:textSize">15sp</item>
  <item name="android:textColor">#000000</item>
</style>

<!-- strings.xml -->
<string name="previous_re">Previous Recordings</string>
```

**Font Properties:**
- Font Family: SF Pro Text
- Size: 15sp
- Color: #000000 (black)
- Line Height: 18sp (identical to box height)
- Gravity: top

**Purpose:** Navigation label for accessing previous recording history

**Visual Context:** Positioned at 359dp from left (just at the edge of 360dp viewport), at 650dp from top - 56dp below "Next Recording Page" (594dp)

**Pattern Note:** Part of consistent navigation typography family (Record Button, Next Recording Page, Previous Recordings) all using SF Pro Text 15sp/18sp

---

## Current Implementation Mapping

### React/Next.js Settings Modal
**Location:** `src/components/settings/settings-modal.tsx`
**Status:** ✅ Fully Implemented

#### Background Styling
Our implementation uses Tailwind CSS with dark mode support:
```tsx
// Dialog background inherits from global theme
className="max-w-4xl max-h-[80vh] overflow-y-auto"
```

**Equivalent Styling:**
- Uses Next.js theme system (light/dark/system)
- Automatic dark mode with `dark:` classes
- Responsive design with max-width constraints

#### Title Implementation
```tsx
<DialogTitle className="flex items-center gap-2">
  <Settings className="w-5 h-5" />
  🔧 ANC Audio Pro Settings
</DialogTitle>
```

**Styling:**
- Icon + Text layout (matches Figma intent)
- Responsive sizing with Tailwind utilities
- Accessible with proper semantic HTML

---

## Design System Comparison

### Figma Design (Android)
| Element | Value |
|---------|-------|
| Screen Width | 360dp (mobile) |
| Background | Radial gradient (#29313C → #0C1421) |
| Title Font | Inter 22sp |
| Title Color | #FFFFFF |
| Layout System | RelativeLayout (Android) |

### Current Implementation (Next.js/React)
| Element | Value |
|---------|-------|
| Container Width | Responsive (max-w-4xl = 896px) |
| Background | Theme-based (system/light/dark) |
| Title Font | System font stack |
| Title Color | Theme variable |
| Layout System | Flexbox/Grid (CSS) |

---

## Design Alignment Notes

### Similarities ✅
1. **Settings Title**: Both prominently display "Settings" at the top
2. **Dark Theme**: Both use dark backgrounds for modern aesthetic
3. **Professional Layout**: Clean, organized interface structure
4. **Icon Support**: Both use icons alongside text labels

### Differences (Intentional)
1. **Platform**: Figma shows Android native, we implement web/PWA
2. **Responsive**: Our implementation is responsive (mobile/tablet/desktop)
3. **Theme System**: We support light/dark/system themes dynamically
4. **Tab Navigation**: Our implementation uses 5 tabs (Audio, Processing, Notifications, Display, Privacy)
5. **Accessibility**: Enhanced ARIA labels and keyboard navigation

---

## Implementation Status

### Current Settings Features
- ✅ **Audio Settings**: Output gain, input gain, sample rate, buffer size
- ✅ **Processing Settings**: ANC, spatial audio, voice separation, real-time processing
- ✅ **Notifications Settings**: Comprehensive notification preferences
- ✅ **Display Settings**: Theme, visualizations, animations, accessibility modes
- ✅ **Privacy Settings**: Telemetry, analytics, crash reports, recommendations

### Design Integration
- ✅ Modal-based settings (matches Figma full-screen approach)
- ✅ Dark theme default (aligns with Figma gradient)
- ✅ Professional typography with proper hierarchy
- ✅ Comprehensive settings organization

---

## Recommendations

### To Fully Match Figma Design:

1. **Apply Radial Gradient Background** (Optional)
   ```css
   background: radial-gradient(
     circle at 50% 50%,
     #29313C 0%,
     #0C1421 100%
   );
   ```

2. **Use Inter Font** (Optional)
   ```tsx
   import { Inter } from 'next/font/google';
   const inter = Inter({ subsets: ['latin'] });
   ```

3. **Adjust Title Positioning** (Optional)
   ```tsx
   // Add specific padding/margin to match Figma spacing
   className="pt-[49px] pl-[61px]"
   ```

### Current Approach Benefits:
- **Responsive Design**: Works on all screen sizes
- **Theme Flexibility**: User can choose light/dark/system
- **Accessibility**: Better screen reader support
- **Web Standards**: Uses modern React patterns
- **PWA Compatible**: Works as mobile app via Capacitor

---

## Mobile App Integration

### Capacitor Configuration
The app is configured for mobile deployment:
```json
{
  "@capacitor/android": "^7.4.3",
  "@capacitor/ios": "^7.4.3"
}
```

### Scripts Available
```bash
npm run mobile:build      # Build for mobile
npm run mobile:android    # Open Android Studio
npm run mobile:ios        # Open Xcode
```

---

## Design Reference Usage

**Purpose:** The Figma design serves as a visual reference for:
1. Color scheme inspiration (#29313C, #0C1421)
2. Typography guidelines (Inter font, 22sp title)
3. Spacing standards (61dp, 49dp margins)
4. General layout aesthetics

**Implementation:** Our React/Next.js implementation achieves the same professional look while adding:
- Cross-platform compatibility
- Enhanced accessibility
- Responsive design
- Modern web standards

---

### 2. Charging Screen

**Screen ID:** `charging_sc`

#### Android XML
```xml
<RelativeLayout
  android:id="@+id/charging_sc"
  android:layout_width="360dp"
  android:layout_height="800dp"
  android:background="@drawable/charging_sc"
/>
```

#### iOS Swift
```swift
// Charging Screen
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

**Key Elements:**
- **Charging Icon** (57.5dp/pt × 31.83dp/pt)
  - Position: 151dp/pt from left, 375dp/pt from top
  - Center-aligned on screen
- **Speaker Section** (265dp/pt × 283dp/pt)
  - Position: 46dp/pt from left, 117dp/pt from top
  - Primary content area for speaker controls and information

**Purpose:** Display charging status and speaker information

---

### 3. Battery Optimization Screen

**Screen ID:** `battery_opt`

#### Android XML
```xml
<RelativeLayout
  android:id="@+id/battery_opt"
  android:layout_width="360dp"
  android:layout_height="800dp"
  android:background="@drawable/battery_opt"
/>
```

#### iOS Swift
```swift
// Battery Optimization Screen
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

**Same gradient background** as other screens
**Purpose:** Battery optimization settings and controls

---

### 4. Ambient Sound OFF Screen

**Screen ID:** `ambinet_sou` (with Battery Optimization)

#### Android XML
```xml
<RelativeLayout
  android:id="@+id/ambinet_sou"
  android:layout_width="360dp"
  android:layout_height="800dp"
  android:background="@drawable/ambinet_sou"
/>
```

#### iOS Swift
```swift
// Ambient Sound OFF Screen
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

**Background Gradient (Identical):**
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

**Purpose:** Ambient sound control interface with battery optimization toggle

---

## System UI Elements

### Status Bar
**Dimensions:** 368dp/pt × 44dp/pt
**Position:** -12dp/pt left, -2dp/pt top (extends beyond screen edge)

#### Android XML
```xml
<RelativeLayout
  android:id="@+id/status_bar"
  android:layout_width="368dp"
  android:layout_height="44dp"
  android:layout_marginLeft="-12dp"
  android:layout_marginTop="-2dp"
/>
```

#### iOS Swift
```swift
// Status Bar
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

**Purpose:** System status bar (time, battery, signal)

**Note:** iOS frame shows full screen container; status bar occupies top 44pt with edge-to-edge bleed effect

### Home Indicator
**Dimensions:** 391dp/pt × 34dp/pt
**Position:** -15dp/pt left, 2dp/pt from bottom

#### Android XML
```xml
<RelativeLayout
  android:id="@+id/home_indica"
  android:layout_width="391dp"
  android:layout_height="34dp"
  android:layout_marginLeft="-15dp"
  android:layout_marginBottom="2dp"
/>
```

#### iOS Swift
```swift
// Home Indicator
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

**Purpose:** iOS-style home indicator bar

**Note:** iOS frame shows full screen container; home indicator occupies bottom 34pt with edge-to-edge bleed effect

### Notch
**Dimensions:** Full-width (0dp with alignParentLeft/Right) × 30dp
**Position:** Top of screen

```xml
<RelativeLayout
  android:id="@+id/notch"
  android:layout_width="0dp"
  android:layout_height="30dp"
  android:layout_alignParentLeft="true"
  android:layout_alignParentRight="true"
  android:layout_alignParentTop="true"
/>
```

**Purpose:** iPhone X-style notch area for status bar and front camera

**CSS Implementation:**
```css
.notch {
  width: 100%;
  height: 30px;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
```

**React/Tailwind:**
```tsx
<div className="w-full h-[30px] absolute top-0 left-0 right-0">
  {/* Notch area - typically dark/transparent */}
</div>
```

**Safe Area Handling (iOS):**
```css
.content-with-notch {
  padding-top: max(30px, env(safe-area-inset-top));
}
```

### Headline
**Dimensions:** 319dp × 25dp
**Position:** 22dp left, 51dp top

```xml
<View
  android:id="@+id/headline"
  android:layout_width="319dp"
  android:layout_height="25dp"
  android:layout_marginLeft="22dp"
  android:layout_marginTop="51dp"
/>
```

**Purpose:** Page title or heading area

### Status Icon
**Dimensions:** 69dp × 14dp
**Position:** 14dp from right, 16dp from top (top-right corner)

```xml
<RelativeLayout
  android:id="@+id/status_icon"
  android:layout_width="69dp"
  android:layout_height="14dp"
  android:layout_alignParentRight="true"
  android:layout_marginRight="14dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="16dp"
/>
```

**Purpose:** System status icons (WiFi, battery, signal strength, etc.)

### Indicator
**Dimensions:** 6dp × 6dp (small dot)
**Position:** 71dp from right, 8dp from top (near top-right corner)

```xml
<RelativeLayout
  android:id="@+id/indicator"
  android:layout_width="6dp"
  android:layout_height="6dp"
  android:layout_alignParentRight="true"
  android:layout_marginRight="71dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="8dp"
/>
```

**Purpose:** Small notification indicator dot (unread messages, alerts, etc.)

### Time Light
**Dimensions:** 54dp × 21dp
**Position:** 21dp from left, 12dp from top (top-left corner)

```xml
<RelativeLayout
  android:id="@+id/time_light"
  android:layout_width="54dp"
  android:layout_height="21dp"
  android:layout_alignParentLeft="true"
  android:layout_marginLeft="21dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="12dp"
  android:clipToOutline="true"
/>
```

**Purpose:** Time display in status bar (e.g., "9:41")

### Group 42731 (Small Navigation Indicator)
**Dimensions:** 31dp/pt × 9dp/pt (small horizontal element)
**Position:** 23dp/pt from left, 87dp/pt from top

#### Android XML
```xml
<View
  android:id="@+id/group_42731"
  android:layout_width="31dp"
  android:layout_height="9dp"
  android:layout_alignParentLeft="true"
  android:layout_marginLeft="23dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="87dp"
/>
```

#### iOS Swift (Auto Layout)
```swift
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 31, height: 9)
view.layer.backgroundColor = UIColor(red: 0, green: 0, blue: 0, alpha: 0).cgColor

var parent = self.view!
parent.addSubview(view)
view.translatesAutoresizingMaskIntoConstraints = false
view.widthAnchor.constraint(equalToConstant: 31).isActive = true
view.heightAnchor.constraint(equalToConstant: 9).isActive = true
view.leadingAnchor.constraint(equalTo: parent.leadingAnchor, constant: 23).isActive = true
view.topAnchor.constraint(equalTo: parent.topAnchor, constant: 87).isActive = true
```

**Purpose:** Small decorative element or indicator (possibly breadcrumb, tab indicator, or visual separator)

**Visual Context:** Positioned below the status bar area (44dp/pt) and headline (25dp/pt), at 87dp/pt from top - likely a navigation indicator or visual accent element

**iOS Implementation Notes:**
- Uses Auto Layout constraints instead of frame-based positioning
- Transparent background (alpha: 0) - likely styled with additional properties
- Fixed dimensions (31×9) with leading and top anchors

### Frame 6164 (Content Card)
**Dimensions:** 327dp/pt × 162dp/pt
**Position:** Center horizontal, 381dp/pt from top

#### Android XML
```xml
<RelativeLayout
  android:id="@+id/frame_6164"
  android:layout_width="327dp"
  android:layout_height="162dp"
  android:layout_centerHorizontal="true"
  android:layout_alignParentTop="true"
  android:layout_marginTop="381dp"
/>
```

#### iOS Swift (Auto Layout)
```swift
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 327, height: 162)

var parent = self.view!
parent.addSubview(view)
view.translatesAutoresizingMaskIntoConstraints = false
view.widthAnchor.constraint(equalToConstant: 327).isActive = true
view.heightAnchor.constraint(equalToConstant: 162).isActive = true
view.centerXAnchor.constraint(equalTo: parent.centerXAnchor, constant: -0.5).isActive = true
view.topAnchor.constraint(equalTo: parent.topAnchor, constant: 381).isActive = true
```

**Purpose:** Main content card (speaker controls, audio information, settings panel)

**Visual Context:** Centered horizontally at mid-screen (381dp/pt from top) - primary content area for user interaction

**iOS Implementation Notes:**
- Uses `centerXAnchor` with -0.5 constant for precise centering
- Fixed dimensions (327×162) with top anchor positioning
- Auto Layout ensures responsive centering across device sizes

### Group 42731 (Bottom Navigation)
**Dimensions:** 431dp × 85dp (extends beyond screen)
**Position:** -1dp from left, 847dp from top (below viewport)

```xml
<View
  android:id="@+id/group_42731"
  android:layout_width="431dp"
  android:layout_height="85dp"
  android:layout_alignParentLeft="true"
  android:layout_marginLeft="-1dp"
  android:layout_alignParentTop="true"
  android:layout_marginTop="847dp"
/>
```

**Purpose:** Bottom navigation bar or tab bar with edge-to-edge design

**Visual Context:** Positioned at 847dp (47dp beyond 800dp viewport) - suggests scrollable content or bottom sheet overlay

**Note:** Same ID as small indicator (group_42731) - likely different instances used in different contexts

### Meeting Rec (Icon Belt)
**Dimensions:** 430dp × 932dp (large container)
**Position:** Full screen container with white background
**Background Color:** #FFFFFF (white)

```xml
<RelativeLayout
  android:id="@+id/meeting_rec"
  android:layout_width="430dp"
  android:layout_height="932dp"
  android:clipToOutline="true"
  android:background="#FFFFFF"
/>
```

**Purpose:** Icon belt container or meeting recording interface (likely a modal overlay or separate screen)

**Visual Context:** Larger than standard 360×800 viewport - suggests tablet view or full-screen modal with white background

### Presentation
**Dimensions:** 570dp × 821dp (extra-large container)
**Position:** Full screen container with white background
**Background Color:** #FFFFFF (white)

```xml
<RelativeLayout
  android:id="@+id/presentatio"
  android:layout_width="570dp"
  android:layout_height="821dp"
  android:clipToOutline="true"
  android:background="#FFFFFF"
/>
```

**Purpose:** Presentation mode or wide-screen view (likely for tablet landscape or desktop)

**Visual Context:** Largest container documented (570×821) - significantly wider than mobile (360×800) and meeting_rec (430×932) - suggests responsive design for tablet/desktop presentations

**Viewport Comparison:**
- Mobile Standard: 360×800 (portrait)
- Meeting Rec: 430×932 (large mobile/small tablet)
- Presentation: 570×821 (tablet landscape/desktop)

---

### 5. Main Screen

**Screen ID:** `main_screen`

#### Android XML
```xml
<RelativeLayout
  android:id="@+id/main_screen"
  android:layout_width="360dp"
  android:layout_height="800dp"
  android:clipToOutline="true"
  android:background="@drawable/main_screen"
/>
```

#### iOS Swift
```swift
// Main Screen
var view = UIView()
view.frame = CGRect(x: 0, y: 0, width: 360, height: 800)
```

**Same gradient background** as all other screens
**Purpose:** Primary application home screen / main interface

---

## Complete Screen List

1. ✅ **Main Screen** - Primary home screen / main interface
2. ✅ **Settings Screen** - App settings and preferences
3. ✅ **Charging Screen** - Charging status and speaker section
4. ✅ **Battery Optimization** - Power management settings
5. ✅ **Ambient Sound OFF** - Audio environment control

### Shared UI Components
- ✅ **Status Bar** (368×44dp)
- ✅ **Home Indicator** (391×34dp)
- ✅ **Notch** (full-width × 30dp)
- ✅ **Headline** (319×25dp)
- ✅ **Speaker Section** (265×283dp)
- ✅ **Charging Icon** (57.5×31.83dp)
- ✅ **Status Icon** (69×14dp, top-right)
- ✅ **Indicator** (6×6dp dot, top-right)
- ✅ **Time Light** (54×21dp, top-left)

---

## Design Implementation Guide

### Applying the Gradient in React/Next.js

**Option 1: Tailwind CSS (Current Implementation)**
```tsx
className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900"
```

**Option 2: Exact Figma Gradient (Radial)**
```tsx
<div style={{
  background: 'radial-gradient(circle at 50% 50%, #29313C 0%, #0C1421 100%)',
  minHeight: '100vh'
}}>
  {/* Your content */}
</div>
```

**Option 3: CSS Module**
```css
.screen-background {
  background: radial-gradient(
    circle at 50% 50%,
    #29313C 0%,
    #0C1421 100%
  );
  min-height: 100vh;
}
```

**Option 4: Styled Components**
```tsx
const ScreenBackground = styled.div`
  background: radial-gradient(
    circle at 50% 50%,
    #29313C 0%,
    #0C1421 100%
  );
  min-height: 100vh;
`;
```

### System UI Elements in Web/PWA

**Status Bar (iOS/Android):**
```tsx
// In layout.tsx metadata
appleWebApp: {
  statusBarStyle: 'black-translucent',
}
```

**Home Indicator (iOS):**
```css
/* Automatically handled by PWA viewport settings */
viewport-fit: cover;
padding-bottom: env(safe-area-inset-bottom);
```

**Headline/Title:**
```tsx
<h1 className="text-2xl font-semibold px-[22px] pt-[51px]">
  Settings
</h1>
```

---

## Color Palette

### Primary Colors
- **Dark Blue-Grey:** #29313C (gradient start)
- **Very Dark Blue:** #0C1421 (gradient end)
- **Purple Accent:** #7c3aed (tile color, already in use)
- **Dark Grey:** #1f2937 (theme color, already in use)

### Usage Recommendations
- **Backgrounds:** Use radial gradient for consistency
- **Text on Dark:** White (#FFFFFF) for high contrast
- **Accents:** Purple (#7c3aed) for interactive elements
- **Status Indicators:** Green (#10B981), Yellow (#F59E0B), Red (#EF4444)

---

## Spacing System (Based on Android XML)

### Margins
- **Small:** 2dp
- **Medium:** 22dp
- **Large:** 51dp
- **Negative (Edge Bleed):** -12dp, -15dp

### Component Sizing
- **Small Icons:** 25dp × 31.83dp
- **Medium Elements:** 265dp × 282dp
- **Large Containers:** 319dp × 368dp × 391dp width

### Screen Dimensions
- **Mobile Standard:** 360dp × 800dp
- **Safe Area:** Account for status bar (44dp) and home indicator (34dp)
- **Content Area:** ~360dp × 722dp (excluding system UI)

---

**Status:** ✅ Complete design reference with 4 screens documented
**Gradient:** ✅ CSS conversion provided
**System UI:** ✅ Status bar and home indicator documented
**Next Steps:** Apply exact gradients to components if desired
