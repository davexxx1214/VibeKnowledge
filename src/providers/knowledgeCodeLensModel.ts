import type {
  KnowledgeEntity,
  KnowledgeRelation,
} from '../services/knowledgeGraphService';

const MAX_DESCRIPTION_LENGTH = 96;

export interface KnowledgeCodeLensModel {
  entityId: string;
  line: number;
  title: string;
}

export function buildKnowledgeCodeLensModels(
  entities: KnowledgeEntity[],
  relations: KnowledgeRelation[],
  lineCount: number,
  getObservationCount: (entityId: string) => number
): KnowledgeCodeLensModel[] {
  const relationCounts = new Map<string, number>();
  for (const relation of relations) {
    relationCounts.set(
      relation.sourceEntityId,
      (relationCounts.get(relation.sourceEntityId) || 0) + 1
    );
    relationCounts.set(
      relation.targetEntityId,
      (relationCounts.get(relation.targetEntityId) || 0) + 1
    );
  }

  return entities.flatMap((entity) => {
    if (entity.startLine < 1 || entity.startLine > lineCount) {
      return [];
    }

    const description = compactDescription(entity.description) || entity.name;
    const observationCount = getObservationCount(entity.id);
    const relationCount = relationCounts.get(entity.id) || 0;
    return [
      {
        entityId: entity.id,
        line: entity.startLine - 1,
        title: `🧠 KG: ${description} · 📝 ${observationCount} · 🔗 ${relationCount}`,
      },
    ];
  });
}

function compactDescription(description?: string): string {
  const compact = description?.replace(/\s+/g, ' ').trim() || '';
  if (compact.length <= MAX_DESCRIPTION_LENGTH) {
    return compact;
  }
  return `${compact.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`;
}
