import boto3
import csv
from io import StringIO
import os

region = os.getenv('REGION')
count = os.getenv('RECORDCOUNT')
s3_client = boto3.client('s3', region_name=region)
s3 = boto3.resource('s3')

def lambda_handler(event, context):
  data = []
  for i in range(1, (int(count) + 1)):
    data.append({
      'num': i
    })

  stream = StringIO()
  headers = list(data[0].keys())
  writer = csv.DictWriter(stream, fieldnames=headers)
  writer.writeheader()
  writer.writerows(data)
  body = stream.getvalue()

  dst = s3.Object(event['bucket'], 'inventory/numbers.csv')
  dst.put(Body=body)