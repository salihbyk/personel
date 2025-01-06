declare module 'xlsx-populate' {
  interface Style {
    bold?: boolean;
    fontSize?: number;
    horizontalAlignment?: string;
    fontColor?: string;
    fill?: string;
    border?: boolean;
  }

  interface Workbook {
    sheet(index: number): Sheet;
    outputAsync(): Promise<Buffer>;
  }

  interface Sheet {
    cell(ref: string): Cell;
    range(range: string): Range;
    column(col: string): Column;
  }

  interface Cell {
    value(value?: any): Cell;
    formula(formula: string): Cell;
    style(style: Style): Cell;
  }

  interface Range {
    merged(merged: boolean): Range;
    style(style: Style): Range;
    value(value: any): Range;
  }

  interface Column {
    width(width: number): void;
  }

  const XlsxPopulate: {
    fromBlankAsync(): Promise<Workbook>;
  };

  export = XlsxPopulate;
}

declare module 'pdfkit' {
  interface PDFDocumentOptions {
    size?: string;
    margin?: number;
    info?: {
      Title?: string;
      Author?: string;
    };
  }

  interface PDFDocument {
    constructor(options?: PDFDocumentOptions);
    on(event: string, callback: (chunk: Buffer) => void): void;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, x?: number, y?: number, options?: any): this;
    moveDown(lines?: number): this;
    end(): void;
    y: number;
  }

  const PDFDocument: {
    new(options?: PDFDocumentOptions): PDFDocument;
  };

  export = PDFDocument;
}