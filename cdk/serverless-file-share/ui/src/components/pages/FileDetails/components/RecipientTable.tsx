import {
  DeleteConfirmationDialog,
  SelectionChangeDetail,
  Table,
} from '@aws-northstar/ui';
import {
  Button,
  SpaceBetween,
  StatusIndicator,
  TextContent,
} from '@cloudscape-design/components';
import { NonCancelableEventHandler } from '@cloudscape-design/components/internal/events';
import moment from 'moment';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiService } from '../../../../services/ApiService';

interface RecipientTable {
  file: OwnedFile;
}

export const RecipientTable = ({ file }: RecipientTable) => {
  const navigate = useNavigate();

  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const api = ApiService.getInstance();

  const onSelectedRecipientsChange: NonCancelableEventHandler<
    SelectionChangeDetail<Recipient>
  > = ({ detail }) => {
    setSelectedRecipients(detail.selectedItems);
  };

  const handleRemoveRecipients = async () => {
    setIsDeleting(true);

    if (file) {
      await api.removeRecipients(file, selectedRecipients);
    }

    setSelectedRecipients([]);
    setDeleteModalVisible(false);
    setIsDeleting(false);
  };

  return (
    <>
      <Table
        header="Recipients"
        headerVariant="h3"
        selectedItems={selectedRecipients}
        onSelectionChange={onSelectedRecipientsChange}
        actions={
          <SpaceBetween size="xs" direction="horizontal">
            <Button
              disabled={selectedRecipients.length === 0}
              onClick={() => setDeleteModalVisible(true)}
            >
              Remove
            </Button>
            <Button onClick={() => navigate(`/share/${file.fileId}`)}>
              Add Recipients
            </Button>
          </SpaceBetween>
        }
        items={file.recipients}
        trackBy="recipientEmail"
        columnDefinitions={[
          {
            id: 'email',
            header: 'Email',
            cell: (recipient) => recipient.recipientEmail,
          },
          {
            id: 'expiry',
            header: 'Expiry',
            cell: (recipient) =>
              recipient.expiryDate ? (
                moment(recipient.expiryDate).format('ll')
              ) : (
                <StatusIndicator type="warning" colorOverride="blue">
                  No expiry
                </StatusIndicator>
              ),
          },
          {
            id: 'limit',
            header: 'Download limit',
            cell: (recipient) =>
              recipient.downloadLimit ? (
                recipient.downloadLimit
              ) : (
                <StatusIndicator type="warning" colorOverride="blue">
                  Unlimited
                </StatusIndicator>
              ),
          },
        ]}
      />

      <DeleteConfirmationDialog
        variant="confirmation"
        visible={isDeleteModalVisible}
        title="Remove recipients"
        onCancelClicked={() => setDeleteModalVisible(false)}
        onDeleteClicked={handleRemoveRecipients}
        loading={isDeleting}
        deleteButtonText="Remove"
      >
        <TextContent>
          <p>Are you sure you want to remove these recipients?</p>
          <p>They will no longer be able to access this file.</p>
        </TextContent>
      </DeleteConfirmationDialog>
    </>
  );
};

export default RecipientTable;
