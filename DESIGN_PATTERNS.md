# fyxi.ru — Design System & Pattern Library

## 🎨 Color Palette & Tokens
- **Background Deep**: `#0b0a14`
- **Background Surface (Cards/Nav)**: `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(16px)`
- **Border Glow**: `rgba(255, 255, 255, 0.08)` / `rgba(99, 102, 241, 0.2)`
- **Accent Cyan**: `#06b6d4` (`rgb(6, 182, 212)`)
- **Accent Violet**: `#8b5cf6` (`rgb(139, 92, 246)`)
- **Gradient Cyber**: `linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)`
- **Text Primary**: `#f8fafc`
- **Text Muted**: `#94a3b8`

---

## 📱 Mobile Overlay & Navigation Guidelines
1. **Glassmorphism**: Mobile menus and overlays MUST use `backdrop-filter: blur(20px)` with dark semi-transparent backgrounds (`rgba(11, 10, 20, 0.95)`).
2. **Tactile Micro-interactions**: Buttons must have smooth `:active` press effects (`transform: scale(0.96)`).
3. **No Unstyled Elements**: All native elements (like `<button>`, `<select>`, `<input>`) MUST use scoped Vanilla CSS with custom borders, glass backgrounds, and rounded corners (12px - 16px).
4. **Visual Hierarchy**: Include subtle icons (emoji/SVG) alongside navigation links. Ensure email/user info is placed in a styled user-card, never raw plain text.
5. **Smooth Entrance**: Use keyframe slide & fade animations (`slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 🔗 Action Links & Read-More Components (`.read-more-link`)
1. **No Raw Underlined Links**: All action links (like "Читать статью →", "Подробнее →") MUST be styled as glassmorphic interactive badges. Never use plain text links or default browser underlines (`text-decoration: underline`).
2. **Cyber Glow**: Use `color: var(--accent-cyan)`, subtle cyan glass background (`rgba(6, 182, 212, 0.08)`), and border `rgba(6, 182, 212, 0.2)`.
3. **Micro-interaction**: On `:hover`, shift right (`transform: translateX(4px)`), brighten background to `rgba(6, 182, 212, 0.18)`, and add a cyan drop glow (`box-shadow: 0 0 15px rgba(6, 182, 212, 0.3)`).
4. **Border Radius**: 10px pill shapes.

---

## 🏷️ Category Chips & SEO Keyword Tags (`.seo-tag-link`)
1. **Glass Badges**: Styled as dark glass badges (`rgba(255, 255, 255, 0.03)` with `border: 1px solid var(--border-glow)`).
2. **Text Formatting**: Primary text color (`#f8fafc`), no underlines (`text-decoration: none`).
3. **Hover Animation**: On hover, lift up (`transform: translateY(-2px)`), glow cyan border (`border-color: var(--accent-cyan)`), and apply subtle cyan shadow (`box-shadow: 0 0 15px rgba(6, 182, 212, 0.2)`).


