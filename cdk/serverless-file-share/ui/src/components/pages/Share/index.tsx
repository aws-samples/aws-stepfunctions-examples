import { FormRenderer } from '@aws-northstar/ui';
import { Alert, Button, Container, Spinner } from '@cloudscape-design/components';
import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiService } from '../../../services/ApiService';
import { AppContext } from '../../common/AppLayout/context';
import { selectFileStep, shareSteps } from './constants';
import { generateBreadcrumb } from './utils';

export const Share = () => {
  const navigate = useNavigate();
  const { fileId } = useParams();
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isError, setError] = useState<boolean>(false);
  const [isSubmiting, setSubmitting] = useState(false);
  const [file, setFile] = useState<OwnedFile | undefined>(undefined);
  const { setBreadcrumb } = useContext(AppContext);

  const api = ApiService.getInstance();

  const init = async () => {
    if (!fileId) {
      setBreadcrumb([
        { text: 'Home', href: '/' },
        { text: 'My Files', href: '/files' },
        { text: 'Share a file', href: '/share' },
      ]);
      setLoading(false);
    } else {
      setBreadcrumb(generateBreadcrumb({ isLoading: true }));

      const file = await api.getOwnedFile(fileId);
      setLoading(false);

      if (!file) {
        setError(true);
        setBreadcrumb(generateBreadcrumb({ isError: true }));
      }

      if (file) {
        setFile(file);
        setBreadcrumb(generateBreadcrumb({ file }));
      }
    }
  };

  const onSubmit = async (data: unknown) => {
    const submissionData = data as ShareFileFormSubmission;
    const api = ApiService.getInstance();

    setSubmitting(true);
    await api.shareFile(submissionData);
    setSubmitting(false);
    navigate('/files');
  };

  const onCancel = () => {
    if (file) {
      navigate(`/files/${file.fileId}`);
    } else {
      navigate('/files');
    }
  };

  useEffect(() => {
    init();
  }, []);

  if (isLoading) {
    return (
      <Container>
        <Spinner /> Loading...
      </Container>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        action={<Button onClick={() => navigate('/')}>Go back</Button>}
        header="Whoops!"
      >
        The file you are trying to access does not exist or there was an issue trying to
        access it.
      </Alert>
    );
  }

  return (
    <FormRenderer
      isSubmitting={isSubmiting}
      onCancel={onCancel}
      onSubmit={onSubmit}
      initialValues={{
        source: file ? 'existing' : 'upload',
        recipients: [{ recipientEmail: '' }],
        existingFile: file,
      }}
      schema={{
        header: file ? 'Add recipients' : 'Share a file',
        description: file
          ? 'Share this file with additional recipients'
          : 'Upload or share a file with someone',
        fields: [
          {
            component: 'wizard',
            name: 'wizard',
            allowSkipTo: true,
            fields: file ? shareSteps : [selectFileStep, ...shareSteps],
          },
        ],
      }}
    />
  );
};

export default Share;
