// frontend/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CustomCursor from './components/CustomCursor'; // Import the new global component
import HomePage from './pages/HomePage';
import IndividualPredictPage from './pages/IndividualPredictPage';
import BatchPredictPage from './pages/BatchPredictPage';
import ExplorePage from './pages/ExplorePage';
import FeedbackPage from './pages/FeedbackPage';

function App() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/individual" element={<IndividualPredictPage />} />
          <Route path="/batch" element={<BatchPredictPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </main>

      <Footer />
      <Toaster position="bottom-right" />
    </>
  );
}

export default App;