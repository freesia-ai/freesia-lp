/* Campaign-only attribution. No consultation text or contact details are read. */
(() => {
  'use strict';
  const element = document.getElementById('freesia-analytics-config');
  if (!element) return;
  const config = JSON.parse(element.textContent);
  const campaigns = new Set(['overseas_ai', 'human_needed', 'case_study', 'opinion', 'experiment', 'fixed']);
  const key = 'freesia-attribution-v1';
  const id = /^[A-Za-z0-9_-]{1,80}$/;
  let attribution = {};
  let clientId = '';
  let sessionId = '';
  function valid(data) {
    return data && data.utm_source === 'x' && data.utm_medium === 'organic_social'
      && campaigns.has(data.utm_campaign) && id.test(data.utm_content || '');
  }
  const current = new URL(window.location.href);
  const incoming = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
    .map(name => [name, current.searchParams.get(name) || '']));
  if (valid(incoming)) {
    attribution = incoming;
    try { sessionStorage.setItem(key, JSON.stringify({data: incoming, expires: Date.now() + 30 * 60 * 1000})); } catch { /* URL still carries attribution when browser storage is unavailable. */ }
  } else if (!current.searchParams.has('utm_source')) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (saved && saved.expires > Date.now() && valid(saved.data)) attribution = saved.data;
    } catch { /* A missing or malformed attribution never enables a fabricated campaign. */ }
  } else {
    try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
  }
  const canonicalPage = current.origin + current.pathname;
  const pageLocation = new URL(canonicalPage);
  Object.entries(attribution).forEach(([name, value]) => pageLocation.searchParams.set(name, value));
  const cleanReferrer = (() => {
    try { const referrer = new URL(document.referrer); return referrer.origin + referrer.pathname; } catch { return ''; }
  })();
  function event(name, values = {}) {
    if (!config.measurementId) return;
    window.gtag('event', name, {...attribution, genre: attribution.utm_campaign || 'unattributed',
      page_location: pageLocation.href, page_referrer: cleanReferrer, ...values});
  }
  function decorate(anchor) {
    const url = new URL(anchor.getAttribute('href'), current);
    if (!['https:', 'http:'].includes(url.protocol)) return;
    if (url.origin === current.origin && (url.pathname.endsWith('.html') || url.pathname.endsWith('/'))) {
      Object.entries(attribution).forEach(([name, value]) => url.searchParams.set(name, value));
      anchor.setAttribute('href', url.pathname + url.search + url.hash);
    }
    if (anchor.hasAttribute('data-consultation-form') && url.hostname === 'docs.google.com') {
      const values = {...attribution, client_id: clientId, session_id: sessionId};
      Object.entries(config.prefillFields || {}).forEach(([name, field]) => {
        if (values[name]) url.searchParams.set(field, values[name]);
      });
      anchor.setAttribute('href', url.href);
    }
  }
  const anchors = () => Array.from(document.querySelectorAll('a[href]'));
  anchors().forEach(decorate);
  if (config.measurementId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', config.measurementId, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: pageLocation.href, page_referrer: cleanReferrer,
      campaign_source: attribution.utm_source, campaign_medium: attribution.utm_medium,
      campaign_name: attribution.utm_campaign, campaign_content: attribution.utm_content,
    });
    event('page_view');
    window.gtag('get', config.measurementId, 'client_id', value => {
      if (/^[0-9]+\.[0-9]+$/.test(String(value))) clientId = String(value);
      anchors().forEach(decorate);
    });
    window.gtag('get', config.measurementId, 'session_id', value => {
      if (/^[0-9]+$/.test(String(value))) sessionId = String(value);
      anchors().forEach(decorate);
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.measurementId);
    document.head.appendChild(script);
  }
  document.addEventListener('click', click => {
    const anchor = click.target.closest('a[href]');
    if (!anchor) return;
    decorate(anchor);
    const url = new URL(anchor.getAttribute('href'), current);
    if (!['https:', 'http:'].includes(url.protocol)) return;
    const consultation = url.hash === '#contact' || url.pathname.endsWith('/contact.html')
      || anchor.hasAttribute('data-consultation-form');
    const booking = anchor.hasAttribute('data-meeting-link');
    if (consultation || booking) event('cta_click', {cta_kind: booking ? 'meeting' : 'consultation',
      link_path: url.pathname});
    if (url.origin !== current.origin) event('external_link_click', {link_domain: url.hostname,
      link_path: url.pathname});
    if (anchor.hasAttribute('data-consultation-form')) event('ai_consultation_click');
    // A link click is never a confirmed consultation or reservation.
  });
})();
