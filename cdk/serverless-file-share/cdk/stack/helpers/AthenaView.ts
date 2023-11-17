import { Database as GlueDatabase } from '@aws-cdk/aws-glue-alpha';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

interface AthenaViewProps {
  viewName: string;
  sqlQuery: string;
  database: GlueDatabase;
  outputBucket: s3.Bucket;
  tables: string[];
}

export class AthenaView extends Construct {
  constructor(scope: Construct, id: string, props: AthenaViewProps) {
    super(scope, id);

    const { viewName, sqlQuery, database, outputBucket, tables } = props;

    const iamResources = [
      cdk.Arn.format({ service: 'athena', resource: 'workgroup', resourceName: '*' }, cdk.Stack.of(this)),
      cdk.Arn.format({ service: 'glue', resource: 'catalog' }, cdk.Stack.of(this)),
      cdk.Arn.format({ service: 'glue', resource: 'database', resourceName: database.databaseName }, cdk.Stack.of(this)),
      cdk.Arn.format({ service: 'glue', resource: 'table', resourceName: viewName }, cdk.Stack.of(this)),
    ];

    tables.forEach((table) =>
      iamResources.push(cdk.Arn.format({ service: 'glue', resource: 'table', resourceName: table }, cdk.Stack.of(this))),
    );

    new AwsCustomResource(this, id, {
      onUpdate: {
        service: 'Athena',
        action: 'StartQueryExecution',
        parameters: {
          QueryString: `CREATE OR REPLACE VIEW ${viewName} AS ${sqlQuery}`,
          ResultConfiguration: {
            OutputLocation: `s3://${outputBucket.bucketName}`,
          },
          QueryExecutionContext: {
            Database: database.databaseName,
          },
        },
        physicalResourceId: PhysicalResourceId.of(id),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'athena:StartQueryExecution',
            'athena:GetQueryExecution',
            'glue:GetTable',
            'glue:GetDatabase',
            'glue:GetPartition',
            'glue:CreateTable',
            'glue:UpdateTable',
            'glue:DeleteTable',
          ],
          resources: iamResources,
        }),
        new iam.PolicyStatement({
          actions: [
            's3:GetBucketLocation',
            's3:GetObject',
            's3:ListBucket',
            's3:ListBucketMultipartUploads',
            's3:ListMultipartUploadParts',
            's3:AbortMultipartUpload',
            's3:CreateBucket',
            's3:PutObject',
          ],
          resources: [outputBucket.bucketArn, `${outputBucket.bucketArn}/*`],
        }),
      ]),
    });
  }
}
