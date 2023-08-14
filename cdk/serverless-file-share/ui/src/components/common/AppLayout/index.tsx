import { AmplifyUser, AuthEventData } from '@aws-amplify/ui';
import AppLayoutBase from '@aws-northstar/ui/components/AppLayout';
import { BreadcrumbGroup } from '@cloudscape-design/components';
import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { formatUserForNav } from '../../../helpers/util';
import { ApiService } from '../../../services/ApiService';
import { AppContext } from './context';

interface AppLayoutProps {
  signOut?: (data?: AuthEventData | undefined) => void;
  user?: AmplifyUser;
  children: ReactNode;
}

const AppLayout = ({ signOut, user, children }: AppLayoutProps) => {
  const location = useLocation();
  const navUser = formatUserForNav(user);
  const [breadcrumb, setBreadcrumb] = useState([{ text: 'Home', href: '/' }]);

  // add path attribute to <body> tag whenever route changes (for page specific css)
  useEffect(() => {
    document.querySelector('body')?.setAttribute('path', location.pathname);
  }, [location.pathname]);

  // sign out using amplify when user signs out through nav signout button
  const onSignOut = async () => {
    // clear local api cache on sign out
    const api = ApiService.getInstance();
    api.clearCache();

    // signout from cognito using amplify function
    if (signOut) {
      signOut();
    }
  };

  return (
    <AppLayoutBase
      title="Serverless File Sharing"
      navigationItems={[
        { href: '/', text: 'Home', type: 'link' },
        { href: '/files', text: 'My files', type: 'link' },
        { href: '/shared-files', text: 'Files shared with me', type: 'link' },
        { type: 'divider' },
        {
          external: true,
          href: 'https://docs.aws.amazon.com',
          text: 'Documentation',
          type: 'link',
        },
      ]}
      user={navUser}
      onSignout={onSignOut}
      breadcrumbGroup={<BreadcrumbGroup items={breadcrumb} />}
      navigationOpen={window.innerWidth > 688}
    >
      <AppContext.Provider value={{ breadcrumb, setBreadcrumb }}>
        {children}
      </AppContext.Provider>
    </AppLayoutBase>
  );
};

export default AppLayout;
