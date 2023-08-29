import * as glue from '@aws-cdk/aws-glue-alpha';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { AthenaView } from '../helpers/AthenaView';
import { GlueS3AccessLogTable } from '../helpers/GlueS3AccessLogTable';

interface FileShareAnalyticsProps {
  account: string;
  analyticsBucket: s3.Bucket;
  loggingBucket: s3.Bucket;
}

export class FileShareAnalytics extends Construct {
  constructor(scope: Construct, id: string, props: FileShareAnalyticsProps) {
    super(scope, id);

    // Create a new Glue database for storing S3 access logs
    const glueDb = new glue.Database(this, 'database', {
      locationUri: `s3://${props.analyticsBucket.bucketName}`,
    });

    // Create a new Glue table for S3 access logs
    new GlueS3AccessLogTable(this, 'table', {
      database: glueDb,
      tableName: 'file_access_logs',
      s3Location: `s3://${props.loggingBucket.bucketName}/file_access_logs`,
    });

    // Create Athena view to query above access logs table
    new AthenaView(this, 'view', {
      viewName: 'user_access',
      database: glueDb,
      outputBucket: props.analyticsBucket,
      tables: ['file_access_logs'],
      sqlQuery: `
        SELECT
          request_datetime,
          REGEXP_EXTRACT(URL_DECODE(request_uri), 'x-amz-meta-recipient-id=([^& ]+)', 1) as recipient_id,
          REGEXP_EXTRACT(URL_DECODE(request_uri), 'x-amz-meta-recipient-email=([^& ]+)', 1) as recipient_email,
          REGEXP_EXTRACT(URL_DECODE(request_uri), 'x-amz-meta-filename=([^& ]+)', 1) as filename,
          key as filepath,
          bytes_sent
        FROM
          file_access_logs
        WHERE
          REGEXP_EXTRACT(URL_DECODE(request_uri), 'x-amz-meta-recipient-id=([^& ]+)', 1) != ''
          AND operation = 'REST.GET.OBJECT'
          AND http_status = 200
        ORDER BY
          request_datetime
      `,
    });
  }
}
