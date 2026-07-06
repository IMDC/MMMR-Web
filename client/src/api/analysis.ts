import apiClient from './client';

export const analysisApi = {
  analyzeVideo: (videoId: string, skipTextReports = false) =>
    apiClient.post('/analysis/chatgpt', { videoId, skipTextReports }).then(r => r.data),

  analyzeVideoSet: (videoSetId: string) =>
    apiClient.post('/analysis/videoset-summary', { videoSetId }).then(r => r.data),

  getFrequencyData: (videoSetId: string, minCount = 2) =>
    apiClient.get(`/analysis/frequency/${videoSetId}`, { params: { minCount } }).then(r => r.data),

  getLineGraphData: (videoSetId: string, word: string) =>
    apiClient.get(`/analysis/linegraph/${videoSetId}`, { params: { word } }).then(r => r.data),

  reprocessFrequency: (videoId: string) =>
    apiClient.post('/analysis/reprocess-frequency', { videoId }).then(r => r.data),
};
