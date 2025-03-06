import { PM, GraphData, GraphNode, GraphLink } from '../types/pm';

// PM 타입에 따른 색상 매핑
const typeColorMap: Record<string, string> = {
  'pm': '#4285F4',           // 파란색
  'PM기능': '#EA4335',       // 빨간색
  'PM입력': '#34A853',       // 초록색
  'PM출력': '#FBBC05',       // 노란색
  'PM기능입력': '#46BFBD',   // 청록색
  'PM기능출력': '#AC92EC',   // 보라색
  'PM구조': '#FF6384',       // 분홍색
  'PM상속연결': '#36A2EB',   // 하늘색
  '파일': '#9966FF',         // 보라색
  'PM수명주기': '#FF9F40',   // 주황색
  'default': '#CCCCCC'       // 기본 회색
};

// PM 데이터를 그래프 데이터로 변환하는 함수
export const transformPMToGraphData = (pmList: PM[]): GraphData => {
  // 빈 데이터 처리
  if (!pmList || pmList.length === 0) {
    return { nodes: [], links: [] };
  }

  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, boolean>();
  const nameToIdMap = new Map<string, string>(); // 이름으로 ID를 찾기 위한 맵
  const pmStructureMap = new Map<string, string[]>(); // PM 구조 관계 맵 (상위 PM ID -> 하위 PM ID 배열)
  const processedLinks = new Set<string>(); // 중복 링크 방지를 위한 세트

  try {
    // 1단계: 모든 PM 노드 생성 및 이름-ID 매핑 구축
    pmList.forEach(pm => {
      if (!pm || !pm.id) return; // 유효하지 않은 PM 건너뛰기

      // PM 노드 추가
      if (!nodeMap.has(pm.id)) {
        nodes.push({
          id: pm.id,
          name: pm.name || '이름 없음',
          type: 'PM',
          val: 30,
          color: '#4285F4', // 파란색
          pmId: pm.id
        });
        nodeMap.set(pm.id, true);
        if (pm.name) {
          nameToIdMap.set(pm.name, pm.id);
        }
      }
    });

    // 2단계: PM 간의 상하위 관계 분석
    pmList.forEach(pm => {
      if (!pm || !pm.id || !pm.content) return; // 유효하지 않은 PM 건너뛰기

      // PM 구조 및 상속 연결 관계 찾기
      pm.content.forEach(content => {
        if (!content) return; // 유효하지 않은 컨텐츠 건너뛰기

        // PM구조 관계 분석
        if (content.type1 === 'PM구조' && content.spec) {
          // 다른 PM을 참조하는 경우 (spec이 다른 PM의 ID인 경우)
          if (nodeMap.has(content.spec)) {
            // 상위 PM -> 하위 PM 관계 저장
            const childPMs = pmStructureMap.get(pm.id) || [];
            if (!childPMs.includes(content.spec)) {
              childPMs.push(content.spec);
              pmStructureMap.set(pm.id, childPMs);
            }
          }
        }

        // PM상속연결 관계 분석
        if (content.type1 === 'PM상속연결' && content.spec) {
          // spec이 다른 PM의 이름인 경우
          const targetId = nameToIdMap.get(content.spec);
          if (targetId && nodeMap.has(targetId)) {
            // 상위 PM -> 하위 PM 관계 저장
            const childPMs = pmStructureMap.get(pm.id) || [];
            if (!childPMs.includes(targetId)) {
              childPMs.push(targetId);
              pmStructureMap.set(pm.id, childPMs);
            }
          }
        }
      });
    });

    // 3단계: PM 간의 링크 생성
    pmStructureMap.forEach((childPMs, parentPmId) => {
      childPMs.forEach(childPmId => {
        const linkId = `${parentPmId}-${childPmId}`;
        if (!processedLinks.has(linkId)) {
          links.push({
            source: parentPmId,
            target: childPmId,
            type: 'structure',
            value: 3
          });
          processedLinks.add(linkId);
        }
      });
    });

    // 노드가 없는 경우 (PM 간 관계가 없는 경우) 모든 PM 간에 약한 연결 생성
    if (links.length === 0 && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        const linkId = `${nodes[i].id}-${nodes[i + 1].id}`;
        if (!processedLinks.has(linkId)) {
          links.push({
            source: nodes[i].id,
            target: nodes[i + 1].id,
            type: 'default',
            value: 1
          });
          processedLinks.add(linkId);
        }
      }
    }

    // 고립된 노드 처리 (연결이 없는 노드)
    const connectedNodes = new Set<string>();
    links.forEach(link => {
      if (typeof link.source === 'string') connectedNodes.add(link.source);
      if (typeof link.target === 'string') connectedNodes.add(link.target);
    });

    // 고립된 노드를 찾아서 가장 가까운 노드와 연결
    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        // 가장 가까운 노드 찾기 (여기서는 간단히 첫 번째 다른 노드와 연결)
        const otherNode = nodes.find(n => n.id !== node.id);
        if (otherNode) {
          const linkId = `${node.id}-${otherNode.id}`;
          if (!processedLinks.has(linkId)) {
            links.push({
              source: node.id,
              target: otherNode.id,
              type: 'default',
              value: 1
            });
            processedLinks.add(linkId);
          }
        }
      }
    });

    return { nodes, links };
  } catch (error) {
    console.error('그래프 데이터 변환 중 오류 발생:', error);
    // 오류 발생 시 빈 그래프 반환
    return { nodes, links };
  }
};

// 노드 크기 결정 함수
const getNodeSize = (type: string): number => {
  switch (type) {
    case 'PM':
      return 15;
    default:
      return 10;
  }
};

// 노드 색상 결정 함수
const getNodeColor = (type: string): string => {
  return typeColorMap[type] || typeColorMap.default;
}; 