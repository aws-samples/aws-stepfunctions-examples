import { KeyValuePairs } from '@aws-northstar/ui';
import { Box, Container, SpaceBetween } from '@cloudscape-design/components';
import moment from 'moment';

import { formatBytes } from '../../../../helpers/util';

interface FileDetailPanelProps {
  file: OwnedFile;
}

export const FileDetailPanel = ({ file }: FileDetailPanelProps) => {
  return (
    <Container>
      <Box>
        <SpaceBetween size="m" direction="vertical">
          <Box variant="h3">File details</Box>
          <KeyValuePairs
            items={[
              [
                {
                  label: 'File',
                  value: file.filename,
                },
                {
                  label: 'Source',
                  value: 'Uploaded',
                },
              ],
              [
                {
                  label: 'Uploaded',
                  value: `${moment(file.dateAdded).format('ll')} (${moment(
                    file.dateAdded
                  ).fromNow()})`,
                },
                {
                  label: 'File size',
                  value: formatBytes(file.size),
                },
              ],
            ]}
          />
        </SpaceBetween>
        <Box variant="p" />
      </Box>
    </Container>
  );
};

export default FileDetailPanel;
