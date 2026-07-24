(function () {
  'use strict';

  const list = [
    { id: 'plain', name: 'Plain', blurb: 'Clean text, no styling', pro: false },
    { id: 'ruled', name: 'Ruled Notepad', blurb: 'Blue rules + red margin', pro: false },
    { id: 'letterhead', name: 'Letterhead', blurb: 'Header, date, divider line', pro: true },
    { id: 'journal', name: 'Journal', blurb: 'Dated entry + page numbers', pro: true },
    { id: 'legal', name: 'Legal Brief', blurb: 'Numbered lines, double-spaced', pro: true },
    { id: 'screenplay', name: 'Screenplay', blurb: 'Courier, industry margins', pro: true }
  ];

  const COLORS = {
    ink: [43, 42, 40],
    muted: [107, 102, 92],
    paper: [246, 241, 228],
    rule: [169, 190, 220],
    accent: [192, 96, 90],
    gold: [184, 145, 47]
  };

  function cleanText(value) {
    return String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u0000/g, '');
  }

  function titleFromFilename(filename) {
    const raw = String(filename || 'My Document').replace(/[-_]+/g, ' ').trim();
    return raw ? raw.replace(/\b\w/g, (char) => char.toUpperCase()) : 'My Document';
  }

  function humanDate() {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      }).format(new Date());
    } catch (_) {
      return new Date().toLocaleDateString();
    }
  }

  function pageSize(doc) {
    return {
      width: doc.internal.pageSize.getWidth(),
      height: doc.internal.pageSize.getHeight()
    };
  }

  function fillPaper(doc) {
    const { width, height } = pageSize(doc);
    doc.setFillColor.apply(doc, COLORS.paper);
    doc.rect(0, 0, width, height, 'F');
  }

  function wrapParagraph(doc, paragraph, width) {
    if (paragraph === '') return [''];
    const wrapped = doc.splitTextToSize(paragraph, width);
    return Array.isArray(wrapped) ? wrapped : [String(wrapped)];
  }

  function setMetadata(doc, options) {
    if (typeof doc.setProperties !== 'function') return;
    doc.setProperties({
      title: titleFromFilename(options.filename),
      subject: 'Created with Notepad to PDF Pro',
      author: options.author || '',
      creator: 'Notepad to PDF Pro'
    });
  }

  function drawRulePaper(doc, leftMargin, top, bottom, lineHeight) {
    const { width } = pageSize(doc);
    doc.setDrawColor.apply(doc, COLORS.rule);
    doc.setLineWidth(0.55);
    for (let y = top; y <= bottom; y += lineHeight) {
      doc.line(leftMargin, y, width - 42, y);
    }
    doc.setDrawColor.apply(doc, COLORS.accent);
    doc.setLineWidth(1);
    doc.line(leftMargin - 14, 0, leftMargin - 14, pageSize(doc).height);
  }

  function renderTextFlow(doc, text, settings) {
    const {
      left,
      top,
      right,
      bottom,
      font = 'courier',
      style = 'normal',
      fontSize = 12,
      lineHeight = fontSize * 1.55,
      beforePage,
      paragraphGap = lineHeight * 0.25,
      processLine
    } = settings;

    let pageNumber = 1;
    let y = top;
    const availableWidth = pageSize(doc).width - left - right;

    function preparePage() {
      if (typeof beforePage === 'function') beforePage(doc, pageNumber);
      doc.setFont(font, style);
      doc.setFontSize(fontSize);
      doc.setTextColor.apply(doc, COLORS.ink);
      y = top;
    }

    function nextPage() {
      doc.addPage();
      pageNumber += 1;
      preparePage();
    }

    preparePage();

    const paragraphs = cleanText(text).split('\n');
    for (let p = 0; p < paragraphs.length; p += 1) {
      const paragraph = paragraphs[p];
      const lines = wrapParagraph(doc, paragraph, availableWidth);

      for (let i = 0; i < lines.length; i += 1) {
        if (y > bottom) nextPage();
        const line = lines[i];
        if (typeof processLine === 'function') {
          processLine(doc, line, left, y, pageNumber);
        } else if (line !== '') {
          doc.text(line, left, y);
        }
        y += lineHeight;
      }

      if (p < paragraphs.length - 1 && paragraph !== '') {
        y += paragraphGap;
      }
    }

    return pageNumber;
  }

  function renderPlain(doc, options) {
    renderTextFlow(doc, options.text, {
      left: 54,
      right: 54,
      top: 64,
      bottom: pageSize(doc).height - 54,
      font: 'courier',
      fontSize: options.fontSize,
      lineHeight: options.fontSize * 1.55,
      paragraphGap: options.fontSize * 0.35,
      beforePage(currentDoc) {
        fillPaper(currentDoc);
      }
    });
  }

  function renderRuled(doc, options) {
    const left = 74;
    const top = 74;
    const lineHeight = Math.max(24, options.fontSize * 1.7);
    const bottom = pageSize(doc).height - 48;

    renderTextFlow(doc, options.text, {
      left,
      right: 48,
      top,
      bottom,
      font: 'courier',
      fontSize: options.fontSize,
      lineHeight,
      paragraphGap: 0,
      beforePage(currentDoc) {
        fillPaper(currentDoc);
        drawRulePaper(currentDoc, left, top + 5, bottom + 5, lineHeight);
      }
    });
  }

  function renderLetterhead(doc, options) {
    const title = titleFromFilename(options.filename);
    const top = 112;

    renderTextFlow(doc, options.text, {
      left: 58,
      right: 58,
      top,
      bottom: pageSize(doc).height - 58,
      font: 'times',
      fontSize: options.fontSize,
      lineHeight: options.fontSize * 1.5,
      paragraphGap: options.fontSize * 0.5,
      beforePage(currentDoc, pageNumber) {
        fillPaper(currentDoc);
        const { width, height } = pageSize(currentDoc);

        currentDoc.setTextColor.apply(currentDoc, COLORS.accent);
        currentDoc.setFont('helvetica', 'bold');
        currentDoc.setFontSize(18);
        currentDoc.text(title, 58, 48);

        currentDoc.setTextColor.apply(currentDoc, COLORS.muted);
        currentDoc.setFont('helvetica', 'normal');
        currentDoc.setFontSize(9.5);
        currentDoc.text(humanDate(), 58, 66);
        currentDoc.text(`Page ${pageNumber}`, width - 58, 66, { align: 'right' });

        currentDoc.setDrawColor.apply(currentDoc, COLORS.accent);
        currentDoc.setLineWidth(1.25);
        currentDoc.line(58, 78, width - 58, 78);

        currentDoc.setDrawColor(210, 203, 185);
        currentDoc.setLineWidth(0.5);
        currentDoc.line(58, height - 36, width - 58, height - 36);
      }
    });
  }

  function renderJournal(doc, options) {
    const left = 70;
    const top = 118;
    const lineHeight = Math.max(25, options.fontSize * 1.75);
    const bottom = pageSize(doc).height - 62;

    renderTextFlow(doc, options.text, {
      left,
      right: 52,
      top,
      bottom,
      font: 'times',
      fontSize: options.fontSize,
      lineHeight,
      paragraphGap: 0,
      beforePage(currentDoc, pageNumber) {
        fillPaper(currentDoc);
        const { width, height } = pageSize(currentDoc);

        currentDoc.setTextColor.apply(currentDoc, COLORS.accent);
        currentDoc.setFont('times', 'bolditalic');
        currentDoc.setFontSize(16);
        currentDoc.text('Journal', left, 48);

        currentDoc.setTextColor.apply(currentDoc, COLORS.muted);
        currentDoc.setFont('times', 'normal');
        currentDoc.setFontSize(10);
        currentDoc.text(humanDate(), left, 69);
        currentDoc.text(String(pageNumber), width - 52, height - 28, { align: 'right' });

        drawRulePaper(currentDoc, left, top + 5, bottom + 5, lineHeight);
      }
    });
  }

  function renderLegal(doc, options) {
    const left = 88;
    const top = 72;
    const lineHeight = Math.max(24, options.fontSize * 2);
    const bottom = pageSize(doc).height - 58;
    let lineNumber = 1;

    renderTextFlow(doc, options.text, {
      left,
      right: 62,
      top,
      bottom,
      font: 'times',
      fontSize: options.fontSize,
      lineHeight,
      paragraphGap: 0,
      beforePage(currentDoc, pageNumber) {
        fillPaper(currentDoc);
        const { width } = pageSize(currentDoc);
        currentDoc.setDrawColor(180, 180, 180);
        currentDoc.setLineWidth(0.5);
        currentDoc.line(70, 44, 70, bottom + 14);
        currentDoc.setFont('helvetica', 'normal');
        currentDoc.setFontSize(8);
        currentDoc.setTextColor.apply(currentDoc, COLORS.muted);
        currentDoc.text(`LEGAL BRIEF  •  PAGE ${pageNumber}`, width - 62, 40, { align: 'right' });
      },
      processLine(currentDoc, line, x, y) {
        currentDoc.setFont('helvetica', 'normal');
        currentDoc.setFontSize(8);
        currentDoc.setTextColor.apply(currentDoc, COLORS.muted);
        currentDoc.text(String(lineNumber), 60, y, { align: 'right' });

        currentDoc.setFont('times', 'normal');
        currentDoc.setFontSize(options.fontSize);
        currentDoc.setTextColor.apply(currentDoc, COLORS.ink);
        if (line !== '') currentDoc.text(line, x, y);
        lineNumber += 1;
      }
    });
  }

  function renderScreenplay(doc, options) {
    const left = 86;
    const right = 60;
    const top = 72;
    const bottom = pageSize(doc).height - 54;
    const fontSize = Math.max(10, Math.min(12, options.fontSize));
    const lineHeight = fontSize * 1.55;
    const { width } = pageSize(doc);
    let pageNumber = 1;
    let y = top;

    function drawPageHeader() {
      fillPaper(doc);
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, COLORS.muted);
      doc.text(String(pageNumber) + '.', width - right, 38, { align: 'right' });
      doc.setTextColor.apply(doc, COLORS.ink);
      doc.setFontSize(fontSize);
      y = top;
    }

    function nextPage() {
      doc.addPage();
      pageNumber += 1;
      drawPageHeader();
    }

    function ensureSpace(linesNeeded) {
      if (y + (linesNeeded * lineHeight) > bottom) nextPage();
    }

    drawPageHeader();

    const sourceLines = cleanText(options.text).split('\n');
    for (const rawLine of sourceLines) {
      const trimmed = rawLine.trim();

      if (!trimmed) {
        ensureSpace(1);
        y += lineHeight;
        continue;
      }

      const isSceneHeading = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(trimmed);
      const isTransition = /^(FADE (IN|OUT)|CUT TO:|DISSOLVE TO:|SMASH CUT TO:)/i.test(trimmed) || /:$/.test(trimmed) && trimmed === trimmed.toUpperCase();
      const isCharacter = trimmed.length <= 32 && trimmed === trimmed.toUpperCase() && !isSceneHeading && !isTransition;

      let x = left;
      let available = width - left - right;
      let style = 'normal';
      let align = 'left';

      if (isSceneHeading) {
        style = 'bold';
      } else if (isTransition) {
        x = width - right;
        available = width * 0.36;
        align = 'right';
      } else if (isCharacter) {
        x = width * 0.46;
        available = width * 0.26;
      } else if (/^\(.+\)$/.test(trimmed)) {
        x = width * 0.39;
        available = width * 0.33;
      } else if (rawLine.startsWith('    ') || rawLine.startsWith('\t')) {
        x = width * 0.32;
        available = width * 0.46;
      }

      doc.setFont('courier', style);
      doc.setFontSize(fontSize);
      const wrapped = wrapParagraph(doc, trimmed, available);
      ensureSpace(wrapped.length);

      for (const line of wrapped) {
        doc.text(line, x, y, { align });
        y += lineHeight;
      }
    }
  }

  function render(options) {
    if (!options || typeof options.jsPDFCtor !== 'function') {
      throw new Error('jsPDF is not available. Check the script connection and reload the page.');
    }

    const normalized = {
      jsPDFCtor: options.jsPDFCtor,
      text: cleanText(options.text),
      templateId: options.templateId || 'plain',
      filename: options.filename || 'my-document',
      pageFormat: options.pageFormat === 'a4' ? 'a4' : 'letter',
      fontSize: Number.isFinite(Number(options.fontSize)) ? Number(options.fontSize) : 12,
      author: options.author || ''
    };

    const doc = new normalized.jsPDFCtor({
      orientation: 'portrait',
      unit: 'pt',
      format: normalized.pageFormat,
      compress: true,
      putOnlyUsedFonts: true
    });

    setMetadata(doc, normalized);

    switch (normalized.templateId) {
      case 'ruled':
        renderRuled(doc, normalized);
        break;
      case 'letterhead':
        renderLetterhead(doc, normalized);
        break;
      case 'journal':
        renderJournal(doc, normalized);
        break;
      case 'legal':
        renderLegal(doc, normalized);
        break;
      case 'screenplay':
        renderScreenplay(doc, normalized);
        break;
      case 'plain':
      default:
        renderPlain(doc, normalized);
        break;
    }

    return doc;
  }

  window.PDFTemplates = Object.freeze({ list: Object.freeze(list), render });
})();
