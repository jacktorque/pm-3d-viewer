export interface PMContent {
  id: string;
  type1: string;
  type2: string;
  createdAt: string;
  name: string;
  description: string;
  spec: string;
  status: string;
  notes: string;
}

export interface PM {
  id: string;
  createdAt: string;
  name: string;
  description: string;
  status: string;
  userId: string;
  content: PMContent[];
}

export interface PMResponse {
  success: boolean;
  pm: PM[];
}

// 그래프 데이터 구조를 위한 타입
export interface GraphNode {
  id: string;
  name: string;
  type: string;
  val: number; // 노드 크기
  color?: string;
  pmId?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type?: string;
  value?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
} 