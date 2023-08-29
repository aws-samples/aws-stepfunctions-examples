type GenerateBreadcrumbArgs = {
  isLoading?: boolean;
  isError?: boolean;
  file?: OwnedFile;
};

export const generateBreadcrumb = ({
  isLoading,
  isError,
  file,
}: GenerateBreadcrumbArgs) => {
  const breadcrumbItems = [
    { text: 'Home', href: '/' },
    { text: 'My Files', href: '/files' },
  ];

  if (isLoading) {
    breadcrumbItems.push({ text: 'Loading...', href: '#' });
  }

  if (isError) {
    breadcrumbItems.push({ text: 'Error', href: '#' });
  }

  if (file) {
    breadcrumbItems.push({ text: file.filename, href: `/files/${file.fileId}` });
    breadcrumbItems.push({ text: 'Add Recipients', href: '#' });
  }

  return breadcrumbItems;
};
