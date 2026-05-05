#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// ── Theme definitions ──────────────────────────────────────────────────────────
// id, bg-color, title-color, text-color, accent-color
const themes = [
  ['graphite-red',        '#FFFFFF', '#333333', '#666666', '#E05D5D'],
  ['graphite-black',      '#222222', '#EEEEEE', '#BBBBBB', '#5D9CE0'],
  ['graphite-blue',       '#FFFFFF', '#24292F', '#57606A', '#0969DA'],
  ['charcoal-grey',       '#373C43', '#8B949E', '#C9D1D9', '#79C0FF'],
  ['broad-daylight',      '#FDF6E3', '#586E75', '#657B83', '#B58900'],
  ['dark-night',          '#002B36', '#93A1A1', '#839496', '#2AA198'],
  ['anxiety-mode',        '#1A202C', '#D69E2E', '#E2E8F0', '#38B2AC'],
  ['gotham-city',         '#111827', '#10B981', '#64748B', '#EF4444'],
  ['dracula',             '#282A36', '#50FA7B', '#F8F8F2', '#8BE9FD'],
  ['toothpaste',          '#263238', '#80CBC4', '#B0BEC5', '#EF9A9A'],
  ['cobalt-blue',         '#192A3E', '#D4AF37', '#E2E8F0', '#20B2AA'],
  ['dead-leaf',           '#FBF7EE', '#5D4037', '#795548', '#3F51B5'],
  ['icefield',            '#FFFFFF', '#5C6BC0', '#495057', '#D96F6F'],
  ['moonlight',           '#FCFCFC', '#A068C6', '#606266', '#B565A7'],
  ['ten-gold',            '#000000', '#F5A623', '#F3F4F6', '#F59E0B'],
  ['ayu-light',           '#FAFAFA', '#6C719C', '#5C617B', '#F2994A'],
  ['ayu-mirage',          '#1F2430', '#8A91A7', '#C2C5D1', '#FFCC66'],
  ['gandalf',             '#F4F5F7', '#4A6076', '#4B5563', '#8C4348'],
  ['deer-park',           '#F6F7F0', '#35664F', '#424B46', '#4A9D87'],
  ['boring',              '#FFFFFF', '#1C1C1E', '#3A3A3C', '#6E7C8B'],
  ['day',                 '#FFFFFF', '#BA7276', '#4C5768', '#D97B65'],
  ['nord',                '#2E3440', '#81A1C1', '#ECEFF4', '#A3BE8C'],
  ['notes-light',         '#FFFFFF', '#4A4A4A', '#5A5A5A', '#E2B53E'],
  ['notes-dark',          '#1C1C1E', '#D4D4D4', '#A1A1AA', '#E2B53E'],
  ['lighthouse',          '#131216', '#EED87A', '#EAE5E1', '#73D2AE'],
  ['rose-pine',           '#191724', '#A390C4', '#E0DEF4', '#EB6F92'],
  ['rose-pine-dawn',      '#FAF4ED', '#3A7C96', '#575279', '#D7827E'],
  ['tokyo-night',         '#1A1B26', '#7AA2F7', '#A9B1D6', '#BB9AF7'],
  ['norwegian-light',     '#EEF2F6', '#1B5469', '#4C6275', '#B85B33'],
  ['academic',            '#594A46', '#DBC5C1', '#BEB0AE', '#C67D38'],
  ['atom-one-dark',       '#282C34', '#ABB2BF', '#9CA3AF', '#61AFEF'],
  ['vinyl',               '#F7EFCF', '#796B3E', '#5C5A4E', '#64845D'],
  ['catppuccin-latte',    '#EFF1F5', '#179299', '#4C4F69', '#8839EF'],
  ['catppuccin-macchiato','#24273A', '#8BD5CA', '#CAD3F5', '#C6A0F6'],
  ['shibuya-jazz',        '#000000', '#4FD1C5', '#F3F4F6', '#F687B3'],
  ['shibuya-lofi',        '#000000', '#B794F4', '#E2E8F0', '#F6AD55'],
  ['dark-forest',         '#222627', '#C6A67B', '#E3D9C6', '#C76E74'],
  ['clear-realm',         '#FCF9F2', '#6B7280', '#4B5563', '#2563EB'],
];

// ── Color utilities ────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  // Simple perceived brightness
  return (0.299 * r + 0.587 * g + 0.114 * b);
}

function isLight(hex) {
  return luminance(hex) > 128;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  if (alpha >= 1) return `rgba(${r}, ${g}, ${b}, 1)`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgb(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Lighten a hex color by mixing towards white */
function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return '#' + [nr, ng, nb].map(c => c.toString(16).padStart(2, '0')).join('');
}

/** Darken a hex color by mixing towards black */
function darken(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r * (1 - amount));
  const ng = Math.round(g * (1 - amount));
  const nb = Math.round(b * (1 - amount));
  return '#' + [nr, ng, nb].map(c => c.toString(16).padStart(2, '0')).join('');
}

/** Blend two hex colors (0 = colorA, 1 = colorB) */
function blend(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const nr = Math.round(a.r + (b.r - a.r) * t);
  const ng = Math.round(a.g + (b.g - a.g) * t);
  const nb = Math.round(a.b + (b.b - a.b) * t);
  return '#' + [nr, ng, nb].map(c => c.toString(16).padStart(2, '0')).join('');
}

// ── Theme generation ───────────────────────────────────────────────────────────

function generateTheme(id, bgColor, titleColor, textColor, accentColor) {
  const light = isLight(bgColor);

  const accentRgb = hexToRgb(accentColor);
  const textRgb = hexToRgb(textColor);
  const titleRgb = hexToRgb(titleColor);
  const bgRgb = hexToRgb(bgColor);

  // Derived colors
  const sideBarBg = light ? darken(bgColor, 0.04) : darken(bgColor, 0.15);
  const floatBg = light ? lighten(bgColor, 0.3) : lighten(bgColor, 0.12);
  const codeBg = light ? '#d8d8d869' : lighten(bgColor, 0.15);
  const codeBlockBg = light
    ? rgba(accentColor, 0.05)
    : lighten(bgColor, 0.12);
  const tableBorderColor = light ? '#e5e5e5' : darken(lighten(bgColor, 0.1), 0.0);
  const inputBg = light ? 'rgba(0, 0, 0, .06)' : rgba('#000000', 0.1);

  // For button focus shadow, darken the accent color
  const accentDark = darken(accentColor, 0.5);
  const accentDarkRgb = hexToRgb(accentDark);

  // sideBarBgColor for light themes: slightly off background; for dark: darker
  const sideBarBgLight = rgba(lighten(bgColor, 0.2), 0.9);
  const sideBarBgDark = darken(bgColor, 0.2);

  // Float border / separator colors
  const borderDark = darken(bgColor, 0.35);
  const borderLight = 'rgba(0, 0, 0, .03)';

  // Scrollbar thumb for dark themes
  const scrollThumb = lighten(bgColor, 0.18);
  const scrollThumbHover = lighten(bgColor, 0.25);

  // Tab border for dark themes
  const tabBorder = darken(bgColor, 0.3);
  // Tab border for light themes
  const tabBorderLight = darken(bgColor, 0.12);

  // Tab background for light themes
  const tabBgLight = darken(bgColor, 0.03);

  // itemBgColor
  const itemBg = light
    ? rgba(darken(bgColor, 0.05), 0.6)
    : lighten(bgColor, 0.12);

  let css = '';
  css += ':root {\n';
  css += '  /*editor*/\n';

  // themeColor (accent)
  css += `  --themeColor: ${rgb(accentColor)};\n`;
  for (let i = 90; i >= 10; i -= 10) {
    css += `  --themeColor${i}: ${rgba(accentColor, i / 100)};\n`;
  }
  css += '\n';

  // highlight / selection
  css += `  --highlightColor: ${rgba(accentColor, 0.4)};\n`;
  if (light) {
    css += `  --selectionColor: rgba(0, 0, 0, .1);\n`;
  } else {
    css += `  --selectionColor: ${rgba(accentColor, 0.3)};\n`;
  }

  // editorColor (text-color based)
  if (light) {
    css += `  --editorColor: ${rgba(textColor, 0.7)};\n`;
    css += `  --editorColor80: ${rgba(textColor, 0.8)};\n`;
    css += `  --editorColor60: ${rgba(textColor, 0.6)};\n`;
    css += `  --editorColor50: ${rgba(textColor, 0.5)};\n`;
    css += `  --editorColor40: ${rgba(textColor, 0.4)};\n`;
    css += `  --editorColor30: ${rgba(textColor, 0.3)};\n`;
    css += `  --editorColor10: ${rgba(textColor, 0.1)};\n`;
    css += `  --editorColor04: ${rgba(textColor, 0.04)};\n`;
  } else {
    css += `  --editorColor: ${rgba(textColor, 0.8)};\n`;
    css += `  --editorColor80: ${rgba(textColor, 1)};\n`;
    css += `  --editorColor60: ${rgba(textColor, 0.6)};\n`;
    css += `  --editorColor50: ${rgba(textColor, 0.5)};\n`;
    css += `  --editorColor40: ${rgba(textColor, 0.4)};\n`;
    css += `  --editorColor30: ${rgba(textColor, 0.3)};\n`;
    css += `  --editorColor10: ${rgba(textColor, 0.1)};\n`;
    css += `  --editorColor04: ${rgba(textColor, 0.04)};\n`;
  }

  // editorBgColor
  css += `  --editorBgColor: ${bgColor.toLowerCase()};\n`;

  // deleteColor
  css += `  --deleteColor: #ff6969;\n`;

  // iconColor
  if (light) {
    css += `  --iconColor: ${rgba(textColor, 0.8)};\n`;
  } else {
    css += `  --iconColor: rgba(255, 255, 255, .56);\n`;
  }

  // code colors
  css += `  --codeBgColor: ${codeBg};\n`;
  css += `  --codeBlockBgColor: ${codeBlockBg};\n`;

  // footnote / input
  if (light) {
    css += `  --footnoteBgColor: rgba(0, 0, 0, .03);\n`;
  } else {
    css += `  --footnoteBgColor: ${rgba(lighten(bgColor, 0.15), 0.5)};\n`;
  }
  css += `  --inputBgColor: ${inputBg};\n`;
  css += `  --focusColor: var(--themeColor);\n`;
  css += '\n';

  // ── Button styles ──
  if (light) {
    css += `  --buttonFontColor: var(--editorColor);\n`;
    css += `  --buttonBgColor: #ffffff;\n`;
    css += `  --buttonBorder: 1px solid #dcdfe6;\n`;
    css += `  --buttonShadow: none;\n`;
    css += `  --buttonFontColorHover: var(--buttonFontColor);\n`;
    css += `  --buttonBgColorHover: linear-gradient(#fafafa, #f5f5f5);\n`;
    css += `  --buttonBorderHover: var(--buttonBorder);\n`;
    css += `  --buttonFontColorActive: var(--buttonFontColor);\n`;
    css += `  --buttonBgColorActive: #f5f5f5;\n`;
    css += `  --buttonBorderActive: var(--buttonBorder);\n`;
    css += `  --buttonFocusBorder: 1px solid var(--themeColor);\n`;
  } else {
    const btnBg = lighten(bgColor, 0.15);
    const btnBgHover = lighten(bgColor, 0.2);
    const btnBgActive = darken(bgColor, 0.05);
    const btnBorderColor = darken(bgColor, 0.25);
    css += `  --buttonFontColor: ${rgba(textColor, 0.6)};\n`;
    css += `  --buttonBgColor: ${btnBg};\n`;
    css += `  --buttonBorder: 1px solid ${btnBorderColor};\n`;
    css += `  --buttonShadow: none;\n`;
    css += `  --buttonFontColorHover: var(--buttonFontColor);\n`;
    css += `  --buttonBgColorHover: ${btnBgHover};\n`;
    css += `  --buttonBorderHover: var(--buttonBorder);\n`;
    css += `  --buttonFontColorActive: var(--buttonFontColor);\n`;
    css += `  --buttonBgColorActive: ${btnBgActive};\n`;
    css += `  --buttonBorderActive: var(--buttonBorder);\n`;
    css += `  --buttonFocusBorder: 1px solid var(--themeColor);\n`;
  }
  css += '\n';

  // ── Primary button ──
  css += `  --buttonPrimaryFontColor: #ffffff;\n`;
  css += `  --buttonPrimaryBgColor: var(--themeColor);\n`;
  if (light) {
    css += `  --buttonPrimaryBorder: none;\n`;
    css += `  --buttonPrimaryShadow: 0 0 8px 0 rgba(0, 0, 0, .1);\n`;
  } else {
    css += `  --buttonPrimaryBorder: none;\n`;
    css += `  --buttonPrimaryShadow: none;\n`;
  }
  css += `  --buttonPrimaryFontColorHover: var(--buttonPrimaryFontColor);\n`;
  css += `  --buttonPrimaryBgColorHover: var(--buttonPrimaryBgColor);\n`;
  css += `  --buttonPrimaryBorderHover: var(--buttonPrimaryBorder);\n`;
  css += `  --buttonPrimaryFontColorActive: var(--buttonPrimaryFontColor);\n`;
  css += `  --buttonPrimaryBgColorActive: var(--buttonPrimaryBgColor);\n`;
  css += `  --buttonPrimaryBorderActive: var(--buttonPrimaryBorder);\n`;
  css += `  --buttonPrimaryFocusBorder: none;\n`;
  css += `  --buttonPrimaryFocusShadow: inset 0 0 0 1px rgba(${accentDarkRgb.r}, ${accentDarkRgb.g}, ${accentDarkRgb.b}, 0.5), 0 0 0 1px var(--themeColor);\n`;

  // table border
  css += `  --tableBorderColor: ${light ? '#e5e5e5' : lighten(bgColor, 0.08)};\n`;
  css += '\n';

  // ── Sidebar ──
  css += '  /*marktext*/\n';
  if (light) {
    css += `  --sideBarColor: ${rgba(textColor, 0.6)};\n`;
    css += `  --sideBarIconColor: var(--iconColor);\n`;
    css += `  --sideBarTitleColor: ${rgba(titleColor, 1)};\n`;
    css += `  --sideBarTextColor: ${rgba(textColor, 0.4)};\n`;
    css += `  --sideBarBgColor: ${sideBarBgLight};\n`;
    css += `  --sideBarItemHoverBgColor: ${rgba(textColor, 0.03)};\n`;
    css += `  --itemBgColor: ${rgba(darken(bgColor, 0.04), 0.6)};\n`;
  } else {
    css += `  --sideBarColor: ${rgba(textColor, 0.6)};\n`;
    css += `  --sideBarIconColor: var(--iconColor);\n`;
    css += `  --sideBarTitleColor: ${rgba(titleColor, 1)};\n`;
    css += `  --sideBarTextColor: ${rgba(textColor, 0.4)};\n`;
    css += `  --sideBarBgColor: ${sideBarBgDark};\n`;
    css += `  --sideBarItemHoverBgColor: rgba(255, 255, 255, .03);\n`;
    css += `  --itemBgColor: ${itemBg};\n`;
  }
  css += '\n';

  // ── Float / mask ──
  if (light) {
    css += `  --floatFontColor: ${rgba(textColor, 0.7)};\n`;
    css += `  --floatBgColor: ${floatBg};\n`;
    css += `  --floatHoverColor: ${rgba(textColor, 0.04)};\n`;
    css += `  --floatBorderColor: ${borderLight};\n`;
    css += `  --maskColor: rgba(232, 232, 232, .8);\n`;
  } else {
    css += `  --floatFontColor: ${rgba(textColor, 0.7)};\n`;
    css += `  --floatBgColor: ${floatBg};\n`;
    css += `  --floatHoverColor: rgba(255, 255, 255, .04);\n`;
    css += `  --floatBorderColor: rgba(0, 0, 0, .05);\n`;
    css += `  --floatShadow: rgba(0, 0, 0, 0.2);\n`;
    css += `  --maskColor: rgba(0, 0, 0, .7);\n`;
  }

  css += `  --editorAreaWidth: 750px;\n`;
  css += '}\n';

  // ── Extra rules after :root ──
  css += '\n';

  if (!light) {
    // Dark theme: scrollbar styling
    css += `::-webkit-scrollbar,\n`;
    css += `::-webkit-scrollbar-corner {\n`;
    css += `  background: var(--editorBgColor);\n`;
    css += `}\n`;
    css += `::-webkit-scrollbar:vertical {\n`;
    css += `  width: 10px;\n`;
    css += `}\n`;
    css += `::-webkit-scrollbar:vertical:hover {\n`;
    css += `  width: 12px;\n`;
    css += `}\n`;
    css += `::-webkit-scrollbar-thumb {\n`;
    css += `  background: ${scrollThumb};\n`;
    css += `}\n`;
    css += `::-webkit-scrollbar-thumb:hover {\n`;
    css += `  background: ${scrollThumbHover};\n`;
    css += `}\n`;
    css += '\n';

    // Float shadow
    css += `.ag-front-menu .submenu,\n`;
    css += `.ag-float-wrapper {\n`;
    css += `  box-shadow: 0 4px 8px 0 var(--floatShadow) !important;\n`;
    css += `}\n`;
    css += '\n';

    // Title bar
    css += `.title-bar .frameless-titlebar-button > div > svg {\n`;
    css += `  fill: #ffffff;\n`;
    css += `}\n`;
    css += `.title-bar .frameless-titlebar-minimize:hover,\n`;
    css += `.title-bar .frameless-titlebar-toggle:hover {\n`;
    css += `  background-color: rgba(255, 255, 255, .05);\n`;
    css += `}\n`;
    css += '\n';

    // Sidebar border
    css += `.side-bar {\n`;
    css += `  border-right: 1px solid ${tabBorder} !important;\n`;
    css += `}\n`;
    css += '\n';

    // Buttons: no shadow
    css += `.recent-files-projects a,\n`;
    css += `.open-project a {\n`;
    css += `  box-shadow: none !important;\n`;
    css += `}\n`;
    css += '\n';

    // Editor tabs
    css += `.editor-tabs {\n`;
    css += `  box-shadow: none !important;\n`;
    css += `}\n`;
    css += `.editor-tabs:after {\n`;
    css += `  position: absolute;\n`;
    css += `  content: '';\n`;
    css += `  border-bottom: 1px solid ${tabBorder};\n`;
    css += `  bottom: 0;\n`;
    css += `  left: 0;\n`;
    css += `  right: 0;\n`;
    css += `  z-index: 1;\n`;
    css += `}\n`;
    css += `.editor-tabs ul.tabs-container:after {\n`;
    css += `  position: absolute;\n`;
    css += `  content: '';\n`;
    css += `  border-bottom: 1px solid ${tabBorder};\n`;
    css += `  bottom: 0;\n`;
    css += `  left: 0;\n`;
    css += `  right: 0;\n`;
    css += `  z-index: 2;\n`;
    css += `}\n`;
    css += '\n';

    css += `.tabs-container > li,\n`;
    css += `.tabs-container > li.active {\n`;
    css += `  background: var(--editorBgColor) !important;\n`;
    css += `}\n`;
    css += '\n';

    css += `.open-project button,\n`;
    css += `.recent-files-projects button {\n`;
    css += `  box-shadow: none !important;\n`;
    css += `}\n`;
  } else {
    // Light theme: editor tabs
    css += `.editor-tabs {\n`;
    css += `  background: ${tabBgLight} !important;\n`;
    css += `  box-shadow: none !important;\n`;
    css += `}\n`;
    css += `.editor-tabs:after {\n`;
    css += `  position: absolute;\n`;
    css += `  content: '';\n`;
    css += `  border-bottom: 1px solid ${tabBorderLight};\n`;
    css += `  bottom: 0;\n`;
    css += `  left: 0;\n`;
    css += `  right: 0;\n`;
    css += `  z-index: 1;\n`;
    css += `}\n`;
    css += `.editor-tabs ul.tabs-container:after {\n`;
    css += `  position: absolute;\n`;
    css += `  content: '';\n`;
    css += `  border-bottom: 1px solid ${tabBorderLight};\n`;
    css += `  bottom: 0;\n`;
    css += `  left: 0;\n`;
    css += `  right: 0;\n`;
    css += `  z-index: 2;\n`;
    css += `}\n`;
    css += `.title-bar-editor-bg.tabs-visible {\n`;
    css += `  background: ${tabBgLight} !important;\n`;
    css += `}\n`;
    css += '\n';

    css += `.tabs-container > li {\n`;
    css += `  background: none !important;\n`;
    css += `}\n`;
    css += `.tabs-container > li.active {\n`;
    css += `  border: 1px solid ${tabBorderLight};\n`;
    css += `  border-top: none;\n`;
    css += `  border-bottom: none;\n`;
    css += `  background: var(--floatBgColor) !important;\n`;
    css += `}\n`;
    css += `.tabs-container > li.active:after {\n`;
    css += `  top: 0 !important;\n`;
    css += `  bottom: auto !important;\n`;
    css += `  background: var(--themeColor) !important;\n`;
    css += `}\n`;
  }

  css += '\n';
  css += '/* ------------------------------------ */\n';
  css += '\n';

  // Code block overrides
  css += `:not(pre) > code[class*="language-"],\n`;
  css += `pre:not(.CodeMirror-line),\n`;
  css += `pre[class*="language-"],\n`;
  css += `pre.ag-paragraph {\n`;
  css += `  background: var(--codeBlockBgColor) !important;\n`;
  css += `  border: none !important;\n`;
  css += `}\n`;

  if (!light) {
    css += `p:not(.ag-active)[data-role="hr"]::before {\n`;
    css += `  border-top: 2px dashed var(--editorColor10) !important;\n`;
    css += `  background: none !important;\n`;
    css += `}\n`;
    css += `figure.ag-active.ag-container-block > div.ag-container-preview {\n`;
    css += `  box-shadow: 0 3px 8px 0 var(--floatShadow) !important;\n`;
    css += `}\n`;
  }

  css += '\n';

  // Task list / paragraph styles (both light and dark)
  css += `li.ag-paragraph {\n`;
  css += `  color: var(--editorColor);\n`;
  css += `}\n`;
  css += '\n';

  css += `/*task list*/\n`;
  css += `li.ag-task-list-item {\n`;
  css += `  list-style-type: none;\n`;
  css += `  position: relative;\n`;
  css += `}\n`;
  css += `li.ag-task-list-item > input[type=checkbox] {\n`;
  css += `  position: absolute;\n`;
  css += `  cursor: pointer;\n`;
  css += `  width: 16px;\n`;
  css += `  height: 16px;\n`;
  css += `  top: .1em;\n`;
  css += `  transform: rotate(-90deg);\n`;
  css += `  margin: 0;\n`;
  css += `  left: -24px;\n`;
  css += `  transform-origin: center;\n`;
  css += `  transition: all .2s ease;\n`;
  css += `}\n`;
  css += `li.ag-task-list-item > input.ag-checkbox-checked {\n`;
  css += `  transform: rotate(0);\n`;
  css += `  opacity: ${light ? '.5' : '.6'};\n`;
  css += `}\n`;
  css += `li.ag-task-list-item > input[type=checkbox]::before {\n`;
  css += `  content: '';\n`;
  css += `  width: 16px;\n`;
  css += `  height: 16px;\n`;
  css += `  box-sizing: border-box;\n`;
  css += `  display: inline-block;\n`;
  css += `  border: 2px solid var(--editorColor);\n`;
  css += `  border-radius: 2px;\n`;
  css += `  background-color: var(--editorBgColor);\n`;
  css += `  position: absolute;\n`;
  css += `  top: 0;\n`;
  css += `  left: 0;\n`;
  css += `  transition: all .2s ease;\n`;
  css += `}\n`;
  css += `li.ag-task-list-item > input.ag-checkbox-checked::before {\n`;
  css += `  border: transparent;\n`;
  css += `  background-color: var(--editorColor);\n`;
  css += `}\n`;
  css += `li.ag-task-list-item > input::after {\n`;
  css += `  content: '';\n`;
  css += `  transform: rotate(-45deg) scale(0);\n`;
  css += `  width: 9px;\n`;
  css += `  height: 5px;\n`;
  css += `  border: 2px solid #fff;\n`;
  css += `  border-top: none;\n`;
  css += `  border-right: none;\n`;
  css += `  position: absolute;\n`;
  css += `  display: inline-block;\n`;
  css += `  top: 1px;\n`;
  css += `  left: 5px;\n`;
  css += `  transition: all .2s ease;\n`;
  css += `}\n`;
  css += `li.ag-task-list-item > input.ag-checkbox-checked::after {\n`;
  css += `  transform: rotate(-45deg) scale(1);\n`;
  css += `}\n`;
  css += '\n';

  // Horizontal rule for light themes
  if (light) {
    css += `/*horizontal line*/\n`;
    css += `p:not(.ag-active)[data-role="hr"]::before {\n`;
    css += `  content: '';\n`;
    css += `  position: absolute;\n`;
    css += `  width: 100%;\n`;
    css += `  display: block;\n`;
    css += `  left: 50%;\n`;
    css += `  top: 50%;\n`;
    css += `  height: 2px;\n`;
    css += `  box-sizing: border-box;\n`;
    css += `  border: none;\n`;
    css += `  border-bottom: 2px dashed var(--editorColor50);\n`;
    css += `  transform: translateX(-50%) translateY(-50%);\n`;
    css += `}\n`;
  }

  return css;
}

// ── Main ───────────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'src', 'renderer', 'assets', 'themes');

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let generated = 0;
for (const [id, bg, title, text, accent] of themes) {
  const css = generateTheme(id, bg, title, text, accent);
  const filename = `${id}.theme.css`;
  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, css, 'utf8');
  const mode = isLight(bg) ? 'light' : 'dark';
  console.log(`  [${mode}] ${filename}`);
  generated++;
}

console.log(`\nGenerated ${generated} theme files in ${outDir}`);
