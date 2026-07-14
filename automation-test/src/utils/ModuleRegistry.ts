import * as registry from './ModuleRegistry.js';

export interface TestModule {
  id: string;
  name: string;
  description: string;
  type: string[];
  specs: string[];
  tags: string[];
  requiresAuth: boolean;
  enabled: boolean;
}

export const loadTestModules = registry.loadTestModules as () => TestModule[];
export const findTestModule = registry.findTestModule as (id: string) => TestModule | undefined;
export const buildPlaywrightArgsForModule = registry.buildPlaywrightArgsForModule as (id: string) => string[];
