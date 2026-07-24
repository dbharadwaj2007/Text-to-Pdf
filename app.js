(function () {
  'use strict';

  const STORAGE = {
    text: 'notepad_pdf_text_v2',
    filename: 'notepad_pdf_filename_v2',
    pageSize: 'notepad_pdf_pagesize_v2',
    fontSize: 'notepad_pdf_fontsize_v2',
    template: 'notepad_pdf_template_v2',
    pro: 'pro_unlocked'
  };

  const $ = (id) => document.getElementById(id);
  const templatesEl = $('templates');
  const textEl = $('text');
  const filenameEl = $('filename');
  const pageSizeEl = $('pagesize');
  const fontSizeEl = $('fontsize');
  const convertBtn = $('convert');
  const statusEl = $('status');
  const installBtn = $('installBtn');
  const iosHint = $('iosHint');
  const modalBackdrop = $('modalBackdrop');
  const modalMessage = $('modalMessage');
  const goCheckoutBtn = $('goCheckout');
  const closeModalBtn = $('closeModal');
  const proBadge = $('proBadge');

  const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  let selectedTemplate = readStorage(STORAGE.template) || 'plain';
  let proUnlocked = readStorage(STORAGE.pro) === 'true';
  let paymentsEnabled = false;
  let deferredInstallPrompt = null;
  let saveTimer = null;

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      // Private browsing or restricted storage: the app still works without autosave.
    }
  }

  function setStatus(message, type) {
    statusEl.textContent = message || '';
    statusEl.className = 'status' + (type ? ` ${type}` : '');
  }

  function sanitizeFilename(value) {
    const cleaned = String(value || '')
      .replace(/\.pdf$/i, '')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    return cleaned || 'my-document';
  }

  function restoreDraft() {
    const savedText = readStorage(STORAGE.text);
    const savedFilename = readStorage(STORAGE.filename);
    const savedPageSize = readStorage(STORAGE.pageSize);
    const savedFontSize = readStorage(STORAGE.fontSize);

    if (savedText !== null) textEl.value = savedText;
    if (savedFilename) filenameEl.value = savedFilename;
    if (savedPageSize && [...pageSizeEl.options].some((o) => o.value === savedPageSize)) {
      pageSizeEl.value = savedPageSize;
    }
    if (savedFontSize && [...fontSizeEl.options].some((o) => o.value === savedFontSize)) {
      fontSizeEl.value = savedFontSize;
    }

    const templateExists = window.PDFTemplates.list.some((t) => t.id === selectedTemplate);
    const selectedMeta = window.PDFTemplates.list.find((t) => t.id === selectedTemplate);
    if (!templateExists || (selectedMeta && selectedMeta.pro && !proUnlocked)) {
      selectedTemplate = 'plain';
    }
  }

  function queueDraftSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      writeStorage(STORAGE.text, textEl.value);
      writeStorage(STORAGE.filename, filenameEl.value);
      writeStorage(STORAGE.pageSize, pageSizeEl.value);
      writeStorage(STORAGE.fontSize, fontSizeEl.value);
      writeStorage(STORAGE.template, selectedTemplate);
    }, 250);
  }

  function renderTemplates() {
    templatesEl.replaceChildren();

    window.PDFTemplates.list.forEach((template) => {
      const locked = template.pro && !proUnlocked;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'tpl'
        + (template.id === selectedTemplate ? ' selected' : '')
        + (locked ? ' locked' : '');
      card.setAttribute('aria-pressed', String(template.id === selectedTemplate));
      card.setAttribute('aria-label', `${template.name}. ${template.blurb}${locked ? '. Locked' : ''}`);

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = template.name;

      const blurb = document.createElement('div');
      blurb.className = 'blurb';
      blurb.textContent = template.blurb;

      card.append(name, blurb);

      if (template.pro) {
        const lock = document.createElement('span');
        lock.className = 'lock';
        lock.setAttribute('aria-hidden', 'true');
        lock.textContent = locked ? '🔒' : '✓';
        card.appendChild(lock);
      }

      card.addEventListener('click', () => {
        if (locked) {
          openModal();
          return;
        }
        selectedTemplate = template.id;
        writeStorage(STORAGE.template, selectedTemplate);
        renderTemplates();
      });

      templatesEl.appendChild(card);
    });

    proBadge.hidden = !proUnlocked;
  }

  function openModal() {
    if (paymentsEnabled) {
      modalMessage.textContent = 'Letterhead, Journal, Legal Brief, and Screenplay layouts — one payment, yours forever.';
      goCheckoutBtn.hidden = false;
    } else {
      modalMessage.textContent = 'Pro checkout is not connected on this deployment. The free Plain and Ruled Notepad templates are fully available.';
      goCheckoutBtn.hidden = true;
    }
    modalBackdrop.classList.add('show');
    closeModalBtn.focus();
  }

  function closeModal() {
    modalBackdrop.classList.remove('show');
  }

  async function loadPaymentConfig() {
    try {
      const response = await fetch('./api/config', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) return;
      const data = await response.json();
      paymentsEnabled = data.paymentsEnabled === true;
    } catch (_) {
      paymentsEnabled = false;
    }
  }

  async function startCheckout() {
    if (!paymentsEnabled) {
      openModal();
      return;
    }

    goCheckoutBtn.disabled = true;
    goCheckoutBtn.textContent = 'Opening Stripe…';

    try {
      const response = await fetch('./api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ product: 'webapp-templates' })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'The checkout session could not be created.');
      }

      window.location.assign(data.url);
    } catch (error) {
      setStatus(error.message || 'Could not open checkout.', 'error');
      closeModal();
      goCheckoutBtn.disabled = false;
      goCheckoutBtn.textContent = 'Continue to Stripe →';
    }
  }

  async function verifyCheckoutReturn() {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    const checkoutState = url.searchParams.get('checkout');

    if (checkoutState === 'cancelled') {
      setStatus('Checkout cancelled. Your draft is still here.');
      url.searchParams.delete('checkout');
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }

    if (!sessionId) return;

    setStatus('Confirming payment…');

    try {
      const response = await fetch(`./api/verify-session?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.paid !== true || data.product !== 'webapp-templates') {
        throw new Error(data.error || 'Payment could not be verified.');
      }

      proUnlocked = true;
      writeStorage(STORAGE.pro, 'true');
      renderTemplates();
      setStatus('Pro templates unlocked. Pick one above.', 'ok');
    } catch (error) {
      setStatus(error.message || 'Payment verification failed.', 'error');
    } finally {
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }
  }

  function canShareFile(file) {
    if (typeof navigator.share !== 'function') return false;
    if (typeof navigator.canShare !== 'function') return true;
    try {
      return navigator.canShare({ files: [file] });
    } catch (_) {
      return false;
    }
  }

  function downloadBlob(blob, filename) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  function previewBlobOnApple(blob) {
    const blobUrl = URL.createObjectURL(blob);
    const preview = window.open(blobUrl, '_blank');
    if (!preview) window.location.assign(blobUrl);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
  }

  async function exportPdf(doc, filename) {
    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf', lastModified: Date.now() });

    if (isAppleMobile && canShareFile(file)) {
      await navigator.share({
        title: filename.replace(/\.pdf$/i, ''),
        files: [file]
      });
      return 'shared';
    }

    if (isAppleMobile) {
      previewBlobOnApple(blob);
      return 'previewed';
    }

    downloadBlob(blob, filename);
    return 'downloaded';
  }

  async function createPdf() {
    const text = textEl.value;
    if (!text.trim()) {
      setStatus('Write something first.', 'error');
      textEl.focus();
      return;
    }

    const template = window.PDFTemplates.list.find((item) => item.id === selectedTemplate);
    if (!template) {
      selectedTemplate = 'plain';
      renderTemplates();
      setStatus('Template reset to Plain. Please try again.', 'error');
      return;
    }

    if (template.pro && !proUnlocked) {
      openModal();
      return;
    }

    if (!window.jspdf || typeof window.jspdf.jsPDF !== 'function') {
      setStatus('The PDF library did not load. Check your internet connection and reload.', 'error');
      return;
    }

    const filenameBase = sanitizeFilename(filenameEl.value);
    filenameEl.value = filenameBase;
    queueDraftSave();

    convertBtn.disabled = true;
    convertBtn.textContent = 'Creating PDF…';
    setStatus('Creating your PDF…');

    try {
      const doc = window.PDFTemplates.render({
        jsPDFCtor: window.jspdf.jsPDF,
        text,
        templateId: selectedTemplate,
        filename: filenameBase,
        pageFormat: pageSizeEl.value,
        fontSize: Number.parseInt(fontSizeEl.value, 10),
        author: ''
      });

      if (!doc || typeof doc.output !== 'function') {
        throw new Error('The PDF renderer did not return a valid document.');
      }

      const result = await exportPdf(doc, `${filenameBase}.pdf`);

      if (result === 'shared') {
        setStatus('PDF created. Choose Save to Files, AirDrop, Mail, or another app.', 'ok');
      } else if (result === 'previewed') {
        setStatus('PDF opened in Safari. Tap Share, then Save to Files.', 'ok');
      } else {
        setStatus(`Saved ${filenameBase}.pdf using the ${template.name} template.`, 'ok');
      }
    } catch (error) {
      if (error && error.name === 'AbortError') {
        setStatus('Share cancelled. Your draft is unchanged.');
      } else {
        console.error(error);
        setStatus(error.message || 'Could not create the PDF.', 'error');
      }
    } finally {
      convertBtn.disabled = false;
      convertBtn.textContent = 'Save / Share PDF';
    }
  }

  function setupInstallExperience() {
    if (isAppleMobile && !isStandalone) {
      iosHint.style.display = 'block';
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      installBtn.style.display = 'inline-block';
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
      installBtn.style.display = 'none';
      setStatus('App installed.', 'ok');
    });
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }

  function bindEvents() {
    textEl.addEventListener('input', queueDraftSave);
    filenameEl.addEventListener('input', queueDraftSave);
    pageSizeEl.addEventListener('change', queueDraftSave);
    fontSizeEl.addEventListener('change', queueDraftSave);
    convertBtn.addEventListener('click', createPdf);
    goCheckoutBtn.addEventListener('click', startCheckout);
    closeModalBtn.addEventListener('click', closeModal);

    modalBackdrop.addEventListener('click', (event) => {
      if (event.target === modalBackdrop) closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modalBackdrop.classList.contains('show')) closeModal();
    });
  }

  function init() {
    if (!window.PDFTemplates || !Array.isArray(window.PDFTemplates.list)) {
      setStatus('The template file did not load. Please reload the page.', 'error');
      return;
    }

    restoreDraft();
    renderTemplates();
    bindEvents();
    setupInstallExperience();
    registerServiceWorker();
    loadPaymentConfig();
    verifyCheckoutReturn();
  }

  init();
})();
