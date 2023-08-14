import { FieldInputProps, FileType, FileUpload } from '@aws-northstar/ui';

interface FileUploadComponentProps {
  input: FieldInputProps<HTMLInputElement>;
  data: Record<string, object>;
  label?: string;
  description?: string;
  showError: boolean;
  meta: {
    error: string | undefined;
  };
}

export const FileUploadComponent = ({
  input,
  data,
  label,
  description,
  showError,
  meta: { error },
}: FileUploadComponentProps) => {
  return (
    <>
      <FileUpload
        description={description}
        label={label}
        files={data[input.name] as FileType[]}
        onChange={input.onChange}
        errorText={showError && error}
      />
    </>
  );
};
