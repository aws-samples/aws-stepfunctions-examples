import { Database as GlueDatabase } from '@aws-cdk/aws-glue-alpha';
import * as cdk from 'aws-cdk-lib';
import * as glue from 'aws-cdk-lib/aws-glue';
import { Construct } from 'constructs';

interface GlueS3AccessLogTableProps {
  database: GlueDatabase;
  tableName: string;
  s3Location: string;
}

export class GlueS3AccessLogTable extends Construct {
  constructor(scope: Construct, id: string, props: GlueS3AccessLogTableProps) {
    super(scope, id);

    const { database, tableName, s3Location } = props;

    // Create a new Glue table for storing S3 access logs
    new glue.CfnTable(this, 'AccessLogsGlueTable', {
      catalogId: cdk.Aws.ACCOUNT_ID,
      databaseName: database.databaseName,
      tableInput: {
        name: tableName,
        storageDescriptor: {
          columns: [
            { name: 'bucket_owner', type: 'string' },
            { name: 'bucket', type: 'string' },
            { name: 'request_datetime', type: 'string' },
            { name: 'remote_ip', type: 'string' },
            { name: 'requester', type: 'string' },
            { name: 'request_id', type: 'string' },
            { name: 'operation', type: 'string' },
            { name: 'key', type: 'string' },
            { name: 'request_uri', type: 'string' },
            { name: 'http_status', type: 'int' },
            { name: 'error_code', type: 'string' },
            { name: 'bytes_sent', type: 'bigint' },
            { name: 'object_size', type: 'bigint' },
            { name: 'total_time', type: 'int' },
            { name: 'turn_around_time', type: 'int' },
            { name: 'referrer', type: 'string' },
            { name: 'user_agent', type: 'string' },
            { name: 'version_id', type: 'string' },
            { name: 'host_id', type: 'string' },
            { name: 'sigv', type: 'string' },
            { name: 'cipher_suite', type: 'string' },
            { name: 'auth_type', type: 'string' },
            { name: 'endpoint', type: 'string' },
            { name: 'tlsversion', type: 'string' },
          ],
          location: s3Location,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.RegexSerDe',
            parameters: {
              'input.regex':
                '([^ ]*) ([^ ]*) \\[(.*?)\\] ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (\\"[^"]*\\"|-) (-|[0-9]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (\\"[^"]*\\"|-) ([^ ]*)(?: ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*))?.*$',
            },
          },
        },
      },
    });
  }
}
