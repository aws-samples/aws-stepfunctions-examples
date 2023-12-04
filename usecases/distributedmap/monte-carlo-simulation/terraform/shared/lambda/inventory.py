import boto3
import csv
import gzip
from io import StringIO
from io import BytesIO
from botocore.client import Config
import os

# set a few variables we'll use to get our data
region = os.getenv('REGION')
count = os.getenv('RECORDCOUNT')
s3_client = boto3.client('s3', region_name=region)
s3 = boto3.resource('s3')

def get_zeroes(current, total):
  x = total - len(str(current))
  ret = ""
  for i in range(0, x):
    ret = ret + "0"
  return ret + str(current)

def lambda_handler(event, context):
  data = []
  length = len(str(count))
  start = 0
  end = 0
  for x in range(0, len(event['Items'])):
    source = s3_client.get_object(Bucket=event['BatchInput']['bucket'], Key=event['Items'][x]['Key'])
    content = source.get('Body').read().decode('utf-8')
    buf = StringIO(content)
    reader = csv.DictReader(buf)
    objects = list(reader)
  
    for item in objects:
      start = int(item['Key'].split('-')[2].replace('.csv','')) if int(item['Key'].split('-')[2].replace('.csv','')) < int(start) or int(start) == 0 else int(start)
      end = int(item['Key'].split('-')[2].replace('.csv','')) if int(item['Key'].split('-')[2].replace('.csv','')) > int(end) else int(end)
      data.append({
        'Bucket': event['BatchInput']['bucket'],
        'Key': item['Key'],
        'Size': item['Size']
      })

  mem = BytesIO()
  with gzip.GzipFile(fileobj=mem, mode='w') as gz:
    stream = StringIO()
    headers = list(data[0].keys())
    writer = csv.DictWriter(stream, fieldnames=headers)
    writer.writerows(data)

    gz.write(stream.getvalue().encode())
    gz.close()
    mem.seek(0)

  s3_client.upload_fileobj(Fileobj=mem, Bucket=event['BatchInput']['bucket'], Key='inventory/data-gen-' + str(get_zeroes(start, length)) + '-' + str(get_zeroes(end, length)) + '.csv.gz')