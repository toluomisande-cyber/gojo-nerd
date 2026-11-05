// Ambient declarations for IDE / TypeScript checking when Next/React/Node types are not installed locally

declare var process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};

declare class Buffer {
  static from(data: any, encoding?: string): Buffer;
  static concat(list: any[]): Buffer;
  static isBuffer(obj: any): boolean;
  length: number;
  toString(encoding?: string): string;
  slice(start?: number, end?: number): Buffer;
  indexOf(value: string | number | Buffer, byteOffset?: number): number;
  [index: number]: number;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module "react" {
  export function useState<T>(initial: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void];
  export function useEffect(fn: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initial: T): { current: T };
  export type ReactNode = any;
  export type ChangeEvent<T = any> = { target: T & { files?: FileList | null; value: string } };
  export type FormEvent<T = any> = { preventDefault(): void; currentTarget: T };
  const React: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useRef: typeof useRef;
    ReactNode: any;
    ChangeEvent: any;
    FormEvent: any;
    createElement: (...args: any[]) => any;
    Fragment: any;
  };
  export default React;
}

declare module "next/server" {
  export class NextRequest extends Request {
    nextUrl: URL;
  }
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
  }
}

declare module "pdf-parse" {
  const pdfParse: any;
  export const PDFParse: any;
  export default pdfParse;
}

