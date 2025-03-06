import { PM, PMContent } from '../types/pm';

// 요구사항 타입 (PM이 붙지 않은 타입, 파일 제외)
export const isRequirementType = (type: string): boolean => {
  return !type.includes('PM') && type !== '파일' && type !== 'pm';
};

// 요구사항 추적 관계 타입
export interface RequirementRelation {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  targetId: string;
  targetName: string;
  targetType: string;
  spec?: string;
  relationType: 'internal' | 'hierarchical'; // 내부 추적 또는 상하위 추적
  relationMethod: 'name' | 'explicit'; // 이름 기반 또는 명시적 추적
  pmId: string;
  pmName: string;
}

// 요구사항 항목 타입
export interface RequirementItem {
  id: string;
  name: string;
  type: string;
  description: string;
  spec: string;
  pmId: string;
  pmName: string;
  relations: RequirementRelation[];
}

// PM 데이터에서 요구사항 항목 추출
export const extractRequirements = (pmList: PM[]): RequirementItem[] => {
  const requirements: RequirementItem[] = [];
  const nameToRequirementMap = new Map<string, RequirementItem[]>();

  // 1단계: 모든 요구사항 항목 추출
  pmList.forEach(pm => {
    pm.content.forEach(content => {
      if (isRequirementType(content.type1)) {
        const requirement: RequirementItem = {
          id: content.id,
          name: content.name,
          type: content.type1,
          description: content.description || '',
          spec: content.spec || '',
          pmId: pm.id,
          pmName: pm.name,
          relations: []
        };
        requirements.push(requirement);

        // 이름으로 요구사항 맵핑 (이름 기반 추적을 위해)
        if (!nameToRequirementMap.has(content.name)) {
          nameToRequirementMap.set(content.name, []);
        }
        nameToRequirementMap.get(content.name)?.push(requirement);
      }
    });
  });

  // 2단계: 이름 기반 추적 관계 설정
  nameToRequirementMap.forEach((items, name) => {
    if (items.length > 1) {
      // 같은 이름을 가진 요구사항 간의 관계 설정
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const source = items[i];
          const target = items[j];

          // 같은 PM 내부의 추적인지, 다른 PM 간의 추적인지 확인
          const relationType = source.pmId === target.pmId ? 'internal' : 'hierarchical';

          // 소스에서 타겟으로의 관계 추가
          source.relations.push({
            sourceId: source.id,
            sourceName: source.name,
            sourceType: source.type,
            targetId: target.id,
            targetName: target.name,
            targetType: target.type,
            relationType,
            relationMethod: 'name',
            pmId: source.pmId,
            pmName: source.pmName
          });

          // 타겟에서 소스로의 관계 추가
          target.relations.push({
            sourceId: target.id,
            sourceName: target.name,
            sourceType: target.type,
            targetId: source.id,
            targetName: source.name,
            targetType: source.type,
            relationType,
            relationMethod: 'name',
            pmId: target.pmId,
            pmName: target.pmName
          });
        }
      }
    }
  });

  // 3단계: 명시적 추적 관계 설정 (PM특성추적, PM상속연결)
  pmList.forEach(pm => {
    pm.content.forEach(content => {
      // PM특성추적 처리 (PM 내부 추적)
      if (content.type1 === 'PM특성추적' && content.name && content.spec) {
        const sourceName = content.name;
        const targetName = content.spec;

        // 소스와 타겟 요구사항 찾기
        const sourceReqs = requirements.filter(req => 
          req.name === sourceName && req.pmId === pm.id
        );
        const targetReqs = requirements.filter(req => 
          req.name === targetName && req.pmId === pm.id
        );

        // 관계 추가
        sourceReqs.forEach(source => {
          targetReqs.forEach(target => {
            source.relations.push({
              sourceId: source.id,
              sourceName: source.name,
              sourceType: source.type,
              targetId: target.id,
              targetName: target.name,
              targetType: target.type,
              relationType: 'internal',
              relationMethod: 'explicit',
              pmId: pm.id,
              pmName: pm.name
            });
          });
        });
      }

      // PM상속연결 처리 (PM 상하위 간 추적)
      if (content.type1 === 'PM상속연결' && content.name && content.spec) {
        const sourceName = content.name;
        const targetName = content.spec;

        // 소스 요구사항 찾기 (현재 PM에서)
        const sourceReqs = requirements.filter(req => 
          req.name === sourceName && req.pmId === pm.id
        );

        // 타겟 요구사항 찾기 (모든 PM에서)
        const targetReqs = requirements.filter(req => 
          req.name === targetName
        );

        // 관계 추가
        sourceReqs.forEach(source => {
          targetReqs.forEach(target => {
            if (source.pmId !== target.pmId) { // 다른 PM 간의 관계만 추가
              source.relations.push({
                sourceId: source.id,
                sourceName: source.name,
                sourceType: source.type,
                targetId: target.id,
                targetName: target.name,
                targetType: target.type,
                relationType: 'hierarchical',
                relationMethod: 'explicit',
                pmId: source.pmId,
                pmName: source.pmName
              });
            }
          });
        });
      }
    });
  });

  return requirements;
};

// 요구사항 관계 그룹화 (타입별, PM별 등)
export const groupRequirementsByType = (requirements: RequirementItem[]): Record<string, RequirementItem[]> => {
  const groups: Record<string, RequirementItem[]> = {};
  
  requirements.forEach(req => {
    if (!groups[req.type]) {
      groups[req.type] = [];
    }
    groups[req.type].push(req);
  });
  
  return groups;
};

export const groupRequirementsByPM = (requirements: RequirementItem[]): Record<string, RequirementItem[]> => {
  const groups: Record<string, RequirementItem[]> = {};
  
  requirements.forEach(req => {
    if (!groups[req.pmName]) {
      groups[req.pmName] = [];
    }
    groups[req.pmName].push(req);
  });
  
  return groups;
};

// 특정 요구사항과 관련된 모든 요구사항 ID 찾기 (하이라이트용)
export const findRelatedRequirementIds = (requirement: RequirementItem): string[] => {
  const relatedIds = new Set<string>();
  relatedIds.add(requirement.id);
  
  requirement.relations.forEach(relation => {
    relatedIds.add(relation.targetId);
  });
  
  return Array.from(relatedIds);
}; 