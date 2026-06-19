import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Feed from './pages/Feed';
import PostView from './pages/PostView';

// A "Guard" component to ensure only logged-in users can see the Sanctuary
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-teal-500 animate-pulse">Loading Identity...</div>;
  if (!user) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-900 text-gray-100 font-sans">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route 
              path="/feed" 
              element={
                <ProtectedRoute>
                  <Feed />
                </ProtectedRoute>
              } 
            />
            {/* SECURITY FIX: The PostView is now locked behind the Auth Guard */}
            <Route 
              path="/post/:id" 
              element={
                <ProtectedRoute>
                  <PostView />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;