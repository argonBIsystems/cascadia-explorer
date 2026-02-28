import { useCallback, useRef, useState } from 'react';
import { Viewer } from 'cesium';
import { initCesium } from './lib/cesium-config';
import CesiumViewer from './components/viewer/CesiumViewer';
import EarthquakeLayer from './components/layers/EarthquakeLayer';
import SlabLayer from './components/layers/SlabLayer';
import FaultLayer from './components/layers/FaultLayer';
import GPSVectorLayer from './components/layers/GPSVectorLayer';
import ScenarioOverlay from './components/layers/ScenarioOverlay';
import TsunamiOverlay from './components/layers/TsunamiOverlay';
import AnnotationLayer from './components/layers/AnnotationLayer';
import LoadingScreen from './components/ui/LoadingScreen';
import TopBar from './components/controls/TopBar';
import LayerPanel from './components/controls/LayerPanel';
import BottomBar from './components/controls/BottomBar';
import ScenarioSelector from './components/controls/ScenarioSelector';
import TsunamiPlayer from './components/controls/TsunamiPlayer';
import WhatIfPanel from './components/controls/WhatIfPanel';
import InfoCard from './components/info/InfoCard';
import AnnotationInfoCard from './components/info/AnnotationInfoCard';
import CrossSectionView from './components/info/CrossSectionView';
import Legend from './components/ui/Legend';
import AboutModal from './components/ui/AboutModal';
import Timeline from './components/ui/Timeline';
import { useAppStore } from './store/useAppStore';

// Initialize Cesium Ion token
initCesium();

function App() {
  const globeReady = useAppStore((s) => s.globeReady);
  const setGlobeReady = useAppStore((s) => s.setGlobeReady);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const viewerRef = useRef<Viewer | null>(null);

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
          <GPSVectorLayer viewer={viewerRef.current} />
          <ScenarioOverlay viewer={viewerRef.current} />
          <TsunamiOverlay viewer={viewerRef.current} />
          <AnnotationLayer viewer={viewerRef.current} />
        </>
      )}

      {!loadingComplete && (
        <LoadingScreen
          globeReady={globeReady}
          onComplete={() => setLoadingComplete(true)}
        />
      )}

      {loadingComplete && (
        <>
          <TopBar onAboutClick={() => setAboutOpen(true)} />
          <LayerPanel />
          <BottomBar />
          <InfoCard />
          <AnnotationInfoCard />
          <CrossSectionView />
          <Legend />
          <ScenarioSelector />
          <TsunamiPlayer />
          <WhatIfPanel />
          <Timeline viewer={viewerRef.current} />
          {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
        </>
      )}
    </div>
  );
}

export default App;
