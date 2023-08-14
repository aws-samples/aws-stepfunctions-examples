import { componentTypes, validatorTypes } from '@aws-northstar/ui';

import { EMAIL_REGEX } from '../../../helpers/constants';
import { FileUploadComponent } from './components/FileUploadComponent';
import { ReviewTemplate } from './components/ReviewTemplate';
import { SelectExistingFile } from './components/SelectExistingFile';

export const selectFileStep = {
  name: 'step-select-file',
  title: 'Select a file',
  fields: [
    {
      component: 'radio',
      label: 'Which file do you want to share?',
      isRequired: true,
      name: 'source',
      options: [
        {
          label: 'Upload a new file',
          description: 'Upload a file and store it in this application',
          value: 'upload',
        },
        {
          label: 'Select an existing file',
          description: 'Share an existing file that has already been uploaded',
          value: 'existing',
        },
      ],
      validate: [
        {
          type: validatorTypes.REQUIRED,
        },
      ],
    },
    {
      component: componentTypes.CUSTOM,
      label: 'Select a file',
      description: 'Click below to select an existing file',
      CustomComponent: SelectExistingFile,
      isRequired: true,
      name: 'existingFile',
      validate: [
        {
          type: validatorTypes.REQUIRED,
          message: 'Please select a file to continue',
        },
      ],
      condition: {
        when: 'source',
        is: 'existing',
      },
    },
    {
      component: componentTypes.CUSTOM,
      label: 'Upload file',
      description: 'Click below to select a file to upload',
      CustomComponent: FileUploadComponent,
      isRequired: true,
      name: 'uploadedFiles',
      validate: [
        {
          type: validatorTypes.REQUIRED,
          message: 'Please upload a file to continue',
        },
      ],
      condition: {
        when: 'source',
        is: 'upload',
      },
    },
  ],
};

export const shareSteps = [
  {
    name: 'step-select-recipients',
    title: 'Select recipients',
    fields: [
      {
        component: 'field-array',
        isRequired: true,
        label: 'Who do you want to share this file with?',
        description: 'Enter the email address of recipients below',
        name: 'recipients',
        minItems: 1,
        addButtonText: 'Add recipient',
        validate: [{ type: validatorTypes.REQUIRED }],
        variant: 'embedded',
        fields: [
          {
            component: 'text-field',
            label: 'Email address',
            name: 'recipientEmail',
            isRequired: true,
            validate: [
              { type: validatorTypes.REQUIRED },
              {
                type: validatorTypes.PATTERN,
                pattern: EMAIL_REGEX,
                message: 'Please enter a valid email address',
              },
            ],
          },
          {
            component: 'checkbox',
            label: 'Notify?',
            description: 'Send email notification',
            name: 'notify',
          },
        ],
      },
    ],
  },
  {
    name: 'step-access',
    title: 'Access settings',
    description: 'Optional',
    fields: [
      {
        component: componentTypes.PLAIN_TEXT,
        name: 'access-header',
        label: 'Optional settings to restrict download access',
        element: 'h5',
      },
      {
        component: 'checkbox',
        label: 'Expire link?',
        description: 'Expire link after specific date',
        name: 'expiryEnabled',
      },
      {
        component: componentTypes.DATE_PICKER,
        description: 'Expiry date',
        name: 'expiryDate',
        condition: {
          when: 'expiryEnabled',
          is: true,
          then: {
            visible: true,
          },
        },
      },
      {
        component: 'checkbox',
        label: 'Limit downloads?',
        description: 'Limit number of times the file can be downloaded',
        name: 'limitEnabled',
      },
      {
        component: componentTypes.SELECT,
        description: 'Enter a limit (number)',
        name: 'limitAmount',
        options: Array.from({ length: 100 }).map((val, i) => {
          return { text: (i + 1).toString(), value: i + 1 };
        }),
        condition: {
          when: 'limitEnabled',
          is: true,
          then: {
            visible: true,
          },
        },
      },
    ],
  },
  {
    name: 'step-review',
    title: 'Review',
    fields: [
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Template: (details: any) => {
          return <ReviewTemplate {...details.data} />;
        },
        component: 'REVIEW',
        name: 'review',
      },
    ],
  },
];
