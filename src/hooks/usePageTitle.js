import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { generatePageTitle } from '../utils/routeUtils';

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const newTitle = generatePageTitle(location.pathname);
    document.title = newTitle;
  }, [location.pathname]);
};
