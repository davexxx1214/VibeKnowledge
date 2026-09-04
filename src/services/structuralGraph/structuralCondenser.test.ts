import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it } from 'vitest';
import {
  convergeStructuralGraph,
  mergeCuratedGroup,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-condenser.mjs';
import { extractStructuralGraph } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';
import { CuratedGraphService } from './curatedGraphService';

const temporaryDirectories: string[] = [];
const fixtureRoot = resolve(
  process.cwd(),
  'src',
  'services',
  'structuralGraph',
  'fixtures',
  'condenser-project'
);
const extractorPath = resolve(
  process.cwd(),
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'extract-structural-graph.mjs'
);
const curatorPath = resolve(
  process.cwd(),
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'curate-structural-graph.mjs'
);
const generatedAt = '2026-09-03T00:00:00.000Z';

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('structural condenser', () => {
  it('converges a NestJS application into a readable system boundary graph', () => {
    const structural = extractStructuralGraph({
      workspaceRoot: fixtureRoot,
      generatedAt,
    });
    const result = convergeStructuralGraph(structural, { kind: 'framework' });
    const keys = result.group.entities.map((entity) => entity.key);

    expect(result.group.key).toBe('framework');
    expect(result.group.entities).toHaveLength(9);
    expect(result.group.relations.length).toBeGreaterThanOrEqual(8);
    expect(result.group.relations.length).toBeLessThanOrEqual(20);
    expect(keys).toEqual(
      expect.arrayContaining([
        'src/main.ts#bootstrap',
        'src/app.module.ts#AppModule',
        'src/article/article.module.ts#ArticleModule',
        'src/infrastructure/database.module.ts#DatabaseModule',
        'src/tag/tag.module.ts#TagModule',
        'src/user/user.module.ts#UserModule',
        'external:@nestjs/core',
        'external:@nestjs/typeorm',
        'external:mysql2',
      ])
    );
    expect(
      keys.some((key) => /(Controller|Service|Entity)(?:\.|$)/.test(key))
    ).toBe(false);
    expect(result.group.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'src/main.ts#bootstrap',
          target: 'src/app.module.ts#AppModule',
          verb: 'calls',
        }),
        expect.objectContaining({
          source: 'src/article/article.module.ts#ArticleModule',
          target: 'src/user/user.module.ts#UserModule',
          verb: 'imports',
        }),
      ])
    );

    const rawRelations = new Set(
      structural.relations.map((relation) => rawRelationIdentity(relation))
    );
    for (const relation of result.group.relations) {
      const structuralPath = relation.structuralPath ?? [];
      expect(relation.evidence.length).toBeGreaterThan(0);
      expect(structuralPath.length).toBeGreaterThan(0);
      for (const hop of structuralPath) {
        expect(rawRelations.has(rawRelationIdentity(hop))).toBe(true);
      }
      if (structuralPath.every((hop) => hop.traversal !== undefined)) {
        const walked = structuralPath.map((hop) => ({
          from: hop.traversal === 'reverse' ? hop.target : hop.source,
          to: hop.traversal === 'reverse' ? hop.source : hop.target,
        }));
        expect(walked[0].from).toBe(relation.source);
        expect(walked[walked.length - 1].to).toBe(relation.target);
        for (let index = 1; index < walked.length; index += 1) {
          expect(walked[index - 1].to).toBe(walked[index].from);
        }
      }
    }
  });

  it('collapses a detailed scope to components and lifts method calls to their owners', () => {
    const structural = extractStructuralGraph({
      workspaceRoot: fixtureRoot,
      generatedAt,
    });
    const result = convergeStructuralGraph(structural, {
      kind: 'feature',
      scope: 'src/article',
      key: 'article-management',
      name: 'Article management',
    });
    const keys = result.group.entities.map((entity) => entity.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'src/article/article.module.ts#ArticleModule',
        'src/article/article.controller.ts#ArticleController',
        'src/article/article.service.ts#ArticleService',
        'src/article/article.entity.ts#ArticleEntity',
        'src/user/user.service.ts#UserService',
        'external:@nestjs/typeorm',
      ])
    );
    expect(keys.some((key) => /\.(constructor|list|find)$/.test(key))).toBe(false);
    expect(keys.some((key) => key.includes('/tag/'))).toBe(false);
    expect(result.group.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'src/article/article.service.ts#ArticleService',
          target: 'src/user/user.service.ts#UserService',
          verb: 'calls',
        }),
      ])
    );
  });

  it('refreshes one group while preserving prose and discarding unmatched old structure', () => {
    const structural = extractStructuralGraph({
      workspaceRoot: fixtureRoot,
      generatedAt,
    });
    const framework = convergeStructuralGraph(structural, {
      kind: 'framework',
    }).group;
    const article = convergeStructuralGraph(structural, {
      kind: 'feature',
      scope: 'src/article',
      key: 'article-management',
      name: 'Article management',
    }).group;
    const withFramework = mergeCuratedGroup(undefined, framework, {
      generatedAt,
    });
    const document = mergeCuratedGroup(withFramework, article, {
      generatedAt,
    });
    const articleGroup = document.groups.find(
      (group) => group.key === 'article-management'
    )!;
    articleGroup.name = '文章管理';
    articleGroup.description = '人工维护的业务语义。';
    const service = articleGroup.entities.find(
      (entity) => entity.key === 'src/article/article.service.ts#ArticleService'
    )!;
    const oldServiceKey = service.key;
    service.key = './src/article/article.service.ts#ArticleService';
    service.name = '文章应用服务';
    service.description = '人工维护的职责说明。';
    for (const relation of articleGroup.relations) {
      if (relation.source === oldServiceKey) {
        relation.source = service.key;
      }
      if (relation.target === oldServiceKey) {
        relation.target = service.key;
      }
    }
    articleGroup.entities.push({
      key: 'semantic:publish-policy',
      name: 'PublishPolicy',
      type: 'class',
      filePath: 'src/article/article.service.ts',
      startLine: 5,
      endLine: 14,
      description: 'Agent 补充的发布策略。',
    });
    articleGroup.relations.push({
      source: service.key,
      target: 'semantic:publish-policy',
      verb: 'depends_on',
      origin: 'agent',
      confidence: 'review_required',
      description: '文章发布受业务策略约束。',
      evidence: [
        {
          filePath: 'src/article/article.service.ts',
          startLine: 5,
          endLine: 14,
        },
      ],
    });
    const untouchedFramework = JSON.stringify(document.groups[0]);

    const regeneratedArticle = convergeStructuralGraph(structural, {
      kind: 'feature',
      scope: 'src/article',
      key: 'article-management',
      name: 'Article management',
    }).group;
    const refreshed = mergeCuratedGroup(document, regeneratedArticle, {
      generatedAt,
    });
    const refreshedArticle = refreshed.groups.find(
      (group) => group.key === 'article-management'
    )!;

    expect(JSON.stringify(refreshed.groups[0])).toBe(untouchedFramework);
    expect(refreshedArticle.name).toBe('文章管理');
    expect(refreshedArticle.description).toBe('人工维护的业务语义。');
    expect(refreshedArticle.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'src/article/article.service.ts#ArticleService',
          name: 'ArticleService',
          type: 'service',
          description: '人工维护的职责说明。',
        }),
      ])
    );
    expect(
      refreshedArticle.entities.some(
        (entity) => entity.key === 'semantic:publish-policy'
      )
    ).toBe(false);
    expect(
      refreshedArticle.relations.some(
        (relation) => relation.target === 'semantic:publish-policy'
      )
    ).toBe(false);
  });
});

describe('structural curation command line tool', () => {
  it('validates before replacing one group and keeps unrelated groups unchanged', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-curator-'));
    temporaryDirectories.push(workspace);
    cpSync(fixtureRoot, workspace, { recursive: true });

    expect(run(extractorPath, ['--workspace', workspace]).status).toBe(0);
    const frameworkRun = run(curatorPath, ['--workspace', workspace]);
    expect(frameworkRun.status, frameworkRun.stderr).toBe(0);
    const outputPath = join(
      workspace,
      '.vscode',
      '.knowledge',
      'agent-graph.json'
    );
    expect(existsSync(outputPath)).toBe(true);
    const document = JSON.parse(readFileSync(outputPath, 'utf8'));
    document.groups[0].description = '人工审计后的系统边界说明。';
    writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    const preservedFramework = JSON.stringify(document.groups[0]);

    const featureRun = run(curatorPath, [
      '--workspace',
      workspace,
      '--kind',
      'feature',
      '--scope',
      'src/article',
      '--key',
      'article-management',
      '--name',
      'Article management',
    ]);
    expect(featureRun.status, featureRun.stderr).toBe(0);
    const refreshed = JSON.parse(readFileSync(outputPath, 'utf8'));

    expect(JSON.stringify(refreshed.groups[0])).toBe(preservedFramework);
    expect(refreshed.groups.map((group: { key: string }) => group.key)).toEqual([
      'framework',
      'article-management',
    ]);
  });
});

describe('CuratedGraphService', () => {
  it('writes a valid group and preserves an invalid existing file on failure', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-curated-service-'));
    temporaryDirectories.push(workspace);
    cpSync(fixtureRoot, workspace, { recursive: true });
    const structural = extractStructuralGraph({
      workspaceRoot: workspace,
      generatedAt,
    });
    const service = new CuratedGraphService(workspace);

    const result = service.curate(structural, {
      kind: 'framework',
      generatedAt,
    });
    expect(result.group.key).toBe('framework');
    expect(JSON.parse(readFileSync(service.getOutputPath(), 'utf8')).groups)
      .toHaveLength(1);

    writeFileSync(service.getOutputPath(), '{broken', 'utf8');
    expect(() =>
      service.curate(structural, { kind: 'framework', generatedAt })
    ).toThrow(expect.objectContaining({
      message: expect.stringContaining('existing agent-graph.json is invalid'),
      cause: expect.any(SyntaxError),
    }));
    expect(readFileSync(service.getOutputPath(), 'utf8')).toBe('{broken');
  });
});

function rawRelationIdentity(relation: {
  source: string;
  target: string;
  verb: string;
  location?: { filePath: string; startLine: number; endLine: number };
  filePath?: string;
  startLine?: number;
  endLine?: number;
}) {
  const location = relation.location ?? relation;
  return [
    relation.source,
    relation.target,
    relation.verb,
    location.filePath,
    location.startLine,
    location.endLine,
  ].join('\u0000');
}

function run(scriptPath: string, args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
  });
}
