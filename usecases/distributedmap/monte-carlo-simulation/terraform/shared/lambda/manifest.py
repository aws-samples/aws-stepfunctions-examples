import boto3
import json
from datetime import datetime
import time

s3_client = boto3.client("s3")
s3 = boto3.resource("s3")

def lambda_handler(event, context):
  files = []
  for item in event['Items']:
    files.append({
      "key": item['Key'],
      "size": item['Size'],
      "MD5checksum": item['Etag'].replace('"','')
    })
  manifest = {
    "sourceBucket" : event['BatchInput']['bucket'],
    "destinationBucket" : "arn:aws:s3:::" + event['BatchInput']['bucket'],
    "version" : "2016-11-30",
    "creationTimestamp" : time.mktime(datetime.now().timetuple()),
    "fileFormat" : "CSV",
    "fileSchema" : "Bucket, Key, Size",
    "files" : files
  }
  dst = s3.Object(event['BatchInput']['bucket'], 'inventory/manifest.json')
  dst.put(Body=(bytes(json.dumps(manifest).encode('UTF-8'))))