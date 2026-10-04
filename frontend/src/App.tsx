import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ProjectorMode from './pages/teacher/ProjectorMode';
import ExamSetup from './pages/teacher/ExamSetup';
import StudentExam from './pages/student/StudentExam';
import StudentWaiting from './pages/student/StudentWaiting';
import ExamComplete from './pages/student/ExamComplete';
import LoadingSpinner from './components/ui/LoadingSpinner';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'teacher' | 'student' }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace /> : <LoginPage />} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/exam/:examId" element={<ProtectedRoute role="teacher"><ExamSetup /></ProtectedRoute>} />
      <Route path="/projector" element={<ProtectedRoute role="teacher"><ProjectorMode /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentWaiting /></ProtectedRoute>} />
      <Route path="/student/exam/:sessionId" element={<ProtectedRoute role="student"><StudentExam /></ProtectedRoute>} />
      <Route path="/student/complete/:sessionId" element={<ProtectedRoute role="student"><ExamComplete /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
