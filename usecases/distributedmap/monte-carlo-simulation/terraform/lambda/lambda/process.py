import boto3
import botocore
import os
import pandas as pd
from io import StringIO
from botocore.config import Config
from random import randint

# set initial variables for the rest of the script
config = Config(retries = dict(max_attempts = 2, mode = 'standard'))
region = os.getenv('REGION')
count = os.getenv('RECORDCOUNT')
fedrate = os.getenv('FEDRATE')
s3 = boto3.client('s3', region_name=region)
s3_resource = boto3.resource('s3', config=config)

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

# this is the main function of the script.
def lambda_handler(event, context):
  # set variables passed from the Set Variables step of the Step Function workflow
  prefix = event['BatchInput']['workshop_variables']['output_prefix']
  bucket = event['BatchInput']['workshop_variables']['output_bucket']
  rowsper = event['BatchInput']['workshop_variables']['output_rows_per_file']
  start = 0
  end = 0
  counter = 0
  x = 0
  
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