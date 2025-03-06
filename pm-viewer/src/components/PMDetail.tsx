import React, { useState } from 'react';
import { 
  Typography, 
  Paper, 
  Divider, 
  List, 
  ListItem, 
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { PM, GraphNode, PMContent } from '../types/pm';

interface PMDetailProps {
  selectedNode: GraphNode | null;
  pmData: PM[];
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
      id={`pm-tabpanel-${index}`}
      aria-labelledby={`pm-tab-${index}`}
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

const PMDetail: React.FC<PMDetailProps> = ({ selectedNode, pmData }) => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedContent, setSelectedContent] = useState<PMContent | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleContentSelect = (content: PMContent) => {
    setSelectedContent(content);
    setTabValue(2); // 컨텐츠 상세 탭으로 이동
  };

  if (!selectedNode) {
    return (
      <Paper sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6">PM 상세 정보</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          그래프에서 PM 노드를 선택하면 상세 정보가 표시됩니다.
        </Typography>
      </Paper>
    );
  }

  // 선택된 노드의 PM 찾기
  const pm = pmData.find(p => p.id === selectedNode.id);
  if (!pm) return null;

  // PM 구조 관계 찾기
  const childPMs: PM[] = [];
  const parentPMs: PM[] = [];

  // 하위 PM 찾기 (PM구조 컨텐츠를 통해)
  pm.content.forEach(content => {
    if (content.type1 === 'PM구조' && content.spec) {
      const childPM = pmData.find(p => p.id === content.spec);
      if (childPM && !childPMs.some(p => p.id === childPM.id)) {
        childPMs.push(childPM);
      }
    }
  });

  // 상위 PM 찾기 (다른 PM의 PM구조 컨텐츠를 통해)
  pmData.forEach(otherPM => {
    if (otherPM.id !== pm.id) {
      otherPM.content.forEach(content => {
        if (content.type1 === 'PM구조' && content.spec === pm.id) {
          if (!parentPMs.some(p => p.id === otherPM.id)) {
            parentPMs.push(otherPM);
          }
        }
      });
    }
  });

  // 컨텐츠 타입별 그룹화
  const contentByType = pm.content.reduce((acc, content) => {
    if (!acc[content.type1]) {
      acc[content.type1] = [];
    }
    acc[content.type1].push(content);
    return acc;
  }, {} as Record<string, PMContent[]>);

  return (
    <Paper sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="기본 정보" />
          <Tab label="컨텐츠 목록" />
          {selectedContent && <Tab label="컨텐츠 상세" />}
        </Tabs>
      </Box>

      {/* 기본 정보 탭 */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h5">{pm.name}</Typography>
        <Chip 
          label={pm.status} 
          color={pm.status === '미확정' ? 'warning' : 'success'} 
          size="small" 
          sx={{ ml: 1 }} 
        />
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          생성일: {new Date(pm.createdAt).toLocaleDateString()}
        </Typography>
        
        {pm.description && (
          <Typography variant="body1" sx={{ mt: 2 }}>
            {pm.description}
          </Typography>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* 상위 PM 목록 */}
        <Typography variant="h6">상위 PM</Typography>
        {parentPMs.length > 0 ? (
          <List dense>
            {parentPMs.map(parentPM => (
              <ListItem key={parentPM.id}>
                <ListItemText 
                  primary={parentPM.name} 
                  secondary={parentPM.description || '설명 없음'} 
                />
                <Chip 
                  label={parentPM.status} 
                  size="small" 
                  color={parentPM.status === '미확정' ? 'warning' : 'success'} 
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            상위 PM이 없습니다.
          </Typography>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* 하위 PM 목록 */}
        <Typography variant="h6">하위 PM</Typography>
        {childPMs.length > 0 ? (
          <List dense>
            {childPMs.map(childPM => (
              <ListItem key={childPM.id}>
                <ListItemText 
                  primary={childPM.name} 
                  secondary={childPM.description || '설명 없음'} 
                />
                <Chip 
                  label={childPM.status} 
                  size="small" 
                  color={childPM.status === '미확정' ? 'warning' : 'success'} 
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            하위 PM이 없습니다.
          </Typography>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* 컨텐츠 유형 분포 */}
        <Typography variant="h6">컨텐츠 유형 분포</Typography>
        <Box sx={{ mt: 2 }}>
          {Object.entries(contentByType).map(([type, contents]) => (
            <Chip 
              key={type} 
              label={`${type}: ${contents.length}개`} 
              sx={{ m: 0.5 }} 
              variant="outlined"
              onClick={() => setTabValue(1)} // 컨텐츠 목록 탭으로 이동
            />
          ))}
        </Box>
      </TabPanel>

      {/* 컨텐츠 목록 탭 */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6">컨텐츠 목록</Typography>
        
        {Object.entries(contentByType).map(([type, contents]) => (
          <Accordion key={type} defaultExpanded={type === 'PM구조' || type === 'PM상속연결'}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{type} ({contents.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>이름</TableCell>
                      <TableCell>상태</TableCell>
                      <TableCell>상세</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contents.map((content) => (
                      <TableRow key={content.id} hover>
                        <TableCell>{content.name}</TableCell>
                        <TableCell>
                          <Chip 
                            label={content.status} 
                            size="small" 
                            color={content.status === '미확정' ? 'warning' : 'success'} 
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            size="small" 
                            onClick={() => handleContentSelect(content)}
                            color="primary"
                          >
                            <InfoIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </TabPanel>

      {/* 컨텐츠 상세 탭 */}
      {selectedContent && (
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>
              {selectedContent.type1}
            </Typography>
            <Typography variant="h6">{selectedContent.name}</Typography>
            <Chip 
              label={selectedContent.status} 
              color={selectedContent.status === '미확정' ? 'warning' : 'success'} 
              size="small" 
              sx={{ ml: 1 }} 
            />
          </Box>
          
          <List dense>
            {selectedContent.description && (
              <ListItem>
                <ListItemText 
                  primary="설명" 
                  secondary={selectedContent.description} 
                  primaryTypographyProps={{ variant: 'subtitle2' }}
                />
              </ListItem>
            )}
            {selectedContent.spec && (
              <ListItem>
                <ListItemText 
                  primary="사양" 
                  secondary={selectedContent.spec} 
                  primaryTypographyProps={{ variant: 'subtitle2' }}
                />
              </ListItem>
            )}
            {selectedContent.notes && (
              <ListItem>
                <ListItemText 
                  primary="메모" 
                  secondary={selectedContent.notes} 
                  primaryTypographyProps={{ variant: 'subtitle2' }}
                />
              </ListItem>
            )}
            <ListItem>
              <ListItemText 
                primary="생성일" 
                secondary={new Date(selectedContent.createdAt).toLocaleDateString()} 
                primaryTypographyProps={{ variant: 'subtitle2' }}
              />
            </ListItem>
          </List>
          
          {selectedContent.type1 === 'PM구조' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1">구조 참조</Typography>
              <Typography variant="body2" color="primary">
                {selectedContent.spec}
              </Typography>
              {pmData.find(p => p.id === selectedContent.spec) && (
                <Typography variant="body2">
                  참조 PM: {pmData.find(p => p.id === selectedContent.spec)?.name}
                </Typography>
              )}
            </>
          )}
          
          {selectedContent.type1 === 'PM상속연결' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1">상속 관계</Typography>
              <Typography variant="body2">
                상위: {selectedContent.name || '없음'}
              </Typography>
              <Typography variant="body2">
                하위: {selectedContent.description || '없음'}
              </Typography>
              <Typography variant="body2">
                연결 대상: {selectedContent.spec || '없음'}
              </Typography>
            </>
          )}
        </TabPanel>
      )}
    </Paper>
  );
};

export default PMDetail; 