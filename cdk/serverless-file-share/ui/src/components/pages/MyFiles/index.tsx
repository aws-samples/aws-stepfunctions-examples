import { DeleteConfirmationDialog } from '@aws-northstar/ui';
import Table, { SelectionChangeDetail } from '@aws-northstar/ui/components/Table';
import {
  Button,
  ContentLayout,
  Header,
  Link,
  SpaceBetween,
  StatusIndicator,
  TextContent,
} from '@cloudscape-design/components';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import moment from 'moment';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatBytes } from '../../../helpers/util';
import { ApiService } from '../../../services/ApiService';
import { AppContext } from '../../common/AppLayout/context';

const MyFiles: FunctionComponent = () => {
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState(true);
  const [files, setFiles] = useState<OwnedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<OwnedFile[]>([]);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleteProcessing, setIsDeleteProcessing] = useState(false);
  const { setBreadcrumb } = useContext(AppContext);

  const api = ApiService.getInstance();

  const init = async () => {
    setBreadcrumb([
      { text: 'Home', href: '/' },
      { text: 'My Files', href: '/files' },
    ]);

    const ownedFiles = await api.getOwnedFiles();
    setFiles(ownedFiles);
    setLoading(false);
  };

  const refresh = async () => {
    setLoading(true);
    const ownedFiles = await api.getOwnedFiles(true);
    setFiles(ownedFiles);
    setLoading(false);
  };

  const onCreateClick = () => {
    navigate('/share');
  };

  const handleDelete = async () => {
    setIsDeleteProcessing(true);

    await api.removeFiles(selectedFiles);

    const updatedFiles = files.filter((file) => {
      return selectedFiles.indexOf(file) < 0;
    });

    setFiles(updatedFiles);
    setSelectedFiles([]);
    setDeleteModalVisible(false);
    setIsDeleteProcessing(false);
  };

  useEffect(() => {
    init();
  }, []);

  const columnDefinitions = [
    {
      cell: (file: OwnedFile) => (
        <span className="text-link">
          <Link onFollow={() => navigate(`/files/${file.fileId}`)}>{file.filename}</Link>
        </span>
      ),
      header: 'Name',
      id: 'filename',
      sortingField: 'filename',
      width: 500,
    },
    {
      cell: (file: OwnedFile) => formatBytes(file.size),
      header: 'Size',
      id: 'size',
      sortingField: 'size',
      width: 400,
    },
    {
      cell: (file: OwnedFile) => <>{moment(file.dateAdded).fromNow()}</>,
      header: 'Uploaded',
      id: 'source',
      sortingField: 'source',
      width: 200,
    },
    {
      cell: (file: OwnedFile) =>
        file.recipients && file.recipients.length > 0 ? (
          <>{file.recipients.length}</>
        ) : (
          <StatusIndicator type="warning">None</StatusIndicator>
        ),
      header: 'Recipients',
      id: 'recipients',
      sortingField: 'recipients',
      width: 200,
    },
  ];

  const handleSelectionChange: NonCancelableEventHandler<
    SelectionChangeDetail<OwnedFile>
  > = ({ detail }) => {
    setSelectedFiles(detail.selectedItems);
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Button onClick={onCreateClick} variant="primary">
              Share a file
            </Button>
          }
        >
          My Files
        </Header>
      }
    >
      <Table
        trackBy="fileId"
        columnDefinitions={columnDefinitions}
        header="My files"
        items={files}
        selectedItems={selectedFiles}
        onSelectionChange={handleSelectionChange}
        loading={isLoading}
        actions={
          <SpaceBetween direction="horizontal" size="s">
            <Button iconName="refresh" onClick={refresh} disabled={isLoading} />
            <Button
              disabled={selectedFiles.length === 0}
              onClick={() => setDeleteModalVisible(true)}
            >
              Delete
            </Button>
          </SpaceBetween>
        }
      />
      <DeleteConfirmationDialog
        variant="confirmation"
        visible={isDeleteModalVisible}
        title="Remove files"
        onCancelClicked={() => setDeleteModalVisible(false)}
        onDeleteClicked={handleDelete}
        loading={isDeleteProcessing}
      >
        <TextContent>Are you sure you want to remove these file(s)?</TextContent>
      </DeleteConfirmationDialog>
    </ContentLayout>
  );
};

export default MyFiles;
