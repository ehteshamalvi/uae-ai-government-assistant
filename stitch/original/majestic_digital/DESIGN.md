---
name: Majestic Digital
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#42474d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#73777e'
  outline-variant: '#c3c7ce'
  surface-tint: '#406182'
  primary: '#001629'
  on-primary: '#ffffff'
  primary-container: '#002b49'
  on-primary-container: '#7293b6'
  inverse-primary: '#a8caef'
  secondary: '#775a19'
  on-secondary: '#ffffff'
  secondary-container: '#fed488'
  on-secondary-container: '#785a1a'
  tertiary: '#001819'
  on-tertiary: '#ffffff'
  tertiary-container: '#002e30'
  on-tertiary-container: '#00a0a6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#a8caef'
  on-primary-fixed: '#001d34'
  on-primary-fixed-variant: '#274969'
  secondary-fixed: '#ffdea5'
  secondary-fixed-dim: '#e9c176'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4201'
  tertiary-fixed: '#63f7ff'
  tertiary-fixed-dim: '#00dce5'
  on-tertiary-fixed: '#002021'
  on-tertiary-fixed-variant: '#004f53'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 20px
  stack-gap: 16px
  element-padding: 12px
  section-spacing: 32px
---

## Brand & Style

This design system embodies the intersection of heritage and high-tech innovation, specifically tailored for the UAE's digital transformation. The aesthetic is "Sovereign Modernism"—a blend of institutional authority and forward-thinking AI integration.

The visual style utilizes **Corporate Minimalism** with **Glassmorphic** accents for AI-driven features. It prioritizes clarity, efficiency, and a sense of "digital hospitality." The emotional response should be one of absolute trust, efficiency, and premium service. Backgrounds should remain clean, using extremely subtle, low-opacity geometric patterns (Mashrabiya-inspired) to provide texture without distracting from content.

## Colors

The palette is rooted in the "Majestic Blue" of sovereign stability and "Executive Gold" for premium service tiers. 
- **Primary (Majestic Blue):** Used for headers, primary actions, and institutional branding.
- **Secondary (Executive Gold):** Used for rewards, premium statuses, and high-level verification markers.
- **Tertiary (AI Cyan):** Specifically reserved for AI insights, chatbots, and live data visualizations to differentiate human-led and machine-led interactions.
- **Neutral:** A range of cool grays (Slate) to ensure the interface feels breathable and modern. 
- **Status:** Success (Emerald), Warning (Amber), and Error (Crimson) must meet WCAG AA accessibility standards against white backgrounds.

## Typography

The design system utilizes **IBM Plex Sans** for English and its companion **IBM Plex Sans Arabic** to ensure a perfectly matched visual weight across bilingual interfaces.

- **English:** A systematic Grotesque that conveys technical precision.
- **Arabic:** A modern Kufi-Naskh hybrid that ensures maximum legibility at small sizes for complex government forms.
- **Hierarchy:** Use Bold weights sparingly for headlines to maintain a "light" feel. Body text should prioritize the Regular weight with increased line-height (1.5x) to accommodate Arabic script descenders and ascenders without crowding.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for mobile-first interactions. 
- **Margins:** A consistent 20px lateral margin ensures content does not feel "trapped" against the screen edges.
- **Rhythm:** An 8px linear scale drives all spacing. 
- **Bilingual Adaptability:** The layout must mirror perfectly for RTL (Right-to-Left) Arabic support. Icons that indicate direction (arrows, progress bars) must be flipped, while brand marks remain fixed.
- **Whitespace:** High-priority "Executive" views should increase `section-spacing` to 48px to evoke a premium, uncluttered gallery feel.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layers** and **Ambient Shadows**.
- **Base Layer:** Pure White (#FFFFFF) or ultra-light gray (#F8F9FA).
- **Cards:** Use a very soft, diffused shadow (0px 4px 20px rgba(0, 43, 73, 0.05)) and a 1px border in a slightly darker neutral to define the edge.
- **AI Layers:** Use **Glassmorphism**. Banners or overlays for AI features should use a `backdrop-filter: blur(12px)` with a 60% white opacity tint and a subtle "AI Cyan" inner glow.
- **Interactive Elements:** Buttons should use a slight lift on press, rather than a deep shadow, to maintain the minimal aesthetic.

## Shapes

The design system uses a **Rounded** (Level 2) logic. This 8px (0.5rem) base radius provides a friendly, modern approachable feel that moves away from the rigid sharpness of traditional bureaucracy.
- **Small Components:** Buttons and Input fields use 8px.
- **Container Elements:** Cards and Modals use `rounded-lg` (16px) to create a distinct nesting visual.
- **AI Elements:** May use `rounded-xl` (24px) or pill shapes to denote a more "organic" and fluid technology.

## Components

### AI Insight Banners
Constructed with a glassmorphic background. They must feature the **AI Cyan** accent on the left border (or right for Arabic) and use a subtle shimmer animation to indicate active processing.

### Bottom Navigation
A clean, white bar with a blur effect. Icons use the **Primary Blue** for active states. Label text is mandatory for accessibility.

### Progress Trackers
Vertical for complex mobile forms, horizontal for short flows. Use a "connecting thread" metaphor with the **Executive Gold** used only for the current active step and completed steps.

### Input Fields
Minimalist style with a subtle 1px border. On focus, the border transitions to **Primary Blue** with a soft outer glow. Support for bilingual text entry is critical, ensuring the cursor and alignment switch dynamically based on the input language.

### Document States
- **Pending:** Soft Gray background.
- **Verified:** Primary Blue with a Gold checkmark icon.
- **Action Required:** Subtle Amber tint with high-contrast text.

### Buttons
- **Primary:** Solid Majestic Blue with white text.
- **Secondary:** Transparent with an Executive Gold border and text.
- **AI Action:** Gradient fill from Majestic Blue to AI Cyan.