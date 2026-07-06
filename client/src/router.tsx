import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';
import ManageVideosPage from './pages/ManageVideosPage';
import VideoDetailPage from './pages/VideoDetailPage';
import VideoSetsPage from './pages/VideoSetsPage';
import VideoSetDetailPage from './pages/VideoSetDetailPage';
import DataAnalysisPage from './pages/DataAnalysisPage';
import BarGraphPage from './pages/BarGraphPage';
import LineGraphPage from './pages/LineGraphPage';
import WordCloudPage from './pages/WordCloudPage';
import TextReportPage from './pages/TextReportPage';
import SharingPage from './pages/SharingPage';
import HelpPage from './pages/HelpPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'record', element: <RecordPage /> },
      { path: 'videos', element: <ManageVideosPage /> },
      { path: 'videos/:id', element: <VideoDetailPage /> },
      { path: 'videosets', element: <VideoSetsPage /> },
      { path: 'videosets/:id', element: <VideoSetDetailPage /> },
      { path: 'analysis', element: <DataAnalysisPage /> },
      { path: 'analysis/:setId/bar', element: <BarGraphPage /> },
      { path: 'analysis/:setId/line', element: <LineGraphPage /> },
      { path: 'analysis/:setId/cloud', element: <WordCloudPage /> },
      { path: 'analysis/:setId/report', element: <TextReportPage /> },
      { path: 'sharing', element: <SharingPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
