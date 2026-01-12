import { describe, it, expect } from 'vitest';
import type { EntityRecord, ObservationRecord, RelationRecord } from '../src/database.js';

/**
 * 格式化实体结果（从 registerTools.ts 提取的逻辑）
 */
function formatEntityResults(results: EntityRecord[]): string {
  if (results.length === 0) {
    return '未找到匹配的实体。';
  }

  return results
    .map((entity, index) => {
      const location = `${entity.filePath}:${entity.startLine}-${entity.endLine}`;
      const updatedAt = new Date(entity.updatedAt).toISOString();
      const description = entity.description
        ? `\n    描述：${entity.description}`
        : '';
      return `${index + 1}. [${entity.type}] ${entity.name}\n    位置：${location}\n    更新时间：${updatedAt}${description}`;
    })
    .join('\n\n');
}

/**
 * 格式化观察记录结果
 */
function formatObservationResults(results: ObservationRecord[]): string {
  if (results.length === 0) {
    return '未找到匹配的观察记录。';
  }

  return results
    .map((item, index) => {
      const updatedAt = new Date(item.updatedAt).toISOString();
      return `${index + 1}. ${item.content}\n    实体：${item.entityName} [${item.entityType}]\n    路径：${item.filePath}\n    更新时间：${updatedAt}`;
    })
    .join('\n\n');
}

/**
 * 格式化关系结果
 */
function formatRelationResults(results: RelationRecord[]): string {
  if (results.length === 0) {
    return '未找到匹配的关系记录。';
  }

  return results
    .map((relation, index) => {
      const createdAt = new Date(relation.createdAt).toISOString();
      return `${index + 1}. ${relation.sourceName} [${relation.sourceType}] --${relation.verb}--> ${relation.targetName} [${relation.targetType}]\n    Source: ${relation.sourceFilePath}\n    Target: ${relation.targetFilePath}\n    Created At: ${createdAt}`;
    })
    .join('\n\n');
}

describe('Formatters', () => {
  const now = Date.now();

  describe('formatEntityResults', () => {
    it('应该返回空结果消息', () => {
      const result = formatEntityResults([]);
      expect(result).toBe('未找到匹配的实体。');
    });

    it('应该格式化单个实体', () => {
      const entities: EntityRecord[] = [
        {
          id: 'e1',
          name: 'TestService',
          type: 'service',
          filePath: '/src/services/test.ts',
          startLine: 1,
          endLine: 50,
          description: 'A test service',
          metadata: null,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = formatEntityResults(entities);

      expect(result).toContain('1. [service] TestService');
      expect(result).toContain('位置：/src/services/test.ts:1-50');
      expect(result).toContain('描述：A test service');
    });

    it('应该格式化多个实体', () => {
      const entities: EntityRecord[] = [
        {
          id: 'e1',
          name: 'ServiceA',
          type: 'service',
          filePath: '/a.ts',
          startLine: 1,
          endLine: 10,
          description: null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'e2',
          name: 'FunctionB',
          type: 'function',
          filePath: '/b.ts',
          startLine: 5,
          endLine: 15,
          description: 'Some function',
          metadata: null,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = formatEntityResults(entities);

      expect(result).toContain('1. [service] ServiceA');
      expect(result).toContain('2. [function] FunctionB');
      expect(result).not.toContain('描述：\n'); // 没有描述的不应该有描述行
    });

    it('应该正确处理无描述的实体', () => {
      const entities: EntityRecord[] = [
        {
          id: 'e1',
          name: 'NoDesc',
          type: 'class',
          filePath: '/test.ts',
          startLine: 1,
          endLine: 10,
          description: null,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = formatEntityResults(entities);

      expect(result).not.toContain('描述：');
    });
  });

  describe('formatObservationResults', () => {
    it('应该返回空结果消息', () => {
      const result = formatObservationResults([]);
      expect(result).toBe('未找到匹配的观察记录。');
    });

    it('应该格式化观察记录', () => {
      const observations: ObservationRecord[] = [
        {
          id: 'o1',
          entityId: 'e1',
          entityName: 'TestService',
          entityType: 'service',
          filePath: '/src/test.ts',
          content: 'This is an important observation',
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = formatObservationResults(observations);

      expect(result).toContain('1. This is an important observation');
      expect(result).toContain('实体：TestService [service]');
      expect(result).toContain('路径：/src/test.ts');
    });

    it('应该格式化多条观察记录', () => {
      const observations: ObservationRecord[] = [
        {
          id: 'o1',
          entityId: 'e1',
          entityName: 'EntityA',
          entityType: 'class',
          filePath: '/a.ts',
          content: 'First observation',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'o2',
          entityId: 'e2',
          entityName: 'EntityB',
          entityType: 'function',
          filePath: '/b.ts',
          content: 'Second observation',
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = formatObservationResults(observations);

      expect(result).toContain('1. First observation');
      expect(result).toContain('2. Second observation');
    });
  });

  describe('formatRelationResults', () => {
    it('应该返回空结果消息', () => {
      const result = formatRelationResults([]);
      expect(result).toBe('未找到匹配的关系记录。');
    });

    it('应该格式化关系', () => {
      const relations: RelationRecord[] = [
        {
          id: 'r1',
          verb: 'uses',
          createdAt: now,
          sourceEntityId: 'e1',
          sourceName: 'ServiceA',
          sourceType: 'service',
          sourceFilePath: '/src/a.ts',
          targetEntityId: 'e2',
          targetName: 'ServiceB',
          targetType: 'service',
          targetFilePath: '/src/b.ts',
        },
      ];

      const result = formatRelationResults(relations);

      expect(result).toContain('1. ServiceA [service] --uses--> ServiceB [service]');
      expect(result).toContain('Source: /src/a.ts');
      expect(result).toContain('Target: /src/b.ts');
    });

    it('应该支持不同的关系动词', () => {
      const verbs = ['uses', 'calls', 'extends', 'implements', 'depends_on'];

      verbs.forEach((verb) => {
        const relations: RelationRecord[] = [
          {
            id: 'r1',
            verb,
            createdAt: now,
            sourceEntityId: 'e1',
            sourceName: 'A',
            sourceType: 'class',
            sourceFilePath: '/a.ts',
            targetEntityId: 'e2',
            targetName: 'B',
            targetType: 'class',
            targetFilePath: '/b.ts',
          },
        ];

        const result = formatRelationResults(relations);
        expect(result).toContain(`--${verb}-->`);
      });
    });
  });
});

