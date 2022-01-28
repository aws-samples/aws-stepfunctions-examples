ROOT_DIR:=$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))

run:
	docker run -p 8083:8083 \
  	--mount type=bind,readonly,source=$(ROOT_DIR)/statemachine/test/MockConfigFile.json,destination=/home/StepFunctionsLocal/MockConfigFile.json \
  	-e SFN_MOCK_CONFIG="/home/StepFunctionsLocal/MockConfigFile.json" \
  	amazon/aws-stepfunctions-local

create:
	aws stepfunctions create-state-machine \
		--endpoint-url http://localhost:8083 \
		--definition file://statemachine/local_testing.asl.json \
		--name "LocalTesting" \
		--role-arn "arn:aws:iam::123456789012:role/DummyRole" \
		--no-cli-pager

happy:
	aws stepfunctions start-execution \
		--endpoint http://localhost:8083 \
		--name happyPathExecution \
		--state-machine arn:aws:states:us-east-1:123456789012:stateMachine:LocalTesting#HappyPathTest \
		--input file://events/sfn_valid_input.json \
		--no-cli-pager

error:
	aws stepfunctions start-execution \
		--endpoint http://localhost:8083 \
		--name catchCustomErrorExecution \
		--state-machine arn:aws:states:us-east-1:123456789012:stateMachine:LocalTesting#CustomValidationFailedCatchTest \
		--input file://events/sfn_valid_input.json \
		--no-cli-pager

exception:
	aws stepfunctions start-execution \
		--endpoint http://localhost:8083 \
		--name runtimeExceptionExecution \
		--state-machine arn:aws:states:us-east-1:123456789012:stateMachine:LocalTesting#ValidationExceptionCatchTest \
		--input file://events/sfn_valid_input.json \
		--no-cli-pager

retry:
	aws stepfunctions start-execution \
		--endpoint http://localhost:8083 \
		--name retryWithServiceException \
		--state-machine arn:aws:states:us-east-1:123456789012:stateMachine:LocalTesting#RetryOnServiceExceptionTest \
		--input file://events/sfn_valid_input.json \
		--no-cli-pager

all: create happy error exception retry

happy-h:
	aws stepfunctions get-execution-history \
		--endpoint http://localhost:8083 \
		--execution-arn arn:aws:states:us-east-1:123456789012:execution:LocalTesting:happyPathExecution \
		--query 'events[?type==`TaskStateExited` && stateExitedEventDetails.name==`CustomerAddedToFollowup`]' \
		--no-cli-pager

error-h:
	aws stepfunctions get-execution-history \
		--endpoint http://localhost:8083 \
		--execution-arn arn:aws:states:us-east-1:123456789012:execution:LocalTesting:catchCustomErrorExecution \
		--query 'events[?type==`TaskStateEntered` && stateEnteredEventDetails.name==`CustomValidationFailed` && contains(stateEnteredEventDetails.input, `Check Identity Validation Failed`)]' \
		--no-cli-pager

exception-h:
	aws stepfunctions get-execution-history \
		--endpoint http://localhost:8083 \
		--execution-arn arn:aws:states:us-east-1:123456789012:execution:LocalTesting:runtimeExceptionExecution \
		--query 'events[?type==`TaskStateEntered` && stateEnteredEventDetails.name==`ValidationException` && contains(stateEnteredEventDetails.input, `Address Validation Exception`)]' \
		--no-cli-pager

retry-h:
	aws stepfunctions get-execution-history \
		--endpoint http://localhost:8083 \
		--execution-arn arn:aws:states:us-east-1:123456789012:execution:LocalTesting:retryWithServiceException \
		--query 'events[?(type==`TaskFailed` && taskFailedEventDetails.error==`InternalServerException`) || (type==`TaskSucceeded` && taskSucceededEventDetails.resource==`comprehend:detectSentiment`)]' \
		--no-cli-pager

history: happy-h error-h exception-h retry-h