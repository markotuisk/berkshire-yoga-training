/**
 * Shadow Settings — Google OAuth connections and environment readout.
 */
(function () {
  'use strict';

  let escapeHtml = (s) => String(s || '');
  let toast = function () {};
  let changelog = function () {
    return { version: '0.0.0' };
  };
  let onInsightsRefresh = function () {};

  let statusCache = null;
  let statusLoading = false;
  let oauthSuccessPending = false;

  const GSC_STATUS_LABELS = {
    connected_via_google: 'Connected via Google',
    service_account_only: 'Service account only',
    oauth_no_site: 'Connected — verify property access',
    not_available: 'Not available'
  };

  const GA4_STATUS_LABELS = {
    connected_via_google: 'Connected via Google',
    service_account_only: 'Service account only',
    oauth_no_property: 'Connected — property ID needed',
    not_available: 'Not available'
  };

  function pillClass(tone) {
    return 'shadow-settings-status-pill shadow-settings-status-pill--' + (tone || 'muted');
  }

  function gscTone(status) {
    if (status === 'connected_via_google') return 'good';
    if (status === 'service_account_only') return 'warn';
    if (status === 'oauth_no_site') return 'warn';
    return 'muted';
  }

  function ga4Tone(status) {
    if (status === 'connected_via_google') return 'good';
    if (status === 'service_account_only') return 'warn';
    if (status === 'oauth_no_property') return 'warn';
    return 'muted';
  }

  function connectionTone(connected) {
    return connected ? 'good' : 'muted';
  }

  function renderAdvancedHints() {
    return (
      '<details class="shadow-settings-advanced">' +
      '<summary class="shadow-settings-advanced-summary">Advanced setup (Marko)</summary>' +
      '<ul class="shadow-insights-hints-list">' +
      '<li><code>GOOGLE_OAUTH_CLIENT_ID</code> and <code>GOOGLE_OAUTH_CLIENT_SECRET</code> — OAuth client for partner Connect Google</li>' +
      '<li><code>GOOGLE_SERVICE_ACCOUNT_JSON</code> — fallback service account (full JSON)</li>' +
      '<li><code>GSC_SITE_URL</code> — e.g. <code>sc-domain:berkshireyogatraining.co.uk</code></li>' +
      '<li><code>GA4_PROPERTY_ID</code> — numeric GA4 property ID</li>' +
      '<li>Redirect URI: <code>https://shadow.berkshireyogatraining.co.uk/api/auth/google/callback</code> (and pages.dev URL for testing)</li>' +
      '</ul></details>'
    );
  }

  function renderStatusBody(data) {
    if (!data) {
      return '<p class="shadow-hint">Could not load settings.</p>';
    }

    const connected = !!data.connected;
    const email = data.email ? escapeHtml(data.email) : '';
    const oauthAvailable = data.oauthAvailable !== false;

    let connectBlock = '';
    if (!oauthAvailable) {
      connectBlock =
        '<p class="shadow-hint">Connect unavailable — ask Marko to configure the OAuth client (<code>GOOGLE_OAUTH_CLIENT_ID</code> / <code>GOOGLE_OAUTH_CLIENT_SECRET</code>).</p>';
    } else if (connected) {
      connectBlock =
        '<div class="shadow-settings-actions">' +
        '<button type="button" class="shadow-btn shadow-btn-secondary shadow-settings-disconnect">Disconnect</button>' +
        '</div>';
    } else {
      connectBlock =
        '<div class="shadow-settings-actions">' +
        '<button type="button" class="shadow-btn shadow-settings-connect">Connect Google</button>' +
        '</div>' +
        '<p class="shadow-hint">Grants read-only Search Console and Analytics access for your Google account.</p>';
    }

    const gsc = data.gsc || {};
    const ga4 = data.ga4 || {};
    const gscLabel = GSC_STATUS_LABELS[gsc.status] || GSC_STATUS_LABELS.not_available;
    const ga4Label = GA4_STATUS_LABELS[ga4.status] || GA4_STATUS_LABELS.not_available;
    const gscSite = gsc.siteUrl ? '<p class="shadow-settings-meta"><span class="shadow-settings-meta-label">Site</span> <code>' + escapeHtml(gsc.siteUrl) + '</code></p>' : '';
    const ga4Prop = ga4.propertyId
      ? '<p class="shadow-settings-meta"><span class="shadow-settings-meta-label">Property ID</span> <code>' + escapeHtml(ga4.propertyId) + '</code></p>'
      : '<p class="shadow-hint">Property ID is set by Marko in environment variables.</p>';

    let gscNote = '';
    if (gsc.status === 'oauth_no_site') {
      gscNote =
        '<p class="shadow-hint">Your Google account is connected but Search Console access could not be verified. Confirm you have access to the property, or ask Marko to set <code>GSC_SITE_URL</code>.</p>';
    }

    let ga4Note = '';
    if (ga4.status === 'oauth_no_property') {
      ga4Note =
        '<p class="shadow-hint">OAuth grants Analytics read access; Marko still sets <code>GA4_PROPERTY_ID</code> in the environment.</p>';
    }

    const insights = data.insights || {};
    const insightsLine =
      'Search Console: ' +
      (insights.gsc ? 'ready' : 'not ready') +
      ' · Analytics: ' +
      (insights.ga4 ? 'ready' : 'not ready');

    return (
      '<div class="shadow-settings">' +
      '<div class="shadow-settings-toolbar">' +
      '<button type="button" class="shadow-btn shadow-btn-small shadow-btn-secondary shadow-settings-refresh">Refresh</button>' +
      '</div>' +
      '<section class="shadow-settings-card">' +
      '<h3 class="shadow-settings-card-title">Connections</h3>' +
      '<div class="shadow-settings-row">' +
      '<span class="shadow-settings-row-label">Google account</span>' +
      '<span class="' +
      pillClass(connectionTone(connected)) +
      '">' +
      escapeHtml(connected ? 'Connected' : 'Not connected') +
      '</span>' +
      '</div>' +
      (email ? '<p class="shadow-settings-meta"><span class="shadow-settings-meta-label">Email</span> ' + email + '</p>' : '') +
      connectBlock +
      '</section>' +
      '<section class="shadow-settings-card">' +
      '<h3 class="shadow-settings-card-title">Search Console</h3>' +
      '<div class="shadow-settings-row">' +
      '<span class="shadow-settings-row-label">Status</span>' +
      '<span class="' +
      pillClass(gscTone(gsc.status)) +
      '">' +
      escapeHtml(gscLabel) +
      '</span>' +
      '</div>' +
      gscSite +
      gscNote +
      '</section>' +
      '<section class="shadow-settings-card">' +
      '<h3 class="shadow-settings-card-title">Google Analytics (GA4)</h3>' +
      '<div class="shadow-settings-row">' +
      '<span class="shadow-settings-row-label">Status</span>' +
      '<span class="' +
      pillClass(ga4Tone(ga4.status)) +
      '">' +
      escapeHtml(ga4Label) +
      '</span>' +
      '</div>' +
      ga4Prop +
      ga4Note +
      '</section>' +
      '<section class="shadow-settings-card shadow-settings-card--muted">' +
      '<h3 class="shadow-settings-card-title">Environment</h3>' +
      '<p class="shadow-settings-meta"><span class="shadow-settings-meta-label">Shadow version</span> v' +
      escapeHtml(changelog().version) +
      '</p>' +
      '<p class="shadow-settings-meta"><span class="shadow-settings-meta-label">Insights API</span> ' +
      escapeHtml(insightsLine) +
      '</p>' +
      (data.serviceAccountFallback
        ? '<p class="shadow-hint">Service account fallback is configured if OAuth is not connected.</p>'
        : '<p class="shadow-hint">No service account fallback — connect Google or ask Marko to configure secrets.</p>') +
      renderAdvancedHints() +
      '</section>' +
      '</div>'
    );
  }

  function bindSettingsControls(container) {
    if (!container) return;
    const connectBtn = container.querySelector('.shadow-settings-connect');
    if (connectBtn && !connectBtn._bound) {
      connectBtn._bound = true;
      connectBtn.addEventListener('click', () => {
        window.location.href = '/api/auth/google/start';
      });
    }
    const disconnectBtn = container.querySelector('.shadow-settings-disconnect');
    if (disconnectBtn && !disconnectBtn._bound) {
      disconnectBtn._bound = true;
      disconnectBtn.addEventListener('click', async () => {
        if (!window.confirm('Disconnect your Google account from Shadow insights?')) return;
        try {
          const res = await fetch('/api/auth/google/disconnect', { method: 'POST', credentials: 'same-origin' });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            toast('Could not disconnect Google account');
            return;
          }
          statusCache = null;
          onInsightsRefresh();
          toast('Google account disconnected');
          await loadStatus(true);
          container.innerHTML = renderStatusBody(statusCache);
          bindSettingsControls(container);
        } catch (e) {
          toast('Could not disconnect Google account');
        }
      });
    }
    const refreshBtn = container.querySelector('.shadow-settings-refresh');
    if (refreshBtn && !refreshBtn._bound) {
      refreshBtn._bound = true;
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        await loadStatus(true);
        onInsightsRefresh();
        container.innerHTML = renderStatusBody(statusCache);
        bindSettingsControls(container);
        refreshBtn.disabled = false;
        toast('Settings refreshed');
      });
    }
  }

  async function loadStatus(force) {
    if (!force && statusCache) return statusCache;
    if (statusLoading) return statusCache;
    statusLoading = true;
    try {
      const res = await fetch('/api/auth/google/status', { credentials: 'same-origin' });
      statusCache = await res.json();
      return statusCache;
    } catch (e) {
      statusCache = { error: 'Could not reach settings API' };
      return statusCache;
    } finally {
      statusLoading = false;
    }
  }

  function renderLoading() {
    return '<p class="shadow-hint">Loading environment settings…</p>';
  }

  async function renderActivity(sectionId, bodyEl) {
    if (!bodyEl) return;
    bodyEl.innerHTML = renderLoading();
    await loadStatus(false);
    bodyEl.innerHTML = renderStatusBody(statusCache);
    bindSettingsControls(bodyEl);
  }

  function handleOAuthReturn() {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (!oauth) return false;
    params.delete('oauth');
    params.delete('reason');
    const qs = params.toString();
    const next = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    window.history.replaceState({}, '', next);
    statusCache = null;
    if (oauth === 'success') {
      oauthSuccessPending = true;
      toast('Google account connected');
      onInsightsRefresh();
      return true;
    }
    if (oauth === 'error') {
      toast('Google connection failed — try again or ask Marko');
      return true;
    }
    return false;
  }

  function init(options) {
    if (options.escapeHtml) escapeHtml = options.escapeHtml;
    if (options.toast) toast = options.toast;
    if (options.changelog) changelog = options.changelog;
    if (options.onInsightsRefresh) onInsightsRefresh = options.onInsightsRefresh;
    handleOAuthReturn();
  }

  window.TWAShadowSettings = {
    init,
    renderActivity,
    loadStatus,
    handleOAuthReturn,
    consumeOAuthSuccess: function () {
      const pending = oauthSuccessPending;
      oauthSuccessPending = false;
      return pending;
    },
    invalidateCache: function () {
      statusCache = null;
    }
  };
})();
