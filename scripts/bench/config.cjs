// Dev bench: the ball settings the app uses on a court (logic/ballConfigFor.ts), as JSON.
// detect.py reads them from here, so the bench never has its own copy of a setting.
//
//   node scripts/bench/config.cjs <place>,<surface>
const { knownCourts, toCourt, withLogic } = require('./logic.cjs');

const [text] = process.argv.slice(2);
withLogic((logic) => {
  const court = text ? toCourt(text, logic) : null;
  if (!court) {
    console.error(`usage: node scripts/bench/config.cjs ${knownCourts(logic)}`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(logic('ballConfigFor').ballConfigFor(court)));
});
