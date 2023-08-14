import { KeyValuePair } from '@aws-northstar/ui';
import {
  Box,
  ColumnLayout,
  SpaceBetween,
  StatusIndicator,
  Table,
} from '@cloudscape-design/components';
import moment from 'moment';

const fileTypeDescription = {
  upload: 'Upload a new file',
  existing: 'Existing file',
};

export const ReviewTemplate = (data: ShareFileFormSubmission) => {
  return (
    <SpaceBetween size="xxl">
      <Box>
        <SpaceBetween size="s">
          <Box variant="h3">File details</Box>
          <ColumnLayout columns={2}>
            <KeyValuePair label="File type" value={fileTypeDescription[data.source]} />
            <KeyValuePair
              label="File"
              value={
                data.source === 'upload'
                  ? data.uploadedFiles[0].name
                  : data.existingFile?.filename
              }
            />
          </ColumnLayout>
        </SpaceBetween>
      </Box>
      <Box>
        <Box variant="h3">Recipients</Box>
        <Table
          variant="embedded"
          items={data.recipients}
          columnDefinitions={[
            {
              id: 'recipientEmail',
              header: 'Email',
              cell: (item) => item.recipientEmail,
              width: '50%',
            },
            {
              id: 'notify',
              header: 'Notify',
              cell: (item) => (item.notify ? <>Yes</> : <>No</>),
            },
          ]}
        />
      </Box>
      <Box margin={{ bottom: 's' }}>
        <SpaceBetween size="s">
          <Box variant="h3">Access Settings</Box>
          <ColumnLayout columns={2}>
            <KeyValuePair
              label="Expiry"
              value={
                !data.expiryEnabled ? (
                  <StatusIndicator type="warning" colorOverride="blue">
                    No expiry
                  </StatusIndicator>
                ) : (
                  moment.utc(data.expiryDate).format('ll')
                )
              }
            />
            <KeyValuePair
              label="Download limit"
              value={
                !data.limitEnabled ? (
                  <StatusIndicator type="warning" colorOverride="blue">
                    Unlimited downloads
                  </StatusIndicator>
                ) : (
                  data.limitAmount && data.limitAmount.value.toString()
                )
              }
            />
          </ColumnLayout>
        </SpaceBetween>
      </Box>
    </SpaceBetween>
  );
};
