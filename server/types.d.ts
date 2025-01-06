declare module 'xlsx-populate' {
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
    style(style: any): Cell;
  }

  interface Range {
    merged(merged: boolean): Range;
    style(style: any): Range;
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
  class PDFDocument {
    constructor(options?: any);
    on(event: string, callback: (chunk: Buffer) => void): void;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, options?: any): this;
    moveDown(): this;
    end(): void;
  }
  export = PDFDocument;
}
