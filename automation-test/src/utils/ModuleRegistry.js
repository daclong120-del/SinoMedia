const fs = require('fs');
const path = require('path');

const automationRoot = path.resolve(__dirname, '../..');
const testsRoot = path.join(automationRoot, 'tests');
const ignoredDirs = new Set(['_setup', 'explore', 'node_modules']);

function asStringArray(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}

function normalizeModuleConfig(config) {
  return {
    id: config.id,
    name: config.name,
    description: config.description || '',
    type: asStringArray(config.type),
    specs: asStringArray(config.specs),
    tags: asStringArray(config.tags),
    requiresAuth: config.requiresAuth === true,
    enabled: config.enabled !== false,
    parallelSafe: config.parallelSafe !== false,
    recommendedWorkers: typeof config.recommendedWorkers === 'number' ? config.recommendedWorkers : null,
    maxWorkers: typeof config.maxWorkers === 'number' ? config.maxWorkers : null,
    requiresEnv: asStringArray(config.requiresEnv),
    defaultRun: config.defaultRun !== false
  };
}

function isPathInside(parentDir, childPath) {
  const relativePath = path.relative(parentDir, childPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function validateModuleConfig(moduleConfig, moduleFilePath) {
  if (!moduleConfig.id) {
    console.warn(`[ModuleRegistry] Skip ${moduleFilePath}: missing "id"`);
    return false;
  }

  if (!moduleConfig.name) {
    console.warn(`[ModuleRegistry] Skip ${moduleFilePath}: missing "name"`);
    return false;
  }

  if (moduleConfig.specs.length === 0) {
    console.warn(`[ModuleRegistry] Skip ${moduleFilePath}: "specs" must be a non-empty array`);
    return false;
  }

  for (const spec of moduleConfig.specs) {
    const specPath = path.resolve(automationRoot, spec);
    if (!isPathInside(automationRoot, specPath)) {
      console.warn(`[ModuleRegistry] Skip ${moduleFilePath}: spec path escapes automation-test root: ${spec}`);
      return false;
    }

    if (!fs.existsSync(specPath)) {
      console.warn(`[ModuleRegistry] Skip ${moduleFilePath}: spec file does not exist: ${specPath}`);
      return false;
    }
  }

  return true;
}

function scanDirForModules(dir, moduleList = []) {
  if (!fs.existsSync(dir)) return moduleList;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        scanDirForModules(fullPath, moduleList);
      }
      continue;
    }

    if (entry.name !== 'module.json') continue;

    try {
      const rawData = fs.readFileSync(fullPath, 'utf8');
      const moduleConfig = normalizeModuleConfig(JSON.parse(rawData));

      if (moduleConfig.enabled && validateModuleConfig(moduleConfig, fullPath)) {
        moduleList.push(moduleConfig);
      }
    } catch (err) {
      console.error(`[ModuleRegistry] Failed to parse ${fullPath}:`, err);
    }
  }

  return moduleList;
}

function loadTestModules() {
  return scanDirForModules(testsRoot).sort((a, b) => a.id.localeCompare(b.id));
}

function findTestModule(id) {
  return loadTestModules().find(moduleConfig => moduleConfig.id === id);
}

function buildPlaywrightArgsForModule(id) {
  const moduleConfig = findTestModule(id);
  if (!moduleConfig) return [];
  const args = [...moduleConfig.specs];
  if (!moduleConfig.requiresAuth) {
    args.push('--no-deps');
  }
  return args;
}

module.exports = {
  loadTestModules,
  findTestModule,
  buildPlaywrightArgsForModule
};
