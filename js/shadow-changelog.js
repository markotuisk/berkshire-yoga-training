/**
 * Shadow mode release notes. Bump version when shipping partner-facing changes.
 * user: shown to Katia and Raili in What's new
 * dev: shown only when Marko is logged in
 */
(function () {
  'use strict';

  window.TWAShadowChangelog = {
    version: '1.7.1',
    releases: [
      {
        version: '1.7.1',
        date: '2026-08-26',
        title: 'Shadow asset cache fix',
        user: [
          'View SEO and other shadow tools now load the latest version after each release — no stale panel from browser cache'
        ],
        dev: [
          'Middleware injects ?v= on shadow CSS/JS; bump SHADOW_ASSET_VERSION in functions/_middleware.js with changelog version'
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
