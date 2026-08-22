import type { Column } from "../../types";

/**
 * glide-data-grid theme mapped to EchoSheets AMOLED tokens.
 */
export function makeGridTheme(accent = "#52a9ff") {
  return {
    accentColor: accent,
    accentLight: "rgba(82, 169, 255, 0.20)",

    textDark: "#f2f2f3",
    textMedium: "#a0a0ab",
    textLight: "#63636e",
    textHeader: "#a0a0ab",
    textHeaderSelected: "#f2f2f3",

    bgIconHeader: "#63636e",
    fgIconHeader: "#a0a0ab",

    bgCell: "#000000",
    bgCellHorizontalBorder: "#141417",
    bgCellVerticalBorder: "#141417",
    bgHeader: "#09090b",
    bgHeaderHasFocus: "#101013",
    bgHeaderHovered: "#101013",
    bgSearchResult: "rgba(82, 169, 255, 0.14)",
    bgBubble: "#101013",
    bgSelectionCell: "rgba(82, 169, 255, 0.10)",
    bgShadow: "rgba(0, 0, 0, 0.64)",

    borderColor: "#1c1c21",
    horizontalBorderColor: "#1c1c21",
    verticalBorderColor: "#1c1c21",

    headerFontStyle: "600 11px 'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    baseFontStyle: "400 12.5px 'JetBrains Mono', ui-monospace, Consolas, monospace",
    fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    editorFontSize: "13px",
    lineHeight: 1.35,

    cellHorizontalPadding: 10,
    cellVerticalPadding: 4,
    headerHeight: 34,
    rowHeight: 30,
    headerIconSize: 16,
  };
}

export const stagedThemeOverride = {
  bgCell: "rgba(61, 214, 140, 0.10)",
  textDark: "#7ee2ac",
};

export const excludedStagedThemeOverride = {
  bgCell: "rgba(255, 202, 22, 0.08)",
  textDark: "#ffca16",
};

export const failedThemeOverride = {
  bgCell: "rgba(229, 72, 77, 0.12)",
  textDark: "#ff9592",
};

export const pendingThemeOverride = {
  bgCell: "rgba(82, 169, 255, 0.06)",
  textDark: "#404049",
};

export function columnWidth(col: Column): number {
  let max = col.name.length;
  const step = Math.max(1, Math.floor(col.values.length / 200));
  for (let i = 0; i < col.values.length; i += step) {
    const v = col.values[i];
    if (v && v.length > max) max = Math.min(v.length, 60);
  }
  return Math.min(Math.max(max * 8 + 44, 110), 420);
}
