import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { PM } from '../types/pm';
import {
  RequirementItem,
  RequirementRelation,
  extractRequirements,
  groupRequirementsByType,
  groupRequirementsByPM,
  findRelatedRequirementIds
} from '../utils/requirementTraceabilityUtils';

interface RequirementTraceabilityViewProps {
  pmData: PM[];
  loading: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`req-tabpanel-${index}`}
      aria-labelledby={`req-tab-${index}`}
      style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const RequirementTraceabilityView: React.FC<RequirementTraceabilityViewProps> = ({ pmData, loading }) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPM, setFilterPM] = useState('all');
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  // 요구사항 데이터 추출
  const requirements = useMemo(() => {
    return extractRequirements(pmData);
  }, [pmData]);

  // 요구사항 타입 및 PM 목록
  const requirementTypes = useMemo(() => {
    const types = new Set<string>();
    requirements.forEach(req => types.add(req.type));
    return Array.from(types);
  }, [requirements]);

  const pmNames = useMemo(() => {
    const names = new Set<string>();
    requirements.forEach(req => names.add(req.pmName));
    return Array.from(names);
  }, [requirements]);

  // 필터링된 요구사항
  const filteredRequirements = useMemo(() => {
    return requirements.filter(req => {
      // 검색어 필터링
      const searchMatch = 
        searchTerm === '' || 
        req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 타입 필터링
      const typeMatch = filterType === 'all' || req.type === filterType;
      
      // PM 필터링
      const pmMatch = filterPM === 'all' || req.pmName === filterPM;
      
      return searchMatch && typeMatch && pmMatch;
    });
  }, [requirements, searchTerm, filterType, filterPM]);

  // 요구사항 그룹화
  const requirementsByType = useMemo(() => {
    return groupRequirementsByType(filteredRequirements);
  }, [filteredRequirements]);

  const requirementsByPM = useMemo(() => {
    return groupRequirementsByPM(filteredRequirements);
  }, [filteredRequirements]);

  // 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 필터 변경 핸들러
  const handleTypeFilterChange = (event: SelectChangeEvent) => {
    setFilterType(event.target.value);
  };

  const handlePMFilterChange = (event: SelectChangeEvent) => {
    setFilterPM(event.target.value);
  };

  // 요구사항 클릭 핸들러 (하이라이트)
  const handleRequirementClick = (requirement: RequirementItem) => {
    const relatedIds = findRelatedRequirementIds(requirement);
    setHighlightedIds(relatedIds);
  };

  // 하이라이트 클리어
  const clearHighlight = () => {
    setHighlightedIds([]);
  };

  // 요구사항 행 렌더링
  const renderRequirementRow = (req: RequirementItem) => {
    const isHighlighted = highlightedIds.includes(req.id);
    const hasRelations = req.relations.length > 0;
    
    return (
      <TableRow 
        key={req.id} 
        hover 
        onClick={() => handleRequirementClick(req)}
        sx={{ 
          backgroundColor: isHighlighted ? 'rgba(144, 202, 249, 0.2)' : 'inherit',
          cursor: 'pointer'
        }}
      >
        <TableCell>{req.type}</TableCell>
        <TableCell>{req.name}</TableCell>
        <TableCell>{req.spec}</TableCell>
        <TableCell>
          {hasRelations ? (
            <Tooltip title={`${req.relations.length}개의 추적 관계`}>
              <IconButton size="small" color="primary">
                <LinkIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="추적 관계 없음">
              <IconButton size="small" color="default" disabled>
                <LinkOffIcon />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
        <TableCell>{req.pmName}</TableCell>
      </TableRow>
    );
  };

  // 관계 테이블 렌더링
  const renderRelationsTable = () => {
    // 하이라이트된 요구사항이 없으면 안내 메시지 표시
    if (highlightedIds.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            요구사항을 클릭하면 추적 관계가 표시됩니다.
          </Typography>
        </Box>
      );
    }

    // 하이라이트된 요구사항 찾기
    const selectedReq = requirements.find(req => req.id === highlightedIds[0]);
    if (!selectedReq) return null;

    // 관계가 없으면 안내 메시지 표시
    if (selectedReq.relations.length === 0) {
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">{selectedReq.name} ({selectedReq.type})</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            이 요구사항에는 추적 관계가 없습니다.
          </Typography>
        </Box>
      );
    }

    // 내부 추적과 상하위 추적으로 관계 분류
    const internalRelations = selectedReq.relations.filter(rel => rel.relationType === 'internal');
    const hierarchicalRelations = selectedReq.relations.filter(rel => rel.relationType === 'hierarchical');

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">{selectedReq.name} ({selectedReq.type})</Typography>
          <Chip 
            label="하이라이트 초기화" 
            size="small" 
            onClick={(e) => { e.stopPropagation(); clearHighlight(); }}
            color="primary"
            variant="outlined"
          />
        </Box>

        {internalRelations.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>PM 내부 추적 관계</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>타입</TableCell>
                    <TableCell>이름</TableCell>
                    <TableCell>Spec</TableCell>
                    <TableCell>추적 방법</TableCell>
                    <TableCell>PM</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {internalRelations.map((relation, index) => (
                    <TableRow key={`internal-${index}`} hover>
                      <TableCell>{relation.targetType}</TableCell>
                      <TableCell>{relation.targetName}</TableCell>
                      <TableCell>{relation.spec}</TableCell>
                      <TableCell>
                        <Chip 
                          label={relation.relationMethod === 'name' ? '이름 기반' : '명시적'} 
                          size="small"
                          color={relation.relationMethod === 'name' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{relation.pmName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {hierarchicalRelations.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>PM 상하위 간 추적 관계</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>타입</TableCell>
                    <TableCell>이름</TableCell>
                    <TableCell>Spec</TableCell>
                    <TableCell>추적 방법</TableCell>
                    <TableCell>PM</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hierarchicalRelations.map((relation, index) => (
                    <TableRow key={`hierarchical-${index}`} hover>
                      <TableCell>{relation.targetType}</TableCell>
                      <TableCell>{relation.targetName}</TableCell>
                      <TableCell>{relation.spec}</TableCell>
                      <TableCell>
                        <Chip 
                          label={relation.relationMethod === 'name' ? '이름 기반' : '명시적'} 
                          size="small"
                          color={relation.relationMethod === 'name' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{relation.pmName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 필터 영역 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <TextField
            label="요구사항 검색"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: '200px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel>요구사항 타입</InputLabel>
            <Select
              value={filterType}
              label="요구사항 타입"
              onChange={handleTypeFilterChange}
            >
              <MenuItem value="all">모든 타입</MenuItem>
              {requirementTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel>PM</InputLabel>
            <Select
              value={filterPM}
              label="PM"
              onChange={handlePMFilterChange}
            >
              <MenuItem value="all">모든 PM</MenuItem>
              {pmNames.map(name => (
                <MenuItem key={name} value={name}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* 메인 콘텐츠 영역 */}
      <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100% - 80px)' }}>
        {/* 왼쪽: 요구사항 목록 */}
        <Paper sx={{ width: '60%', mr: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
              <Tab label="전체 요구사항" />
              <Tab label="타입별 요구사항" />
              <Tab label="PM별 요구사항" />
            </Tabs>
          </Box>

          {/* 전체 요구사항 탭 */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>타입</TableCell>
                    <TableCell>이름</TableCell>
                    <TableCell>Spec</TableCell>
                    <TableCell>추적</TableCell>
                    <TableCell>PM</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequirements.map(req => renderRequirementRow(req))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* 타입별 요구사항 탭 */}
          <TabPanel value={tabValue} index={1}>
            {Object.entries(requirementsByType).map(([type, reqs]) => (
              <Box key={type} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{type} ({reqs.length})</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>이름</TableCell>
                        <TableCell>Spec</TableCell>
                        <TableCell>추적</TableCell>
                        <TableCell>PM</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reqs.map(req => (
                        <TableRow 
                          key={req.id} 
                          hover 
                          onClick={() => handleRequirementClick(req)}
                          sx={{ 
                            backgroundColor: highlightedIds.includes(req.id) ? 'rgba(144, 202, 249, 0.2)' : 'inherit',
                            cursor: 'pointer'
                          }}
                        >
                          <TableCell>{req.name}</TableCell>
                          <TableCell>{req.spec}</TableCell>
                          <TableCell>
                            {req.relations.length > 0 ? (
                              <Tooltip title={`${req.relations.length}개의 추적 관계`}>
                                <IconButton size="small" color="primary">
                                  <LinkIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="추적 관계 없음">
                                <IconButton size="small" color="default" disabled>
                                  <LinkOffIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>{req.pmName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </TabPanel>

          {/* PM별 요구사항 탭 */}
          <TabPanel value={tabValue} index={2}>
            {Object.entries(requirementsByPM).map(([pmName, reqs]) => (
              <Box key={pmName} sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{pmName} ({reqs.length})</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>타입</TableCell>
                        <TableCell>이름</TableCell>
                        <TableCell>Spec</TableCell>
                        <TableCell>추적</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reqs.map(req => (
                        <TableRow 
                          key={req.id} 
                          hover 
                          onClick={() => handleRequirementClick(req)}
                          sx={{ 
                            backgroundColor: highlightedIds.includes(req.id) ? 'rgba(144, 202, 249, 0.2)' : 'inherit',
                            cursor: 'pointer'
                          }}
                        >
                          <TableCell>{req.type}</TableCell>
                          <TableCell>{req.name}</TableCell>
                          <TableCell>{req.spec}</TableCell>
                          <TableCell>
                            {req.relations.length > 0 ? (
                              <Tooltip title={`${req.relations.length}개의 추적 관계`}>
                                <IconButton size="small" color="primary">
                                  <LinkIcon />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Tooltip title="추적 관계 없음">
                                <IconButton size="small" color="default" disabled>
                                  <LinkOffIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </TabPanel>
        </Paper>

        {/* 오른쪽: 추적 관계 상세 */}
        <Paper sx={{ width: '40%', p: 0, overflow: 'auto' }}>
          {renderRelationsTable()}
        </Paper>
      </Box>
    </Box>
  );
};

export default RequirementTraceabilityView; 