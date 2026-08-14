import {
  AlignmentType,
  BorderStyle,
  LevelFormat,
  LineRuleType,
  PageOrientation,
  ShadingType,
  TableLayoutType,
  VerticalAlignTable,
  WidthType,
} from "docx";

export const PAGE_WIDTH_TWIPS = 11907;
export const PAGE_HEIGHT_TWIPS = 16840;
export const PAGE_MARGIN_TWIPS = 720;
export const PAGE_ORIENTATION = PageOrientation.PORTRAIT;

export const BODY_FONT = "Times New Roman";
export const BODY_SIZE_HALF_POINTS = 24; // 12pt
export const TITLE_SIZE_HALF_POINTS = 28; // 14pt
export const HEADING_SIZE_HALF_POINTS = 24; // 12pt

export const LINE_SPACING = 360;
export const LINE_RULE = LineRuleType.AUTO;
export const AFTER_SPACING = 0;

export const HEADING_SHADING = {
  fill: "CAEDFB",
  color: "auto",
  type: ShadingType.CLEAR,
};

export const CELL_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "000000",
} as const;

export const TABLE_BORDERS = {
  top: CELL_BORDER,
  left: CELL_BORDER,
  bottom: CELL_BORDER,
  right: CELL_BORDER,
  insideHorizontal: CELL_BORDER,
  insideVertical: CELL_BORDER,
};

export const HEADER_GRID = [1809, 8789];
export const SECTION1_GRID = [813, 1590, 3167, 2614];
export const SECTION2_GRID = [514, 2277, 3021, 4820];

export const LOGO_WIDTH_PX = 86;
export const LOGO_HEIGHT_PX = 85;

export const PHOTO_LANDSCAPE_WIDTH_PX = 453;
export const PHOTO_PORTRAIT_WIDTH_PX = 265;

export const SECTION_HEADING_LEVEL = {
  level: 0,
  format: LevelFormat.DECIMAL,
  text: "%1.",
  alignment: AlignmentType.START,
  start: 1,
};

export const LIST_LEVEL = {
  level: 0,
  format: LevelFormat.LOWER_LETTER,
  text: "%1.",
  alignment: AlignmentType.START,
  start: 1,
  style: {
    paragraph: {
      indent: { left: 852, hanging: 426 },
    },
  },
};

export const TABLE_ALIGNMENT = AlignmentType.START;
export const TABLE_WIDTH_TYPE = WidthType.DXA;
export const TABLE_LAYOUT = TableLayoutType.AUTOFIT;
export const TABLE_VERTICAL_ALIGN = VerticalAlignTable.CENTER;