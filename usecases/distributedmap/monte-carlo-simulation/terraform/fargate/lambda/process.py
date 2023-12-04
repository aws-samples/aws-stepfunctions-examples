import boto3
import os

# set a few variables we'll use to get our data
region = os.getenv('REGION')
bucket = os.getenv('SOURCEBUCKET')

s3_client = boto3.client('s3', region_name=region)
s3 = boto3.resource('s3')

def lambda_handler(event, context):
  body = """#!/usr/bin/python3
import boto3
import botocore
import os
import json
import pandas as pd
from io import StringIO
from botocore.config import Config
from random import randint

# set initial variables for the rest of the script
config = Config(
  connect_timeout=65,
  read_timeout=65,
  retries={'max_attempts': 0}
)
region = os.getenv('REGION')
count = os.getenv('RECORDCOUNT')
fedrate = os.getenv('FEDRATE')
client = boto3.client('stepfunctions', region_name=region, config=config)
s3 = boto3.client('s3', region_name=region)
s3_resource = boto3.resource('s3')

# set a few variables we'll use to get our data
activity_arn = os.getenv('ACTIVITY_ARN')
worker_name = os.getenv('HOSTNAME')

# this function is simulating calculating the percentage of likelihood
# a given loan would default based on a given federal rate and the existing
# rate and payment of the loan. for simplicity we are simply returning
# a random percentage    
def calculate_default(df, fedrate):
  df['WillDefault'] = (randint(1,100)/100)
  return df

# you always need a little error handling :) in this case what we
# are specifically looking for is SlowDown errors from S3. when that 
# occurs we are raising the error to let Step Functions handle it
def handle_processing_errors(error):
  print("botocore Error Caught")
  if error.response['Error']['Code'] == 'SlowDown':
    print ("Client SlowDown Error")
    # Throw 503 from S3
    class SlowDown(Exception):
      pass
    raise SlowDown('Reduce S3 Requests')

# this function just prepends zeroes to the object names
# to make it prettier and easier to read
def get_zeroes(current, total):
  x = total - len(str(current))
  ret = ""
  for i in range(0, x):
    ret = ret + "0"
  return ret + str(current)

# this function finds the lowest value in the list of object names
def get_start(id,start):
  ret = id if id < int(start) or int(start) == 0 else int(start)
  return ret

# this function finds the highest value in the list of object names
def get_end(id,end):
  ret = id if id > int(end) else int(end)
  return ret

# this functions writes to s3
def write_output(bucket, batch, rowsper, prefix, start, end):
  # write the data
  buffer = StringIO()
  batch.to_csv(buffer, index=False)
  key = prefix + "/data-gen-" + get_zeroes(start, len(count)) + ".csv" if rowsper == 1 else prefix + "/data-gen-batch-" + get_zeroes(start, len(count)) + "_" + get_zeroes(end, len(count)) + ".csv"

  # write the object
  try:
    s3_resource.Object(bucket, key).put(Body=buffer.getvalue())
  except botocore.exceptions.ClientError as error:
    handle_processing_errors(error)

# now we start polling until we have nothing left to do. i realize this should
# be more functions and it's pretty gross but it works for a demo :) 
while True:
  response = client.get_activity_task(
    activityArn = activity_arn,
    workerName = worker_name
  )

  if 'input' not in response.keys() or 'taskToken' not in response.keys():
    print('no tasks to process...waiting 30 seconds to try again')
    time.sleep(30)
    continue

  # setup variables to be used throughout the script
  token = response['taskToken']
  event = json.loads(response['input'])
  success = True
  cause = ""
  error = ""
  start = 0
  end = 0
  counter = 0
  x = 0

  # set variables passed from the Set Variables step of the Step Function workflow
  prefix = event['BatchInput']['workshop_variables']['output_prefix']
  bucket = event['BatchInput']['workshop_variables']['output_bucket']
  rowsper = event['BatchInput']['workshop_variables']['output_rows_per_file']
  
  # instantiate the initial dataframe
  batch = pd.DataFrame()

  # load the full batch from Step Functions into the dataframe
  for item in event['Items']:
    # our s3 inventory report may contain objects we don't care about. this
    # conditional will ensure we only process source CSV Files, 
    # skipping folders an other metadata object entries.
    if str(item['Key']).find(".csv") == -1: continue

    # increment our counter
    counter+=1
    x+=1

    # with that out of the way lets get our data
    try:
      source = s3.get_object(Bucket=item['Bucket'], Key=item['Key'])
      content = source['Body'].read().decode('utf-8')
    except botocore.exceptions.ClientError as error:
      handle_processing_errors(error)
    
    # with data in hand we can load the content into a dataframe
    df = pd.read_csv(StringIO(content))

    # calculate our percentage for defaulting
    df = calculate_default(df, fedrate)

    # and finally add it to our batch of dataframes 
    batch = pd.concat([batch,df])

    # our file names will include the first and last object
    # id to make them easier to find. 
    id = int(item['Key'].split('-')[2].replace('.csv','')) 
    start = get_start(id, start)
    end = get_end(id, end)
    
    # do we need to write yet? we'll check to see we hit that yet
    if counter == rowsper or x >= len(event['Items']):
      # write the object(s)
      write_output(bucket, batch, rowsper, prefix, str(start), str(end))

      # rinse and repeat :)
      start = 0
      end = 0
      counter = 0
      batch.empty
  
  client.send_task_success(
    taskToken = token,
    output = "{\\"message\\": \\"success\\"}"
  )"""
  
  dst = s3.Object(bucket, 'script/process.py')
  dst.put(Body=body)