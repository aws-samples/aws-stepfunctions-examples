import json
import boto3

#Write a lambda handler to read input event into variables input_path and output_bucket
def lambda_handler(event, context):
    input_path = event['INPUT_PATH']
    output_bucket = event['OUTPUT_BUCKET']

    input_path = input_path.split('/')
    
    input_path = {'bucket': input_path[2], 'key': '/'.join(input_path[3:])}        
    file_name = input_path['key'].split('/')[-1]
    file_name = "input/"+file_name;

    # Read the file from the input_path and write it to the output_bucket
    s3 = boto3.client('s3')
    obj = s3.get_object(Bucket=input_path['bucket'], Key=input_path['key'])
    data = obj['Body'].read().decode('utf-8')
    s3.put_object(Body=data, Bucket=output_bucket, Key=file_name)
    return {
        'statusCode': 200,
        'body': json.dumps('Successfully copied the file!!')
    }