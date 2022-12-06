
import boto3

client = boto3.client('s3')

def handler(event, context):
    bucket = event['Name']

    if object_keys := [{'Key': i['Key']} for i in event.get( 'Contents', [] )]:
        response = client.delete_objects(
            Bucket=bucket,
            Delete={
                'Objects': object_keys,
            },
        )
        try:
            print(f"Deleted { len(response['Deleted']) } items")
        except KeyError:
            print(response)
            print(event)
            raise

    if token := event.get('NextContinuationToken'):
        return {
            'NextContinuationToken': token,
            "BucketToEmpty": bucket,
        }

    return {}
