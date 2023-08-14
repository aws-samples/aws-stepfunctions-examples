import { Box, Button, Popover, StatusIndicator } from '@cloudscape-design/components';

interface CopyToClipboardProps {
  buttonText?: string;
  copyMessage?: string;
  hoverMessage?: string;
  content: string;
}

export const CopyToClipboard = ({
  buttonText,
  copyMessage,
  hoverMessage,
  content,
}: CopyToClipboardProps) => {
  return (
    <Box display="inline-block">
      <Popover
        size="small"
        position="top"
        triggerType="custom"
        dismissButton={false}
        content={
          <StatusIndicator type="success">
            {copyMessage || 'Copied to clipboard'}
          </StatusIndicator>
        }
      >
        <Button
          variant={!buttonText ? 'inline-icon' : undefined}
          iconName="copy"
          ariaLabel={hoverMessage || 'Copy to clipboard'}
          onClick={() => {
            navigator.clipboard.writeText(content);
          }}
        >
          {buttonText}
        </Button>
      </Popover>
    </Box>
  );
};

export default CopyToClipboard;
