import { addFile } from '../../lib/database';
import { wrapHandler } from '../../lib/observability';
import { OwnedFile, ShareRequestWithUserAndFileInfo } from '../../types';

const lambdaHandler = async (event: ShareRequestWithUserAndFileInfo): Promise<ShareRequestWithUserAndFileInfo> => {
  const { fileId, file, user, recipients, expiryDate, downloadLimit } = event;

  // Generate current date to save to database
  const currentDate = new Date().toISOString();

  // construct object to save to database
  const dbFile: OwnedFile = {
    fileId,
    ...file,
    dateAdded: currentDate,
    ownerName: user.name,
    ownerEmail: user.email,
    recipients: recipients.map((recipient) => ({
      ...recipient,
      dateShared: currentDate,
      expiryDate,
      downloadLimit,
    })),
  };

  // Write data to database
  await addFile(dbFile);

  return event;
};

export const handler = wrapHandler(lambdaHandler);
