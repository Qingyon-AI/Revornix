// electron-builder afterPack hook.
//
// v1 ships unsigned, but a macOS (especially Apple Silicon) app still needs a
// PROPER ad-hoc signature or it is treated as "damaged" once quarantined (i.e.
// downloaded). `identity: null` makes electron-builder SKIP signing entirely,
// which leaves the .app bundle without a valid CodeResources seal. This hook
// re-signs the whole bundle with the ad-hoc identity ("-") so `codesign
// --verify --strict` passes and the app opens via right-click → Open.
//
// When real signing is configured (identity set + APPLE_ID present), this hook
// is a no-op so it never clobbers a Developer ID signature.

const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

module.exports = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.APPLE_ID || process.env.CSC_LINK) return; // real signing path owns it

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = join(context.appOutDir, appName);

  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  console.log(`ad-hoc signed ${appName}`);
};
