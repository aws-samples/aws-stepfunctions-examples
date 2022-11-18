EXECUTION_ARN=$(aws stepfunctions start-execution \
--state-machine-arn $3 \
--input "{}" \
--profile $1 \
--region $2 \
--output text \
--query "executionArn")

RESULT=$(aws stepfunctions describe-execution \
--execution-arn $EXECUTION_ARN \
--profile $1 \
--region $2 \
--output json \
--query "output" | jq -r)

counter=0
while [[ -z $RESULT && $counter -le 5 ]]
do

counter=$((counter+1))

# sleep for x seconds
sleep $counter

RESULT=$(aws stepfunctions describe-execution \
--execution-arn $EXECUTION_ARN \
--profile $1 \
--region $2 \
--output json \
--query "output" | jq -r)

done

echo $RESULT