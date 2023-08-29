import { createContext } from 'react';

interface Breadcrumb {
  text: string;
  href: string;
}

// Define the type for the app context
interface AppContextType {
  breadcrumb: Breadcrumb[];
  setBreadcrumb: (newBreadcrumb: Breadcrumb[]) => void;
}

// Create the app context
export const AppContext = createContext<AppContextType>({
  breadcrumb: [],
  setBreadcrumb: () => {},
});
