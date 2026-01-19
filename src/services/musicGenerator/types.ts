/**
 * 音乐生成器类型定义
 * 用于将知识图谱数据转换为 Strudel 音乐代码
 */

import { EntityType, RelationVerb } from '../../utils/types';

/**
 * 音色/乐器类型
 */
export type SoundType = 
  | 'sawtooth'   // 锯齿波 - class
  | 'triangle'   // 三角波 - function
  | 'sine'       // 正弦波 - variable
  | 'square'     // 方波
  | 'piano'      // 钢琴 - interface
  | 'fm'         // FM 合成 - external
  | 'pad';       // Pad 音色

/**
 * 音符名称
 */
export type NoteName = 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b';

/**
 * 八度范围
 */
export type Octave = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * 音符定义
 */
export interface Note {
  name: NoteName;
  octave: Octave;
  accidental?: '#' | 'b';
}

/**
 * 实体类型到音乐元素的映射配置
 */
export interface EntityMusicMapping {
  entityType: EntityType;
  sound: SoundType;
  baseNote: Note;
  gain: number;          // 0-1 音量
  lpf?: number;          // 低通滤波器频率
  room?: number;         // 混响 0-1
  delay?: number;        // 延迟 0-1
  slow?: number;         // 减慢倍数
  fast?: number;         // 加快倍数
}

/**
 * 关系类型到和弦进行的映射
 */
export interface RelationMusicMapping {
  verb: RelationVerb;
  chordProgression: string[];  // 和弦序列 e.g., ['c3', 'g3', 'f3']
  description: string;
}

/**
 * 音乐层配置
 */
export interface MusicLayer {
  name: string;
  entityType: EntityType;
  notes: string;         // Strudel 音符模式 e.g., "c2 g2 c3"
  sound: SoundType;
  effects: LayerEffects;
  entityCount: number;
}

/**
 * 音效配置
 */
export interface LayerEffects {
  gain: number;
  lpf?: number;
  room?: number;
  delay?: number;
  slow?: number;
  fast?: number;
}

/**
 * 生成的音乐配置
 */
export interface GeneratedMusic {
  code: string;          // Strudel 代码
  layers: MusicLayer[];  // 各音层信息
  stats: MusicStats;     // 统计信息
  bpm: number;           // 节拍
}

/**
 * 音乐统计信息
 */
export interface MusicStats {
  totalEntities: number;
  totalRelations: number;
  entitiesByType: Record<string, number>;
  relationsByVerb: Record<string, number>;
  mode: 'manual' | 'auto' | 'merged';
}

/**
 * 播放状态
 */
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  highlightedType?: EntityType;
}

/**
 * 音乐生成选项
 */
export interface MusicGenerationOptions {
  bpm?: number;          // 默认 60 (氛围音乐较慢)
  baseOctave?: Octave;   // 基础八度
  includeRelations?: boolean;  // 是否包含关系和弦
  ambientStyle?: boolean;      // 氛围风格
}
