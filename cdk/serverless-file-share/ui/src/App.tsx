// Import styles
import '@aws-amplify/ui-react/styles.css';
import './app.scss';

import { withAuthenticator, WithAuthenticatorProps } from '@aws-amplify/ui-react';
import NorthStarThemeProvider from '@aws-northstar/ui/components/NorthStarThemeProvider';
import { Amplify } from 'aws-amplify';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import amplifyConfig from './amplify';
import AppLayout from './components/common/AppLayout';
import Download from './components/pages/Download';
import FileDetails from './components/pages/FileDetails';
import Home from './components/pages/Home';
import MyFiles from './components/pages/MyFiles';
import Share from './components/pages/Share';
import SharedFiles from './components/pages/SharedFiles';

Amplify.configure(amplifyConfig);

const App = ({ user, signOut }: WithAuthenticatorProps) => {
  return (
    <Router>
      <NorthStarThemeProvider>
        <AppLayout signOut={signOut} user={user}>
          <Routes>
            <Route path="/share" element={<Share />} />
            <Route path="/share/:fileId" element={<Share />} />
            <Route path="/shared-files" element={<SharedFiles />} />
            <Route path="/files/:fileId" element={<FileDetails />} />
            <Route path="/files" element={<MyFiles />} />
            <Route path="/download/:fileId" element={<Download />} />
            <Route path="/" element={<Home />} />
          </Routes>
        </AppLayout>
      </NorthStarThemeProvider>
    </Router>
  );
};

export default withAuthenticator(App, { signUpAttributes: ['name'] });
