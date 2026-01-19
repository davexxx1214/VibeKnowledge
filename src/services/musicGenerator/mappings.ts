/**
 * 音乐映射规则
 * 定义实体类型和关系类型到音乐元素的映射
 */

import { EntityType, RelationVerb } from '../../utils/types';
import { EntityMusicMapping, RelationMusicMapping, SoundType, Note } from './types';

/**
 * 实体类型 → 音乐元素映射
 * 
 * 设计理念（氛围音乐风格）：
 * - class: 低沉持续的 drone，作为音乐的基础
 * - interface: 空灵的钢琴泛音，代表抽象层
 * - function: 流动的琶音，代表执行逻辑
 * - variable: 轻柔的点缀音，代表数据
 * - external: FM 合成的模糊音色，代表外部依赖
 */
export const ENTITY_MUSIC_MAPPINGS: Record<EntityType, EntityMusicMapping> = {
  class: {
    entityType: 'class',
    sound: 'sawtooth',
    baseNote: { name: 'c', octave: 2 },
    gain: 0.3,
    lpf: 400,
    room: 0.5,
    slow: 8,
  },
  interface: {
    entityType: 'interface',
    sound: 'piano',
    baseNote: { name: 'e', octave: 4 },
    gain: 0.2,
    room: 0.8,
    slow: 4,
  },
  function: {
    entityType: 'function',
    sound: 'triangle',
    baseNote: { name: 'c', octave: 4 },
    gain: 0.25,
    delay: 0.3,
    fast: 2,
  },
  variable: {
    entityType: 'variable',
    sound: 'sine',
    baseNote: { name: 'g', octave: 5 },
    gain: 0.15,
    room: 0.6,
  },
  external: {
    entityType: 'external',
    sound: 'fm',
    baseNote: { name: 'a', octave: 3 },
    gain: 0.1,
    lpf: 600,
    room: 0.7,
    slow: 6,
  },
  // 其他类型使用默认配置
  file: {
    entityType: 'file',
    sound: 'sine',
    baseNote: { name: 'd', octave: 4 },
    gain: 0.1,
    room: 0.4,
  },
  directory: {
    entityType: 'directory',
    sound: 'sine',
    baseNote: { name: 'f', octave: 3 },
    gain: 0.1,
    room: 0.5,
  },
  api: {
    entityType: 'api',
    sound: 'triangle',
    baseNote: { name: 'g', octave: 4 },
    gain: 0.2,
    delay: 0.2,
  },
  config: {
    entityType: 'config',
    sound: 'sine',
    baseNote: { name: 'e', octave: 3 },
    gain: 0.1,
    slow: 4,
  },
  database: {
    entityType: 'database',
    sound: 'sawtooth',
    baseNote: { name: 'a', octave: 2 },
    gain: 0.2,
    lpf: 300,
    slow: 8,
  },
  service: {
    entityType: 'service',
    sound: 'triangle',
    baseNote: { name: 'g', octave: 3 },
    gain: 0.25,
    room: 0.4,
  },
  component: {
    entityType: 'component',
    sound: 'piano',
    baseNote: { name: 'c', octave: 5 },
    gain: 0.2,
    room: 0.5,
  },
  other: {
    entityType: 'other',
    sound: 'sine',
    baseNote: { name: 'b', octave: 4 },
    gain: 0.1,
  },
};

/**
 * 关系类型 → 和弦进行映射
 * 
 * 设计理念：
 * - extends: 五度进行 (I → V)，稳定的继承关系
 * - implements: 四度进行 (I → IV)，接口实现的张力
 * - uses/depends_on: 平行小调 (i → iv)，依赖关系的流动
 * - imports: 半音下行，外部引入的过渡感
 */
export const RELATION_MUSIC_MAPPINGS: Record<RelationVerb, RelationMusicMapping> = {
  extends: {
    verb: 'extends',
    chordProgression: ['c3', 'g3', 'c3', 'g3'],
    description: '五度进行 (I → V)',
  },
  implements: {
    verb: 'implements',
    chordProgression: ['c3', 'f3', 'c3', 'f3'],
    description: '四度进行 (I → IV)',
  },
  uses: {
    verb: 'uses',
    chordProgression: ['am3', 'dm3', 'am3', 'em3'],
    description: '平行小调进行',
  },
  depends_on: {
    verb: 'depends_on',
    chordProgression: ['am3', 'dm3', 'em3', 'am3'],
    description: '小调循环',
  },
  calls: {
    verb: 'calls',
    chordProgression: ['c3', 'em3', 'f3', 'g3'],
    description: '渐进式进行',
  },
  imports: {
    verb: 'imports',
    chordProgression: ['b3', 'bb3', 'a3', 'ab3'],
    description: '半音下行',
  },
  contains: {
    verb: 'contains',
    chordProgression: ['c3', 'c4', 'g3', 'c3'],
    description: '八度跳跃',
  },
  references: {
    verb: 'references',
    chordProgression: ['e3', 'a3', 'd3', 'g3'],
    description: '四度循环',
  },
  exports: {
    verb: 'exports',
    chordProgression: ['g3', 'c4', 'e3', 'g3'],
    description: '上行进行',
  },
};

/**
 * 音阶定义 - C 大调音阶
 */
export const C_MAJOR_SCALE = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];

/**
 * 音阶定义 - A 小调音阶
 */
export const A_MINOR_SCALE = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

/**
 * 根据实体名称长度计算音高偏移
 * 短名称 → 高音，长名称 → 低音
 */
export function calculatePitchOffset(name: string): number {
  const length = name.length;
  if (length <= 4) return 2;      // 短名 +2 八度
  if (length <= 8) return 1;      // 中等 +1 八度
  if (length <= 16) return 0;     // 标准 0
  if (length <= 24) return -1;    // 较长 -1 八度
  return -2;                       // 很长 -2 八度
}

/**
 * 根据代码行数计算音符时值
 * 更多行数 → 更长的音
 */
export function calculateDuration(lineCount: number): number {
  if (lineCount <= 5) return 1;
  if (lineCount <= 20) return 2;
  if (lineCount <= 50) return 4;
  if (lineCount <= 100) return 8;
  return 16;
}

/**
 * 根据观察记录数量计算混响
 * 更多观察 → 更大的空间感
 */
export function calculateRoom(observationCount: number): number {
  const base = 0.3;
  const increase = Math.min(observationCount * 0.1, 0.5);
  return Math.min(base + increase, 0.9);
}

/**
 * 根据实体数量生成音符序列
 */
export function generateNoteSequence(count: number, baseNote: Note): string {
  const scale = C_MAJOR_SCALE;
  const notes: string[] = [];
  
  // 基于实体数量生成不同长度的音符序列
  const sequenceLength = Math.min(Math.max(count, 2), 8);
  
  for (let i = 0; i < sequenceLength; i++) {
    const scaleIndex = i % scale.length;
    const octaveOffset = Math.floor(i / scale.length);
    const octave = Math.min(Math.max(baseNote.octave + octaveOffset, 1), 7);
    notes.push(`${scale[scaleIndex]}${octave}`);
  }
  
  return notes.join(' ');
}

/**
 * 默认 BPM (氛围音乐较慢)
 */
export const DEFAULT_BPM = 60;

/**
 * 默认 CPS (cycles per second)
 * 氛围音乐使用 0.5 cps = 30 BPM 的循环
 */
export const DEFAULT_CPS = 0.5;
