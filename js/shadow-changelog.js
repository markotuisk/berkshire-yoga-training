/**
 * Shadow mode release notes. Bump version when shipping partner-facing changes.
 * user: shown to Katia and Raili in What's new
 * dev: shown only when Marko is logged in
 */
(function () {
  'use strict';

  window.TWAShadowChangelog = {
    version: '1.23.0',
    releases: [
      {
        version: '1.23.0',
        date: '2026-08-27',
        title: 'Ticket inbox and raiser updates',
        user: [
          'Tickets panel refreshes from the server when you open it — use Refresh any time',
          'New In progress tab lists work Marko is implementing; orange badge on Tickets shows the count',
          'Each ticket row shows page, category, who raised it, date, and status',
          'When a ticket is resolved, a comment is added for the person who raised it (they see it in Tickets)',
          'Uncheck Notify raiser on a ticket if you only want a silent status change'
        ],
        dev: [
          'PATCH /api/tickets/:id accepts comment + notifyRaiser; updateTicketStatus auto-comments; inbox progress tab + toolbar badge; cache-bust via ?v=1.23.0'
        ]
      },
      {
        version: '1.22.0',
        date: '2026-08-27',
        title: 'Partner link graph views',
        user: [
          'Link graph popup has four views — This page, URL structure, Crawl map, and Incoming links',
          'URL structure shows folders like Screaming Frog — green indexable pages, soft red noindex',
          'Crawl map shows depth from home in columns; unreachable pages listed separately',
          'Incoming links highlights every page that links to the one you are on',
          'Summary shows site-wide page count and noindex count with a shortcut to URL structure'
        ],
        dev: [
          'shadow-graph.js nodeMeta + buildDirectoryTree + buildCrawlTree + view switcher; shadow-graph-view-switch CSS; cache-bust via ?v=1.22.0'
        ]
      },
      {
        version: '1.21.0',
        date: '2026-08-27',
        title: 'Link tree redesign',
        user: [
          'Link graph replaced with a clear two-panel tree — see who links here and where this page links, grouped by site section',
          'Tap a section to expand exact pages; tap a page row to open it on shadow',
          'Health signals show orphan warnings, hub vs leaf, and link balance at a glance',
          'Summary mini preview shows a text overview instead of the crowded radial diagram'
        ],
        dev: [
          'shadow-graph.js renderLinkTreePanel + bindLinkTreeInteractions; radial SVG removed from full view; shadow-link-tree BEM CSS; cache-bust via ?v=1.21.0'
        ]
      },
      {
        version: '1.20.3',
        date: '2026-08-27',
        title: 'Toolbox sub-menu stays usable',
        user: [
          'Opening an SEO or Design section from the toolbox sub-menu keeps the menu open so you can launch another section straight away',
          'Close, back, and drag on the sub-menu header work reliably after opening activity popups'
        ],
        dev: [
          'Fix [hidden] overridden by display:flex on submenu; keep submenu open via afterActivityPopupOpened; releaseSubmenuDragState; outside-click ignores activity layer; submenu z-index 100002; cache-bust via ?v=1.20.3'
        ]
      },
      {
        version: '1.20.2',
        date: '2026-08-27',
        title: 'Insights hero metric details',
        user: [
          'Insights Summary hero shows total links (internal + external), not just internal',
          'Tap Title, Meta or Links chips to open a plain-language detail popup with the actual text and guidance',
          'Links popup lists a preview of internal and external links, with a shortcut to the full SEO Links activity'
        ],
        dev: [
          'renderSummaryHeroHtml metric buttons; openMetricDetailPopup in shadow-review.js; renderMetricDetailHtml in shadow-seo.js; shadow-insight-metric-btn/detail CSS; cache-bust via ?v=1.20.2'
        ]
      },
      {
        version: '1.20.1',
        date: '2026-08-26',
        title: 'Toolbox sub-menu close controls',
        user: [
          'Close any toolbox category sub-menu with the × button, Escape, or a tap outside the menu',
          'Back arrow still returns to the category list without closing the toolbox'
        ],
        dev: [
          'shadow-tools-submenu-close; header grid [← title ×]; bindToolsMenuEscapeKey; outside-click when submenu open; drag excludes close btn; cache-bust via ?v=1.20.1'
        ]
      },
      {
        version: '1.20.0',
        date: '2026-08-26',
        title: 'Smarter link graph',
        user: [
          'Link graph groups related pages by section — tap + to expand and see individual subpages',
          'Expanded subpages fan out on a secondary ring with lighter connection lines',
          'Summary mini graph shows a compact preview; open the full graph for expand and explore'
        ],
        dev: [
          'shadow-graph.js pathTree + section grouping; expand/collapse state; group nodes with +/− badges; shadow-graph-legend; cache-bust via ?v=1.20.0'
        ]
      },
      {
        version: '1.19.0',
        date: '2026-08-26',
        title: 'Quieter Insights Summary',
        user: [
          'Insights Summary redesigned with a clearer hero, Visibility and Traffic cards, and calmer empty states',
          'Connect Google from elegant empty states instead of long setup paragraphs',
          'Link graph shows inbound and outbound as compact chips; design issues on one tidy row',
          'Activity popups have more breathing room, softer cards, and easier drag and close controls'
        ],
        dev: [
          'renderInsightsSummaryHtml rewrite; shadow-insight-hero/grid/empty-state/metric-chip BEM; activity modal 20px radius; Marko hints dev-only; cache-bust via ?v=1.19.0'
        ]
      },
      {
        version: '1.18.3',
        date: '2026-08-26',
        title: 'Draggable toolbox sub-menus',
        user: [
          'Drag any toolbox category sub-menu by its header to move it anywhere on screen',
          'Sub-menu position is remembered for the rest of your session'
        ],
        dev: [
          'initDraggableSubmenu: pointer drag on .shadow-tools-submenu-head, fixed positioning, sessionStorage via SUBMENU_POS_KEY; cache-bust via ?v=1.18.3'
        ]
      },
      {
        version: '1.18.2',
        date: '2026-08-26',
        title: 'Environment settings and Google connect',
        user: [
          'New Settings button in the toolbar opens environment and connection options',
          'Connect your Google account for Search Console and Analytics insights — no wrangler secrets needed on your side',
          'See connection status for Search Console and GA4, plus Shadow version and insights readiness',
          'Disconnect Google any time from Settings'
        ],
        dev: [
          'OAuth Pages Functions /api/auth/google/*; KV token store; insights prefers OAuth then service account; shadow-settings.js; cache-bust via ?v=1.18.2'
        ]
      },
      {
        version: '1.18.1',
        date: '2026-08-26',
        title: 'Toolbox opens in a straight column',
        user: [
          'Toolbox categories now stack in a neat column above the tools button instead of fanning off the screen edge',
          'Sub-menus open above the column, anchored toward the page centre'
        ],
        dev: [
          'Replace radial fan (--tools-x/y angles) with flex column stack above FAB; shadow-tools-stack wrapper; cache-bust via ?v=1.18.1'
        ]
      },
      {
        version: '1.17.0',
        date: '2026-08-26',
        title: "Curator's desk — grouped toolbox and activity dock",
        user: [
          'Toolbox sub-menus group SEO and Design sections (Foundation, Content, Links, Technical) instead of one long list',
          'Open activities appear as pills above the toolbar — click to focus, × to close; link graph lives in Insights only',
          'Pick toggles element selection instantly with a brief confirmation (no sub-menu)',
          'Activity cards use a softer folio style with display titles; empty dock hint when the toolbox is open'
        ],
        dev: [
          'UX audit: flat 12-item SEO list, duplicate link graph, no open-popup dock, submenu vs popup visual competition, Pick as category vs mode, mobile cramming',
          'shadow-review.js activity dock, grouped submenu, bringToFront, dedupe popups; shadow-seo.js and shadow-design.js getSectionGroups; cache-bust via ?v=1.17.0'
        ]
      },
      {
        version: '1.16.0',
        date: '2026-08-26',
        title: 'Exploding toolbox and separate activity popups',
        user: [
          'Orange toolbox button now explodes into category buttons: Insights, SEO, Design and Pick',
          'Tap a category to see its activities (Meta, Links, Typography, GSC, and more), then open each as its own draggable popup',
          'Keep multiple popups open at once (e.g. Meta and Links) and close them individually',
          'Pick toggles element selection directly from the toolbox'
        ],
        dev: [
          'shadow-review.js exploding FAB + openActivityPopup; shadow-seo.js and shadow-design.js renderActivity per popup; unified #shadow-review-modal removed; cache-bust via ?v=1.16.0'
        ]
      },
      {
        version: '1.15.0',
        date: '2026-08-26',
        title: 'Page insights — link graph, Search Console and Analytics',
        user: [
          'Summary tab now shows Search (GSC) and Traffic (GA4) cards for this page when Google credentials are configured',
          'Compare this page vs site average with simple bars; top search queries listed when available',
          'Link graph maps internal links across the site — mini preview on Summary, full radial graph in SEO → Link graph',
          'Click a graph node to open that page on shadow; orphan pages (no inbound links) are flagged'
        ],
        dev: [
          'js/shadow-graph.js buildSiteGraph + getPageGraph; functions/api/insights.js + google-auth/gsc/ga4 clients; Summary fetch /api/insights; cache-bust via ?v=1.15.0'
        ]
      },
      {
        version: '1.14.0',
        date: '2026-08-26',
        title: 'Unified page review panel',
        user: [
          'Orange toolbox button opens one review panel with Summary, SEO, Design and Pick tabs',
          'Summary shows page health at a glance — SEO score, key counts, and quick links to each tab',
          'SEO and Design keep their sidebar navigation inside the same panel; Pick explains element selection with a toggle',
          'Tickets stay in the bottom toolbar only'
        ],
        dev: [
          'shadow-review.js #shadow-review-modal replaces tools/seo/design modals; openReviewTab + switchReviewTab; cache-bust via ?v=1.14.0'
        ]
      },
      {
        version: '1.13.2',
        date: '2026-08-26',
        title: 'Review tools button icon',
        user: [
          'Orange review button is now an icon (toolbox) instead of the word Tools',
          'Hub title reads Review tools with Pick, SEO and Design tiles'
        ],
        dev: [
          'shadow-fab icon-only FAB; hub h2 Review tools; cache-bust via ?v=1.13.2'
        ]
      },
      {
        version: '1.13.1',
        date: '2026-08-26',
        title: 'Toolbar Tools button removed',
        user: ['Remove duplicate Tools button from toolbar'],
        dev: [
          'shadow-review.js restore flat toolbar layout; remove centre Tools btn and click handler; cache-bust via ?v=1.13.1'
        ]
      },
      {
        version: '1.13.0',
        date: '2026-08-26',
        title: 'Redesigned Tools hub',
        user: [
          'Tools FAB or the new Tools button in the bottom toolbar opens a clear hub with three choices: Pick, SEO, and Design',
          'Pick toggles element selection with a brief hint; SEO and Design open straight to their full sidebar panels (Overview, Meta, Links, Typography, Colours, and more)',
          'No extra step through a nested View SEO or View design menu'
        ],
        dev: [
          'shadow-review.js openToolCategory hub, toolbar centre Tools btn, 3-tile picker; shadow-seo.js and shadow-design.js init no longer bind tool buttons; cache-bust via ?v=1.13.0'
        ]
      },
      {
        version: '1.12.4',
        date: '2026-08-26',
        title: 'Link counts now match in Links tab',
        user: [
          'Page check summary uses one set of numbers — no more conflicting totals',
          'Clearer labels: links in total, unique destinations, unique internal destinations checked',
          'Short note explains why nav and footer links make totals higher than unique destinations'
        ],
        dev: [
          'js/shadow-links.js collectPageLinks + isExcluded in anchor scan; unified buildPageLinkStats; shadow-seo.js delegates collectLinks, bullet summary card, footer counts removed; cache-bust via ?v=1.12.4'
        ]
      },
      {
        version: '1.12.3',
        date: '2026-08-26',
        title: 'Clearer link checker scope in Links tab',
        user: [
          'Links tab explains the difference between checking this page and crawling from sitemap.xml',
          'Sitemap crawl shows how many pages were fetched, unique URLs checked, and issues found — not just broken links',
          'Progress bar now shows page-by-page fetch progress and link counts during a crawl',
          'Link inventory clarifies it lists the first 10 of all internal links on this page (nav and footer links count separately)'
        ],
        dev: [
          'js/shadow-links.js crawlStats + getSitemapPageCount; shadow-seo.js scope callout, stats card, inventory note; cache-bust via ?v=1.12.3'
        ]
      },
      {
        version: '1.12.2',
        date: '2026-08-26',
        title: 'Cloudflare links excluded from broken counts',
        user: [
          'Links tab no longer flags Cloudflare email protection URLs as broken 404s',
          'Same-origin /cdn-cgi/ paths (email protection, Access logout, etc.) show as Cloudflare (ignore) and are excluded from broken link totals'
        ],
        dev: [
          'js/shadow-links.js isCloudflareInfraUrl + cloudflare cls; summariseResults cloudflareIgnored; cache-bust via ?v=1.12.2'
        ]
      },
      {
        version: '1.12.1',
        date: '2026-08-26',
        title: 'SEO and design sidebar tabs always visible',
        user: [
          'View SEO and View design sidebars now scroll independently — Links, Technical, Structured data and Accessibility tabs stay reachable even in a short panel',
          'Hard refresh once if the toolbar still shows v1.12.0 after this update'
        ],
        dev: [
          'Flex height chain on shadow-modal-scroll → seo/design body → nav; renderTabs before auditPage; cache-bust via ?v=1.12.1'
        ]
      },
      {
        version: '1.12.0',
        date: '2026-08-26',
        title: 'Link checker and ranking SEO tools',
        user: [
          'View SEO → Links tab now checks broken links on the current page or crawls the whole site from sitemap.xml',
          'Summary shows broken internal, broken external, and redirects worth reviewing',
          'Each link row has ⋯ menu: Locate on page, Open link, and Request change',
          'Technical tab adds canonical mismatch, mixed content, DOM size, image dimensions, and page load timing',
          'Structured data tab validates required fields for Organization, WebSite, Article, and other schema types',
          'New ticket category: Broken link'
        ],
        dev: [
          'js/shadow-links.js page + sitemap crawl (concurrency 5, 8s timeout); shadow-seo.js extended technical/structured validation; try/catch on renderAudit; cache-bust via ?v=1.12.0'
        ]
      },
      {
        version: '1.11.1',
        date: '2026-08-26',
        title: 'Fix empty Page design panel',
        user: ['View design panel shows summary, typography, colours, accessibility and issues again'],
        dev: [
          'Restore missing sortMap() in js/shadow-design.js; try/catch in renderAudit with fallback message; cache-bust via ?v=1.11.1'
        ]
      },
      {
        version: '1.11.0',
        date: '2026-08-26',
        title: 'Design audit accessibility and row menus',
        user: [
          'View design now includes an Accessibility tab: images, headings, colour contrast, links, buttons, form fields and page landmarks',
          'Summary shows accessibility error and warning counts plus a note on SEO relevance',
          'Every design and accessibility row has a ⋯ menu with Locate on page and Request change, matching the SEO panel'
        ],
        dev: [
          'js/shadow-design.js a11y audit (WCAG contrast, heading outline, alt heuristics); portaled row menus; openChangeTicket wired; cache-bust via ?v=1.11.0'
        ]
      },
      {
        version: '1.10.0',
        date: '2026-08-26',
        title: 'Design audit tool',
        user: [
          'Tools → View design opens a panel listing font families, sizes, weights, line heights and font colours on the page',
          'Issues tab flags unexpected fonts, non-token font colours and inline styles',
          'Locate highlights matching elements on the page so you can spot design mismatches quickly'
        ],
        dev: [
          'js/shadow-design.js design audit panel; wired in shadow-review tools modal; cache-bust via ?v=1.10.0'
        ]
      },
      {
        version: '1.9.9',
        date: '2026-08-26',
        title: 'All page elements pickable',
        user: [
          'All page elements are pickable in Pick element mode — including badges, labels, spans and category tags',
          'Hover outline wraps small badges and labels so you can see exactly what you will select',
          'Image swap upload is only offered when you pick an actual image — text elements open a copy or change ticket'
        ],
        dev: [
          'elementsFromPoint deepest-target resolution; image-only storycard via elementMeta fix; extended hover ring for small inline elements; cache-bust via ?v=1.9.9'
        ]
      },
      {
        version: '1.9.8',
        date: '2026-08-26',
        title: 'Pick spans, badges and category labels',
        user: [
          'Pick element now selects small inline elements like category badges and tags — not just the whole card or article around them',
          'Hover outline shows on spans and labels before you click'
        ],
        dev: [
          'PICK_TARGET_SELECTOR adds span, time, badge/tag/category patterns; resolvePickTarget walks up from pointer for nearest visible match; pick-hover z-index for small inline elements; cache-bust via ?v=1.9.8'
        ]
      },
      {
        version: '1.9.7',
        date: '2026-08-26',
        title: 'SEO row menu closes after action',
        user: [
          '⋯ row menu now closes when you choose Preview, Locate on page, or Request change',
          'No more menu left floating on screen after you pick an action'
        ],
        dev: [
          'findPopoverForMenu resolves portaled popover for closeRowMenu; clearMenuPortalPopovers on closeAllRowMenus; cache-bust via ?v=1.9.7'
        ]
      },
      {
        version: '1.9.6',
        date: '2026-08-26',
        title: 'SEO image Preview opens reliably',
        user: [
          'Preview under ⋯ on image rows now opens the popup every time',
          'Preview appears above the SEO panel so it is not hidden behind it'
        ],
        dev: [
          'Portal menu click delegation; block document pointerdown dismiss on portaled menu items; preview z-index 100020; previewAttrFrom + try/catch in openImagePreview; cache-bust via ?v=1.9.6'
        ]
      },
      {
        version: '1.9.5',
        date: '2026-08-26',
        title: 'Fix SEO image Preview click',
        user: [
          'Preview under ⋯ on image rows now opens correctly',
          'Locate and Request change in the row menu also work reliably after the menu portal fix'
        ],
        dev: [
          'Row menu click/keydown handlers bound on document so portaled popover items receive clicks; preview URL on menu item; cache-bust via ?v=1.9.5'
        ]
      },
      {
        version: '1.9.4',
        date: '2026-08-26',
        title: 'Image preview in Page SEO',
        user: [
          'Images in the SEO panel have a Preview option under ⋯ — opens a popup with the full image, alt text, and URL',
          'Preview works alongside Locate on page and Request change for each image row'
        ],
        dev: [
          'shadow-seo-image-preview overlay with backdrop blur; Preview menu item on image rows only; cache-bust via ?v=1.9.4'
        ]
      },
      {
        version: '1.9.3',
        date: '2026-08-26',
        title: 'SEO row menu positioning and active row highlight',
        user: [
          '⋯ row menus open without shifting the SEO table — menus float above the panel',
          'The row you are acting on stays highlighted in amber when you open the menu, locate on page, or request a change'
        ],
        dev: [
          'Portal row menus to document.body with fixed coords; constrain flip within SEO modal bounds',
          'Active row state (.shadow-seo-row--active) with focus-within fallback; cleared on ticket close; cache-bust via ?v=1.9.3'
        ]
      },
      {
        version: '1.9.1',
        date: '2026-08-26',
        title: 'Social tab and View SEO fix',
        user: [
          'View SEO in the Tools modal opens the Page SEO panel again',
          'Open Graph and Twitter are now one Social tab with grouped Open Graph, Twitter / X, and Other social sections',
          'All og:* and twitter:* fields always show with Not set pills when missing; Overview warns on thin social previews'
        ],
        dev: [
          'Fix shadow-seo.js renderLinks syntax (v1.8.0) and shadow-changelog.js release list syntax (v1.9.0) that blocked TWAShadowSEO',
          'Social tab replaces separate og/twitter sidebar items (12 → 11 nav items); pin:media + LinkedIn guidance row',
          'Overview warns on missing og:title/og:image and twitter:card when Open Graph is thin; cache-bust via ?v=1.9.1'
        ]
      },
      {
        version: '1.9.0',
        date: '2026-08-26',
        title: 'Complete Google SEO template',
        user: [
          'Page SEO now shows every field Google looks for, even when missing: empty values appear as Not set or Missing pills',
          'New International tab: hreflang alternates, x-default, HTML lang, and Content-Language',
          'Meta tab expanded with Googlebot, charset, and viewport; Crawl & security covers noindex, nofollow, and server header note',
          'Structured data lists all common Google rich result types (Course, Organization, FAQ, and more) plus JSON-LD blocks',
          'Technical tab adds favicon, apple touch icon, theme colour, lazy images, iframes, and resource hints',
          'Key fields include a short note on what Google looks for, with Found / Might be relevant / Not set status pills',
          'Overview warnings flag title/description length, missing H1, alt text, og:image, viewport, and key structured data'
        ],
        dev: [
          'Full Google-focused field template; GOOGLE_FIELD_HINTS with page-depth relevance',
          'Structured data @type mapping with SearchAction check for WebSite; cache-bust via ?v=1.9.0'
        ]
      },
      {
        version: '1.8.0',
        date: '2026-08-26',
        title: 'Page SEO visual redesign',
        user: [
          'Page SEO panel redesigned with Apple-style layout: sidebar navigation, grouped cards, and clearer typography',
          'Overview shows a larger score ring with individual issue cards instead of a plain list',
          'Field tabs use iOS Settings-style rows with hairline separators and dashed amber pills for empty values',
          'Keywords tab has proper tables with Term, Count, Density, and colour-coded source badges',
          'Headings and links show level/type badges; highlight and refresh moved to a subtle footer bar'
        ],
        dev: [
          'Vertical sidebar nav with orange active accent; default modal 480×580px',
          'Section fade transitions; frosted-glass ⋯ menus; cache-bust via ?v=1.8.0'
        ]
      },
      {
        version: '1.7.0',
        date: '2026-08-26',
        title: 'SEO panel redesign and Keywords tab',
        user: [
          'View SEO now uses grouped iOS-style sections with clearer labels, values, and actions',
          '⋯ menu on every field row is larger and always visible on the right',
          'Locate on page uses fixed menus and scrolls to visible matches with orange highlight',
          'New Keywords tab: top single words and two-word phrases from page content, with counts, density, and source badges',
          'Meta keywords tag shown at the top of Keywords when set'
        ],
        dev: [
          'SEO field rows use grid layout instead of tables to prevent action button clipping',
          'Client-side keyword extraction with English stop-word filter; no API'
        ]
      },
      {
        version: '1.6.5',
        date: '2026-08-26',
        title: 'SEO row actions menu',
        user: [
          'Each SEO field row now has a ⋯ menu with Locate on page and Request change',
          'Locate keeps the scroll and orange highlight from v1.6.4 when a page element exists',
          'Request change opens the ticket form pre-filled with the field name, current value, and page URL'
        ],
        dev: []
      },
      {
        version: '1.6.4',
        date: '2026-08-26',
        title: 'Locate SEO fields on page',
        user: [
          'View SEO rows now include a locate button to jump to the matching element on the page',
          'Headings, images, and links scroll into view with an orange highlight pulse',
          'Meta and social tags highlight the tag or the nearest visible match (e.g. title → H1, og:image → image)'
        ],
        dev: []
      },
      {
        version: '1.6.3',
        date: '2026-08-26',
        title: 'Complete SEO field template',
        user: [
          'View SEO now always shows every field — Meta, Open Graph, Twitter, Security, and more',
          'Empty or missing values appear as clear Not set / Missing pills instead of hiding rows',
          'Images, links, and structured data sections always show counts and empty states'
        ],
        dev: []
      },
      {
        version: '1.6.2',
        date: '2026-08-26',
        title: 'Tools position and SEO polish',
        user: [
          'Tools panel opens centre-right by default — easier reach from the bottom-right button',
          'View SEO refreshed: score ring, clearer missing fields, segmented tabs, and stat cards'
        ],
        dev: []
      },
      {
        version: '1.6.1',
        date: '2026-08-26',
        title: 'Tools and Tickets swapped',
        user: [
          'Tools FAB (bottom-right) opens pick and View SEO; Tickets button in the toolbar opens the inbox'
        ],
        dev: []
      },
      {
        version: '1.6.0',
        date: '2026-08-26',
        title: 'Tools panel and View SEO',
        user: [
          'Toolbar Tools button opens a compact tools window with Pick element and View SEO',
          'Tickets FAB opens the ticket inbox only — inbox no longer auto-opens after login',
          'View SEO audits the current page: score, meta tags, headings, images, links, and structured data',
          'Highlight on page labels headings and marks images missing alt text while SEO is open'
        ],
        dev: [
          'Client-side SEO audit in js/shadow-seo.js; loaded after shadow-changelog.js',
          'Tools and SEO modals use the same draggable, resizable, collapsible pattern as ticket windows'
        ]
      },
      {
        version: '1.5.8',
        date: '2026-08-26',
        title: 'Collapsed window resize fix',
        user: [
          'Resizing a collapsed ticket inbox or detail window now only changes width — it no longer jumps open or shows empty ticket content'
        ],
        dev: []
      },
      {
        version: '1.5.7',
        date: '2026-08-26',
        title: 'Aligned ticket window headers',
        user: [
          'Ticket inbox and detail headers line up on one row — drag grip, title, collapse, and close sit evenly centred like an Apple toolbar',
          'Long titles truncate cleanly; collapse and close are matching circular buttons on the right'
        ],
        dev: []
      },
      {
        version: '1.5.6',
        date: '2026-08-26',
        title: 'Collapse ticket windows',
        user: [
          'Chevron next to Ticket inbox collapses the window to a slim header bar so you can see more of the page',
          'Same collapse on ticket detail windows — click the chevron again to restore size',
          'Drag still works when collapsed; your collapsed preference is remembered for the session'
        ],
        dev: []
      },
      {
        version: '1.5.5',
        date: '2026-08-26',
        title: 'Edge resize on ticket windows',
        user: [
          'Drag any edge of inbox, ticket detail, and new-ticket windows to resize — not just the corners',
          'Corners still work as before; hover an edge for a subtle highlight'
        ],
        dev: []
      },
      {
        version: '1.5.4',
        date: '2026-08-26',
        title: 'Clearer pick mode preview',
        user: [
          'Pick element mode now shows a bold orange outline, dimmed page, and a label for the element under your cursor before you click'
        ],
        dev: []
      },
      {
        version: '1.5.3',
        date: '2026-08-26',
        title: 'Pick mode hover preview',
        user: [
          'Pick element mode highlights whatever is under your cursor before you click'
        ],
        dev: []
      },
      {
        version: '1.5.2',
        date: '2026-08-26',
        title: 'Open and Closed tickets',
        user: [
          'Inbox tabs are now Open and Closed — finished tickets leave Open automatically',
          'Accept agrees with the direction; Done closes a ticket when a shadow change looks right',
          'Comment to keep discussing (no separate Request changes button)',
          'Simpler status labels on each row: Open, In progress, Ready for review, Done'
        ],
        dev: []
      },
      {
        version: '1.5.1',
        date: '2026-08-26',
        title: 'Page-grouped ticket inbox',
        user: [
          'Ticket inbox groups items by page so you see what belongs on each URL first',
          'Tickets for the page you are viewing appear at the top under This page'
        ],
        dev: []
      },
      {
        version: '1.5.0',
        date: '2026-08-26',
        title: 'Corner resize and refined UI',
        user: [
          'Drag any corner of inbox, ticket detail, and new-ticket windows to resize — not just the bottom-right',
          'Shadow mode overlay refreshed with a cleaner Apple-style look (toolbar, modals, tabs, and badges)'
        ],
        dev: []
      },
      {
        version: '1.4.3',
        date: '2026-08-26',
        title: 'Shadow mode naming',
        user: [
          'Toolbar and menus now say Shadow mode instead of Shadow review'
        ],
        dev: []
      },
      {
        version: '1.4.2',
        date: '2026-08-26',
        title: 'Clearer drag handle',
        user: [
          'Six-dot grip on the left of ticket windows — drag there to move, not the whole header',
          'Title and close button behave normally again'
        ],
        dev: []
      },
      {
        version: '1.4.1',
        date: '2026-08-26',
        title: 'Resizable ticket windows',
        user: [
          'Drag the bottom-right corner of inbox, ticket detail, and new-ticket windows to resize them',
          'Double-click the header to re-centre and restore the default size',
          'Content scrolls inside the window if you make it smaller'
        ],
        dev: [
          'Modal width and height persist in sessionStorage alongside drag position'
        ]
      },
      {
        version: '1.4.0',
        date: '2026-08-26',
        title: 'Draggable tickets and Show on page',
        user: [
          'Drag ticket windows by the header so you can see the page behind while discussing',
          'Double-click the header to re-centre a window',
          'Show on page jumps to the element a ticket refers to and highlights it in orange',
          'Locate button on inbox rows for a quick jump without opening the full thread',
          'Opening a ticket from an on-page TWA marker scrolls to that element automatically'
        ],
        dev: [
          'Cross-page tickets open via ?ticket=TWA-xxx query param then scroll and highlight',
          'Modal positions persist in sessionStorage per modal type during the browser session'
        ]
      },
      {
        version: '1.3.0',
        date: '2026-08-26',
        title: 'Shared inbox and on-page markers',
        user: [
          'Ticket inbox shows everyone\'s tickets so you can avoid duplicate requests',
          'Active and Archive tabs — default view is only tickets still in play',
          'Orange TWA markers on page elements with open tickets — click to open the thread',
          'Each ticket row shows who raised it'
        ],
        dev: [
          'Page badges match tickets via stored cssSelector on the current page path',
          'Badges hide when a ticket moves to Approved, Shipped, Won\'t fix, or Duplicate'
        ]
      },
      {
        version: '1.2.0',
        date: '2026-08-25',
        title: 'Log out and session timeout',
        user: [
          'Log out button in the toolbar ends your shadow session',
          'Switch user if someone else needs to review without signing out of email access',
          'Automatic log out after 1 hour with no activity on the page'
        ],
        dev: []
      },
      {
        version: '1.1.0',
        date: '2026-08-25',
        title: 'Ticket workflow and What\'s new',
        user: [
          'Accept on a ticket when you agree with the proposed direction',
          'Comment to keep discussing before anything is built',
          'Approve when a change on shadow looks right to you',
          'What\'s new popup on login when we ship updates that affect you',
          'Version number in the toolbar so you know which review tools you have'
        ],
        dev: [
          'Mark on shadow, send for review, and ship to live actions on tickets',
          'New statuses: Discussing, Accepted, On shadow'
        ]
      },
      {
        version: '1.0.0',
        date: '2026-08-25',
        title: 'Shadow review launch',
        user: [
          'Pick any page element to raise a ticket (or use Pick element / ⌘ Alt+click)',
          'Storycard uploads for replacement images on placeholders and photos',
          'Ticket inbox with discussion thread on each item',
          'Quick links to the audit sheet and asset folder'
        ],
        dev: []
      }
    ]
  };
})();
