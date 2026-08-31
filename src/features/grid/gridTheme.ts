import type { Column } from "../../types";

/**
 * glide-data-grid theme mapped to EchoSheets AMOLED tokens,
 * styled to read like Google Sheets' dark-mode chrome:
 *   — near-black cells with hairline gridlines
 *   — slightly-lighter gray row/column header gutters
 *   — blue accent for the active cell + selection
 */
export function makeGridTheme(accent = "#52a9ff") {
  return {
    accentColor: accent,
    accentFg: "#ffffff",
    accentLight: "rgba(82, 169, 255, 0.16)",

    textDark: "#f2f2f3",
    textMedium: "#a0a0ab",
    textLight: "#63636e",
    textHeader: "#9aa0a6",
    textHeaderSelected: "#f2f2f3",

    bgIconHeader: "#63636e",
    fgIconHeader: "#9aa0a6",
    bgAccentLight: undefined as string | undefined,

    bgCell: "#000000",
    bgCellMedium: "#09090b",
    bgHeader: "#111114",
    bgHeaderHasFocus: "#16161a",
    bgHeaderHovered: "#16161a",
    bgBubble: "#101013",
    bgSearchResult: "rgba(82, 169, 255, 0.14)",
    bgShadow: "rgba(0, 0, 0, 0.64)",

    borderColor: "#1d1d22",
    horizontalBorderColor: "#1d1d22",
    verticalBorderColor: "#1d1d22",
    headerBottomBorderColor: "#26262c",

    drilldownBorder: accent,
    linkColor: "#52a9ff",
    resizeIndicatorColor: accent,

    headerFontStyle: "500 11px 'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    baseFontStyle: "400 12.5px 'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    markerFontStyle: "400 11px 'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    fontFamily: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
    editorFontSize: "13px",
    lineHeight: 1.35,

    cellHorizontalPadding: 10,
    cellVerticalPadding: 4,
    headerHeight: 24,
    rowHeight: 26,
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
