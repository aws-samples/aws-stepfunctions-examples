import { FieldInputProps, SelectionChangeDetail, Table } from '@aws-northstar/ui';
import { Button, FormField, StatusIndicator } from '@cloudscape-design/components';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import moment from 'moment';
import { useEffect, useState } from 'react';

import { formatBytes } from '../../../../helpers/util';
import { ApiService } from '../../../../services/ApiService';

interface SelectExistingFileProps {
  input: FieldInputProps<HTMLInputElement>;
  data: Record<string, object>;
  label?: string;
  description?: string;
  showError: boolean;
  meta: {
    error: string | undefined;
  };
}

export const SelectExistingFile = ({
  input,
  showError,
  meta: { error },
}: SelectExistingFileProps) => {
  const [isLoading, setLoading] = useState(true);
  const [files, setFiles] = useState<OwnedFile[]>([]);
  const selectedFiles: OwnedFile[] = [];

  const api = ApiService.getInstance();

  const init = async () => {
    const files = await api.getOwnedFiles();
    setFiles(files);
    setLoading(false);

    if (input.value) {
      const file = input.value as unknown as OwnedFile;
      selectedFiles.push(file);
    }
  };

  const refresh = async () => {
    setLoading(true);
    const ownedFiles = await api.getOwnedFiles(true);
    setFiles(ownedFiles);
    setLoading(false);
  };

  const handleSelectionChange: NonCancelableEventHandler<
    SelectionChangeDetail<OwnedFile>
  > = ({ detail }) => {
    if (detail.selectedItems.length > 0) {
      const file = detail.selectedItems[0];
      input.onChange(file);
    } else {
      input.onChange(undefined);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const columnDefinitions = [
    {
      cell: (file: OwnedFile) => file.filename,
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
      id: 'dateAdded',
      sortingField: 'dateAdded',
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

  return (
    <>
      <Table
        variant="embedded"
        selectionType="single"
        trackBy="fileId"
        columnDefinitions={columnDefinitions}
        items={files}
        selectedItems={selectedFiles}
        onSelectionChange={handleSelectionChange}
        loading={isLoading}
        actions={<Button iconName="refresh" onClick={refresh} disabled={isLoading} />}
      />
      <FormField errorText={showError && error}></FormField>
    </>
  );
};
