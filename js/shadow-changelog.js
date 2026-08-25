/**
 * Shadow review release notes. Bump version when shipping partner-facing changes.
 * user: shown to Katia and Raili in What's new
 * dev: shown only when Marko is logged in
 */
(function () {
  'use strict';

  window.TWAShadowChangelog = {
    version: '1.4.1',
    releases: [
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
