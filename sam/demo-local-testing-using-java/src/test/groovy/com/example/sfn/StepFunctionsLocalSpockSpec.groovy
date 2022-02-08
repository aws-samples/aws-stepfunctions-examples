package com.example.sfn

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.testcontainers.containers.BindMode
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.output.Slf4jLogConsumer
import org.testcontainers.containers.wait.strategy.Wait
import org.testcontainers.spock.Testcontainers
import software.amazon.awssdk.services.sfn.SfnClient
import software.amazon.awssdk.services.sfn.model.*
import spock.lang.Shared
import spock.lang.Specification
import spock.lang.Stepwise
import spock.lang.Unroll

import static com.example.sfn.StepFunctionsConstants.*
import static software.amazon.awssdk.services.sfn.model.HistoryEventType.*

@Stepwise
@Testcontainers
class StepFunctionsLocalSpockSpec extends Specification {
  private static final Logger log = LoggerFactory.getLogger(StepFunctionsLocalSpockSpec.class)

  @Shared
  String stateMachineArn
  @Shared
  SfnClient client
  @Shared
  GenericContainer SFN_LOCAL_CONTAINER = new GenericContainer(SFN_LOCAL_IMAGE)
    .withExposedPorts(8083)
    .withFileSystemBind(mockFileHostPath, mockFileContainerPath, BindMode.READ_ONLY)
    .withEnv("SFN_MOCK_CONFIG", mockFileContainerPath)
    .withLogConsumer(new Slf4jLogConsumer(log))
    .waitingFor(Wait.forLogMessage(".*Starting server on port 8083.*", 1))

  def setupSpec() {
    client = SfnClient.builder()
      .endpointOverride(
        URI.create(
          String.format("http://%s:%d", SFN_LOCAL_CONTAINER.getHost(), SFN_LOCAL_CONTAINER.getFirstMappedPort())))
      .build()

    // Important to avoid non-deterministic behavior
    Thread.sleep(2000)

    CreateStateMachineResponse createStateMachineResponse = client.createStateMachine(
      CreateStateMachineRequest.builder()
        .name(STATE_MACHINE_NAME)
        .roleArn(DUMMY_ROLE)
        .definition(
          JsonOutput.toJson(
            new JsonSlurper().parse(new File(STATE_MACHINE_ASL))
          )
        ).build() as CreateStateMachineRequest
    )

    stateMachineArn = createStateMachineResponse.stateMachineArn()
  }

  def "test container is running"() {
    expect:
    SFN_LOCAL_CONTAINER.running
  }

  @Unroll
  def "test #executionName scenario"() {
    when: 'Start state machine execution'
    StartExecutionResponse executionResponse = client.startExecution(StartExecutionRequest.builder()
      .stateMachineArn(String.join("#", stateMachineArn, testCaseName))
      .name(executionName)
      .input(EVENT_JSON_STRING)
      .build() as StartExecutionRequest
    )

    assert executionResponse.executionArn()

    and: 'Wait until above execution completes in docker'
    Thread.sleep(timeout)

    and: 'Gather execution history'
    GetExecutionHistoryResponse historyResponse = client.getExecutionHistory(GetExecutionHistoryRequest.builder()
      .executionArn(executionResponse.executionArn())
      .build() as GetExecutionHistoryRequest)

    then: 'History of events should not be empty'
    historyResponse?.events()

    and: 'Happy Path is executed'
    if (testCaseName == 'HappyPathTest') {
      assert resultSize == historyResponse.events().count {
        it.type() == TASK_STATE_EXITED && it.stateExitedEventDetails().name() == "CustomerAddedToFollowup"
      }
    }

    and: 'Negative Sentiment path is executed on detecting a negative sentiment'
    if (testCaseName == 'NegativeSentimentTest') {
      assert resultSize == historyResponse.events().count {
        it.type() == TASK_STATE_EXITED && it.stateExitedEventDetails().name() == "NegativeSentimentDetected"
      }
    }

    and: "on service failure, exact number of retries performed"
    if (testCaseName == 'RetryOnServiceExceptionTest') {
      def results = historyResponse.events().findAll {
        (it.type() == TASK_FAILED && it.taskFailedEventDetails().error() == 'InternalServerException') ||
          (it.type() == TASK_SUCCEEDED && it.taskSucceededEventDetails().resource() == 'comprehend:detectSentiment')
      }

      assert resultSize == results.size()
      assert results[0..2]*.taskFailedEventDetails()*.error().unique().first() == 'InternalServerException',
        "First 3 results should be of type InternalServerException"
      assert results[-1].taskSucceededEventDetails().resource() == 'comprehend:detectSentiment',
        "Last item in the result list should be the task success of type detect sentiment"
    }

    and: "in case of service exception, the exception is caught"
    if (testCaseName == 'ValidationExceptionCatchTest') {
      assert resultSize == historyResponse.events().count {
        it.type() == TASK_STATE_EXITED && it.stateExitedEventDetails().name() == "ValidationException"
      }
    }

    and: "in case of custom validation failure, custom validation error is captured"
    if (testCaseName == 'CustomValidationFailedCatchTest') {
      assert resultSize == historyResponse.events().count {
        it.type() == TASK_STATE_EXITED && it.stateExitedEventDetails().name() == "CustomValidationFailed"
      }
    }

    where:
    executionName                  | testCaseName                      | timeout || resultSize
    'happyPathExecution'           | 'HappyPathTest'                   | 2000    || 1
    'negativeSentimentExecution'   | 'NegativeSentimentTest'           | 2000    || 1
    'retryExecution'               | 'RetryOnServiceExceptionTest'     | 4000    || 4
    'validationExceptionExecution' | 'ValidationExceptionCatchTest'    | 2000    || 1
    'customExceptionExecution'     | 'CustomValidationFailedCatchTest' | 4000    || 1
  }
}