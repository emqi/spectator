import { normalize, strings } from '@angular-devkit/core';
import {
  apply,
  chain,
  externalSchematic,
  mergeWith,
  move,
  template,
  url,
  MergeStrategy,
  Rule,
  SchematicContext,
  Tree,
  noop,
} from '@angular-devkit/schematics';
import { buildDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import { parseName } from '@schematics/angular/utility/parse-name';

import { ComponentOptions, DirectiveOptions, PipeOptions, ServiceOptions, UnitTestRunner } from './schema';

export function spectatorComponentSchematic(options: ComponentOptions): Rule {
  return chain([
    externalSchematic('@schematics/angular', 'component', {
      ...omit(options, ['jest', 'withHost', 'withCustomHost', 'unitTestRunner']),
      skipTests: true,
    }),
    async (tree: Tree, _context: SchematicContext): Promise<Rule> => {
      if (options.skipTests) {
        return noop;
      }

      await _ensurePath(tree, options);
      const movePath = options.flat ? (options.path as string) : normalize(options.path + '/' + strings.dasherize(options.name) || '');

      const specTemplateRule = apply(
        url(`./files/${options.withHost ? 'component-host' : options.withCustomHost ? 'component-custom-host' : 'component'}`),
        [
          template({
            ...strings,
            ...options,
            secondaryEntryPoint: getSecondaryEntryPoint(options),
          }),
          move(movePath),
        ],
      );

      return mergeWith(specTemplateRule, MergeStrategy.Default);
    },
  ]);
}

export function spectatorServiceSchematic(options: ServiceOptions): Rule {
  return chain([
    externalSchematic('@schematics/angular', 'service', {
      ...omit(options, ['jest', 'isDataService', 'unitTestRunner']),
      skipTests: true,
    }),
    async (tree: Tree, _context: SchematicContext): Promise<Rule> => {
      if (options.skipTests) {
        return noop;
      }

      await _ensurePath(tree, options);
      const movePath = normalize(options.path || '');
      const specTemplateRule = apply(url(`./files/${options.isDataService ? 'data-service' : `service`}`), [
        template({
          ...strings,
          ...options,
          secondaryEntryPoint: getSecondaryEntryPoint(options),
        }),
        move(movePath),
      ]);

      return mergeWith(specTemplateRule, MergeStrategy.Default);
    },
  ]);
}

export function spectatorDirectiveSchematic(options: DirectiveOptions): Rule {
  return chain([
    externalSchematic('@schematics/angular', 'directive', {
      ...omit(options, ['jest', 'unitTestRunner']),
      skipTests: true,
    }),
    async (tree: Tree, _context: SchematicContext): Promise<Rule> => {
      if (options.skipTests) {
        return noop;
      }

      await _ensurePath(tree, options);
      const movePath = normalize(options.path || '');
      const specTemplateRule = apply(url(`./files/directive`), [
        template({
          ...strings,
          ...options,
          secondaryEntryPoint: getSecondaryEntryPoint(options),
        }),
        move(movePath),
      ]);

      return mergeWith(specTemplateRule, MergeStrategy.Default);
    },
  ]);
}

export function spectatorPipeSchematic(options: PipeOptions): Rule {
  return chain([
    externalSchematic('@schematics/angular', 'pipe', {
      ...omit(options, ['jest', 'unitTestRunner']),
      skipTests: true,
    }),
    async (tree: Tree, _context: SchematicContext): Promise<Rule> => {
      if (options.skipTests) {
        return noop;
      }

      await _ensurePath(tree, options);
      const movePath = normalize(options.path || '');
      const specTemplateRule = apply(url(`./files/pipe`), [
        template({
          ...strings,
          ...options,
          secondaryEntryPoint: getSecondaryEntryPoint(options),
        }),
        move(movePath),
      ]);

      return mergeWith(specTemplateRule, MergeStrategy.Default);
    },
  ]);
}

async function _ensurePath(tree: Tree, options: any): Promise<void> {
  const workspace = await getWorkspace(tree);

  if (!options.project) {
    options.project = workspace.projects.keys().next().value;
  }

  const project = workspace.projects.get(options.project as string);

  if (options.path === undefined && project) {
    options.path = buildDefaultPath(project);
  }

  const parsedPath = parseName(options.path as string, options.name);
  options.name = parsedPath.name;
  options.path = parsedPath.path;
}

function omit<T extends Record<PropertyKey, any>>(original: T, keys: (keyof T)[]): any {
  return Object.keys(original)
    .filter((key) => !keys.includes(key))
    .reduce((obj: Record<PropertyKey, any>, key) => {
      obj[key] = original[key];

      return obj;
    }, {});
}

function getSecondaryEntryPoint(options: { jest?: boolean; unitTestRunner: UnitTestRunner }): string | null {
  const secondaryEntryPoints: Record<UnitTestRunner, string | null> = {
    jest: 'jest',
    vitest: 'vitest',
    jasmine: null,
  };
  if (options.jest) {
    console.warn('The `jest` option is deprecated and will be removed in the future. Use `unitTestRunner` instead.');
    return secondaryEntryPoints.jest;
  }
  return secondaryEntryPoints[options.unitTestRunner];
}
