import boto3
import json
import csv
import pandas as pd
import io
import os

region = os.getenv('REGION')
count = os.getenv('RECORDCOUNT')
s3_client = boto3.client('s3', region_name=region)
s3_resource = boto3.resource('s3')

def lambda_handler(event, context):
  bucket_v = event['inventory']['bucket']
  manifest_key_v = event['inventory']['key']
  new_manifest_key_prefix = event['inventory']['output_prefix']
  input_sampling = event['workshop_variables']['input_sampling']
  original_manifest = s3_client.get_object(Bucket=bucket_v, Key=manifest_key_v)
  original_manifest_json = json.loads(original_manifest['Body'].read())
  print(original_manifest_json)
  bucket = s3_resource.Bucket(bucket_v)
  df_batch_inventory = pd.DataFrame()
  output_manifest_manifest = {
    'files': []
  }
  output_manifest_manifest['bucket'] = bucket_v 
  
  # Record Counting Variables
  total_records = 0
  output_records = 0
  
  #If not sampling the input (sampling = 1) then we can just re-write manifest.json files only
  manifest_counter = 1
  if input_sampling == 1:
    for file in original_manifest_json['files']:
      inventory_manifest = {
        'files': []
      }
      inventory_manifest['sourceBucket'] = original_manifest_json['sourceBucket']
      inventory_manifest['destinationBucket'] = original_manifest_json['destinationBucket']
      inventory_manifest['fileFormat'] = original_manifest_json['fileFormat']
      inventory_manifest['fileSchema'] = original_manifest_json['fileSchema']
      inventory_manifest['files'].append({
        'key': file['key'],
        'size': file['size']
      })
      inventory_manifest_json = json.dumps(inventory_manifest)
      s3_resource.Object(bucket_v, new_manifest_key_prefix + 'manifest--{}.json'.format(manifest_counter)).put(Body=inventory_manifest_json)
      output_manifest_manifest['files'].append({
        'key': new_manifest_key_prefix + 'manifest--{}.json'.format(manifest_counter),
        'bucket': bucket_v
      })
      manifest_counter += 1
  #If sampling or filtering the input dataset we will read and process the inventory CVS's and create modified versions for processing        
  else:
    im = 1
    i_files = 1
    for file in original_manifest_json['files']:
      obj = s3_resource.Object(bucket_v,file['key'])
      print(obj.key)
      obj_data = io.BytesIO(obj.get()['Body'].read())
      # if file['key'] contains .gz then we are reading the .gz file and not the .csv file
      if '.gz' in file['key']:
        df_temp = pd.read_csv(obj_data, compression='gzip', names=['Bucket', 'Key', 'Size'], header=None)
      else:
        df_temp = pd.read_csv(obj_data, names=['Bucket', 'Key', 'Size'], header=None)
      total_records += len(df_temp)
      print("Current observed record count: " + format(total_records))
      df_batch_inventory = pd.concat([df_batch_inventory,df_temp])
      if (len(df_batch_inventory) > 250000) or i_files == len(original_manifest_json['files']):
        inventory_manifest = {
          'files': []
        }
        inventory_manifest['sourceBucket'] = original_manifest_json['sourceBucket']
        inventory_manifest['destinationBucket'] = original_manifest_json['destinationBucket']
        inventory_manifest['fileFormat'] = original_manifest_json['fileFormat']
        inventory_manifest['fileSchema'] = original_manifest_json['fileSchema']
        df_batch_inventory = df_batch_inventory[::input_sampling]
        csv_buffer = io.StringIO()
        output_records += len(df_batch_inventory)
        print("Output records this batch: " + format(len(df_batch_inventory)))
        print("Total output records to this point: " + format(output_records))
        df_batch_inventory.to_csv(csv_buffer, index=False, header=False)
        csv_tmp_name = new_manifest_key_prefix + 'inventory-' + format(im) + '.csv'
        s3_resource.Object(bucket_v, csv_tmp_name.format(im)).put(Body=csv_buffer.getvalue())
        inventory_manifest['files'].append({
          'key': csv_tmp_name,
          'size': len(csv_buffer.getvalue())
        })
        print(inventory_manifest)
        inventory_manifest_json = json.dumps(inventory_manifest)
        s3_resource.Object(bucket_v, new_manifest_key_prefix + 'manifest--{}.json'.format(im)).put(Body=inventory_manifest_json)
        output_manifest_manifest['files'].append({
          'key': new_manifest_key_prefix + 'manifest--{}.json'.format(im),
          'bucket': bucket_v
        })
        im += 1
        df_batch_inventory = pd.DataFrame(None)
      i_files += 1
  return {
    'statusCode': 200,
    'body': output_manifest_manifest
  }