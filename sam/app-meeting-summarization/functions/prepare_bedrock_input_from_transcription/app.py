import json
import boto3

def lambda_handler(event, context):

    # Create S3 Client
    s3 = boto3.client('s3')
    
    # Load the transcript from file in S3
    obj = s3.get_object(Bucket=event['bucket_name'], Key=event['key'])
    data = obj['Body'].read()
    data_obj = json.loads(data)
    transcript = data_obj['results']['transcripts'][0]['transcript']
    
    # Create prompt object to write out to S3
    prompt_obj = {
        'prompt': 'Human: {}\n\n{}\n\nAssistant:'.format(event['prompt_text'],transcript),
        'max_tokens_to_sample': 4096
    }
    body_text = json.dumps(prompt_obj)
    target_key = '{}.prompt.json'.format(event['key'])
    s3.put_object(
        Bucket=event['bucket_name'],
        Key=target_key,
        Body=body_text
    )
    
    return {
        'bucket': event['bucket_name'],
        'key': target_key,
        's3uri': 's3://{}/{}'.format(event['bucket_name'],target_key)
    }