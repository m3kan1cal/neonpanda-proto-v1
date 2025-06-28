import { Navigate, useLocation } from 'react-router-dom';

const TrailingSlashRedirect = ({ to }) => {
  const location = useLocation();

  // Preserve query parameters and hash when redirecting
  const newPath = to + location.search + location.hash;

  return <Navigate to={newPath} replace />;
};

export default TrailingSlashRedirect;