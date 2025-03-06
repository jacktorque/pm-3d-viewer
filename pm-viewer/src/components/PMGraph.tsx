import React, { useRef, useEffect, useState, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData, GraphNode, PM } from '../types/pm';
import { Box, Typography, Paper, Switch, FormControlLabel, CircularProgress, Alert } from '@mui/material';
import { transformPMToGraphData } from '../utils/pmDataTransformer';

interface PMGraphProps {
  pmData: PM[];
  loading: boolean;
  onNodeClick?: (node: GraphNode) => void;
}

const PMGraph: React.FC<PMGraphProps> = ({ pmData, loading, onNodeClick }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [use3D, setUse3D] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fgRef = useRef<any>(null);
  const isInitializedRef = useRef<boolean>(false);

  // 그래프 데이터 변환 및 설정
  useEffect(() => {
    if (pmData.length > 0) {
      try {
        const data = transformPMToGraphData(pmData);
        setGraphData(data);
        setError(null);
        isInitializedRef.current = false; // 데이터가 변경되면 초기화 상태 리셋
      } catch (err) {
        console.error('그래프 데이터 변환 중 오류 발생:', err);
        setError('그래프 데이터를 처리하는 중 오류가 발생했습니다.');
      }
    }
  }, [pmData]);

  // 그래프 초기화 함수
  const handleGraphInit = useCallback(() => {
    if (fgRef.current && !isInitializedRef.current && graphData.nodes.length > 0) {
      // 그래프 초기 위치 설정
      setTimeout(() => {
        if (fgRef.current && typeof fgRef.current.zoomToFit === 'function') {
          fgRef.current.zoomToFit(400);
          isInitializedRef.current = true;
        }
      }, 500);
    }
  }, [graphData.nodes.length]);

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback((node: any) => {
    if (onNodeClick) {
      // 노드 클릭 이벤트를 전달하되, 그래프 상태는 변경하지 않음
      onNodeClick(node as GraphNode);
    }
    
    // 노드를 클릭하면 해당 노드를 중심으로 확대
    try {
      if (fgRef.current) {
        // 그래프 라이브러리에 따라 다른 메서드를 사용할 수 있음
        if (typeof fgRef.current.centerAt === 'function') {
          const x = node.x || 0;
          const y = node.y || 0;
          fgRef.current.centerAt(x, y, 1000);
          fgRef.current.zoom(2, 1000);
        } else if (typeof fgRef.current.zoomToFit === 'function') {
          // 대체 메서드: zoomToFit
          fgRef.current.zoomToFit(400, 500);
        }
      }
    } catch (err) {
      console.error('노드 확대 중 오류 발생:', err);
    }
  }, [onNodeClick]);

  const handleToggle3D = useCallback(() => {
    setUse3D(prev => !prev);
    isInitializedRef.current = false; // 3D/2D 전환 시 초기화 상태 리셋
  }, []);

  // 노드 렌더링 함수 (2D)
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 14;
    const nodeSize = Math.sqrt(node.val) * 2 / globalScale;
    
    // 노드 그리기
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
    ctx.fillStyle = node.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();
    
    // 라벨 그리기
    if (globalScale > 0.4) {
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(label, node.x, node.y);
    }
    
    return true; // 기본 노드 렌더링 방지
  }, []);

  // 로딩 중이거나 오류 발생 시 표시할 컴포넌트
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // 그래프 데이터 유효성 검사
  const validLinks = graphData.links.filter(link => {
    const sourceExists = graphData.nodes.some(node => node.id === link.source);
    const targetExists = graphData.nodes.some(node => node.id === link.target);
    return sourceExists && targetExists;
  });

  const validGraphData = {
    nodes: graphData.nodes,
    links: validLinks
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', width: '100%', position: 'relative' }}>
      <Paper sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, p: 2 }}>
        <FormControlLabel
          control={<Switch checked={use3D} onChange={handleToggle3D} />}
          label="3D 모드"
        />
        <Typography variant="body2" sx={{ mt: 1 }}>
          PM 수: {validGraphData.nodes.length}, 관계 수: {validGraphData.links.length}
        </Typography>
      </Paper>

      {use3D ? (
        <ForceGraph3D
          ref={fgRef}
          graphData={validGraphData}
          nodeLabel={(node: any) => node.name}
          nodeColor={(node: any) => node.color}
          nodeVal={(node: any) => node.val}
          linkWidth={(link: any) => link.value || 1}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.25}
          onNodeClick={handleNodeClick}
          backgroundColor="#f5f5f5"
          linkColor={() => '#999999'}
          nodeOpacity={0.9}
          linkOpacity={0.6}
          nodeResolution={16}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.1}
          warmupTicks={100}
          cooldownTime={15000} // 15초 동안 안정화
          onEngineStop={handleGraphInit}
        />
      ) : (
        <ForceGraph2D
          ref={fgRef}
          graphData={validGraphData}
          nodeCanvasObject={nodeCanvasObject}
          linkWidth={(link: any) => link.value || 1}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.25}
          onNodeClick={handleNodeClick}
          cooldownTime={15000} // 15초 동안 안정화
          linkColor={() => '#999999'}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.1}
          onEngineStop={handleGraphInit}
        />
      )}
    </Box>
  );
};

export default PMGraph; 