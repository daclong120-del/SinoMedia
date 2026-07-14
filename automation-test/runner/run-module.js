const { spawn } = require('child_process');
const path = require('path');
const {
  buildPlaywrightArgsForModule,
  findTestModule,
  loadTestModules
} = require('../src/utils/ModuleRegistry');

const cliArgs = process.argv.slice(2);
const moduleId = cliArgs[0];
const extraArgs = cliArgs.slice(1);
const passthroughArgs = extraArgs[0] === '--' ? extraArgs.slice(1) : extraArgs;

if (!moduleId) {
  const modules = loadTestModules();
  console.error('Error: missing module id. Example: npm run test:module -- roles');
  console.error(`Available modules: ${modules.map(moduleConfig => moduleConfig.id).join(', ') || '(none)'}`);
  process.exit(1);
}

const moduleConfig = findTestModule(moduleId);
if (!moduleConfig) {
  console.error(`Error: module "${moduleId}" was not found or is disabled.`);
  process.exit(1);
}

const playwrightCli = require.resolve('@playwright/test/cli');
const nodeBin = process.execPath;
const args = [
  playwrightCli,
  'test',
  ...buildPlaywrightArgsForModule(moduleId),
  ...passthroughArgs
];

console.log('==================================================');
console.log(`Running module: ${moduleConfig.name} (${moduleConfig.id})`);
console.log(`Description: ${moduleConfig.description}`);
console.log(`Spec files: ${moduleConfig.specs.join(', ')}`);
if (passthroughArgs.length > 0) {
  console.log(`Extra args: ${passthroughArgs.join(' ')}`);
}
console.log(`Command: ${nodeBin} ${args.join(' ')}`);
console.log('==================================================');

const playwrightProcess = spawn(nodeBin, args, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit'
});

playwrightProcess.on('error', error => {
  console.error(`Failed to start Playwright: ${error.message}`);
  process.exit(1);
});

playwrightProcess.on('close', code => {
  console.log('==================================================');
  console.log(`Module "${moduleConfig.id}" finished with exit code: ${code}`);
  console.log('==================================================');
  process.exit(code);
});
