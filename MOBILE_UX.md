# Student360 AI — Mobile & Tablet UX Architecture

## 1. Student Portal Mobile UX

- **Responsive Viewport**: Viewport configured for `device-width` with safe-area spacing and `user-scalable=no` for native app-like interactions.
- **Card-Based Layouts**: Responsive tables convert to card containers on mobile devices to eliminate horizontal scroll overflow.
- **Touch-Friendly Targets**: Buttons, tabs, and action cards maintain a minimum 44x44px touch boundary.

---

## 2. Faculty Mobile & Tablet Experience

- **Attendance Marking**: Designed for rapid touch input on mobile/tablet devices with large status buttons (Present / Absent / OD / Late).
- **Sticky Primary Actions**: Save attendance and verification buttons stick to bottom viewports on small screens.
- **Batch Verification Queue**: Verification approvals present full-width responsive preview cards.

---

## 3. Admin Responsive Layout

- Mobile sidebar collapses into an accessible slide-over drawer triggered from header hamburger menu.
- Data tables feature clean horizontal overflow wrappers with fixed column header visibility.
