import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  AppBar, 
  Toolbar, 
  Typography, 
  TextField, 
  Button,
  IconButton,
  Drawer,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import { PM, GraphNode } from './types/pm';
import { pmService } from './services/pmService';
import PMGraph from './components/PMGraph';
import PMDetail from './components/PMDetail';
import RequirementTraceabilityView from './components/RequirementTraceabilityView';

import './App.css';

// 뷰 타입 정의
type ViewType = 'structure' | 'traceability';

function App() {
  const [pmData, setPmData] = useState<PM[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [sampleData, setSampleData] = useState<boolean>(false);
  const [viewType, setViewType] = useState<ViewType>('structure');

  // PM 데이터 로드
  const loadPMData = async () => {
    setLoading(true);
    try {
      const data = await pmService.getPMList(searchTerm);
      setPmData(data);
    } catch (error) {
      console.error('PM 데이터 로드 중 오류 발생:', error);
      // 오류 발생 시 샘플 데이터 사용
      if (!sampleData) {
        loadSampleData();
      }
    } finally {
      setLoading(false);
    }
  };

  // 샘플 데이터 로드 (API 연결이 안 될 경우)
  const loadSampleData = async () => {
    setLoading(true);
    try {
      // 샘플 데이터 파일 로드
      const response = await fetch('/sample_pm.json');
      const data = await response.json();
      setPmData(data.pm);
      setSampleData(true);
    } catch (error) {
      console.error('샘플 데이터 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadPMData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색 처리
  const handleSearch = () => {
    loadPMData();
  };

  // 노드 클릭 처리 - useCallback으로 메모이제이션하여 불필요한 리렌더링 방지
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    if (window.innerWidth < 960) {
      setDrawerOpen(true);
    }
  }, []);

  // 새로고침 처리
  const handleRefresh = () => {
    setSelectedNode(null);
    loadPMData();
  };

  // 뷰 타입 변경 처리
  const handleViewTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewType: ViewType | null
  ) => {
    if (newViewType !== null) {
      setViewType(newViewType);
      // 뷰 타입이 변경되면 선택된 노드 초기화
      setSelectedNode(null);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2, display: { xs: 'block', md: 'none' } }}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            PM 뷰어
          </Typography>

          {/* 뷰 타입 전환 버튼 */}
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={handleViewTypeChange}
            aria-label="뷰 타입"
            sx={{ mr: 2, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 1 }}
          >
            <ToggleButton value="structure" aria-label="PM 구조 뷰" sx={{ color: 'white' }}>
              <AccountTreeIcon sx={{ mr: 1 }} />
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                구조 뷰
              </Typography>
            </ToggleButton>
            <ToggleButton value="traceability" aria-label="요구사항 추적성 뷰" sx={{ color: 'white' }}>
              <TrackChangesIcon sx={{ mr: 1 }} />
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                추적성 뷰
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          {viewType === 'structure' && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="PM 검색"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ 
                  mr: 1, 
                  backgroundColor: 'white', 
                  borderRadius: 1,
                  width: { xs: '120px', sm: '200px' }
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={handleSearch}
                startIcon={<SearchIcon />}
              >
                검색
              </Button>
            </Box>
          )}
          <IconButton color="inherit" onClick={handleRefresh} sx={{ ml: 1 }}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ mt: 2, mb: 2, height: 'calc(100vh - 80px)' }}>
        {viewType === 'structure' ? (
          // PM 구조 뷰
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {/* 그래프 영역 */}
            <Grid item xs={12} md={8} sx={{ height: '100%' }}>
              <PMGraph 
                pmData={pmData} 
                loading={loading} 
                onNodeClick={handleNodeClick} 
              />
            </Grid>

            {/* 상세 정보 영역 (데스크톱) */}
            <Grid item md={4} sx={{ height: '100%', display: { xs: 'none', md: 'block' } }}>
              <PMDetail selectedNode={selectedNode} pmData={pmData} />
            </Grid>
          </Grid>
        ) : (
          // 요구사항 추적성 뷰
          <RequirementTraceabilityView pmData={pmData} loading={loading} />
        )}
      </Container>

      {/* 모바일용 상세 정보 드로어 (구조 뷰에서만 사용) */}
      {viewType === 'structure' && (
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' } }}
        >
          <Box sx={{ width: 300, p: 2 }}>
            <PMDetail selectedNode={selectedNode} pmData={pmData} />
          </Box>
        </Drawer>
      )}

      {/* 로딩 인디케이터 */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      )}
    </Box>
  );
}

export default App;
