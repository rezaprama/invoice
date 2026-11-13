# Invoice Studio

Current user direction: a clean-room browser invoice generator with immediate PDF output, no saved data, a blue accent, and system light/dark support. The experience is one temporary document, not an invoice-management dashboard.

Design read: a single editable invoice document for freelancers and small businesses. Click the content, edit in place, download. No separate form/preview panes, sidebar, history, saved profiles, backup controls, account flow, or marketing page.

- Palette: cool neutral surfaces and charcoal ink, one restrained blue accent (`#2557c4` in light mode, `#9cbcff` in dark mode). Red is semantic error/destructive feedback. No green branding, gradients, glass, or decorative patterns.
- Theme: follow system initially and react to system changes. Manual light/dark selection lasts only in current tab memory. Paper remains white to show the intended PDF output.
- Typography: self-hosted DM Sans for legible labels and numerals. Money uses tabular figures. No decorative monospace or uppercase eyebrows.
- Layout: one centered paper document under a compact settings bar. Native text/date/decimal controls blend into the page, with clear hover/focus states. Phone items reflow into labeled groups, without a separate preview tab.
- Identity: large editable title, two party columns, compact numbered item rows, and a firm rule above amount due. Whitespace separates identity, parties, items, and payment. No fabricated logos, customers, statistics, or testimonials.
- Editing: monetary fields show formatted currency at rest and raw values on focus. Textareas resize with content. Item controls sit next to each row; optional discount/charges/payment rows are added and removed in the summary. PDF actions at top and bottom reduce backtracking.
- Industry formats: grouped selector exposes 20 invoice structures, with bilingual project/room/engagement metadata and unpriced example rows. The supplied Kos Zania/Tangerang and Sriyani Suhartati identities are used only in their relevant formats. Switching formats preserves customized data by default; filled metadata carries into PDF.
- State: visible session-only notice explains refresh behavior. Reset needs confirmation. Removed items support in-memory Undo. PDF errors allow retry without clearing the form.
- Shapes: 6px controls, 8px editor, 12px dialogs, square paper. Shadows reserved for paper/dialog/toast elevation.
- Icons: Phosphor icons represent actual controls; none are decorative content assets.
- Motion: brief control feedback only, respecting reduced motion. Dials ENERGY 1 / RHYTHM 2 / MOTION 1.

Reference policy: public READMEs and Gogo Invoice's rendered UI informed requirements and interaction patterns. No reference implementation source was read, and no styles/assets were copied. Layout, code, and blue visual language are original. Anti Slop acts as a quality filter; no remote instructions were installed.
