// Type declarations for vis-network 7.x and vis-data 6.x
// These older versions don't include TypeScript declarations

declare module "vis-network" {
  export interface Options {
    nodes?: NodeOptions;
    edges?: EdgeOptions;
    layout?: LayoutOptions;
    physics?: PhysicsOptions | boolean;
    interaction?: InteractionOptions;
  }

  export interface NodeOptions {
    shape?: string;
    size?: number;
    font?: FontOptions;
    color?: NodeColorOptions;
    borderWidth?: number;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
  }

  export interface FontOptions {
    size?: number;
    face?: string;
    multi?: string | boolean;
  }

  export interface NodeColorOptions {
    background?: string;
    border?: string;
    highlight?: {
      background?: string;
      border?: string;
    };
  }

  export interface EdgeOptions {
    arrows?: {
      to?: { enabled?: boolean; scaleFactor?: number };
    };
    smooth?: boolean | {
      enabled?: boolean;
      type?: string;
      forceDirection?: string | boolean;
      roundness?: number;
    };
    color?: string | { color?: string; inherit?: boolean };
    width?: number;
  }

  export interface LayoutOptions {
    hierarchical?: boolean | HierarchicalOptions;
  }

  export interface HierarchicalOptions {
    enabled?: boolean;
    direction?: string;
    sortMethod?: string;
    levelSeparation?: number;
    nodeSpacing?: number;
  }

  export interface PhysicsOptions {
    enabled?: boolean;
    stabilization?: boolean | { iterations?: number };
  }

  export interface InteractionOptions {
    dragNodes?: boolean;
    dragView?: boolean;
    zoomView?: boolean;
    hover?: boolean;
  }
}

declare module "vis-network/standalone" {
  export interface DataSetOptions<T> {
    filter?: (item: T) => boolean;
  }

  export class DataSet<T extends { id: string | number }> {
    constructor(data?: T[]);
    get(): T[];
    get(id: string | number): T | null;
    get(options: DataSetOptions<T>): T[];
    add(data: T | T[]): void;
    update(data: Partial<T> | Partial<T>[]): void;
    remove(id: string | number): void;
    getIds(): (string | number)[];
    forEach(callback: (item: T) => void): void;
  }

  export interface Position {
    x: number;
    y: number;
  }

  export interface BoundingBox {
    top: number;
    left: number;
    right: number;
    bottom: number;
  }

  export interface MoveToOptions {
    position?: Position;
    scale?: number;
    animation?: boolean | { duration?: number; easingFunction?: string };
  }

  export class Network {
    constructor(
      container: HTMLElement,
      data: { nodes: DataSet<unknown>; edges: DataSet<unknown> },
      options?: import("vis-network").Options
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, callback: (params: any) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    off(event: string, callback: (params: any) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    once(event: string, callback: (params: any) => void): void;

    getPositions(nodeIds?: (string | number)[]): Record<string, Position>;
    getBoundingBox(nodeId: string | number): BoundingBox;
    getNodeAt(position: Position): string | number | undefined;

    getViewPosition(): Position;
    getScale(): number;
    moveTo(options: MoveToOptions): void;

    canvasToDOM(position: Position): Position;
    DOMtoCanvas(position: Position): Position;

    destroy(): void;
  }
}
