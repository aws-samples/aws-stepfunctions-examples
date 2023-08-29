import Table, { SelectionChangeDetail } from '@aws-northstar/ui/components/Table';
import {
  Box,
  Button,
  ContentLayout,
  Header,
  Link,
  SpaceBetween,
} from '@cloudscape-design/components';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import { FunctionComponent, useContext, useEffect, useState } from 'react';

import { formatBytes } from '../../../helpers/util';
import { ApiService } from '../../../services/ApiService';
import { AppContext } from '../../common/AppLayout/context';

const SharedFiles: FunctionComponent = () => {
  const [isLoading, setLoading] = useState(true);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SharedFile[]>([]);
  const { setBreadcrumb } = useContext(AppContext);

  const api = ApiService.getInstance();

  const init = async () => {
    setBreadcrumb([
      { text: 'Home', href: '/' },
      { text: 'Files shared with me', href: '/shared-files' },
    ]);

    const sharedFiles = await api.getSharedFiles();
    setFiles(sharedFiles);
    setLoading(false);
  };

  const refresh = async () => {
    setLoading(true);
    const sharedFiles = await api.getSharedFiles(true);
    setFiles(sharedFiles);
    setLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  const columnDefinitions = [
    {
      cell: (file: SharedFile) => {
        return (
          <Link external href={`/download/${file.fileId}`}>
            {file.filename}
          </Link>
        );
      },
      header: 'Name',
      id: 'filename',
      sortingField: 'filename',
      width: 500,
    },
    {
      cell: (file: SharedFile) => {
        return <>{formatBytes(file.size)}</>;
      },
      header: 'Size',
      id: 'size',
      sortingField: 'size',
      width: 400,
    },
    {
      cell: (file: SharedFile) => {
        return (
          <>
            <Box>{file.ownerName}</Box>
            <Box>
              <small>{file.ownerEmail}</small>
            </Box>
          </>
        );
      },
      header: 'Shared by',
      id: 'owner',
      sortingField: 'ownerName',
      width: 400,
    },
  ];

  const handleSelectionChange: NonCancelableEventHandler<
    SelectionChangeDetail<SharedFile>
  > = ({ detail }) => {
    setSelectedFiles(detail.selectedItems);
  };

  return (
    <ContentLayout header={<Header variant="h1">Files shared with me</Header>}>
      <Table
        columnDefinitions={columnDefinitions}
        header="Shared Files"
        items={files}
        selectedItems={selectedFiles}
        onColumnWidthsChange={() => {}}
        onEditCancel={() => {}}
        onRowClick={() => {}}
        onRowContextMenu={() => {}}
        onSelectionChange={handleSelectionChange}
        onSortingChange={() => {}}
        loading={isLoading}
        actions={
          <SpaceBetween direction="horizontal" size="s">
            <Button iconName="refresh" onClick={refresh} disabled={isLoading} />
          </SpaceBetween>
        }
      />
    </ContentLayout>
  );
};

export default SharedFiles;
