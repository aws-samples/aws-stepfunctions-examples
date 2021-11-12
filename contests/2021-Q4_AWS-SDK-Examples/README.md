# Global Amazon rekognition Custom Labels
This project helps you deploy and manage Amazon Rekognition Custom Labels project globally

## Deployment
1. ./install_all_packages.sh
2. ./deploy.sh

## Sample Command to copy dataset into management dataset bucket
You can get the AWS DeepRacer Dataset.
Open new terminal in AWS Cloud9 and run the following commands.
```
git clone https://github.com/wongcyrus/deepracer_labeled_dataset
cd deepracer_labeled_dataset
find . | grep .git | xargs rm -rf
```
Create a S3 bucket in the region near you i.e. your-source-datasets in ap-east-1.
```
aws s3 sync s3://your-source-datasets . 
```

Then copy the Dataset to custom-labels-global source bucket and it will replicate to all regional dataset bucket.

aws s3 sync s3://your-source-datasets s3://custom-labels-global-<your aws account id>us-east-1 --source-region ap-east-1 

manifest file will be replace the souce bucket name to the distination bucket name.


# Sample Input Data for deplying Global Rekognition Custom Labels Model
## create-build-model-stepfunction
{
    "ProjectName": "AWSDeepRacer",
  	"ManifestKey":"assets/deepracerv1r/output.manifest",
  	"VersionName": "first"
}


## delete-model-stepfunction
Delete model and all versions

{
    "ProjectName": "AWSDeepRacer",  	
  	"VersionNames": []
}


Delete a version

{
    "ProjectName": "AWSDeepRacer",  	
  	"VersionNames": ["first"]
}


## start-model-version-stepfunction
{
    "ProjectName": "AWSDeepRacer",
  	"VersionNames": ["first"],
  	"MinInferenceUnits": 1
}


## stop-model-version-stepfunction
{
    "ProjectName": "AWSDeepRacer",
  	"VersionNames": ["first"]
}
