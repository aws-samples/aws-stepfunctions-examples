import { getDownloads, getFile } from '../../lib/database';
import { wrapHandler } from '../../lib/observability';
import { DownloadEventWithUserAndFileInfo, File, User } from '../../types';
import { DownloadRequestWithUserInfo } from '../../types';

const isRecipientAllowedToDownload = async (file: File, user: User) => {
  if (file.downloadLimit) {
    // check number of downloads from database
    const downloads = await getDownloads(file.fileId, user.id);

    if (downloads >= file.downloadLimit) {
      return false;
    }
  }

  if (file.expiryDate) {
    const currentDate = new Date();
    const expiryDate = new Date(file.expiryDate);

    if (currentDate > expiryDate) {
      return false;
    }
  }

  return true;
};

const lambdaHandler = async (event: DownloadRequestWithUserInfo): Promise<DownloadEventWithUserAndFileInfo> => {
  const { user, fileId } = event;

  // Check if user is allowed to download file
  let downloadAllowed = false;

  // check if recipient record exists (based on email address)
  let file = await getFile(fileId, user.email);

  if (file) {
    downloadAllowed = await isRecipientAllowedToDownload(file, user);
  } else {
    // if no matching recipient record found, check main record
    file = await getFile(fileId);

    // check if user is owner of the file
    if (file && file.ownerId === user.id) {
      downloadAllowed = true;
    }
  }

  // return error response if not allowed to download
  if (!file || !downloadAllowed) {
    throw new Error('User is not authorized to download or file does not exist');
  }

  // append file info to object and pass to next step
  return {
    ...event,
    file,
  };
};

export const handler = wrapHandler(lambdaHandler);
