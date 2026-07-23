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
