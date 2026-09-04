import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep
} from 'node:path';
import ts from 'typescript';
import { discoverHtmlEntries } from './runtime-entrypoints.mjs';
import {
  STRUCTURAL_GRAPH_VERSION,
  assertStructuralGraphDocument,
  validateStructuralGraphDocument
} from './structural-graph-schema.mjs';

export const TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION = 2;
export const STRUCTURAL_CACHE_VERSION = 1;

export class StructuralGraphRecoveryRequiredError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'StructuralGraphRecoveryRequiredError';
    this.code = 'STRUCTURAL_GRAPH_RECOVERY_REQUIRED';
    this.reason = reason;
  }
}

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.vscode',
  'node_modules',
  'dist',
  'out',
  'build',
  'coverage'
]);
const HTTP_DECORATORS = new Map([
  ['Get', 'GET'],
  ['Post', 'POST'],
  ['Put', 'PUT'],
  ['Patch', 'PATCH'],
  ['Delete', 'DELETE'],
  ['Options', 'OPTIONS'],
  ['Head', 'HEAD'],
  ['All', 'ALL']
]);

/** TypeScript/JavaScript language adapter retained behind a small interface. */
export class TypeScriptStructuralAdapter {
  id = 'typescript-compiler-api';
  extensions = Object.freeze([...SUPPORTED_EXTENSIONS]);

  /** @param {StructuralExtractionOptions} options */
  extract(options) {
    return extractWithTypeScript(options);
  }
}

/** @param {StructuralExtractionOptions} options */
export function extractStructuralGraph(options) {
  return new TypeScriptStructuralAdapter().extract(options);
}

/**
 * Validate and atomically write a structural graph.
 *
 * @param {unknown} document
 * @param {string} outputPath
 */
export function writeStructuralGraphAtomically(document, outputPath) {
  assertStructuralGraphDocument(document);
  const absoluteOutputPath = resolve(outputPath);
  atomicWriteText(absoluteOutputPath, serializeStructuralGraph(document));
}

/** @param {unknown} document */
export function serializeStructuralGraph(document) {
  assertStructuralGraphDocument(document);
  return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * Incrementally update the structural graph and its content-addressed file cache.
 * No output is replaced until cache reuse, safety checks, and schema validation pass.
 *
 * @param {StructuralUpdateOptions} options
 */
export function updateStructuralGraph(options) {
  if (!options || typeof options.workspaceRoot !== 'string') {
    throw new TypeError('workspaceRoot is required');
  }
  const workspaceRoot = resolve(options.workspaceRoot);
  const outputPath = resolve(
    workspaceRoot,
    options.outputPath ?? '.vscode/.knowledge/structural-graph.json'
  );
  const cacheDirectory = resolve(
    workspaceRoot,
    options.cacheDirectory ?? '.vscode/.knowledge/cache/structural'
  );
  ensureInsideWorkspace(workspaceRoot, outputPath, 'outputPath');
  ensureInsideWorkspace(workspaceRoot, cacheDirectory, 'cacheDirectory');

  const previousGraph = readPreviousGraph(outputPath, options.force === true);
  const result = extractWithTypeScript(options, {
    cacheDirectory,
    force: options.force === true
  });
  assertSafeReplacement(previousGraph, result.graph, result, options.force === true);
  writeIncrementalResult(result, outputPath, cacheDirectory, previousGraph);
  return {
    graph: result.graph,
    statistics: result.statistics,
    cacheIndex: result.cacheIndex
  };
}

/** @param {StructuralExtractionOptions} options */
function extractWithTypeScript(options, incrementalOptions) {
  if (!options || typeof options.workspaceRoot !== 'string') {
    throw new TypeError('workspaceRoot is required');
  }
  const workspaceRoot = resolve(options.workspaceRoot);
  const scope = normalizeScope(options.scope ?? '.');
  const scopeRoot = resolve(workspaceRoot, scope);
  ensureInsideWorkspace(workspaceRoot, scopeRoot, 'scope');

  const configuration = loadCompilerConfiguration(
    workspaceRoot,
    scopeRoot,
    options.tsconfigPath
  );
  const scannedFiles = scanSupportedFiles(scopeRoot);
  const rootNames = stableUnique([
    ...configuration.fileNames,
    ...scannedFiles
  ]).filter((filePath) => isSupportedSourceFile(filePath));

  const compilerOptions = {
    ...configuration.options,
    allowJs: true,
    checkJs: false,
    noEmit: true,
    skipLibCheck: true,
    target: configuration.options.target ?? ts.ScriptTarget.ES2022,
    moduleResolution:
      configuration.options.moduleResolution ?? ts.ModuleResolutionKind.Node10
  };
  const htmlEntries = discoverHtmlEntries(workspaceRoot, rootNames);
  const configurationHash = createConfigurationHash(
    workspaceRoot,
    compilerOptions,
    configuration.configPath,
    htmlEntries.fingerprints
  );
  const cacheState = incrementalOptions
    ? readStructuralCache(
        incrementalOptions.cacheDirectory,
        scope,
        configurationHash,
        incrementalOptions.force
      )
    : emptyStructuralCacheState();
  const program = ts.createProgram({ rootNames, options: compilerOptions });
  const checker = program.getTypeChecker();
  const state = createExtractionState(
    workspaceRoot,
    scope,
    compilerOptions,
    checker,
    configuration.diagnostics
  );

  firstPass(rootNames, program, state, cacheState.entries);
  for (const facts of state.sourceFacts) {
    const entries = htmlEntries.entries.get(resolve(workspaceRoot, facts.filePath));
    if (entries) facts.fileEntity.metadata = { ...facts.fileEntity.metadata, runtimeEntry: [
      ...entries, ...(facts.fileEntity.metadata?.runtimeEntry ?? []).filter((entry) => entry.kind !== 'html-module-script')
    ] };
  }

  let incrementalPlan;
  let baseSnapshot;
  if (incrementalOptions) {
    for (const facts of state.sourceFacts) {
      facts.summary = summarizeFile(state, facts);
    }
    incrementalPlan = createIncrementalPlan(state, cacheState);
    protectChangedParseFailures(
      incrementalPlan,
      incrementalOptions.force
    );
    baseSnapshot = snapshotBaseContributions(state);
    restoreUnchangedResolvedContributions(state, incrementalPlan);
    secondPass(state, incrementalPlan.affectedFiles);
  } else {
    secondPass(state);
  }

  const document = {
    version: STRUCTURAL_GRAPH_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    scope,
    extractor: {
      name: 'typescript-compiler-api',
      version: TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION,
      typescriptVersion: ts.version
    },
    files: [...state.files].sort(compareFiles),
    entities: [...state.entitiesByKey.values()].sort(compareEntities),
    relations: [...state.relationsByIdentity.values()].sort(compareRelations),
    diagnostics: state.diagnostics.sort(compareDiagnostics)
  };
  assertStructuralGraphDocument(document);
  if (!incrementalOptions) {
    return document;
  }

  const cacheEntries = buildCacheEntries(
    state,
    baseSnapshot,
    incrementalPlan
  );
  const cacheIndex = buildCacheIndex(
    scope,
    configurationHash,
    cacheEntries,
    options.generatedAt ?? document.generatedAt
  );
  return {
    graph: document,
    cacheEntries,
    cacheIndex,
    changedFiles: incrementalPlan.changedFiles,
    deletedFiles: incrementalPlan.deletedFiles,
    statistics: {
      scannedFiles: state.sourceFacts.length,
      parsedFiles: incrementalPlan.changedFiles.size,
      reusedFiles: state.sourceFacts.length - incrementalPlan.changedFiles.size,
      resolvedFiles: [...incrementalPlan.affectedFiles].filter((filePath) =>
        state.sourceFactByRelativePath.has(filePath)
      ).length,
      deletedFiles: incrementalPlan.deletedFiles.size,
      cacheMode: cacheState.compatible ? 'incremental' : 'rebuild'
    }
  };
}

function createExtractionState(
  workspaceRoot,
  scope,
  compilerOptions,
  checker,
  configurationDiagnostics
) {
  return {
    workspaceRoot,
    scope,
    compilerOptions,
    checker,
    files: [],
    sourceFacts: [],
    sourceFactByAbsolutePath: new Map(),
    sourceFactByRelativePath: new Map(),
    entitiesByKey: new Map(),
    entityKeyByNode: new WeakMap(),
    relationsByIdentity: new Map(),
    diagnostics: configurationDiagnostics.map((diagnostic) => ({
      code: `tsconfig-${diagnostic.code}`,
      category:
        diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    })),
    diagnosticIdentities: new Set()
  };
}

function firstPass(rootNames, program, state, cacheEntries = new Map()) {
  for (const absolutePath of rootNames.sort(compareText)) {
    const filePath = toWorkspacePath(state.workspaceRoot, absolutePath);
    if (!filePath || !isInScope(filePath, state.scope)) {
      continue;
    }

    let content;
    try {
      content = readFileSync(absolutePath, 'utf8');
    } catch (error) {
      addDiagnostic(state, {
        code: 'source-read-failed',
        category: 'error',
        message: `Cannot read ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      });
      continue;
    }

    const sourceFile =
      program.getSourceFile(absolutePath) ??
      ts.createSourceFile(
        absolutePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        scriptKindForPath(absolutePath)
      );
    const fileRecord = {
      filePath,
      language: languageForPath(filePath),
      contentHash: createHash('sha256').update(content).digest('hex')
    };
    const previousCacheEntry = cacheEntries.get(filePath);
    const reused =
      previousCacheEntry?.file?.contentHash === fileRecord.contentHash &&
      previousCacheEntry.cacheKey ===
        createStructuralCacheKey(filePath, fileRecord.contentHash);
    state.files.push(fileRecord);
    const fileEntity = {
      key: filePath,
      name: filePath.split('/').pop() ?? filePath,
      kind: 'file',
      filePath,
      ...locationForNode(sourceFile, sourceFile)
    };
    addEntity(state, sourceFile, fileEntity);

    const facts = {
      absolutePath: normalizeAbsolutePath(absolutePath),
      filePath,
      fileKey: filePath,
      sourceFile,
      fileEntity,
      contentHash: fileRecord.contentHash,
      importBindings: collectImportBindings(sourceFile),
      previousCacheEntry,
      reused,
      skipped: reused ? previousCacheEntry.summary.parseFailed : false
    };
    state.sourceFacts.push(facts);
    state.sourceFactByAbsolutePath.set(facts.absolutePath, facts);
    state.sourceFactByRelativePath.set(filePath, facts);

    if (reused) {
      restoreCachedBaseContributions(state, facts, previousCacheEntry);
      continue;
    }

    const syntaxDiagnostics = program
      .getSyntacticDiagnostics(sourceFile)
      .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    facts.skipped = syntaxDiagnostics.length > 0;

    for (const diagnostic of syntaxDiagnostics) {
      addTypeScriptDiagnostic(state, sourceFile, diagnostic, 'syntax-error');
    }
    if (facts.skipped) {
      continue;
    }
    collectDeclarations(state, facts);
  }
}

function collectDeclarations(state, facts) {
  const { sourceFile, fileKey } = facts;
  for (const statement of sourceFile.statements) {
    if (ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement)) {
      collectClassLikeDeclaration(state, facts, statement);
      continue;
    }
    if (ts.isFunctionDeclaration(statement)) {
      if (!statement.body && !hasExportModifier(statement)) {
        continue;
      }
      const name = declarationName(statement, sourceFile);
      const entity = addSymbolEntity(
        state,
        statement,
        facts,
        name,
        'function',
        undefined,
        hasExportModifier(statement)
      );
      addTopLevelRelations(state, facts, statement, entity);
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      const exported = hasExportModifier(statement);
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }
        const callable =
          !!declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer));
        const important =
          exported || callable ||
          (!!declaration.initializer && (ts.isNewExpression(declaration.initializer) || ts.isCallExpression(declaration.initializer)));
        if (!important) {
          continue;
        }
        const entity = addSymbolEntity(
          state,
          declaration,
          facts,
          declaration.name.text,
          callable ? 'function' : 'variable',
          undefined,
          exported
        );
        state.entityKeyByNode.set(declaration.name, entity.key);
        if (declaration.initializer) {
          state.entityKeyByNode.set(declaration.initializer, entity.key);
        }
        addTopLevelRelations(state, facts, statement, entity);
      }
      continue;
    }
  }
}

function collectClassLikeDeclaration(state, facts, declaration) {
  const { sourceFile } = facts;
  const name = declarationName(declaration, sourceFile);
  const decorators = decoratorsForNode(declaration, sourceFile);
  const nest = nestMetadataForClass(decorators);
  const metadata = compactMetadata({ decorators, nest });
  const entity = addSymbolEntity(
    state,
    declaration,
    facts,
    name,
    ts.isInterfaceDeclaration(declaration) ? 'interface' : 'class',
    metadata,
    hasExportModifier(declaration)
  );
  if (declaration.name) {
    state.entityKeyByNode.set(declaration.name, entity.key);
  }
  addTopLevelRelations(state, facts, declaration, entity);

  if (!ts.isClassDeclaration(declaration)) {
    return;
  }
  for (const member of declaration.members) {
    if (
      !ts.isMethodDeclaration(member) &&
      !ts.isConstructorDeclaration(member) &&
      !(
        ts.isPropertyDeclaration(member) &&
        member.initializer &&
        (ts.isArrowFunction(member.initializer) ||
          ts.isFunctionExpression(member.initializer))
      )
    ) {
      continue;
    }
    if (ts.isMethodDeclaration(member) && !member.body) {
      continue;
    }
    const memberName = ts.isConstructorDeclaration(member)
      ? 'constructor'
      : propertyNameText(member.name, sourceFile);
    if (!memberName) {
      continue;
    }
    const decorators = decoratorsForNode(member, sourceFile);
    const route = nestRouteMetadata(decorators);
    const memberEntity = addSymbolEntity(
      state,
      member,
      facts,
      `${name}.${memberName}`,
      'method',
      compactMetadata({ decorators, nest: route }),
      undefined,
      entity.key,
      memberName
    );
    if ('name' in member && member.name) {
      state.entityKeyByNode.set(member.name, memberEntity.key);
    }
    if (ts.isPropertyDeclaration(member) && member.initializer) {
      state.entityKeyByNode.set(member.initializer, memberEntity.key);
    }
    addRelation(state, {
      source: entity.key,
      target: memberEntity.key,
      verb: 'contains',
      origin: 'ast',
      confidence: 'extracted',
      location: locationForNode(sourceFile, member),
      detail: `${name} declares ${memberName}`
    });
  }
}

function addSymbolEntity(
  state,
  node,
  facts,
  qualifiedName,
  kind,
  metadata,
  exported,
  containerKey,
  displayName
) {
  const key = `${facts.filePath}#${qualifiedName}`;
  const entity = {
    key,
    name: displayName ?? qualifiedName,
    kind,
    filePath: facts.filePath,
    ...locationForNode(facts.sourceFile, node),
    ...(exported === undefined ? {} : { exported }),
    ...(containerKey ? { containerKey } : {}),
    ...(metadata ? { metadata } : {})
  };
  return addEntity(state, node, entity);
}

function addTopLevelRelations(state, facts, node, entity) {
  addRelation(state, {
    source: facts.fileKey,
    target: entity.key,
    verb: 'contains',
    origin: 'ast',
    confidence: 'extracted',
    location: locationForNode(facts.sourceFile, node),
    detail: `${facts.filePath} declares ${entity.name}`
  });
  if (entity.exported) {
    addRelation(state, {
      source: facts.fileKey,
      target: entity.key,
      verb: 'exports',
      origin: 'ast',
      confidence: 'extracted',
      location: locationForNode(facts.sourceFile, node),
      detail: `${entity.name} is exported by ${facts.filePath}`
    });
  }
}

function secondPass(state, affectedFiles) {
  for (const facts of state.sourceFacts.sort((left, right) =>
    compareText(left.filePath, right.filePath)
  )) {
    if (facts.skipped || (affectedFiles && !affectedFiles.has(facts.filePath))) {
      continue;
    }
    if (facts.fileEntity.metadata?.runtimeEntry) {
      facts.fileEntity.metadata.runtimeEntry = facts.fileEntity.metadata.runtimeEntry.filter((entry) => entry.kind === 'html-module-script');
    }
    collectModuleRelations(state, facts);
    collectHeritageRelations(state, facts);
    collectNestModuleRelations(state, facts);
    collectCallAndReferenceRelations(state, facts);
  }
}

function collectModuleRelations(state, facts) {
  const { sourceFile } = facts;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const target = resolveModuleTarget(state, facts, specifier);
      if (!target) {
        addDiagnostic(state, {
          filePath: facts.filePath,
          code: 'unresolved-import',
          category: 'warning',
          message: `Cannot resolve import '${specifier}'`,
          ...locationForNode(sourceFile, statement.moduleSpecifier)
        });
        continue;
      }
      addRelation(state, {
        source: facts.fileKey,
        target: target.key,
        verb: 'imports',
        origin: target.kind === 'external' ? 'ast' : 'resolver',
        confidence: 'extracted',
        location: locationForNode(sourceFile, statement.moduleSpecifier),
        detail: `${facts.filePath} imports ${specifier}`,
        metadata: { specifier, ...(isTypeOnlyImport(statement.importClause) ? { typeOnly: true } : {}) }
      });
      continue;
    }

    if (!ts.isExportDeclaration(statement)) {
      continue;
    }
    const specifier =
      statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : undefined;
    if (!statement.exportClause) {
      if (!specifier) {
        continue;
      }
      const target = resolveModuleTarget(state, facts, specifier);
      if (target) {
        addRelation(state, {
          source: facts.fileKey,
          target: target.key,
          verb: 'exports',
          origin: target.kind === 'external' ? 'ast' : 'resolver',
          confidence: 'inferred',
          location: locationForNode(sourceFile, statement),
          detail: `${facts.filePath} re-exports all symbols from ${specifier}`,
          metadata: { specifier, wildcard: true }
        });
      } else {
        addDiagnostic(state, {
          filePath: facts.filePath,
          code: 'unresolved-reexport',
          category: 'warning',
          message: `Cannot resolve re-export '${specifier}'`,
          ...locationForNode(sourceFile, statement)
        });
      }
      continue;
    }
    if (ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        const resolved = resolveExpressionTarget(state, facts, element.propertyName ?? element.name);
        if (resolved) {
          addRelation(state, {
            source: facts.fileKey,
            target: resolved.entity.key,
            verb: 'exports',
            origin: resolved.origin,
            confidence: 'extracted',
            location: locationForNode(sourceFile, element),
            detail: `${facts.filePath} exports ${element.name.text}`,
            ...(specifier ? { metadata: { specifier } } : {})
          });
        } else if (specifier) {
          addDiagnostic(state, {
            filePath: facts.filePath,
            code: 'unresolved-reexport-symbol',
            category: 'warning',
            message: `Cannot uniquely resolve re-export '${element.name.text}' from '${specifier}'`,
            ...locationForNode(sourceFile, element)
          });
        }
      }
    } else if (specifier) {
      const target = resolveModuleTarget(state, facts, specifier);
      if (target) {
        addRelation(state, {
          source: facts.fileKey,
          target: target.key,
          verb: 'exports',
          origin: target.kind === 'external' ? 'ast' : 'resolver',
          confidence: 'inferred',
          location: locationForNode(sourceFile, statement),
          detail: `${facts.filePath} namespace-exports ${specifier}`,
          metadata: { specifier, namespace: true }
        });
      }
    }
  }
}

function collectHeritageRelations(state, facts) {
  const visit = (node) => {
    if (
      (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      resolveEntityKeyForNode(state, node)
    ) {
      const sourceKey = resolveEntityKeyForNode(state, node);
      for (const clause of node.heritageClauses ?? []) {
        const verb =
          clause.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements';
        for (const heritageType of clause.types) {
          const resolved = resolveExpressionTarget(state, facts, heritageType.expression);
          if (!resolved) {
            continue;
          }
          addRelation(state, {
            source: sourceKey,
            target: resolved.entity.key,
            verb,
            origin: resolved.origin,
            confidence: 'extracted',
            location: locationForNode(facts.sourceFile, heritageType),
            detail: `${sourceKey} ${verb} ${resolved.entity.name}`
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(facts.sourceFile);
}

function collectNestModuleRelations(state, facts) {
  const visit = (node) => {
    if (ts.isClassDeclaration(node)) {
      const sourceKey = resolveEntityKeyForNode(state, node);
      if (sourceKey) {
        const moduleDecorator = decoratorCall(node, 'Module');
        const metadataObject = moduleDecorator?.arguments[0];
        if (metadataObject && ts.isObjectLiteralExpression(metadataObject)) {
          const mapping = new Map([
            ['imports', 'imports'],
            ['controllers', 'contains'],
            ['providers', 'contains'],
            ['exports', 'exports']
          ]);
          for (const property of metadataObject.properties) {
            if (!ts.isPropertyAssignment(property)) {
              continue;
            }
            const propertyName = propertyNameText(property.name, facts.sourceFile);
            const verb = mapping.get(propertyName);
            if (!verb) {
              continue;
            }
            for (const expression of unwrapNestExpressions(property.initializer)) {
              const resolved = resolveExpressionTarget(state, facts, expression);
              if (!resolved) {
                addDiagnostic(state, {
                  filePath: facts.filePath,
                  code: 'unresolved-nest-target',
                  category: 'warning',
                  message: `Cannot uniquely resolve @Module ${propertyName} target '${expression.getText(facts.sourceFile)}'`,
                  ...locationForNode(facts.sourceFile, expression)
                });
                continue;
              }
              addRelation(state, {
                source: sourceKey,
                target: resolved.entity.key,
                verb,
                origin: resolved.origin,
                confidence: 'extracted',
                location: locationForNode(facts.sourceFile, expression),
                detail: `@Module ${propertyName} includes ${resolved.entity.name}`,
                metadata: { nestProperty: propertyName }
              });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(facts.sourceFile);
}

function collectCallAndReferenceRelations(state, facts) {
  const visit = (node, currentSourceKey = facts.fileKey) => {
    const mappedSourceKey =
      resolveEntityKeyForNode(state, node) ?? currentSourceKey;

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      const literal = argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument));
      const target = literal ? resolveModuleTarget(state, facts, argument.text) : undefined;
      if (target) {
        for (const source of new Set([facts.fileKey, mappedSourceKey])) {
          addRelation(state, {
            source, target: target.key, verb: 'imports', origin: 'resolver', confidence: 'extracted',
            location: locationForNode(facts.sourceFile, node),
            detail: `${source} dynamically imports ${argument.text}`,
            metadata: { specifier: argument.text, dynamic: true }
          });
        }
      } else {
        addDiagnostic(state, {
          filePath: facts.filePath, code: 'unresolved-dynamic-import', category: 'warning',
          message: literal ? `Cannot resolve dynamic import '${argument.text}'` : 'Dynamic import is not a static string; target was not guessed',
          ...locationForNode(facts.sourceFile, node)
        });
      }
    } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const expression = node.expression;
      const api = importedApi(facts, expression);
      if (api && /^(react-router|react-router-dom)$/.test(api.specifier) && /^create(?:Browser|Hash|Memory)Router$/.test(api.name)) {
        markFrontend(state.entitiesByKey.get(mappedSourceKey), 'router');
      }
      if (isReactMount(facts, node) && isTopLevelRuntimeNode(facts, node)) {
        facts.fileEntity.metadata = { ...facts.fileEntity.metadata, runtimeEntry: [
          ...(facts.fileEntity.metadata?.runtimeEntry ?? []),
          { ...locationForNode(facts.sourceFile, node), kind: 'react-mount' }
        ] };
      }
      const resolved = resolveExpressionTarget(state, facts, expression);
      if (resolved && resolved.entity.key !== mappedSourceKey) {
        addRelation(state, {
          source: mappedSourceKey,
          target: resolved.entity.key,
          verb: ts.isCallExpression(node) ? 'calls' : 'references',
          origin: resolved.origin,
          confidence: 'extracted',
          location: locationForNode(facts.sourceFile, expression),
          detail: `${mappedSourceKey} ${ts.isCallExpression(node) ? 'calls' : 'constructs'} ${resolved.entity.name}`
        });
      }
    } else if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      markFrontend(state.entitiesByKey.get(mappedSourceKey), 'component');
      if (!ts.isIdentifier(node.tagName) || !/^[a-z]/.test(node.tagName.text)) {
        addValueReference(node.tagName, mappedSourceKey, {
          jsx: true, rootRoute: isRootRouteElement(facts, node), runtimeRoot: isMountedComposition(facts, node)
        });
      }
    } else if (ts.isJsxExpression(node) && node.expression && ts.isIdentifier(node.expression)) {
      addValueReference(node.expression, mappedSourceKey, { jsxProp: ts.isJsxAttribute(node.parent) });
    } else if (ts.isPropertyAssignment(node) && /^(Component|component)$/.test(propertyNameText(node.name, facts.sourceFile))) {
      addValueReference(node.initializer, mappedSourceKey, { routeComponent: true, rootRoute: isRootRouteElement(facts, node) });
    } else if (ts.isPropertyAccessExpression(node)) {
      addValueReference(node.expression, mappedSourceKey, { receiver: true });
    } else if (
      ts.isTypeReferenceNode(node) &&
      !isInsideHeritageClause(node)
    ) {
      const resolved = resolveExpressionTarget(state, facts, node.typeName);
      if (resolved && resolved.entity.key !== mappedSourceKey) {
        addRelation(state, {
          source: mappedSourceKey,
          target: resolved.entity.key,
          verb: 'references',
          origin: resolved.origin,
          confidence: 'extracted',
          location: locationForNode(facts.sourceFile, node),
          detail: `${mappedSourceKey} references type ${resolved.entity.name}`,
          metadata: { typeOnly: true }
        });
      }
    }
    ts.forEachChild(node, (child) => visit(child, mappedSourceKey));
  };
  function addValueReference(expression, source, metadata) {
    const resolved = resolveExpressionTarget(state, facts, expression);
    if (!resolved || resolved.entity.key === source) return;
    addRelation(state, {
      source, target: resolved.entity.key, verb: 'references', origin: resolved.origin,
      confidence: 'extracted', location: locationForNode(facts.sourceFile, expression),
      detail: `${source} references ${resolved.entity.name}`, metadata
    });
  }
  visit(facts.sourceFile);
}

function importedApi(facts, expression) {
  const root = leftmostIdentifier(expression);
  const binding = root && facts.importBindings.get(root.text);
  if (!binding) return undefined;
  return { specifier: binding.specifier, name: ts.isPropertyAccessExpression(expression) ? expression.name.text : binding.importedName };
}

function isTypeOnlyImport(clause) {
  if (clause?.isTypeOnly) return true;
  return !!(clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings)
    && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every((element) => element.isTypeOnly));
}

function isReactMount(facts, node) {
  if (!ts.isCallExpression(node)) return false;
  const api = importedApi(facts, node.expression);
  if (api && /^react-dom(?:\/client)?$/.test(api.specifier) && /^(render|hydrate|hydrateRoot)$/.test(api.name)) return true;
  if (!ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'render') return false;
  let receiver = node.expression.expression;
  if (ts.isIdentifier(receiver)) {
    for (const statement of facts.sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const declaration = statement.declarationList.declarations.find((item) => ts.isIdentifier(item.name) && item.name.text === receiver.text);
      if (declaration?.initializer) { receiver = declaration.initializer; break; }
    }
  }
  if (!ts.isCallExpression(receiver)) return false;
  const creator = importedApi(facts, receiver.expression);
  return creator?.specifier === 'react-dom/client' && creator.name === 'createRoot';
}

function markFrontend(entity, role) {
  if (!entity || entity.kind === 'file') return;
  // A router containing JSX remains a router, not a component.
  if (entity.metadata?.frontend?.role === 'router') return;
  entity.metadata = { ...entity.metadata, frontend: { role } };
}

function isMountedComposition(facts, node) {
  for (let current = node.parent; current && !ts.isSourceFile(current); current = current.parent) {
    if (isReactMount(facts, current) && isTopLevelRuntimeNode(facts, current)) return true;
  }
  return false;
}

function isTopLevelRuntimeNode(facts, node) {
  let owner;
  for (let current = node.parent; current && !ts.isSourceFile(current); current = current.parent) {
    if (ts.isFunctionLike(current)) { owner = current; break; }
  }
  if (!owner) return true;
  const name = ts.isFunctionDeclaration(owner) ? owner.name?.text
    : ts.isVariableDeclaration(owner.parent) && ts.isIdentifier(owner.parent.name) ? owner.parent.name.text : undefined;
  // An uncalled exported render helper is not an application entry. Resolve a
  // local bootstrap only when a top-level call actually invokes it.
  let invoked = false;
  const visit = (current) => {
    if (ts.isFunctionLike(current)) return;
    if (name && ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === name) invoked = true;
    ts.forEachChild(current, visit);
  };
  visit(facts.sourceFile);
  return invoked;
}

function isRootRouteElement(facts, node) {
  let current = node;
  let objects = 0;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isObjectLiteralExpression(current)) objects++;
    if (ts.isCallExpression(current)) {
      const api = importedApi(facts, current.expression);
      if (api && /^(react-router|react-router-dom)$/.test(api.specifier) && /^create(?:Browser|Hash|Memory)Router$/.test(api.name)) return objects === 1;
    }
    current = current.parent;
  }
  return false;
}

function resolveModuleTarget(state, facts, specifier) {
  const targetFacts = resolveModuleFacts(state, facts, specifier);
  if (targetFacts) {
    return targetFacts.fileEntity;
  }
  if (!isRelativeModuleSpecifier(specifier)) {
    return ensureExternalEntity(state, specifier);
  }
  return undefined;
}

function resolveModuleFacts(state, facts, specifier) {
  const result = ts.resolveModuleName(
    specifier,
    facts.sourceFile.fileName,
    state.compilerOptions,
    ts.sys
  ).resolvedModule;
  if (result) {
    const targetFacts = state.sourceFactByAbsolutePath.get(
      normalizeAbsolutePath(result.resolvedFileName)
    );
    if (targetFacts) {
      return targetFacts;
    }
  }
  return undefined;
}

function resolveExpressionTarget(state, facts, expression) {
  const rootIdentifier = leftmostIdentifier(expression);
  if (rootIdentifier) {
    const binding = facts.importBindings.get(rootIdentifier.text);
    if (binding && isRelativeModuleSpecifier(binding.specifier)) {
      const requestedName =
        binding.importedName === '*' && ts.isPropertyAccessExpression(expression)
          ? expression.name.text
          : binding.importedName;
      if (requestedName !== '*') {
        const targetFacts = resolveModuleFacts(
          state,
          facts,
          binding.specifier
        );
        const candidates = targetFacts
          ? findExportCandidates(state, targetFacts, requestedName, new Set())
          : [];
        if (candidates.length > 1) {
          addDiagnostic(state, {
            filePath: facts.filePath,
            code: 'ambiguous-import-target',
            category: 'warning',
            message: `Imported symbol '${rootIdentifier.text}' has multiple targets: ${candidates.map((entity) => entity.key).join(', ')}`,
            ...locationForNode(facts.sourceFile, expression)
          });
          return undefined;
        }
        if (candidates.length === 1) {
          return { entity: candidates[0], origin: 'resolver' };
        }
      }
    }
  }

  const symbolNode = ts.isPropertyAccessExpression(expression)
    ? expression.name
    : expression;
  let symbol = state.checker.getSymbolAtLocation(symbolNode);
  if (symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    try {
      symbol = state.checker.getAliasedSymbol(symbol);
    } catch {
      symbol = undefined;
    }
  }
  if (symbol) {
    const keys = new Set();
    for (const declaration of symbol.declarations ?? []) {
      const directKey = resolveEntityKeyForNode(state, declaration);
      if (directKey) {
        keys.add(directKey);
      }
    }
    if (keys.size === 1) {
      const key = [...keys][0];
      const entity = state.entitiesByKey.get(key);
      if (entity) {
        return {
          entity,
          origin: entity.filePath === facts.filePath ? 'ast' : 'resolver'
        };
      }
    }
    if (keys.size > 1) {
      addDiagnostic(state, {
        filePath: facts.filePath,
        code: 'ambiguous-symbol-target',
        category: 'warning',
        message: `Ambiguous symbol '${expression.getText(facts.sourceFile)}' resolves to ${[...keys].sort(compareText).join(', ')}`,
        ...locationForNode(facts.sourceFile, expression)
      });
      return undefined;
    }
  }

  if (rootIdentifier) {
    const binding = facts.importBindings.get(rootIdentifier.text);
    if (binding && !isRelativeModuleSpecifier(binding.specifier)) {
      return {
        entity: ensureExternalEntity(state, binding.specifier),
        origin: 'resolver'
      };
    }
  }
  return undefined;
}

function findExportCandidates(state, facts, requestedName, visited) {
  const visitKey = `${facts.filePath}\u0000${requestedName}`;
  if (visited.has(visitKey)) {
    return [];
  }
  visited.add(visitKey);
  const candidates = new Map();

  for (const entity of state.entitiesByKey.values()) {
    if (
      entity.filePath === facts.filePath &&
      !entity.containerKey &&
      entity.exported === true &&
      entity.name === requestedName
    ) {
      candidates.set(entity.key, entity);
    }
  }

  for (const statement of facts.sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) {
      continue;
    }
    const specifier =
      statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : undefined;
    if (!statement.exportClause && specifier) {
      const targetFacts = resolveModuleFacts(state, facts, specifier);
      if (targetFacts) {
        for (const entity of findExportCandidates(
          state,
          targetFacts,
          requestedName,
          visited
        )) {
          candidates.set(entity.key, entity);
        }
      }
      continue;
    }
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
      continue;
    }
    for (const element of statement.exportClause.elements) {
      if (element.name.text !== requestedName) {
        continue;
      }
      const originalName = element.propertyName?.text ?? element.name.text;
      if (specifier) {
        const targetFacts = resolveModuleFacts(state, facts, specifier);
        if (targetFacts) {
          for (const entity of findExportCandidates(
            state,
            targetFacts,
            originalName,
            visited
          )) {
            candidates.set(entity.key, entity);
          }
        }
      } else {
        for (const entity of state.entitiesByKey.values()) {
          if (
            entity.filePath === facts.filePath &&
            !entity.containerKey &&
            entity.name === originalName
          ) {
            candidates.set(entity.key, entity);
          }
        }
      }
    }
  }
  return [...candidates.values()].sort(compareEntities);
}

function ensureExternalEntity(state, specifier) {
  const key = `external:${specifier}`;
  const existing = state.entitiesByKey.get(key);
  if (existing) {
    return existing;
  }
  const entity = {
    key,
    name: specifier,
    kind: 'external',
    filePath: `external/${specifier}`,
    startLine: 1,
    endLine: 1,
    metadata: { package: specifier }
  };
  state.entitiesByKey.set(key, entity);
  return entity;
}

function addEntity(state, node, entity) {
  const existing = state.entitiesByKey.get(entity.key);
  if (existing) {
    state.entityKeyByNode.set(node, existing.key);
    return existing;
  }
  state.entitiesByKey.set(entity.key, entity);
  state.entityKeyByNode.set(node, entity.key);
  return entity;
}

function resolveEntityKeyForNode(state, node) {
  const existing = state.entityKeyByNode.get(node);
  if (existing) {
    return existing;
  }
  if (ts.isIdentifier(node) && node.parent) {
    const parentKey = resolveEntityKeyForNode(state, node.parent);
    if (parentKey) {
      state.entityKeyByNode.set(node, parentKey);
      return parentKey;
    }
  }

  const sourceFile = node.getSourceFile?.();
  const filePath = sourceFile
    ? toWorkspacePath(state.workspaceRoot, sourceFile.fileName)
    : undefined;
  if (!sourceFile || !filePath) {
    return undefined;
  }

  let qualifiedName;
  if (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isFunctionDeclaration(node)
  ) {
    qualifiedName = declarationName(node, sourceFile);
  } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    qualifiedName = node.name.text;
  } else if (
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isPropertyDeclaration(node)
  ) {
    const container = node.parent;
    if (ts.isClassDeclaration(container)) {
      const containerName = declarationName(container, sourceFile);
      const memberName = ts.isConstructorDeclaration(node)
        ? 'constructor'
        : propertyNameText(node.name, sourceFile);
      if (memberName) {
        qualifiedName = `${containerName}.${memberName}`;
      }
    }
  }
  if (!qualifiedName) {
    return undefined;
  }
  const key = `${filePath}#${qualifiedName}`;
  if (!state.entitiesByKey.has(key)) {
    return undefined;
  }
  state.entityKeyByNode.set(node, key);
  return key;
}

function addRelation(state, relation) {
  if (!relation.source || !relation.target || relation.source === relation.target) {
    return;
  }
  if (!relation.location.filePath) {
    const sourceEntity = state.entitiesByKey.get(relation.source);
    relation = {
      ...relation,
      location: {
        filePath: sourceEntity?.filePath,
        ...relation.location
      }
    };
  }
  const identity = relationIdentity(relation);
  if (!state.relationsByIdentity.has(identity)) {
    state.relationsByIdentity.set(identity, relation);
  }
}

function addDiagnostic(state, diagnostic) {
  const identity = diagnosticIdentity(diagnostic);
  if (!state.diagnosticIdentities.has(identity)) {
    state.diagnosticIdentities.add(identity);
    state.diagnostics.push(diagnostic);
  }
}

function addTypeScriptDiagnostic(state, sourceFile, diagnostic, codePrefix) {
  const start = diagnostic.start ?? 0;
  const length = diagnostic.length ?? 1;
  addDiagnostic(state, {
    filePath: toWorkspacePath(state.workspaceRoot, sourceFile.fileName),
    code: `${codePrefix}-${diagnostic.code}`,
    category: 'error',
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    ...locationForPositions(sourceFile, start, start + Math.max(1, length))
  });
}

function loadCompilerConfiguration(workspaceRoot, scopeRoot, tsconfigPath) {
  const explicitConfigPath = tsconfigPath
    ? resolve(workspaceRoot, tsconfigPath)
    : undefined;
  if (explicitConfigPath) {
    ensureInsideWorkspace(workspaceRoot, explicitConfigPath, 'tsconfigPath');
  }
  const configPath =
    explicitConfigPath ?? ts.findConfigFile(scopeRoot, ts.sys.fileExists);
  if (!configPath) {
    return { fileNames: [], options: {}, diagnostics: [], configPath: undefined };
  }
  const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
  if (readResult.error) {
    return {
      fileNames: [],
      options: {},
      diagnostics: [readResult.error],
      configPath
    };
  }
  const parsed = ts.parseJsonConfigFileContent(
    readResult.config,
    ts.sys,
    dirname(configPath),
    undefined,
    configPath
  );
  return {
    fileNames: parsed.fileNames
      .map((filePath) => resolve(filePath))
      .filter((filePath) => isInside(workspaceRoot, filePath)),
    options: parsed.options,
    diagnostics: parsed.errors,
    configPath
  };
}

function scanSupportedFiles(root) {
  const files = [];
  const visit = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((left, right) =>
      compareText(left.name, right.name)
    )) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          visit(absolutePath);
        }
      } else if (entry.isFile() && isSupportedSourceFile(absolutePath)) {
        files.push(resolve(absolutePath));
      }
    }
  };
  visit(root);
  return files;
}

function isSupportedSourceFile(filePath) {
  const normalized = filePath.toLowerCase();
  return (
    SUPPORTED_EXTENSIONS.has(extname(normalized)) &&
    !normalized.endsWith('.d.ts')
  );
}

function collectImportBindings(sourceFile) {
  const bindings = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (!clause) {
      continue;
    }
    if (clause.name) {
      bindings.set(clause.name.text, { specifier, importedName: 'default' });
    }
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      bindings.set(clause.namedBindings.name.text, {
        specifier,
        importedName: '*'
      });
    } else if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        bindings.set(element.name.text, {
          specifier,
          importedName: element.propertyName?.text ?? element.name.text
        });
      }
    }
  }
  return bindings;
}

function decoratorsForNode(node, sourceFile) {
  const decorators = decoratorsOf(node);
  return decorators.map((decorator) => {
    const expression = decorator.expression;
    const call = ts.isCallExpression(expression) ? expression : undefined;
    const target = call?.expression ?? expression;
    return {
      name: decoratorExpressionName(target, sourceFile),
      arguments: call
        ? call.arguments.map((argument) => argument.getText(sourceFile))
        : [],
      ...locationForNode(sourceFile, decorator)
    };
  });
}

function decoratorCall(node, expectedName) {
  const decorators = decoratorsOf(node);
  for (const decorator of decorators) {
    const expression = decorator.expression;
    if (
      ts.isCallExpression(expression) &&
      decoratorExpressionName(expression.expression, node.getSourceFile()) === expectedName
    ) {
      return expression;
    }
  }
  return undefined;
}

function decoratorsOf(node) {
  if (
    typeof ts.canHaveDecorators === 'function' &&
    typeof ts.getDecorators === 'function'
  ) {
    return ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : [];
  }
  return node.decorators ? [...node.decorators] : [];
}

function decoratorExpressionName(expression, sourceFile) {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return expression.getText(sourceFile);
}

function nestMetadataForClass(decorators) {
  const names = new Set(decorators.map((decorator) => decorator.name));
  if (names.has('Module')) {
    return { framework: 'nestjs', role: 'module' };
  }
  if (names.has('Controller')) {
    const controller = decorators.find((decorator) => decorator.name === 'Controller');
    return {
      framework: 'nestjs',
      role: 'controller',
      routePrefix: controller?.arguments[0] ?? ''
    };
  }
  if (names.has('Injectable') || names.has('Catch') || names.has('WebSocketGateway')) {
    return { framework: 'nestjs', role: 'provider' };
  }
  return undefined;
}

function nestRouteMetadata(decorators) {
  const routes = decorators
    .filter((decorator) => HTTP_DECORATORS.has(decorator.name))
    .map((decorator) => ({
      method: HTTP_DECORATORS.get(decorator.name),
      path: decorator.arguments[0] ?? ''
    }));
  return routes.length > 0
    ? { framework: 'nestjs', role: 'route-handler', routes }
    : undefined;
}

function unwrapNestExpressions(expression) {
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.flatMap((element) =>
      ts.isSpreadElement(element) ? [] : unwrapNestExpressions(element)
    );
  }
  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'forwardRef' &&
    expression.arguments.length === 1
  ) {
    const callback = expression.arguments[0];
    if (
      (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
      !ts.isBlock(callback.body)
    ) {
      return unwrapNestExpressions(callback.body);
    }
  }
  return [expression];
}

function compactMetadata(value) {
  const entries = Object.entries(value).filter(([, entry]) => {
    if (entry === undefined) {
      return false;
    }
    return !Array.isArray(entry) || entry.length > 0;
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function declarationName(node, sourceFile) {
  if (node.name) {
    return propertyNameText(node.name, sourceFile) || 'default';
  }
  return hasDefaultModifier(node) ? 'default' : `anonymous@${locationForNode(sourceFile, node).startLine}`;
}

function propertyNameText(name, sourceFile) {
  if (!name) {
    return '';
  }
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return name.getText(sourceFile);
}

function hasExportModifier(node) {
  return !!node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  );
}

function hasDefaultModifier(node) {
  return !!node.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
  );
}

function leftmostIdentifier(expression) {
  let current = expression;
  while (
    ts.isPropertyAccessExpression(current) ||
    ts.isElementAccessExpression(current) ||
    ts.isCallExpression(current) ||
    ts.isNewExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current : undefined;
}

function isInsideHeritageClause(node) {
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isHeritageClause(current)) {
      return true;
    }
    if (
      ts.isClassDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      ts.isFunctionLike(current)
    ) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function locationForNode(sourceFile, node) {
  return locationForPositions(
    sourceFile,
    Math.max(0, node.getStart(sourceFile, false)),
    Math.max(1, node.getEnd())
  );
}

function locationForPositions(sourceFile, start, end) {
  const startLine = sourceFile.getLineAndCharacterOfPosition(
    Math.min(start, sourceFile.getFullText().length)
  ).line + 1;
  const endPosition = Math.max(start, end - 1);
  const endLine = sourceFile.getLineAndCharacterOfPosition(
    Math.min(endPosition, sourceFile.getFullText().length)
  ).line + 1;
  return { startLine, endLine };
}

export function createStructuralCacheKey(filePath, contentHash) {
  return createHash('sha256')
    .update(
      [
        STRUCTURAL_CACHE_VERSION,
        STRUCTURAL_GRAPH_VERSION,
        TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION,
        filePath,
        contentHash
      ].join('\u0000')
    )
    .digest('hex');
}

function emptyStructuralCacheState() {
  return {
    compatible: false,
    entries: new Map(),
    index: undefined
  };
}

function readStructuralCache(cacheDirectory, scope, configurationHash, force) {
  if (force) {
    return emptyStructuralCacheState();
  }
  const indexPath = join(cacheDirectory, 'index.json');
  if (!existsSync(indexPath)) {
    return emptyStructuralCacheState();
  }

  let index;
  try {
    index = JSON.parse(readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw recoveryRequired(
      'cache-corrupt',
      `Cannot read the structural cache index: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const indexErrors = validateCacheIndex(index);
  if (indexErrors.length > 0) {
    throw recoveryRequired(
      'cache-corrupt',
      `Structural cache index is invalid: ${indexErrors.join('; ')}`
    );
  }
  if (
    index.version !== STRUCTURAL_CACHE_VERSION ||
    index.schemaVersion !== STRUCTURAL_GRAPH_VERSION ||
    index.extractorVersion !== TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION ||
    index.scope !== scope ||
    index.configurationHash !== configurationHash
  ) {
    return { compatible: false, entries: new Map(), index };
  }

  const entries = new Map();
  for (const descriptor of index.files) {
    const entryPath = join(cacheDirectory, 'entries', `${descriptor.cacheKey}.json`);
    let entry;
    try {
      entry = JSON.parse(readFileSync(entryPath, 'utf8').replace(/^\uFEFF/, ''));
    } catch (error) {
      throw recoveryRequired(
        'cache-corrupt',
        `Cannot read cache entry for ${descriptor.filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    const errors = validateCacheEntry(entry, descriptor);
    if (errors.length > 0) {
      throw recoveryRequired(
        'cache-corrupt',
        `Cache entry for ${descriptor.filePath} is invalid: ${errors.join('; ')}`
      );
    }
    entries.set(descriptor.filePath, entry);
  }
  const cachedEntities = new Map();
  const cachedRelations = new Map();
  const cachedDiagnostics = new Map();
  for (const entry of entries.values()) {
    for (const entity of [...entry.entities, ...entry.externalEntities]) {
      cachedEntities.set(entity.key, entity);
    }
    for (const relation of [
      ...entry.baseRelations,
      ...entry.resolvedRelations
    ]) {
      cachedRelations.set(relationIdentity(relation), relation);
    }
    for (const diagnostic of [
      ...entry.baseDiagnostics,
      ...entry.resolvedDiagnostics
    ]) {
      cachedDiagnostics.set(diagnosticIdentity(diagnostic), diagnostic);
    }
  }
  const cachedGraphErrors = validateStructuralGraphDocument({
    version: STRUCTURAL_GRAPH_VERSION,
    generatedAt: index.generatedAt,
    scope: index.scope,
    extractor: {
      name: 'typescript-compiler-api',
      version: index.extractorVersion,
      typescriptVersion: ts.version
    },
    files: [...entries.values()].map((entry) => entry.file).sort(compareFiles),
    entities: [...cachedEntities.values()].sort(compareEntities),
    relations: [...cachedRelations.values()].sort(compareRelations),
    diagnostics: [...cachedDiagnostics.values()].sort(compareDiagnostics)
  });
  if (cachedGraphErrors.length > 0) {
    throw recoveryRequired(
      'cache-corrupt',
      `Merged structural cache is invalid: ${cachedGraphErrors.join('; ')}`
    );
  }
  return { compatible: true, entries, index };
}

function validateCacheIndex(index) {
  const errors = [];
  if (!index || typeof index !== 'object' || Array.isArray(index)) {
    return ['index must be an object'];
  }
  for (const field of [
    'version',
    'schemaVersion',
    'extractorVersion',
    'scope',
    'configurationHash',
    'generatedAt',
    'files'
  ]) {
    if (!(field in index)) {
      errors.push(`${field} is required`);
    }
  }
  if (!Array.isArray(index.files)) {
    errors.push('files must be an array');
    return errors;
  }
  const seen = new Set();
  for (const [position, descriptor] of index.files.entries()) {
    if (!descriptor || typeof descriptor !== 'object') {
      errors.push(`files[${position}] must be an object`);
      continue;
    }
    if (typeof descriptor.filePath !== 'string' || !descriptor.filePath) {
      errors.push(`files[${position}].filePath is required`);
    } else if (seen.has(descriptor.filePath)) {
      errors.push(`files[${position}].filePath is duplicated`);
    } else {
      seen.add(descriptor.filePath);
    }
    if (!/^[a-f0-9]{64}$/.test(descriptor.contentHash ?? '')) {
      errors.push(`files[${position}].contentHash must be SHA-256`);
    }
    if (!/^[a-f0-9]{64}$/.test(descriptor.cacheKey ?? '')) {
      errors.push(`files[${position}].cacheKey must be SHA-256`);
    }
  }
  return errors;
}

function validateCacheEntry(entry, descriptor) {
  const errors = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['entry must be an object'];
  }
  if (entry.cacheKey !== descriptor.cacheKey) {
    errors.push('cacheKey does not match the index');
  }
  if (
    entry.version !== STRUCTURAL_CACHE_VERSION ||
    entry.schemaVersion !== STRUCTURAL_GRAPH_VERSION ||
    entry.extractorVersion !== TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION
  ) {
    errors.push('cache or extractor version is incompatible');
  }
  if (
    entry.file?.filePath !== descriptor.filePath ||
    entry.file?.contentHash !== descriptor.contentHash
  ) {
    errors.push('file identity does not match the index');
  }
  if (
    entry.cacheKey !==
    createStructuralCacheKey(descriptor.filePath, descriptor.contentHash)
  ) {
    errors.push('cacheKey does not match its portable inputs');
  }
  for (const field of [
    'entities',
    'baseRelations',
    'resolvedRelations',
    'externalEntities',
    'baseDiagnostics',
    'resolvedDiagnostics'
  ]) {
    if (!Array.isArray(entry[field])) {
      errors.push(`${field} must be an array`);
    }
  }
  for (const entity of Array.isArray(entry.entities) ? entry.entities : []) {
    if (
      !entity ||
      typeof entity.key !== 'string' ||
      typeof entity.name !== 'string' ||
      !['file', 'class', 'interface', 'function', 'method', 'variable'].includes(
        entity.kind
      ) ||
      entity.filePath !== descriptor.filePath ||
      !Number.isInteger(entity.startLine) ||
      !Number.isInteger(entity.endLine)
    ) {
      errors.push('file entity is invalid');
      break;
    }
  }
  for (
    const entity of Array.isArray(entry.externalEntities)
      ? entry.externalEntities
      : []
  ) {
    if (
      !entity ||
      entity.kind !== 'external' ||
      typeof entity.key !== 'string' ||
      typeof entity.filePath !== 'string'
    ) {
      errors.push('external entity is invalid');
      break;
    }
  }
  if (!entry.summary || typeof entry.summary !== 'object') {
    errors.push('summary must be an object');
  } else {
    for (const field of ['imports', 'reexports', 'exports', 'dependencies']) {
      if (!Array.isArray(entry.summary[field])) {
        errors.push(`summary.${field} must be an array`);
      }
    }
  }
  for (const relation of [
    ...(Array.isArray(entry.baseRelations) ? entry.baseRelations : []),
    ...(Array.isArray(entry.resolvedRelations) ? entry.resolvedRelations : [])
  ]) {
    if (
      !relation ||
      typeof relation.source !== 'string' ||
      typeof relation.target !== 'string' ||
      ![
        'imports',
        'exports',
        'contains',
        'extends',
        'implements',
        'calls',
        'references'
      ].includes(relation.verb) ||
      !relation.location ||
      relation.location.filePath !== descriptor.filePath ||
      !['ast', 'resolver'].includes(relation.origin) ||
      !['extracted', 'inferred', 'review_required'].includes(
        relation.confidence
      )
    ) {
      errors.push('relation provenance or contribution path is invalid');
      break;
    }
  }
  for (const diagnostic of [
    ...(Array.isArray(entry.baseDiagnostics) ? entry.baseDiagnostics : []),
    ...(Array.isArray(entry.resolvedDiagnostics)
      ? entry.resolvedDiagnostics
      : [])
  ]) {
    if (
      !diagnostic ||
      diagnostic.filePath !== descriptor.filePath ||
      typeof diagnostic.code !== 'string' ||
      !['warning', 'error'].includes(diagnostic.category) ||
      typeof diagnostic.message !== 'string'
    ) {
      errors.push('diagnostic is invalid');
      break;
    }
  }
  return errors;
}

function restoreCachedBaseContributions(state, facts, entry) {
  for (const entity of entry.entities) {
    const existing = state.entitiesByKey.get(entity.key);
    if (!existing) {
      state.entitiesByKey.set(entity.key, entity);
    } else if (entity.key === facts.fileKey && entity.metadata) {
      existing.metadata = structuredClone(entity.metadata);
    }
  }
  state.entityKeyByNode.set(facts.sourceFile, facts.fileKey);
  for (const relation of entry.baseRelations) {
    addRelation(state, relation);
  }
  for (const diagnostic of entry.baseDiagnostics) {
    addDiagnostic(state, diagnostic);
  }
}

function summarizeFile(state, facts) {
  if (facts.skipped && facts.reused && facts.previousCacheEntry) {
    return facts.previousCacheEntry.summary;
  }
  const imports = [];
  const reexports = [];
  for (const statement of facts.sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const specifier = statement.moduleSpecifier.text;
      const target = resolveModuleFacts(state, facts, specifier);
      imports.push({
        specifier,
        names: importNames(statement.importClause),
        ...(target ? { resolvedFilePath: target.filePath } : {}),
        ...locationForNode(facts.sourceFile, statement.moduleSpecifier)
      });
      continue;
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const specifier = statement.moduleSpecifier.text;
      const target = resolveModuleFacts(state, facts, specifier);
      reexports.push({
        specifier,
        names: exportNames(statement.exportClause),
        ...(target ? { resolvedFilePath: target.filePath } : {}),
        ...locationForNode(facts.sourceFile, statement.moduleSpecifier)
      });
    }
  }
  const collectDynamic = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const argument = node.arguments[0];
      if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
        const target = resolveModuleFacts(state, facts, argument.text);
        imports.push({ specifier: argument.text, names: ['*'], dynamic: true,
          ...(target ? { resolvedFilePath: target.filePath } : {}),
          ...locationForNode(facts.sourceFile, node) });
      }
    }
    ts.forEachChild(node, collectDynamic);
  };
  collectDynamic(facts.sourceFile);
  const exports = [...state.entitiesByKey.values()]
    .filter(
      (entity) =>
        entity.filePath === facts.filePath &&
        entity.exported === true &&
        !entity.containerKey
    )
    .map((entity) => ({ name: entity.name, key: entity.key }))
    .sort((left, right) => compareText(left.key, right.key));
  const dependencies = [...new Set(
    [...imports, ...reexports]
      .map((item) => item.resolvedFilePath)
      .filter(Boolean)
  )].sort(compareText);
  return {
    parseFailed: facts.skipped,
    imports: imports.sort(compareModuleSummary),
    reexports: reexports.sort(compareModuleSummary),
    exports,
    dependencies
  };
}

function importNames(clause) {
  if (!clause) {
    return [];
  }
  const names = [];
  if (clause.name) {
    names.push(`default:${clause.name.text}`);
  }
  if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
    names.push(`*:${clause.namedBindings.name.text}`);
  } else if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const element of clause.namedBindings.elements) {
      names.push(
        `${element.propertyName?.text ?? element.name.text}:${element.name.text}`
      );
    }
  }
  return names.sort(compareText);
}

function exportNames(clause) {
  if (!clause) {
    return ['*'];
  }
  if (ts.isNamespaceExport(clause)) {
    return [`*:${clause.name.text}`];
  }
  return clause.elements
    .map(
      (element) =>
        `${element.propertyName?.text ?? element.name.text}:${element.name.text}`
    )
    .sort(compareText);
}

function compareModuleSummary(left, right) {
  return (
    left.startLine - right.startLine ||
    compareText(left.specifier, right.specifier) ||
    compareText(left.names.join(','), right.names.join(','))
  );
}

function createIncrementalPlan(state, cacheState) {
  const currentFiles = new Set(
    state.sourceFacts.map((facts) => facts.filePath)
  );
  const changedFiles = new Set(
    state.sourceFacts
      .filter((facts) => !facts.reused)
      .map((facts) => facts.filePath)
  );
  const invalidatedFiles = new Set(changedFiles);
  const deletedFiles = new Set(
    [...cacheState.entries.keys()].filter(
      (filePath) => !currentFiles.has(filePath)
    )
  );

  for (const facts of state.sourceFacts) {
    if (
      facts.reused &&
      stableStringify(facts.summary) !==
        stableStringify(facts.previousCacheEntry.summary)
    ) {
      invalidatedFiles.add(facts.filePath);
    }
  }

  const reverseDependencies = new Map();
  const registerDependencies = (source, dependencies) => {
    for (const target of dependencies ?? []) {
      if (!reverseDependencies.has(target)) {
        reverseDependencies.set(target, new Set());
      }
      reverseDependencies.get(target).add(source);
    }
  };
  for (const entry of cacheState.entries.values()) {
    registerDependencies(entry.file.filePath, entry.summary.dependencies);
  }
  for (const facts of state.sourceFacts) {
    registerDependencies(facts.filePath, facts.summary.dependencies);
  }

  const affectedFiles = new Set([...invalidatedFiles, ...deletedFiles]);
  const queue = [...affectedFiles].sort(compareText);
  while (queue.length > 0) {
    const target = queue.shift();
    for (const importer of [...(reverseDependencies.get(target) ?? [])].sort(
      compareText
    )) {
      if (!affectedFiles.has(importer)) {
        affectedFiles.add(importer);
        queue.push(importer);
      }
    }
  }
  return {
    changedFiles,
    invalidatedFiles,
    deletedFiles,
    affectedFiles,
    cacheState,
    currentFacts: state.sourceFactByRelativePath
  };
}

function protectChangedParseFailures(plan, force) {
  if (force) {
    return;
  }
  for (const filePath of plan.changedFiles) {
    const entry = plan.cacheState.entries.get(filePath);
    if (!entry || entry.summary.parseFailed) {
      continue;
    }
    const currentFacts = plan.currentFacts.get(filePath);
    if (currentFacts?.skipped) {
      throw recoveryRequired(
        'changed-file-parse-failed',
        `Changed file ${filePath} no longer parses; the previous graph was preserved`
      );
    }
  }
}

function snapshotBaseContributions(state) {
  const relations = new Map();
  const diagnostics = new Map();
  for (const relation of state.relationsByIdentity.values()) {
    appendMapArray(relations, relation.location.filePath, relation);
  }
  for (const diagnostic of state.diagnostics) {
    if (diagnostic.filePath) {
      appendMapArray(diagnostics, diagnostic.filePath, diagnostic);
    }
  }
  return { relations, diagnostics };
}

function restoreUnchangedResolvedContributions(state, plan) {
  for (const facts of state.sourceFacts) {
    if (!facts.reused || plan.affectedFiles.has(facts.filePath)) {
      continue;
    }
    const entry = facts.previousCacheEntry;
    for (const entity of entry.externalEntities) {
      if (!state.entitiesByKey.has(entity.key)) {
        state.entitiesByKey.set(entity.key, entity);
      }
    }
    for (const relation of entry.resolvedRelations) {
      addRelation(state, relation);
    }
    for (const diagnostic of entry.resolvedDiagnostics) {
      addDiagnostic(state, diagnostic);
    }
  }
}

function buildCacheEntries(state, baseSnapshot) {
  const entries = [];
  for (const facts of state.sourceFacts.sort((left, right) =>
    compareText(left.filePath, right.filePath)
  )) {
    const baseRelations = [...(baseSnapshot.relations.get(facts.filePath) ?? [])]
      .sort(compareRelations);
    const baseRelationIds = new Set(baseRelations.map(relationIdentity));
    const allRelations = [...state.relationsByIdentity.values()]
      .filter((relation) => relation.location.filePath === facts.filePath)
      .sort(compareRelations);
    const resolvedRelations = allRelations.filter(
      (relation) => !baseRelationIds.has(relationIdentity(relation))
    );
    const baseDiagnostics = [...(baseSnapshot.diagnostics.get(facts.filePath) ?? [])]
      .sort(compareDiagnostics);
    const baseDiagnosticIds = new Set(baseDiagnostics.map(diagnosticIdentity));
    const resolvedDiagnostics = state.diagnostics
      .filter(
        (diagnostic) =>
          diagnostic.filePath === facts.filePath &&
          !baseDiagnosticIds.has(diagnosticIdentity(diagnostic))
      )
      .sort(compareDiagnostics);
    const endpointKeys = new Set(
      allRelations.flatMap((relation) => [relation.source, relation.target])
    );
    const externalEntities = [...state.entitiesByKey.values()]
      .filter(
        (entity) => entity.kind === 'external' && endpointKeys.has(entity.key)
      )
      .sort(compareEntities);
    const entities = [...state.entitiesByKey.values()]
      .filter(
        (entity) =>
          entity.kind !== 'external' && entity.filePath === facts.filePath
      )
      .sort(compareEntities);
    const cacheKey = createStructuralCacheKey(
      facts.filePath,
      facts.contentHash
    );
    entries.push({
      version: STRUCTURAL_CACHE_VERSION,
      schemaVersion: STRUCTURAL_GRAPH_VERSION,
      extractorVersion: TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION,
      cacheKey,
      file: state.files.find((file) => file.filePath === facts.filePath),
      entities,
      baseRelations,
      resolvedRelations,
      externalEntities,
      baseDiagnostics,
      resolvedDiagnostics,
      summary: facts.summary
    });
  }
  return entries;
}

function buildCacheIndex(
  scope,
  configurationHash,
  entries,
  generatedAt
) {
  return {
    version: STRUCTURAL_CACHE_VERSION,
    schemaVersion: STRUCTURAL_GRAPH_VERSION,
    extractorVersion: TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION,
    scope,
    configurationHash,
    generatedAt,
    files: entries.map((entry) => ({
      filePath: entry.file.filePath,
      contentHash: entry.file.contentHash,
      cacheKey: entry.cacheKey
    }))
  };
}

function writeIncrementalResult(result, outputPath, cacheDirectory, previousGraph) {
  assertStructuralGraphDocument(result.graph);
  const entryDirectory = join(cacheDirectory, 'entries');
  mkdirSync(entryDirectory, { recursive: true });
  for (const entry of result.cacheEntries) {
    atomicWriteText(
      join(entryDirectory, `${entry.cacheKey}.json`),
      `${stableStringify(entry, 2)}\n`
    );
  }
  preservePreviousStructuralGraph(previousGraph, result.graph, outputPath);
  writeStructuralGraphAtomically(result.graph, outputPath);
  atomicWriteText(
    join(cacheDirectory, 'index.json'),
    `${stableStringify(result.cacheIndex, 2)}\n`
  );
}

function preservePreviousStructuralGraph(previousGraph, nextGraph, outputPath) {
  if (!previousGraph || structuralFactsIdentity(previousGraph) === structuralFactsIdentity(nextGraph)) {
    return;
  }
  const previousPath = outputPath.endsWith('.json')
    ? `${outputPath.slice(0, -5)}.previous.json`
    : `${outputPath}.previous.json`;
  writeStructuralGraphAtomically(previousGraph, previousPath);
}

function structuralFactsIdentity(graph) {
  return stableStringify({
    version: graph.version,
    scope: graph.scope,
    entities: graph.entities,
    relations: graph.relations
  });
}

function readPreviousGraph(outputPath, force) {
  if (!existsSync(outputPath)) {
    return undefined;
  }
  let graph;
  try {
    graph = JSON.parse(readFileSync(outputPath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    if (force) {
      return undefined;
    }
    throw recoveryRequired(
      'graph-corrupt',
      `Cannot read the existing structural graph: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  const errors = validateStructuralGraphDocument(graph);
  if (errors.length > 0) {
    if (force) {
      return undefined;
    }
    throw recoveryRequired(
      'graph-corrupt',
      `Existing structural graph is invalid: ${errors.join('; ')}`
    );
  }
  return graph;
}

function assertSafeReplacement(previous, next, result, force) {
  if (!previous || force || previous.scope !== next.scope) {
    return;
  }
  const previousHashes = new Map(
    previous.files.map((file) => [file.filePath, file.contentHash])
  );
  for (const diagnostic of next.diagnostics) {
    if (
      diagnostic.filePath &&
      diagnostic.code.startsWith('syntax-error-') &&
      previousHashes.has(diagnostic.filePath) &&
      previousHashes.get(diagnostic.filePath) !==
        next.files.find((file) => file.filePath === diagnostic.filePath)
          ?.contentHash &&
      previous.entities.some(
        (entity) =>
          entity.filePath === diagnostic.filePath && entity.kind !== 'file'
      )
    ) {
      throw recoveryRequired(
        'changed-file-parse-failed',
        `Changed file ${diagnostic.filePath} no longer parses; the previous graph was preserved`
      );
    }
  }
  const checks = [
    ['files', previous.files.length, next.files.length, 0.6, 3],
    ['entities', previous.entities.length, next.entities.length, 0.45, 10],
    ['relations', previous.relations.length, next.relations.length, 0.35, 10]
  ];
  const failures = checks
    .filter(([, before, after, ratio, minimumDrop]) =>
      before > 0 && after / before < ratio && before - after >= minimumDrop
    )
    .map(([name, before, after]) => `${name} ${before} -> ${after}`);
  if (failures.length > 0) {
    throw recoveryRequired(
      'abnormal-shrink',
      `Structural graph shrank unexpectedly (${failures.join(', ')}; ${result.deletedFiles.size} deleted files); the previous graph was preserved`
    );
  }
}

function recoveryRequired(reason, message) {
  return new StructuralGraphRecoveryRequiredError(
    `${message}. Re-run with --force only after reviewing the source changes.`,
    reason
  );
}

function createConfigurationHash(workspaceRoot, compilerOptions, configPath, runtimeInputs) {
  const normalizedOptions = normalizeCacheValue(compilerOptions, workspaceRoot);
  const configIdentity = configPath
    ? {
        filePath: toWorkspacePath(workspaceRoot, configPath),
        contentHash: createHash('sha256')
          .update(readFileSync(configPath, 'utf8'))
          .digest('hex')
      }
    : undefined;
  return createHash('sha256')
    .update(stableStringify({ compilerOptions: normalizedOptions, configIdentity, runtimeInputs }))
    .digest('hex');
}

function normalizeCacheValue(value, workspaceRoot) {
  if (typeof value === 'string') {
    if (isAbsolute(value) && isInside(workspaceRoot, value)) {
      return toWorkspacePath(workspaceRoot, value);
    }
    return value.replace(/\\/g, '/');
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeCacheValue(entry, workspaceRoot));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [
          key,
          normalizeCacheValue(entry, workspaceRoot)
        ])
    );
  }
  return value;
}

function stableStringify(value, spacing) {
  return JSON.stringify(sortJsonValue(value), null, spacing);
}

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, sortJsonValue(entry)])
    );
  }
  return value;
}

function atomicWriteText(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    writeFileSync(temporaryPath, content, 'utf8');
    renameSync(temporaryPath, filePath);
  } finally {
    if (existsSync(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
}

function appendMapArray(map, key, value) {
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(value);
}

function relationIdentity(relation) {
  return [
    relation.source,
    relation.target,
    relation.verb,
    relation.location.filePath,
    relation.location.startLine,
    relation.location.endLine
  ].join('\u0000');
}

function diagnosticIdentity(diagnostic) {
  return [
    diagnostic.filePath ?? '',
    diagnostic.code,
    diagnostic.startLine ?? 0,
    diagnostic.endLine ?? 0,
    diagnostic.message
  ].join('\u0000');
}

function scriptKindForPath(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function languageForPath(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case '.tsx':
      return 'typescriptreact';
    case '.jsx':
      return 'javascriptreact';
    case '.js':
      return 'javascript';
    default:
      return 'typescript';
  }
}

function normalizeScope(scope) {
  const normalized = scope.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
  if (!normalized || normalized === '.') {
    return '.';
  }
  if (isAbsolute(normalized) || normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('scope must be a normalized workspace-relative path');
  }
  return normalized;
}

function ensureInsideWorkspace(workspaceRoot, target, label) {
  if (!isInside(workspaceRoot, target)) {
    throw new Error(`${label} must stay inside the workspace`);
  }
}

function isInside(parent, target) {
  const relativePath = relative(resolve(parent), resolve(target));
  return relativePath === '' || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath));
}

function toWorkspacePath(workspaceRoot, absolutePath) {
  if (!isInside(workspaceRoot, absolutePath)) {
    return undefined;
  }
  return relative(workspaceRoot, absolutePath).split(sep).join('/');
}

function isInScope(filePath, scope) {
  return scope === '.' || filePath === scope || filePath.startsWith(`${scope}/`);
}

function normalizeAbsolutePath(filePath) {
  const normalized = resolve(filePath).replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isRelativeModuleSpecifier(specifier) {
  return specifier.startsWith('./') || specifier.startsWith('../');
}

function stableUnique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const identity = normalizeAbsolutePath(value);
    if (!seen.has(identity)) {
      seen.add(identity);
      result.push(resolve(value));
    }
  }
  return result;
}

function compareFiles(left, right) {
  return compareText(left.filePath, right.filePath);
}

function compareEntities(left, right) {
  return compareText(left.key, right.key);
}

function compareRelations(left, right) {
  return (
    compareText(left.source, right.source) ||
    compareText(left.target, right.target) ||
    compareText(left.verb, right.verb) ||
    compareText(left.location.filePath, right.location.filePath) ||
    left.location.startLine - right.location.startLine ||
    left.location.endLine - right.location.endLine
  );
}

function compareDiagnostics(left, right) {
  return (
    compareText(left.filePath ?? '', right.filePath ?? '') ||
    (left.startLine ?? 0) - (right.startLine ?? 0) ||
    compareText(left.code, right.code) ||
    compareText(left.message, right.message)
  );
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'en');
}

/**
 * @typedef {object} StructuralExtractionOptions
 * @property {string} workspaceRoot
 * @property {string=} scope
 * @property {string=} tsconfigPath
 * @property {string=} generatedAt
 */
