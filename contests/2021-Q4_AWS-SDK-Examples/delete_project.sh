arn=$(aws rekognition describe-projects | jq -r ".ProjectDescriptions[0].ProjectArn")
aws rekognition delete-project --project-arn $arn

# aws rekognition create-project-version\
#   --project-arn $arn\
#   --version-name "first"\
#   --output-config '{"S3Bucket":"global-custom-labels-111964674713-us-east-1-output", "S3KeyPrefix":"output/"}'\
#   --training-data '{"Assets": [{ "GroundTruthManifest": { "S3Object": { "Bucket": "global-custom-labels-111964674713-us-east-1", "Name": "assets/deepracerv1r/output.manifest" } } } ] }'\
#   --testing-data '{"AutoCreate":true }'