import { useCallback, useRef, useState } from 'react';
import { Viewer } from 'cesium';
import { initCesium } from './lib/cesium-config';
import CesiumViewer from './components/viewer/CesiumViewer';
import EarthquakeLayer from './components/layers/EarthquakeLayer';
import SlabLayer from './components/layers/SlabLayer';
import FaultLayer from './components/layers/FaultLayer';
import VolcanoLayer from './components/layers/VolcanoLayer';
import SeismicRiskLayer from './components/layers/SeismicRiskLayer';
import LoadingScreen from './components/ui/LoadingScreen';
import ErrorBoundary from './components/ui/ErrorBoundary';
import TopBar from './components/controls/TopBar';
import LayerPanel from './components/controls/LayerPanel';
import BottomBar from './components/controls/BottomBar';
import MobileTabBar from './components/controls/MobileTabBar';
import MobileToolsDrawer from './components/controls/MobileToolsDrawer';
import InfoCard from './components/info/InfoCard';
import VolcanoInfoCard from './components/info/VolcanoInfoCard';
import RiskScoreCard from './components/info/RiskScoreCard';
import CrossSectionView from './components/info/CrossSectionView';
import Legend from './components/ui/Legend';
import AboutModal from './components/ui/AboutModal';
import DataSourcesModal from './components/ui/DataSourcesModal';
import TourOverlay from './components/ui/TourOverlay';
import Timeline from './components/ui/Timeline';
import { useAppStore } from './store/useAppStore';
import { useIsMobile } from './hooks/useIsMobile';
import { useUrlState } from './hooks/useUrlState';

// Initialize Cesium Ion token
initCesium();

function App() {
  useIsMobile();
  const isMobile = useAppStore((s) => s.isMobile);
  const globeReady = useAppStore((s) => s.globeReady);
  const setGlobeReady = useAppStore((s) => s.setGlobeReady);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const viewerRef = useRef<Viewer | null>(null);
  useUrlState(viewerRef.current);

  const handleGlobeReady = useCallback(
    (viewer: Viewer) => {
      viewerRef.current = viewer;
      setGlobeReady(true);
    },
    [setGlobeReady],
  );

  return (
    <div className="relative w-screen h-screen bg-base overflow-hidden">
      <CesiumViewer onReady={handleGlobeReady} />

      {viewerRef.current && (
        <>
          <EarthquakeLayer viewer={viewerRef.current} />
          <SlabLayer viewer={viewerRef.current} />
          <FaultLayer viewer={viewerRef.current} />
          <VolcanoLayer viewer={viewerRef.current} />
          <SeismicRiskLayer viewer={viewerRef.current} />
        </>
      )}

      {!loadingComplete && (
        <LoadingScreen
          globeReady={globeReady}
          onComplete={() => setLoadingComplete(true)}
        />
      )}

      {loadingComplete && (
        <ErrorBoundary>
          <TopBar onAboutClick={() => setAboutOpen(true)} onDataSourcesClick={() => setDataSourcesOpen(true)} onTourClick={() => setTourOpen(true)} />
          <LayerPanel />
          {!isMobile && <BottomBar />}
          <InfoCard />
          <VolcanoInfoCard />
          <RiskScoreCard />
          <CrossSectionView />
          <Legend />
          <Timeline viewer={viewerRef.current} />
          {isMobile && <MobileToolsDrawer />}
          {isMobile && <MobileTabBar />}
          {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
          {dataSourcesOpen && <DataSourcesModal onClose={() => setDataSourcesOpen(false)} />}
          {tourOpen && <TourOverlay viewer={viewerRef.current} onClose={() => setTourOpen(false)} />}
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;
