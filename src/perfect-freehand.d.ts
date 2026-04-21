declare module "perfect-freehand" {
  export interface StrokeOptions {
    size?: number;
    thinning?: number;
    smoothing?: number;
    streamline?: number;
    easing?: (t: number) => number;
    simulatePressure?: boolean;
    start?: {
      taper?: number;
      cap?: boolean;
    };
    end?: {
      taper?: number;
      cap?: boolean;
    };
  }

  export default function getStroke(
    points: Array<[number, number, number?]>,
    options?: StrokeOptions
  ): number[][];
}
