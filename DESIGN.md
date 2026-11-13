# Invoice Studio

Current user direction: a clean-room browser invoice generator with immediate PDF output, no saved data, a blue accent, and system light/dark support. The experience is one temporary document, not an invoice-management dashboard.

Design read: a focused, disposable invoice form for freelancers and small businesses. Fill, inspect, download. No sidebar, history, saved profiles, backup controls, account flow, or marketing page.

- Palette: cool neutral surfaces and charcoal ink, one restrained blue accent (`#2557c4` in light mode, `#9cbcff` in dark mode). Red is semantic error/destructive feedback. No green branding, gradients, glass, or decorative patterns.
- Theme: follow system initially and react to system changes. Manual light/dark selection lasts only in current tab memory. Paper remains white to show the intended PDF output.
- Typography: self-hosted DM Sans for legible labels and numerals. Money uses tabular figures. No decorative monospace or uppercase eyebrows.
- Layout: slim brand/settings bar; editor and paper preview side by side. Phone/tablet switch explicitly between Edit and Preview. Controls stay readable and wrap instead of squeezing.
- Identity: numbered form sections and a firm rule above amount due. Whitespace separates identity, parties, items, and payment. No fabricated logos, customers, statistics, or testimonials.
- Navigation: section links jump directly to details, sender, client, items, and payment. PDF actions at the top and form bottom reduce backtracking.
- State: visible session-only notice explains refresh behavior. Reset needs confirmation. Removed items support in-memory Undo. PDF errors allow retry without clearing the form.
- Shapes: 6px controls, 8px editor, 12px dialogs, square paper. Shadows reserved for paper/dialog/toast elevation.
- Icons: Phosphor icons represent actual controls; none are decorative content assets.
- Motion: brief control feedback only, respecting reduced motion. Dials ENERGY 1 / RHYTHM 2 / MOTION 1.

Reference policy: public product READMEs informed requirements only. Implementation, layout, and styles are original. No reference implementation code or visual assets were copied. Anti Slop acts as a quality filter; no remote instructions were installed.
