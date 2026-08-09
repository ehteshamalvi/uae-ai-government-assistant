---
name: GovFlow AI
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#42474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#73777e'
  outline-variant: '#c3c7ce'
  surface-tint: '#406182'
  primary: '#001629'
  on-primary: '#ffffff'
  primary-container: '#002b49'
  on-primary-container: '#7293b6'
  inverse-primary: '#a8caef'
  secondary: '#006875'
  on-secondary: '#ffffff'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#00181b'
  on-tertiary: '#ffffff'
  tertiary-container: '#002e34'
  on-tertiary-container: '#2d9eac'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#a8caef'
  on-primary-fixed: '#001d34'
  on-primary-fixed-variant: '#274969'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#94f1ff'
  tertiary-fixed-dim: '#6fd5e4'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f57'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: IBM Plex Sans
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Noto Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
The design system embodies **Transaction Intelligence**—a personality that is authoritative, hyper-efficient, and visionary. It is tailored for the UAE’s digital transformation landscape, where premium aesthetics meet sovereign-grade reliability.

The visual style is **Corporate Modern with a "Glass-Tech" edge**. It utilizes high-end minimalism to convey transparency and trust, while integrating subtle glassmorphic layers to represent the fluid, non-linear nature of AI-driven insights. The interface must feel like a high-performance instrument: precise, calm, and uncluttered.

**Emotional Response:**
*   **Trust:** Through stable, structured layouts and classic navy typography.
*   **Innovation:** Through luminous cyan accents that highlight AI-generated "moments of intelligence."
*   **Efficiency:** Through generous whitespace and a rhythmic, predictable information hierarchy.

## Colors
The palette is rooted in the "Deep Sovereign Navy" (#002B49), providing a foundation of institutional stability. This is contrasted by "Intelligence Cyan" (#00E5FF), reserved exclusively for AI insights, data visualizations, and active states.

*   **Primary (Navy):** Used for primary text, headers, and structural backgrounds.
*   **Secondary (Cyan):** Used for AI highlights, primary call-to-actions, and status indicators.
*   **Tertiary (Teal):** Used for hover states and secondary data points to provide depth without over-stimulating the user.
*   **Neutral (Slate):** A range of cool grays (from #F8FAFC to #64748B) ensures the interface feels airy and modern.

Backgrounds remain predominantly white or ultra-light gray to maximize legibility and maintain a "clean-room" professional aesthetic.

## Typography
The typography system prioritizes bilingual accessibility (English/Arabic). **IBM Plex Sans** is used for structural elements (Headlines/Labels) to provide a technical, engineered feel. **Noto Sans** is utilized for body copy to ensure maximum legibility over long-form data and reports, as it offers exceptional support for the Arabic script.

**Hierarchical Rules:**
*   Use `display-lg` for dashboard hero stats and landing headings.
*   `label-md` should always be uppercase when used for section headers or technical metadata.
*   Maintain a 1.5x to 1.6x line height for body text to reduce cognitive load in data-heavy views.

## Layout & Spacing
The design system employs a **12-column fixed grid** on desktop, transitioning to a **4-column fluid grid** on mobile. The spacing rhythm is based on a 4px baseline, ensuring all components align to a predictable vertical and horizontal flow.

*   **Desktop:** 1440px max-width, 64px outer margins, 24px gutters.
*   **Tablet:** 8-column grid, 32px margins.
*   **Mobile:** 4-column fluid grid, 20px margins, 16px gutters.

Large "Macro-spacing" (80px+) is encouraged between major functional blocks to create a premium, editorial feel that avoids the "dense software" trap.

## Elevation & Depth
Elevation is conveyed through **Tonal Layers** and **Tinted Shadows**. Instead of generic black shadows, this design system uses shadows tinted with the Primary Navy (#002B49) at very low opacities (4-8%) to maintain a sophisticated color profile.

*   **Surface Level 0:** The main page background (#F8FAFC).
*   **Surface Level 1:** White cards/containers with a 1px border (#E2E8F0) and no shadow.
*   **Surface Level 2 (Active/Hover):** White cards with a subtle 12px blur shadow, tinted navy.
*   **AI Insight Layer:** Uses a glassmorphic effect—background blur (12px) with a semi-transparent white fill (80%) and a thin 1px cyan stroke.

## Shapes
The shape language is **Soft (0.25rem)**. This slight rounding removes the harshness of a purely "brutalist" corporate grid while maintaining a sense of precision and "architectural" integrity. 

*   **Base components (Buttons/Inputs):** 4px (0.25rem) corner radius.
*   **Containers (Cards/Modals):** 8px (0.5rem) corner radius.
*   **AI Tags/Chips:** Fully rounded (pill-shaped) to distinguish them as dynamic, "intelligent" elements within the rigid layout.

## Components
Consistent application of the "Transaction Intelligence" aesthetic across all UI patterns:

*   **Buttons:** Primary buttons are Solid Navy with White text. "AI-Action" buttons use a Cyan-to-Teal gradient. Secondary buttons use a Navy ghost-border style.
*   **Input Fields:** Minimalist with a bottom-only border that transforms into a full 1px Navy border on focus. Labels sit atop in `label-sm` navy.
*   **Cards:** Pure white background, 1px border in Light Slate. When a card contains AI insights, the top border is accented with a 2px Cyan line.
*   **Chips/Tags:** Status tags use low-saturation background tints (e.g., Light Cyan background with Teal text) to ensure they don't compete with primary actions.
*   **Data Visualization:** Graphs should use the Primary Navy as the baseline, with Cyan and Teal used for the "Insight" data trends.
*   **Navigation:** A clean left-hand sidebar in a "Deep Navy" glassmorphic state, providing a high-contrast anchor for the user journey.