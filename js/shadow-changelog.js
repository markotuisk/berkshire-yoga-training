/**
 * Shadow mode release notes. Bump version when shipping partner-facing changes.
 * user: shown to Katia and Raili in What's new
 * dev: shown only when Marko is logged in
 */
(function () {
  'use strict';

  window.TWAShadowChangelog = {
    version: '1.10.0',
    releases: [
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
