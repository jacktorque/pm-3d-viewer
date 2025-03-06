import axios from 'axios';
import { PM, PMResponse } from '../types/pm';

const API_BASE_URL = 'http://localhost:62278';

export const pmService = {
  // PM 리스트 가져오기
  async getPMList(search: string = ''): Promise<PM[]> {
    try {
      const response = await axios.get<PMResponse>(`${API_BASE_URL}/pm/?search=${search}`);
      return response.data.pm;
    } catch (error) {
      console.error('PM 리스트를 가져오는 중 오류 발생:', error);
      return [];
    }
  },

  // 특정 PM 상세 정보 가져오기
  async getPMDetail(pmId: string): Promise<PM | null> {
    try {
      const response = await axios.get<PM>(`${API_BASE_URL}/pm/${pmId}`);
      return response.data;
    } catch (error) {
      console.error('PM 상세 정보를 가져오는 중 오류 발생:', error);
      return null;
    }
  },

  // PM 트리 구조 가져오기
  async getPMTree(): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/pm/tree/`);
      return response.data;
    } catch (error) {
      console.error('PM 트리 구조를 가져오는 중 오류 발생:', error);
      return null;
    }
  }
}; 