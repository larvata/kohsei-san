import { div, span, text } from './easy-dom';
import { debounce } from './utils';

class KorrectArea {
  constructor(textArea, options) {
    this.labels = [];
    this.corrections = [];
    this.last = null;
    this.suggestionTimeout = null;
    this.cachedLineHeight = null;

    this.options = options;
    this.textArea = textArea;
    this.loadingIcon = this.createLoadingIcon();
    this.mask = this.createTextAreaMask();
    this.mirror = this.createTextAreaTextMirror();
    this.placeholder = this.createPlaceholder();
    this.bookmark = this.createBookmark();
    this.suggestion = this.createSuggestion();
    this.updateLayout();

    const { onChange, onCorrect } = options;
    this.handles = {
      onChange,
      onCorrect,
    };

    const debounceOnChange = debounce(onChange, 300);

    this.textArea.addEventListener('keydown', (e) => {
      this.showLoadingIcon(true);
      debounceOnChange(e, this);
    });

    this.textArea.addEventListener('input', (e) => {
      this.showLoadingIcon(true);
      debounceOnChange(e, this);
    });

    this.textArea.addEventListener('mouseout', () => {
      this.delayHideSuggestion();
    });

    this.textArea.addEventListener('mousemove', (e) => {
      const { top: offsetTop, left: offsetLeft } = this.textArea.getBoundingClientRect();
      const { clientX, clientY } = e;
      let activedLabel = null;
      let activeRange = null;
      this.labels.forEach((label) => {
        const {
          elements,
          ranges,
        } = label;
        const match = ranges.some((r) => {
          if (
            clientX - offsetLeft > r.x1
              && clientX - offsetLeft < r.x2
              && clientY - offsetTop > r.y1
              && clientY - offsetTop < r.y2
          ) {
            activeRange = r;
            return true;
          }
        });

        if (match) {
          activedLabel = label;
          return;
        }
        elements.forEach((el) => el.classList.remove('active'));
      });

      if (!activedLabel) {
        this.delayHideSuggestion();
        return;
      }

      const visibility = this.suggestion.classList.contains('active');
      if (visibility && this.last === activedLabel.correction) {
        return;
      }

      activedLabel.elements.forEach((el) => el.classList.add('active'));
      this.updateSuggestion(activedLabel, activeRange);
    });

    this.suggestion.addEventListener('mouseout', () => {
      this.delayHideSuggestion();
    });

    this.suggestion.addEventListener('mouseover', () => {
      clearTimeout(this.suggestionTimeout);
    });

    const ro = new ResizeObserver(debounce((entries) => {
      this.updateLayout();
      if (this.corrections) {
        this.updateCorrections(this.corrections);
      }
    }, 500));
    ro.observe(this.textArea);
  }

  showLoadingIcon(visibility) {
    if (this.options.hideSpinner) {
      return;
    }

    const action = visibility ? 'remove' : 'add';
    this.loadingIcon.classList[action]('hidden');
  }

  updateLayout() {
    this.cachedLineHeight = null;
    const el = this.textArea;
    const rect = el.getBoundingClientRect();
    el.setAttribute('spellcheck', 'false');

    this.mask.appendChild(this.loadingIcon);
    this.loadingIcon.style.width = '40px';
    this.loadingIcon.style.margin = '10px';

    // mask
    Object.assign(this.mask.style, {
      top: `${window.scrollY + rect.top}px`,
      left: `${window.scrollX + rect.left}px`,
      width: `${el.offsetWidth}px`,
      height: `${el.offsetHeight}px`,
    });

    // mirror
    // from grammarly
    const MIRROR_KEYS = [
      'border',
      'margin',
      'padding',
      'font',
      'direction',
      'textAlign',
      'textShadow',
      'textIndent',
      'letterSpacing',
      'wordBreak',
      'overflowWrap',
      'wordSpacing',
      'writingMode',
      'whiteSpace',
      'verticalAlign',
      'clear',
      'boxSizing',
      'width',
      'height',
      'top',
      'left',
      'background',
      'overflow',
      'color',
    ];
    const computed = window.getComputedStyle(el);
    MIRROR_KEYS.forEach((mk) => {
      this.mirror.style[mk] = computed[mk];
    });

    this.destoryLabels();
  }

  createLoadingIcon() {
    const el = div('loading hidden');
    const domString = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; display: block; shape-rendering: auto;" width="40px" height="40px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">
<circle cx="50" cy="50" r="32" stroke-width="8" stroke="#fe718d" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round">
  <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" keyTimes="0;1" values="0 50 50;360 50 50"></animateTransform>
</circle>
<!-- [ldio] generated by https://loading.io/ --></svg>`;
    el.innerHTML = domString;
    return el;
  }

  createTextAreaMask() {
    const mask = div('mask');
    return mask;
  }

  createTextAreaTextMirror() {
    const mirror = div('mirror');
    mirror.setAttribute('contentEditable', 'plaintext-only');
    return mirror;
  }


  createSuggestion() {
    const suggestion = div('suggestion');
    return suggestion;
  }

  createPlaceholder() {
    const placeholder = span('placeholder');
    return placeholder;
  }

  createBookmark() {
    const bookmark = span('bookmark');
    return bookmark;
  }

  createCorrectionLabel(textContent, c) {
    const { offset, length } = c;

    const buildLabelElement = (range) => div({
      className: 'label',
      styles: {
        left: `${range.x1}px`,
        width: `${range.width}px`,
        top: `${range.y1}px`,
        height: `${range.height}px`,
      },
    });

    this.mirror.textContent = textContent.substr(0, offset);
    this.mirror.appendChild(this.placeholder);

    const label = {
      correction: c,
      elements: [],
      ranges: [],
    };

    const curr = textContent.substr(offset, length);
    const chars = curr.split('');

    const lastRange = {};
    this.placeholder.textContent = '';

    for (let i = 0; i < chars.length; i += 1) {
      const char = chars[i];

      this.placeholder.textContent += char;
      const nextRange = {
        x1: this.placeholder.offsetLeft,
        x2: this.placeholder.offsetLeft + this.placeholder.offsetWidth,
        y1: this.placeholder.offsetTop,
        y2: this.placeholder.offsetTop + this.placeholder.offsetHeight,
        width: this.placeholder.offsetWidth,
        height: this.placeholder.offsetHeight,
      };

      if (i !== 0 && lastRange.y2 !== nextRange.y2) {
        if (lastRange.height === nextRange.height) {
          // nop
        } else {
          // multiple line
          label.ranges.push({ ...lastRange });
          this.mirror.textContent = this.mirror.textContent.slice(0, -1);
          this.placeholder.textContent = '';
          this.mirror.appendChild(this.placeholder);
          i -= 1;
        }
      }
      Object.assign(lastRange, nextRange);
    }

    label.ranges.push({ ...lastRange });

    label.ranges.forEach((range) => label.elements.push(buildLabelElement(range)));
    this.labels.push(label);
    return label;
  }

  destoryLabels() {
    this.labels.forEach((label) => {
      label.elements.forEach((el) => el.remove());
    });
    this.labels = [];
  }

  getMirrorLineHeight() {
    if (this.cachedLineHeight !== null) {
      return this.cachedLineHeight;
    }

    this.mirror.appendChild(this.bookmark);
    this.bookmark.textContent = 'a';
    const initHeight = this.bookmark.offsetHeight;
    let height = initHeight;
    while (height === initHeight) {
      this.bookmark.textContent += 'a';
      height = this.bookmark.offsetHeight;
    }
    this.cachedLineHeight = height;
    return height;
  }

  delayHideSuggestion() {
    clearTimeout(this.suggestionTimeout);
    this.suggestionTimeout = setTimeout(() => this.suggestion.classList.remove('active'), 50);
  }

  immediateHideSuggestion() {
    clearTimeout(this.suggestionTimeout);
    this.suggestion.classList.remove('active');
  }

  renderSuggestionItems(correction) {
    const btns = correction.replacements.map((rep) =>
      div(
        {
          className: 'btn',
          onClick: () => {
            const { offset, length } = correction;
            const { textContent } = this.textArea;
            const pre = textContent.substr(0, offset);
            const suff = textContent.substr(offset + length);
            const newContent = `${pre}${rep.value}${suff}`;
            this.textArea.textContent = newContent;

            this.labels.some((lbl) => {
              if (lbl.correction === correction) {
                lbl.elements.forEach((el) => el.remove);
                return true;
              }
              return false;
            });

            this.immediateHideSuggestion();
            this.showLoadingIcon(true);
            this.handles.onCorrect(null, this);
          },
        },
        div('correct', text(rep.value)),
      ));


    const desp = div(
      'item',
      div('description', text(correction.rule.description)),
    );

    return [desp, ...btns];
  }

  updateSuggestion({ correction }, { x1, y1, x2, y2 }) {
    const { top: offsetTop, left: offsetLeft } = this.textArea.getBoundingClientRect();
    const items = this.renderSuggestionItems(correction);
    this.suggestion.innerHTML = '';

    clearTimeout(this.suggestionTimeout);
    this.suggestion.classList.add('active');
    this.suggestion.style.left = `${x1 + offsetLeft - 10}px`;
    this.suggestion.style.top = `${y2 + offsetTop}px`;
    items.forEach((item) => this.suggestion.appendChild(item));
  }

  updateCorrections(corrections) {
    const { textContent } = this.textArea;
    this.corrections = corrections;
    this.destoryLabels();
    corrections.forEach((c) => {
      const { elements } = this.createCorrectionLabel(textContent, c);
      elements.forEach((el) => this.mask.appendChild(el));
    });
    this.showLoadingIcon(false);
  }

  getCorrections() {
    return this.corrections;
  }
}

export default KorrectArea;
