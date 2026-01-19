/**
 * 音乐生成服务
 * 将知识图谱数据转换为 Strudel 音乐代码
 */

import { EntityType, RelationVerb } from '../../utils/types';
import {
  GeneratedMusic,
  MusicLayer,
  MusicStats,
  MusicGenerationOptions,
  LayerEffects,
} from './types';
import {
  ENTITY_MUSIC_MAPPINGS,
  RELATION_MUSIC_MAPPINGS,
  DEFAULT_CPS,
  generateNoteSequence,
  calculateRoom,
} from './mappings';

/**
 * 图谱实体接口 (兼容手动和自动图谱)
 */
interface GraphEntity {
  id: string;
  name: string;
  type: EntityType;
  filePath: string;
  startLine: number;
  endLine: number;
  observationCount?: number;
}

/**
 * 图谱关系接口
 */
interface GraphRelation {
  id: string;
  sourceId: string;
  targetId: string;
  verb: RelationVerb;
}

/**
 * 音乐生成服务类
 */
export class MusicGeneratorService {
  private options: MusicGenerationOptions;

  constructor(options: MusicGenerationOptions = {}) {
    this.options = {
      bpm: options.bpm ?? 60,
      baseOctave: options.baseOctave ?? 3,
      includeRelations: options.includeRelations ?? true,
      ambientStyle: options.ambientStyle ?? true,
    };
  }

  /**
   * 从图谱数据生成 Strudel 音乐代码
   */
  public generateMusic(
    entities: GraphEntity[],
    relations: GraphRelation[],
    mode: 'manual' | 'auto' | 'merged' = 'auto'
  ): GeneratedMusic {
    // 统计信息
    const stats = this.calculateStats(entities, relations, mode);
    
    // 按类型分组实体
    const entitiesByType = this.groupEntitiesByType(entities);
    
    // 生成各音层
    const layers = this.generateLayers(entitiesByType);
    
    // 生成关系和弦进行
    const relationChords = this.options.includeRelations
      ? this.generateRelationChords(relations, stats.relationsByVerb)
      : null;
    
    // 组装 Strudel 代码
    const code = this.assembleCode(layers, relationChords, stats);
    
    return {
      code,
      layers,
      stats,
      bpm: this.options.bpm!,
    };
  }

  /**
   * 计算统计信息
   */
  private calculateStats(
    entities: GraphEntity[],
    relations: GraphRelation[],
    mode: 'manual' | 'auto' | 'merged'
  ): MusicStats {
    const entitiesByType: Record<string, number> = {};
    const relationsByVerb: Record<string, number> = {};

    for (const entity of entities) {
      entitiesByType[entity.type] = (entitiesByType[entity.type] || 0) + 1;
    }

    for (const relation of relations) {
      relationsByVerb[relation.verb] = (relationsByVerb[relation.verb] || 0) + 1;
    }

    return {
      totalEntities: entities.length,
      totalRelations: relations.length,
      entitiesByType,
      relationsByVerb,
      mode,
    };
  }

  /**
   * 按类型分组实体
   */
  private groupEntitiesByType(entities: GraphEntity[]): Map<EntityType, GraphEntity[]> {
    const groups = new Map<EntityType, GraphEntity[]>();

    for (const entity of entities) {
      const existing = groups.get(entity.type) || [];
      existing.push(entity);
      groups.set(entity.type, existing);
    }

    return groups;
  }

  /**
   * 生成各类型的音乐层
   */
  private generateLayers(entitiesByType: Map<EntityType, GraphEntity[]>): MusicLayer[] {
    const layers: MusicLayer[] = [];

    // 优先处理主要类型，确保音乐层次分明
    const priorityOrder: EntityType[] = [
      'class',
      'interface',
      'function',
      'variable',
      'service',
      'component',
      'external',
    ];

    // 先处理优先类型
    for (const type of priorityOrder) {
      const entities = entitiesByType.get(type);
      if (entities && entities.length > 0) {
        const layer = this.generateLayerForType(type, entities);
        if (layer) {
          layers.push(layer);
        }
        entitiesByType.delete(type);
      }
    }

    // 处理剩余类型
    for (const [type, entities] of entitiesByType) {
      if (entities.length > 0) {
        const layer = this.generateLayerForType(type, entities);
        if (layer) {
          layers.push(layer);
        }
      }
    }

    return layers;
  }

  /**
   * 为特定类型生成音乐层
   */
  private generateLayerForType(
    type: EntityType,
    entities: GraphEntity[]
  ): MusicLayer | null {
    const mapping = ENTITY_MUSIC_MAPPINGS[type];
    if (!mapping) {
      return null;
    }

    // 计算平均观察记录数
    const avgObservations = entities.reduce(
      (sum, e) => sum + (e.observationCount || 0),
      0
    ) / entities.length;

    // 生成音符序列
    const notes = generateNoteSequence(entities.length, mapping.baseNote);

    // 计算效果参数
    const effects: LayerEffects = {
      gain: mapping.gain,
      lpf: mapping.lpf,
      room: mapping.room ?? calculateRoom(avgObservations),
      delay: mapping.delay,
      slow: mapping.slow,
      fast: mapping.fast,
    };

    return {
      name: `${type} Layer`,
      entityType: type,
      notes,
      sound: mapping.sound,
      effects,
      entityCount: entities.length,
    };
  }

  /**
   * 生成关系和弦进行
   */
  private generateRelationChords(
    relations: GraphRelation[],
    relationsByVerb: Record<string, number>
  ): string | null {
    if (relations.length === 0) {
      return null;
    }

    // 找出最常见的关系类型
    const sortedVerbs = Object.entries(relationsByVerb)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3); // 取前3种关系

    if (sortedVerbs.length === 0) {
      return null;
    }

    // 混合和弦进行
    const chords: string[] = [];
    for (const [verb] of sortedVerbs) {
      const mapping = RELATION_MUSIC_MAPPINGS[verb as RelationVerb];
      if (mapping) {
        chords.push(...mapping.chordProgression.slice(0, 2));
      }
    }

    // 限制和弦数量
    const limitedChords = chords.slice(0, 8);
    
    return `<${limitedChords.join(' ')}>/4`;
  }

  /**
   * 组装 Strudel 代码
   */
  private assembleCode(
    layers: MusicLayer[],
    relationChords: string | null,
    stats: MusicStats
  ): string {
    const lines: string[] = [];

    // 添加注释头
    lines.push(`// Generated from VibeKnowledge Knowledge Graph`);
    lines.push(`// Entities: ${stats.totalEntities} | Relations: ${stats.totalRelations} | Mode: ${stats.mode}`);
    lines.push(`// Generated at: ${new Date().toISOString()}`);
    lines.push('');

    // 设置 CPS
    lines.push(`setcps(${DEFAULT_CPS})`);
    lines.push('');

    // 开始 stack
    lines.push('stack(');

    // 添加各音层
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerCode = this.generateLayerCode(layer);
      const isLast = i === layers.length - 1 && !relationChords;
      lines.push(`  // === ${layer.name} (${layer.entityCount} entities) ===`);
      lines.push(`  ${layerCode}${isLast ? '' : ','}`);
      lines.push('');
    }

    // 添加关系和弦（如果有）
    if (relationChords) {
      lines.push(`  // === Relations Chord Progression ===`);
      lines.push(`  // ${this.formatRelationStats(stats.relationsByVerb)}`);
      lines.push(`  note("${relationChords}").s("fm")`);
      lines.push(`    .lpf(800).gain(0.1).room(0.7)`);
    }

    // 结束 stack，添加全局效果
    lines.push(')');
    lines.push('.late("[0 .01]*4") // 微小延迟增加空间感');
    lines.push('.size(4)');

    return lines.join('\n');
  }

  /**
   * 生成单个音层的代码
   */
  private generateLayerCode(layer: MusicLayer): string {
    const parts: string[] = [];

    // 基础音符和音色
    parts.push(`note("${layer.notes}").s("${layer.sound}")`);

    // 添加效果
    const effects = layer.effects;

    if (effects.lpf !== undefined) {
      parts.push(`.lpf(${effects.lpf})`);
    }

    if (effects.slow !== undefined) {
      parts.push(`.slow(${effects.slow})`);
    }

    if (effects.fast !== undefined) {
      parts.push(`.fast(${effects.fast})`);
    }

    if (effects.delay !== undefined) {
      parts.push(`.delay(${effects.delay})`);
    }

    if (effects.room !== undefined) {
      parts.push(`.room(${effects.room.toFixed(1)})`);
    }

    parts.push(`.gain(${effects.gain})`);

    return parts.join('\n    ');
  }

  /**
   * 格式化关系统计
   */
  private formatRelationStats(relationsByVerb: Record<string, number>): string {
    return Object.entries(relationsByVerb)
      .map(([verb, count]) => `${verb}: ${count}`)
      .join(', ');
  }

  /**
   * 为特定实体类型生成独立的音乐代码片段
   * 用于悬停高亮时单独播放
   */
  public generateTypeHighlightCode(type: EntityType): string {
    const mapping = ENTITY_MUSIC_MAPPINGS[type];
    if (!mapping) {
      return '';
    }

    const note = `${mapping.baseNote.name}${mapping.baseNote.octave}`;
    
    return `note("${note}").s("${mapping.sound}").gain(0.5)`;
  }

  /**
   * 生成所有类型的 gain 调整代码
   * 用于悬停时突出特定类型
   */
  public generateGainAdjustments(
    highlightType: EntityType | null,
    highlightGain: number = 1.0,
    dimGain: number = 0.3
  ): Record<EntityType, number> {
    const adjustments: Record<string, number> = {};

    for (const type of Object.keys(ENTITY_MUSIC_MAPPINGS) as EntityType[]) {
      if (highlightType === null) {
        // 恢复正常音量
        adjustments[type] = ENTITY_MUSIC_MAPPINGS[type].gain;
      } else if (type === highlightType) {
        // 高亮类型增强
        adjustments[type] = highlightGain;
      } else {
        // 其他类型降低
        adjustments[type] = dimGain;
      }
    }

    return adjustments as Record<EntityType, number>;
  }
}

/**
 * 创建默认的音乐生成服务实例
 */
export function createMusicGenerator(
  options?: MusicGenerationOptions
): MusicGeneratorService {
  return new MusicGeneratorService(options);
}
