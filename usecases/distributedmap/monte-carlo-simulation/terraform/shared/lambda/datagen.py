import boto3
import csv
from random import uniform, randrange, randint
from datetime import datetime, timedelta
from io import StringIO
import os

region = os.getenv('REGION')
count = os.getenv('RECORDCOUNT')
s3_client = boto3.client('s3', region_name=region)
s3 = boto3.resource('s3')
terms = [12, 24, 36, 48, 60, 72, 84, 96, 108, 120]
term = terms[randint(0,9)]
end = datetime.now()
start = end - timedelta(days=((term / 12) * 365))

def random_date(start, end):
  delta = end - start
  int_delta = (delta.days * 24 * 60 * 60) + delta.seconds
  random_second = randrange(int_delta)
  return start + timedelta(seconds=random_second)

def get_zeroes(current, total):
  x = total - len(str(current))
  ret = ""
  for i in range(0, x):
    ret = ret + "0"
  return ret + str(current)

def lambda_handler(event, context):
  batch = []
  length = len(str(count))
  first = get_zeroes(event['Items'][0]['num'], length)
  last = get_zeroes(event['Items'][len(event['Items']) - 1]['num'], length)
  for item in event['Items']:
    data = [{
      'AccountID': randint(1000000,9999999),
      'ZipCode': randint(10000,99999),
      'Rate': round(uniform(1.0,9.9), 2),
      'Payment': randint(1000,10000),
      'LoanAmount': randint(10000,10000000),
      'LoanTerm': term,
      'OriginationDate': random_date(start, end).strftime('%m/%d/%Y'),
      'GrossIncome': randint(50000,5000000)
    }]

    stream = StringIO()
    headers = list(data[0].keys())
    writer = csv.DictWriter(stream, fieldnames=headers)
    writer.writeheader()
    writer.writerows(data)
    body = stream.getvalue()

    number = get_zeroes(item['num'], length)

    dst = s3.Object(event['BatchInput']['bucket'], 'data/data-gen-' + str(number) + '.csv')
    dst.put(Body=body)

    batch.append({
      'Key': 'data/data-gen-' + number + '.csv',
      'Size': len(body.encode('utf-8'))
    })
  
  stream = StringIO()
  headers = list(batch[0].keys())
  writer = csv.DictWriter(stream, fieldnames=headers)
  writer.writeheader()
  writer.writerows(batch)
  body = stream.getvalue()

  dst = s3.Object(event['BatchInput']['bucket'], 'temp/data-batch-' + str(first) + '-' + str(last) + '.csv')
  dst.put(Body=body)