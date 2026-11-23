// Dev bench: the app's ball tracking (src/features/ball-tracking/logic, as it is in the repo) on
// what scripts/bench/detect.py found in a video, with the settings of the court detect.py was
// run for.
//
//   node scripts/bench/track.cjs <candidates.json> <track.json>
//
// Prints how many frames show the ball, and writes the ball of each frame for render.py.
const fs = require('fs');

const { toCourt, withLogic } = require('./logic.cjs');

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: node scripts/bench/track.cjs <candidates.json> <track.json>');
  process.exit(1);
}

const { width, height, court, frames } = JSON.parse(fs.readFileSync(input, 'utf8'));
const tracked = withLogic((logic) => {
  const known = court ? toCourt(court, logic) : null;
  if (!known) return null;
  const config = logic('ballConfigFor').ballConfigFor(known);
  const started = process.hrtime.bigint();
  const balls = logic('trackClip').trackClip(frames, { width, height }, config);
  return { balls, ms: Number(process.hrtime.bigint() - started) / 1e6 };
});
if (!tracked) {
  console.error(`${input} is for no court the app knows: run scripts/bench/detect.py again`);
  process.exit(1);
}
const { balls, ms } = tracked;

const ballAt = new Map(balls.map((ball) => [ball.t, ball]));
fs.writeFileSync(
  output,
  JSON.stringify({
    width,
    height,
    court,
    frames: frames.map((frame) => ({ ...frame, ball: ballAt.get(frame.t) ?? null })),
  }),
);
const detected = balls.filter((ball) => ball.state === 'detected').length;
console.log(
  `${court}: ${frames.length} frames, ball on ${balls.length} (${detected} detected, ` +
    `${balls.length - detected} predicted), path worked out in ${ms.toFixed(0)} ms`,
);
