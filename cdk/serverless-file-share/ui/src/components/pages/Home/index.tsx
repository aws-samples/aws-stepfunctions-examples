import {
  Button,
  Container,
  ContentLayout,
  Header,
  SpaceBetween,
} from '@cloudscape-design/components';
import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppContext } from '../../common/AppLayout/context';

export const Home = () => {
  const navigate = useNavigate();
  const { setBreadcrumb } = useContext(AppContext);

  const init = () => {
    setBreadcrumb([{ text: 'Home', href: '/' }]);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Share files securely with anyone."
          actions={
            <Button variant="primary" onClick={() => navigate('/share')}>
              Share a file
            </Button>
          }
        >
          Welcome
        </Header>
      }
    >
      <SpaceBetween size="l" direction="vertical">
        <Container>
          <Header variant="h3">My files</Header>
          <p>If you would like to share a file with someone, you can:</p>
          <ul>
            <li>upload files directly to this application, or;</li>
            <li>share an existing file that you have uploaded previously.</li>
          </ul>
          <Button onClick={() => navigate('/files')}>Manage my files</Button>
        </Container>
        <Container>
          <Header variant="h3">Files shared with me</Header>
          <p>See files that have other people have shared with you.</p>
          <Button onClick={() => navigate('/shared-files')}>
            View files shared with me
          </Button>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
};

export default Home;
