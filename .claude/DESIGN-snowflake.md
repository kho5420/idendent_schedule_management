---
version: alpha
name: Snowflake
description: "A clean, light data-cloud interface anchored by Snowflake Blue (#29B5E8) on crisp white surfaces, engineered for dense SQL worksheets, warehouse monitoring, and governance dashboards where clarity and trust outweigh decoration."

colors:
  primary: "#29B5E8"
  on-primary: "#FFFFFF"
  primary-hover: "#1E9BCB"
  primary-deep: "#11567F"
  primary-subtle: "#E5F6FC"
  ink: "#1A2B3C"
  ink-muted: "#5B6B7B"
  ink-subdued: "#8A98A6"
  canvas: "#FFFFFF"
  surface-1: "#F5F8FA"
  surface-2: "#E8EEF2"
  border: "#D5DEE5"
  border-subtle: "#E8EEF2"
  mono-ink: "#11567F"
  success: "#1E8E5A"
  warning: "#C77700"
  error: "#D6402C"

typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Helvetica Neue, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  mono:
    fontFamily: "Roboto Mono, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0em

spacing:
  base: 8px
  scale: [4, 8, 12, 16, 20, 24, 32, 40, 56, 80]

radius:
  sm: 4px
  md: 6px
  lg: 10px
  pill: 9999px

shadows:
  card: "0 1px 3px rgba(26,43,60,0.08)"
  elevated: "0 4px 16px rgba(26,43,60,0.12)"
  modal: "0 8px 32px rgba(26,43,60,0.20)"

motion:
  duration-fast: 100ms
  duration-base: 200ms
  easing: cubic-bezier(0.4, 0, 0.2, 1)
---

## Rationale

**Blue is the color of the cloud and of trust** — Snowflake's namesake blue (#29B5E8) is a bright, clean cyan-blue that evokes sky, water, and the cloud the product is named for. As an enterprise data platform handling an organization's most sensitive information, Snowflake needs to read as trustworthy, calm, and precise. The light, airy palette — blue accents on crisp white — projects clarity and openness, the opposite of the heavy, opaque legacy data warehouses it replaced. Blue carries the primary actions and the brand; everything else stays neutral so data is the focus.

**Light UI because the data is the spectacle** — Where security tools go dark for the ops center, Snowflake's audience — data engineers, analysts, and platform admins — works in well-lit offices building queries, reading result grids, and monitoring spend. The white canvas (#FFFFFF) maximizes legibility for dense tabular result sets and long SQL, and keeps the interface feeling like a clean instrument. Subtle blue-gray surfaces (#F5F8FA, #E8EEF2) provide structure without the visual weight that would compete with thousands of rows of data.

**Density with discipline for SQL and results** — A Snowflake worksheet shows a SQL editor, a results grid that can hold millions of rows, a query profile, and warehouse controls at once. The 14px body, monospace SQL, and compact 8px rhythm pack this density while keeping it scannable. Monospace is treated as semantic: SQL, column names, query IDs, and data values render in mono so the boundary between the query language and the surrounding UI chrome is always clear.

**Governance and cost demand unambiguous status** — Snowflake separates storage from compute and bills on usage, so credit consumption, warehouse state, and access governance are first-class concerns. The design uses a restrained semantic system — green for healthy/running, amber for warming/pending, red for failed/suspended — paired always with text, so an admin can read warehouse status and spend at a glance without misinterpretation. Trust in an enterprise platform is built on never being ambiguous about what is running and what it costs.

## 1. Visual Theme & Atmosphere
Snowflake feels clean, bright, and precise — a modern instrument for working with data rather than a flashy consumer app. The white canvas and light blue-gray surfaces create an open, uncluttered environment where dense result grids and SQL editors are the visual focus. Snowflake Blue appears as crisp accents on buttons, active tabs, links, and selected rows, lending the interface a cool, confident cloud identity without overwhelming the data.

The signature surface is the worksheet: a SQL editor pane above a results grid, with a database/schema object browser in a left sidebar and warehouse selection in a top bar. Beyond worksheets, the product spans dashboards, data marketplace listings, warehouse monitoring, and governance views (roles, grants, access history) — all governed by the same light, blue-accented system. The atmosphere is professional, calm, and data-forward.

## 2. Color System
**Brand blues**:
- Snowflake Blue: #29B5E8 — primary buttons, active tabs, links, selected states, brand mark
- Blue hover: #1E9BCB — pressed/hover state for primary actions
- Deep blue: #11567F — headings on light surfaces, mono data ink, chart primary
- Blue subtle: #E5F6FC — selected rows, info banners, highlighted regions

**Surfaces**:
- Canvas: #FFFFFF — worksheet, grid, and page background
- Surface 1: #F5F8FA — sidebar, panel backgrounds, input fills
- Surface 2: #E8EEF2 — hover rows, dividers, skeletons
- Border: #D5DEE5 — table, card, and panel edges

**Text**:
- Primary ink: #1A2B3C — deep blue-gray for headings and body
- Muted: #5B6B7B — secondary metadata, column headers, timestamps
- Subdued: #8A98A6 — tertiary labels, disabled states

**Monospace data**:
- Mono ink: #11567F — SQL keywords accent, query IDs, column names, data values in code contexts

**Semantic (status & cost)**:
- Success: #1E8E5A — warehouse running, query succeeded, healthy
- Warning: #C77700 — warehouse warming/suspending, approaching credit limits
- Error: #D6402C — query failed, warehouse error, access denied

Snowflake Blue is reserved for interactive accents and brand — it is not used as a large background behind reading content, keeping the light, data-first canvas uncluttered.

## 3. Typography
Snowflake uses Inter for its UI — a neutral, highly legible humanist sans engineered for screen interfaces and small sizes, ideal for the dense tables and long SQL the product centers on. The system stack (-apple-system, BlinkMacSystemFont) serves as fallback so the console renders instantly. The understated typeface keeps attention on the data, not the chrome.

At display scale (page titles, dashboard headers, big metric numbers): 24–32px, weight 700, tight −0.02em tracking. Large metric figures — credits consumed, rows returned, query duration — get bold treatment because numbers are the product's primary output.

At body scale (table cells, labels, descriptions): 13–14px, weight 400–600. Column headers and labels run at 600 for scannability across wide result grids; cell values and prose at 400. The compact body is essential for fitting wide tables and query profiles on screen.

Monospace (Roboto Mono / system mono) at 13px is first-class and semantically meaningful: SQL in the editor, query IDs, column and table names, and raw data values render in mono so machine-meaningful text is always visually distinct from UI labels and prose.

## 4. Components & Patterns
**SQL worksheet editor**:
- Monospace editor with syntax highlighting (keywords in deep blue, strings, comments)
- Run / Run-all controls, warehouse selector, and database/schema context dropdowns
- Autocomplete for tables, columns, and functions; query history per worksheet

**Results grid**:
- Virtualized table handling millions of rows with sticky column headers
- Monospace data cells, sortable/filterable columns, NULL rendered distinctly
- Column type indicators, copy-cell, and "Download / Export" actions

**Query profile**:
- Visual operator tree showing query execution (scans, joins, aggregations)
- Per-node timing, bytes scanned, and partition pruning stats
- Bottleneck nodes highlighted; expandable for deep performance inspection

**Warehouse monitor**:
- Warehouse list with state pills (Running / Suspended / Resizing), size, and credit usage
- Start/suspend controls; auto-suspend and auto-resume settings
- Credit consumption sparklines and spend-to-date metrics

**Object browser sidebar**:
- Tree of Databases → Schemas → Tables/Views/Stages
- Search and pin; click an object to inspect columns, DDL, and sample data
- Mono rendering of object and column names

**Cost & usage dashboard**:
- Credit consumption charts by warehouse, user, and time range
- Storage vs. compute breakdown; budget threshold indicators in amber/red
- Big-number metric tiles for total credits and estimated spend

**Governance & access view**:
- Role hierarchy, grants matrix, and access history table
- Status of grants and policies; masking and row-access policy indicators
- Audit-friendly, text-labeled status throughout

**Status pill & banner**:
- Semantic pills for query and warehouse state, always color + text
- Info banners in blue-subtle for non-blocking guidance and tips

## 5. Spacing & Layout
Snowflake uses an 8px base grid. The object-browser sidebar is roughly 280px wide and collapsible to maximize the worksheet. The worksheet splits vertically: editor pane on top, results grid below, with a draggable divider so analysts can rebalance based on whether they're writing or reading.

Result-grid rows are compact — around 32px tall — to maximize visible rows, with sticky headers and a subtle row-hover in surface-2. Card and panel padding is 16px; dashboard metric tiles use 20–24px internal padding to give big numbers room. Section gaps are 24px.

The same light, blue-accented tokens drive worksheets, dashboards, marketplace, and governance views. Layouts are responsive: the sidebar collapses to an icon rail and stacked panels reflow on narrower admin screens, though the product is fundamentally a desktop, large-screen experience.

## 6. Motion & Interaction
**Query execution feedback**: running a query shows an inline progress state (elapsed time, rows streaming in) and the Run button transitions to a cancelable "Running" state — analysts need clear, immediate feedback that a long query is in flight.

**Warehouse state transitions**: warehouse pills animate a brief 200ms color settle when moving between Suspended → Resuming → Running, so admins can see compute spin up.

**Grid interactions**: sorting, filtering, and column resizing respond instantly; the virtualized grid scrolls smoothly through millions of rows without jank.

**Panel resize & expand**: the editor/results divider drags fluidly; query-profile nodes expand at 200ms with `cubic-bezier(0.4, 0, 0.2, 1)`.

**Toasts & banners**: success/error toasts slide in at 150ms and auto-dismiss; blocking errors persist until acknowledged. No decorative animation in core workflows.

## Accessibility

### Contrast Ratios
- **#1A2B3C ink on #FFFFFF canvas**: 13.9:1 — passes AAA
- **#5B6B7B muted on #FFFFFF**: 5.4:1 — passes AA
- **#8A98A6 subdued on #FFFFFF**: 3.1:1 — fails AA; decorative/disabled only
- **#FFFFFF on #29B5E8 primary**: 2.2:1 — fails AA; blue buttons use deep-blue (#11567F) text or larger bold white with care
- **#FFFFFF on #11567F deep blue**: 7.6:1 — passes AAA (preferred button fill for white labels)
- **#1A2B3C on #E5F6FC blue-subtle**: 12.6:1 — passes AAA
- **#1E8E5A success on #FFFFFF**: 4.0:1 — fails AA for small text; pair with icon or use at 18px+ bold
- **#D6402C error on #FFFFFF**: 4.7:1 — passes AA

### Minimum Requirements
- **Status indication**: warehouse and query status must always combine color + text label (Running / Suspended / Failed) — never color alone
- **Focus indicator**: 2px solid #29B5E8 outline with 2px offset on interactive elements; #D6402C on destructive actions
- **Data legibility**: result-grid cells must maintain ≥4.5:1 against alternating row backgrounds; NULL and special values flagged with text, not color alone
- **Touch & click targets**: 44×44px minimum; compact grid rows expose full-height click zones

### Motion
- Respects `prefers-reduced-motion`: yes — warehouse state settle, panel expand, and toast slides are suppressed
- Under reduced motion, status changes apply instantly and toasts appear without sliding

### Notes
- Snowflake Blue (#29B5E8) at 2.2:1 with white fails AA — white text must sit on the deep blue (#11567F, 7.6:1); the bright blue is for accents, fills behind dark text, and icons, not white-labeled buttons
- Success green (#1E8E5A) at 4.0:1 falls just short for small text — use it at 18px+ bold or pair with an icon and text label for warehouse/query status
- Monospace data (#11567F on white at 7.6:1) is AAA-compliant — appropriate for the dense SQL and tabular values it presents
- Cost and credit figures are decision-critical: they must render as high-contrast text with explicit units, never relying on chart color alone to convey spend or thresholds
