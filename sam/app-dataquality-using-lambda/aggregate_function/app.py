import json
import boto3
import os
import polars as pl
import s3fs


def lambda_handler(event, context):
    # Extract bucket name from the Lambda event
    #bucket_name = event['Records'][0]['s3']['bucket']['name']
    fs = s3fs.S3FileSystem(config_kwargs={'region_name':'us-east-1'})
    # Initialize S3 client
    s3_client = boto3.client('s3')

    # event object has json structure as {good_file_key:"good_file_key"}. Get good_file_key from event object and assign to prefix
    prefix = event['good_file_key']
    print(f"prefix:{prefix}")

    # event object has json structure as {bucket_name:"bucket_name",}. Get bucket_name from event object and assign to bucket_name
    bucket_name = event['bucket_name']
    print(f"bucket_name:{bucket_name}")    

    response = s3_client.list_objects_v2(Bucket=bucket_name)
    print(f"response values:{response}")
    
    # List to store aggregated results
    aggregated_results = []

    # Iterate over S3 objects
    for obj in response.get('Contents', []):
        file_key = obj['Key']

        # Check if the file is in the "INPUT" folder
        if file_key.startswith(prefix):
            # Construct S3 URL
            s3_url = f"s3://{bucket_name}/{file_key}"

            # Check if the file exists
            try:
                s3_client.head_object(Bucket=bucket_name, Key=file_key)
            except Exception as e:
                print(f"Error: {e}")
                continue

            # Read CSV file from S3 using Polars
            df = pl.read_csv(s3_url, separator=';',has_header=True)


            # Perform aggregation by the "reviews" column
            aggregated_df = df.group_by('neighbourhood_group').agg([
                pl.col('reviews_per_month').mean().alias('average_reviews_per_month'),
                pl.col('price').mean().alias('average_price'),
                pl.col('price').min().alias('min_price'),
                pl.col('price').max().alias('max_price'),
            ])

            #Write aggregated results to S3
            output_path = f"s3://{bucket_name}/OUTPUT/aggregated-data.csv"
            with fs.open(output_path, mode='wb') as f:
                aggregated_df.write_csv(f)
            
    # Return the aggregated results as a JSON response
    return {
        'statusCode': 200
    }
