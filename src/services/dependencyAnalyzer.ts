import { Entity, Relation } from '../utils/types';
import { EntityService } from './entityService';
import { RelationService } from './relationService';

/**
 * 依赖节点
 */
export interface DependencyNode {
  entity: Entity;
  depth: number;
  children: DependencyNode[];
  relation?: Relation; // 与父节点的关系
}

/**
 * 依赖链
 */
export interface DependencyChain {
  root: Entity;
  nodes: DependencyNode[];
  maxDepth: number;
  totalDependencies: number;
  circularDependencies: CircularDependency[];
}

/**
 * 循环依赖
 */
export interface CircularDependency {
  chain: Entity[];
  relations: Relation[];
}

/**
 * 依赖统计
 */
export interface DependencyStats {
  totalEntities: number;
  entitiesWithDependencies: number;
  averageDependencies: number;
  maxDependencyDepth: number;
  circularDependencyCount: number;
  topDependencies: Array<{ entity: Entity; dependencyCount: number }>;
}

/**
 * 依赖链分析器
 */
export class DependencyAnalyzer {
  constructor(
    private entityService: EntityService,
    private relationService: RelationService
  ) {}

  /**
   * 构建实体的依赖树
   */
  public buildDependencyTree(
    entityId: string,
    maxDepth: number = 10
  ): DependencyNode | null {
    const entity = this.entityService.getEntity(entityId);
    if (!entity) {
      return null;
    }

    const visited = new Set<string>();
    return this.buildTreeRecursive(entity, 0, maxDepth, visited, undefined);
  }

  /**
   * 递归构建依赖树
   */
  private buildTreeRecursive(
    entity: Entity,
    depth: number,
    maxDepth: number,
    visited: Set<string>,
    relation?: Relation
  ): DependencyNode {
    const node: DependencyNode = {
      entity,
      depth,
      children: [],
      relation,
    };

    // 防止无限递归
    if (depth >= maxDepth || visited.has(entity.id)) {
      return node;
    }

    visited.add(entity.id);

    // 获取所有出边关系（依赖的其他实体）
    const relations = this.relationService.getRelations(entity.id, 'outgoing');

    for (const rel of relations) {
      const targetEntity = this.entityService.getEntity(rel.targetEntityId);
      if (targetEntity) {
        const childNode = this.buildTreeRecursive(
          targetEntity,
          depth + 1,
          maxDepth,
          new Set(visited), // 创建新的 Set，避免不同分支互相影响
          rel
        );
        node.children.push(childNode);
      }
    }

    return node;
  }

  /**
   * 分析实体的完整依赖链
   */
  public analyzeDependencyChain(entityId: string): DependencyChain | null {
    const root = this.entityService.getEntity(entityId);
    if (!root) {
      return null;
    }

    const tree = this.buildDependencyTree(entityId);
    if (!tree) {
      return null;
    }

    const nodes: DependencyNode[] = [];
    let maxDepth = 0;
    this.collectNodes(tree, nodes, (depth) => {
      maxDepth = Math.max(maxDepth, depth);
    });

    const circularDependencies = this.detectCircularDependencies(entityId);

    return {
      root,
      nodes,
      maxDepth,
      totalDependencies: nodes.length - 1, // 不包括根节点
      circularDependencies,
    };
  }

  /**
   * 收集所有节点
   */
  private collectNodes(
    node: DependencyNode,
    nodes: DependencyNode[],
    onDepth?: (depth: number) => void
  ): void {
    nodes.push(node);
    if (onDepth) {
      onDepth(node.depth);
    }
    for (const child of node.children) {
      this.collectNodes(child, nodes, onDepth);
    }
  }

  /**
   * 检测循环依赖
   */
  public detectCircularDependencies(entityId: string): CircularDependency[] {
    const circularDeps: CircularDependency[] = [];
    const visited = new Set<string>();
    const stack: Entity[] = [];
    const relationStack: Relation[] = [];

    const entity = this.entityService.getEntity(entityId);
    if (!entity) {
      return [];
    }

    this.dfsDetectCycle(entity, visited, stack, relationStack, circularDeps);

    return circularDeps;
  }

  /**
   * DFS 检测循环
   */
  private dfsDetectCycle(
    entity: Entity,
    visited: Set<string>,
    stack: Entity[],
    relationStack: Relation[],
    circularDeps: CircularDependency[]
  ): void {
    // 检查是否在当前路径中（循环）
    const stackIndex = stack.findIndex((e) => e.id === entity.id);
    if (stackIndex !== -1) {
      // 找到循环
      const chain = stack.slice(stackIndex);
      chain.push(entity); // 添加回到起点
      const relations = relationStack.slice(stackIndex);
      circularDeps.push({ chain, relations });
      return;
    }

    // 已经完全访问过
    if (visited.has(entity.id)) {
      return;
    }

    // 添加到路径
    stack.push(entity);

    // 获取所有出边
    const relations = this.relationService.getRelations(entity.id, 'outgoing');

    for (const rel of relations) {
      const targetEntity = this.entityService.getEntity(rel.targetEntityId);
      if (targetEntity) {
        relationStack.push(rel);
        this.dfsDetectCycle(
          targetEntity,
          visited,
          stack,
          relationStack,
          circularDeps
        );
        relationStack.pop();
      }
    }

    // 从路径移除
    stack.pop();
    visited.add(entity.id);
  }

  /**
   * 获取全局依赖统计
   */
  public getGlobalDependencyStats(): DependencyStats {
    const allEntities = this.entityService.listEntities({});
    const allRelations = this.relationService.getAllRelations();

    let totalDependencies = 0;
    let maxDepth = 0;
    const dependencyCounts = new Map<string, number>();
    let circularCount = 0;

    for (const entity of allEntities) {
      const chain = this.analyzeDependencyChain(entity.id);
      if (chain) {
        totalDependencies += chain.totalDependencies;
        maxDepth = Math.max(maxDepth, chain.maxDepth);
        dependencyCounts.set(entity.id, chain.totalDependencies);
        circularCount += chain.circularDependencies.length;
      }
    }

    const entitiesWithDependencies = Array.from(dependencyCounts.values()).filter(
      (count) => count > 0
    ).length;

    const averageDependencies =
      allEntities.length > 0 ? totalDependencies / allEntities.length : 0;

    // 获取依赖最多的实体
    const sortedDeps = Array.from(dependencyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topDependencies = sortedDeps.map(([entityId, count]) => {
      const entity = this.entityService.getEntity(entityId);
      return {
        entity: entity!,
        dependencyCount: count,
      };
    });

    return {
      totalEntities: allEntities.length,
      entitiesWithDependencies,
      averageDependencies: Math.round(averageDependencies * 10) / 10,
      maxDependencyDepth: maxDepth,
      circularDependencyCount: circularCount,
      topDependencies,
    };
  }

  /**
   * 查找实体的所有传递依赖
   */
  public findAllTransitiveDependencies(entityId: string): Entity[] {
    const chain = this.analyzeDependencyChain(entityId);
    if (!chain) {
      return [];
    }

    const uniqueEntities = new Map<string, Entity>();
    for (const node of chain.nodes) {
      if (node.entity.id !== entityId) {
        uniqueEntities.set(node.entity.id, node.entity);
      }
    }

    return Array.from(uniqueEntities.values());
  }

  /**
   * 查找依赖某个实体的所有实体（反向依赖）
   */
  public findDependents(entityId: string): Entity[] {
    const relations = this.relationService.getRelations(entityId, 'incoming');
    const dependents: Entity[] = [];

    for (const rel of relations) {
      const sourceEntity = this.entityService.getEntity(rel.sourceEntityId);
      if (sourceEntity) {
        dependents.push(sourceEntity);
      }
    }

    return dependents;
  }

  /**
   * 将依赖树转换为文本表示（树形结构）
   */
  public treeToString(
    node: DependencyNode,
    prefix: string = '',
    isLast: boolean = true
  ): string {
    let result = '';

    // 当前节点
    const connector = isLast ? '└── ' : '├── ';
    const nodeLine = `${prefix}${connector}${node.entity.name} (${node.entity.type})`;

    if (node.relation) {
      result += `${nodeLine} [${node.relation.verb}]\n`;
    } else {
      result += `${nodeLine}\n`;
    }

    // 子节点
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isLastChild = i === node.children.length - 1;
      result += this.treeToString(child, childPrefix, isLastChild);
    }

    return result;
  }
}

