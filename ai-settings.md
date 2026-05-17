# Front-End Web Development Quality Standards & AI Instructions

## 1. Tech Stack & Architecture

- **Framework:** Use Next.js 14+ (App Router) with TypeScript. Strict type safety is required (avoid `any`).
- **State Management:** Use React Context for lightweight global state, and Zustand for complex, global state logic.
- **Component Architecture:** Follow the Atomic Design methodology (atoms, molecules, organisms, templates, pages) or a feature-based folder structure.
- **API Routing:** Use Next.js Server Actions for data mutations and standard Route Handlers for third-party webhooks.

## 2. Code Quality & Best Practices (Clean Code)

- **Functional Components:** Write only functional components using React Hooks.
- **Coding Principles:** Strictly adhere to SOLID, DRY (Don't Repeat Yourself), and KISS (Keep It Simple, Stupid) principles. Avoid premature abstractions.
- **Immutability:** Treat state as immutable. Use functional updates when state depends on the previous state.
- **Error Handling:** Wrap all API requests, async operations, and JSON parsing in try/catch blocks. Implement centralized error logging and user-friendly fallback UIs.

## 3. Performance & Web Vitals Optimization

- **Images:** Always use the Next.js `<Image>` component. Provide explicit `width` and `height`, or use `fill` with appropriate aspect-ratio styling to prevent layout shifts.
- **Fonts:** Load fonts locally or via `next/font` to optimize Core Web Vitals and eliminate Flash of Unstyled Text (FOUT).
- **Bundle Optimization:** Implement dynamic importing (`next/dynamic`) for heavy components or components below the fold.
- **Data Fetching:** Optimize rendering strategies (SSG, SSR, ISR) based on data volatility. Use proper caching and revalidation thresholds.

## 4. Accessibility (a11y) & SEO

- **Compliance:** Code must strictly comply with WCAG 2.1 AA (or AAA where specified) standards.
- **Semantic HTML:** Use native HTML5 semantic tags (`<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`) instead of generic `<div>` wrappers.
- **Interactive Elements:** Ensure all custom interactive components (modals, dropdowns) are fully keyboard navigable and manage focus properly (`tabindex`, `aria-*` attributes).
- **Images & Media:** Every image must have a descriptive `alt` attribute. Use `alt=""` only for purely decorative images.
- **SEO & Metadata:** Generate metadata dynamically using the Next.js `generateMetadata` API. Ensure proper Open Graph (OG) tags and structured data (JSON-LD) are implemented where necessary.

## 5. UI, Styling & Design System

- **Styling Framework:** Use Tailwind CSS for all layouts and styling.
- **Design System Consistency:** Do NOT use arbitrary Tailwind values (e.g., `w-[312px]` or `bg-[#f3f3f3]`). Always use the design tokens, spacing scales, and color palettes defined in `tailwind.config.js`.
- **Responsive Design:** Follow a Mobile-First design approach. Ensure layout fluidity across all breakpoints (`sm`, `md`, `lg`, `xl`, `2xl`).

## 6. Security (OWASP Top 10)

- **XSS Prevention:** Sanitize any dynamic HTML input before rendering (use libraries like `isomorphic-dompurify`).
- **CSRF & Security Headers:** Implement robust security headers and ensure secure cookie management (SameSite, Secure, HttpOnly).
- **Environment Variables:** Never expose sensitive API keys or credentials to the client side. Use `NEXT_PUBLIC_` strictly for public configurations.
