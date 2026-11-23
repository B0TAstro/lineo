// Dev bench: the app's ball tracking logic (src/features/ball-tracking/logic, as it is in the
// repo). It is pure TypeScript: compiled on the fly, it runs here as it runs on the phone.
const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');

/**
 * Calls `run` with a loader for the files of logic/, and returns what it returns:
 *   withLogic((logic) => logic('trackClip').trackClip(...))
 */
exports.withLogic = function withLogic(run) {
  const logic = path.join(path.dirname(process.argv[1]), '../../src/features/ball-tracking/logic');
  const build = fs.mkdtempSync(path.join(os.tmpdir(), 'temoin-bench-'));
  try {
    for (const file of fs.readdirSync(logic)) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
      const { outputText } = ts.transpileModule(fs.readFileSync(path.join(logic, file), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      });
      fs.writeFileSync(path.join(build, file.replace(/\.ts$/, '.js')), outputText);
    }
    return run((name) => require(path.join(build, `${name}.js`)));
  } finally {
    fs.rmSync(build, { recursive: true });
  }
};

/** The court a bench run is for, from "place,surface"; null if the app knows no such court. */
exports.toCourt = function toCourt(text, logic) {
  const [place, surface] = text.split(',');
  const { COURT_SETTINGS } = logic('ballConfigFor');
  if (!(place in COURT_SETTINGS.place) || !(surface in COURT_SETTINGS.surface)) return null;
  return { place, surface };
};

/** The courts the app knows, for a usage message. */
exports.knownCourts = function knownCourts(logic) {
  const { COURT_SETTINGS } = logic('ballConfigFor');
  const places = Object.keys(COURT_SETTINGS.place).join(' | ');
  const surfaces = Object.keys(COURT_SETTINGS.surface).join(' | ');
  return `<${places}>,<${surfaces}>`;
};
