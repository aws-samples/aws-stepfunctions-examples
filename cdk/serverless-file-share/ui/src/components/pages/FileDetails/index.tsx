import { DeleteConfirmationDialog } from '@aws-northstar/ui';
import {
  Alert,
  Button,
  ContentLayout,
  Header,
  SpaceBetween,
  Spinner,
  TextContent,
} from '@cloudscape-design/components';
import { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { ApiService } from '../../../services/ApiService';
import { AppContext } from '../../common/AppLayout/context';
import CopyToClipboard from '../../common/CopyToClipboard';
import FileDetailPanel from './components/FileDetailPanel';
import { RecipientTable } from './components/RecipientTable';

export const FileDetails = () => {
  // router objects
  const { fileId } = useParams();
  const navigate = useNavigate();

  // page state
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isError, setError] = useState<boolean>(false);
  const [file, setFile] = useState<OwnedFile | undefined>(undefined);

  // delete modal state
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);

  // breadcrumb global state
  const { setBreadcrumb } = useContext(AppContext);

  const api = ApiService.getInstance();

  const setPageBreadcrumb = (text: string) => {
    setBreadcrumb([
      { text: 'Home', href: '/' },
      { text: 'My Files', href: '/files' },
      { text, href: '#' },
    ]);
  };

  const init = async () => {
    setPageBreadcrumb('Loading...');

    const file = await api.getOwnedFile(fileId);
    setLoading(false);

    if (!file) {
      setError(true);
      setPageBreadcrumb('Error');
    }

    if (file) {
      setFile(file);
      setPageBreadcrumb(file.filename);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const handleDelete = async () => {
    setIsDeleteProcessing(true);

    if (file) {
      await api.removeFiles([file]);
    }

    setDeleteModalVisible(false);
    setIsDeleteProcessing(false);
    navigate('/files');
  };

  const openFile = () => {
    window.open(`/download/${fileId}`);
  };

  if (isLoading) {
    return (
      <>
        <Spinner /> Loading...
      </>
    );
  }

  if (isError || !file) {
    return (
      <Alert
        type="error"
        action={<Button onClick={() => navigate('/files')}>Go back</Button>}
        header="Whoops!"
      >
        The file you are trying to access does not exist or there was an issue trying to
        access it.
      </Alert>
    );
  }

  return (
    <>
      <ContentLayout
        header={
          <Header
            variant="h2"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <CopyToClipboard
                  buttonText="Copy link"
                  content={`${window.location.origin}/download/${fileId}`}
                />
                <Button iconName="external" iconAlign="right" onClick={openFile}>
                  Open file
                </Button>
                <Button iconName="close" onClick={() => setDeleteModalVisible(true)}>
                  Delete
                </Button>
              </SpaceBetween>
            }
          >
            {file.filename}
          </Header>
        }
      >
        <SpaceBetween size="xl">
          <FileDetailPanel file={file} />
          <RecipientTable file={file} />
        </SpaceBetween>
      </ContentLayout>
      <DeleteConfirmationDialog
        variant="confirmation"
        visible={isDeleteModalVisible}
        title="Remove file"
        onCancelClicked={() => setDeleteModalVisible(false)}
        onDeleteClicked={handleDelete}
        loading={isDeleteProcessing}
      >
        <TextContent>Are you sure you want to remove this file?</TextContent>
      </DeleteConfirmationDialog>
    </>
  );
};

export default FileDetails;
