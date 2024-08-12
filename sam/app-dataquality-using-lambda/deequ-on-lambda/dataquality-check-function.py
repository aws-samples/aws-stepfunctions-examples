import sys
import os
import pydeequ
import uuid

from pydeequ.suggestions import *
from pydeequ.checks import *
from pydeequ.verification import *
from pydeequ.analyzers import *


from datetime import datetime

from pyspark.sql import SparkSession
from pyspark.sql.functions import *
import boto3

"""
 Function that gets triggered when AWS Lambda is running.
 We are using the example from Redshift documentation
 https://docs.aws.amazon.com/redshift/latest/dg/spatial-tutorial.html#spatial-tutorial-test-data
 
 We are using PyDeequ library which uses Apache 2.0 license. Please refer to LICENSE.Apache.txt file for more details.

  Add below parameters in the lambda function Environment Variables
  SCRIPT_BUCKET         BUCKET WHERE YOU SAVE THIS SCRIPT
  SPARK_SCRIPT          THE SCRIPT NAME AND PATH
  INPUT_PATH            s3a://redshift-downloads/spatial-data/accommodations.csv
  OUTPUT_PATH           THE PATH WHERE THE VERIFICATION RESULTS AND METRICS WILL BE STORED

  Lambda General Configuration for above input file. Based on the input file size, the memory can be updated.
  Memory                 2048 MB
  Tmeout                 2 min
  Ephemeral storage      1024 MB

  Select the Lambda architecture (arm64 or x84_64) based on the your source machine where docker build have been executed
"""

if __name__ == "__main__":

    print(len(sys.argv))
    if (len(sys.argv) != 3):
        print("Usage: spark-dq [input-folder] [output-folder]")
        sys.exit(0)

    input_path = os.environ['INPUT_PATH']
    output_path = os.environ['OUTPUT_PATH']

    
    bucket_name = output_path.split('/')[2]
    print(" ******* Bucket name ", bucket_name)



    aws_region = os.environ['AWS_REGION']

    print(" ******* Input path ", input_path)
    print(" ******* Output path ", output_path)
    print(" ******* aws region ", aws_region)


    spark = SparkSession.builder \
    .appName("Deequ-on-AWS-Lambda") \
    .master("local[*]") \
    .config("spark.jars.packages", "deequ-2.0.3-spark-3.3.jar")\
    .config("spark.driver.bindAddress", "127.0.0.1") \
    .config("spark.driver.memory", "5g") \
    .config("spark.executor.memory", "5g") \
    .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
    .config("spark.hadoop.fs.s3a.aws.credentials.provider","org.apache.hadoop.fs.s3a.TemporaryAWSCredentialsProvider") \
    .getOrCreate()


    # Reading the csv file form input_path
    dataset = spark.read.option('header', 'true').option("delimiter", ";").csv(input_path)

    print("Schema of input file:")
    dataset.printSchema()
    
    analysisResult = AnalysisRunner(spark) \
                    .onData(dataset) \
                    .addAnalyzer(Size()) \
                    .addAnalyzer(Completeness("host_name")) \
                    .addAnalyzer(ApproxCountDistinct("neighbourhood")) \
                    .addAnalyzer(Mean("price")) \
                    .run()

    analysisResult_df = AnalyzerContext.successMetricsAsDataFrame(spark, analysisResult)
    print("Showing AnalysisResults:")
    analysisResult_df.show() # Since show is an action in spark, use it only for troubleshooting and remove before releasing the code for better performance

    check = Check(spark, CheckLevel.Error, "Accomodations")

    checkResult = VerificationSuite(spark) \
        .onData(dataset) \
        .addCheck(
            check.hasSize(lambda x: x >= 22248) \
            .hasCompleteness("name", lambda x: x >= 0.99)  \
            #.isComplete("name")  \
            .isUnique("id")  \
            .hasCompleteness("host_name", lambda x: x >= 0.99)  \
            #.isComplete("host_name")  \
            .isComplete("neighbourhood")  \
            .isComplete("price")  \
            .isNonNegative("price")) \
        .run()


    print("Showing VerificationResults:")
    checkResult_df = VerificationResult.checkResultsAsDataFrame(spark, checkResult)
    checkResult_df.show()

    checkResult_df.repartition(1).write.option("header", "true").mode('overwrite').csv(output_path+"/verification-results/", sep=',')


    # Filtering for any failed data quality constraints
    df_checked_constraints_failures = \
        (checkResult_df[checkResult_df['constraint_status'] == "Failure"])

    # If any data quality check fails, raise exception
    if df_checked_constraints_failures.count() > 0:
            df_checked_constraints_failures.show(n=df_checked_constraints_failures.count(),
                                                 truncate=False)

    print("Showing VerificationResults metrics:")
    checkResult_df = VerificationResult.successMetricsAsDataFrame(spark, checkResult)
    checkResult_df.show()
    
    checkResult_df.repartition(1).write.option("header", "true").mode('overwrite').csv(output_path+"/verification-results-metrics/", sep=',')

            
    spark.sparkContext._gateway.shutdown_callback_server()
    spark.stop()
