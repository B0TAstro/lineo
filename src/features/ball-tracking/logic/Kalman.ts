type Matrix = number[][];

const identity = (n: number, scale = 1): Matrix =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? scale : 0)));

const multiply = (a: Matrix, b: Matrix): Matrix =>
  a.map((row) =>
    (b[0] ?? []).map((_, j) => row.reduce((sum, v, k) => sum + v * (b[k]?.[j] ?? 0), 0)),
  );

const transpose = (a: Matrix): Matrix => (a[0] ?? []).map((_, j) => a.map((row) => row[j] ?? 0));

const add = (a: Matrix, b: Matrix): Matrix =>
  a.map((row, i) => row.map((v, j) => v + (b[i]?.[j] ?? 0)));

const at = (m: Matrix, i: number, j: number) => m[i]?.[j] ?? 0;

/**
 * Constant-velocity Kalman filter on [x, y, vx, vy], written out instead of cv2.KalmanFilter (POC's
 * tracking.py): positions in pixels, velocities in pixels per second, the real time step at every
 * frame. Only x and y are measured.
 */
export class Kalman {
  /** State [x, y, vx, vy], as a column. */
  private state: Matrix;
  private covariance = identity(4);
  private readonly processNoise: Matrix;
  private readonly measurementNoise: Matrix;

  constructor(x: number, y: number, processNoise: number, measurementNoise: number) {
    // Starts still, like the POC: the first frames teach it the speed.
    this.state = [[x], [y], [0], [0]];
    this.processNoise = identity(4, processNoise);
    this.measurementNoise = identity(2, measurementNoise);
  }

  get position() {
    return { x: at(this.state, 0, 0), y: at(this.state, 1, 0) };
  }

  /** Moves the state on by `dt` seconds and returns where the ball should be. */
  predict(dt: number) {
    const transition = [
      [1, 0, dt, 0],
      [0, 1, 0, dt],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ];
    this.state = multiply(transition, this.state);
    this.covariance = add(
      multiply(multiply(transition, this.covariance), transpose(transition)),
      this.processNoise,
    );
    return this.position;
  }

  /** Blends in a measured position, weighted by how much the filter trusts each side. */
  correct(x: number, y: number) {
    const p = this.covariance;
    // H picks x and y, so H P Hᵀ is the top-left 2×2 block of P, and P Hᵀ its first two columns.
    const s00 = at(p, 0, 0) + at(this.measurementNoise, 0, 0);
    const s01 = at(p, 0, 1);
    const s10 = at(p, 1, 0);
    const s11 = at(p, 1, 1) + at(this.measurementNoise, 1, 1);
    const det = s00 * s11 - s01 * s10;
    if (det === 0) return;
    const inverse = [
      [s11 / det, -s01 / det],
      [-s10 / det, s00 / det],
    ];
    const gain = multiply(
      p.map((row) => [row[0] ?? 0, row[1] ?? 0]),
      inverse,
    );
    const innovation = [[x - at(this.state, 0, 0)], [y - at(this.state, 1, 0)]];
    this.state = add(this.state, multiply(gain, innovation));
    // P = (I - K H) P, with K H a 4×4 holding K in its first two columns.
    const kh = gain.map((row) => [row[0] ?? 0, row[1] ?? 0, 0, 0]);
    this.covariance = multiply(
      add(
        identity(4),
        kh.map((row) => row.map((v) => -v)),
      ),
      p,
    );
  }
}
