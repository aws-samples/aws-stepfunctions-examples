package com.example.sfn;

import groovy.json.JsonOutput;
import groovy.json.JsonSlurper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.output.Slf4jLogConsumer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import software.amazon.awssdk.services.sfn.SfnClient;
import software.amazon.awssdk.services.sfn.model.*;

import java.io.File;
import java.net.URI;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static com.example.sfn.StepFunctionsConstants.*;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
public class StepFunctionsLocalJUnitTest {
  private static final Logger log = LoggerFactory.getLogger(StepFunctionsLocalJUnitTest.class);
  private static SfnClient client;
  private static String stateMachineArn;

  @Container
  public static final GenericContainer<?> SFN_LOCAL_CONTAINER = new GenericContainer<>(SFN_LOCAL_IMAGE)
    .withExposedPorts(8083)
    .withFileSystemBind(mockFileHostPath, mockFileContainerPath, BindMode.READ_ONLY)
    .withEnv("SFN_MOCK_CONFIG", mockFileContainerPath)
    .withLogConsumer(new Slf4jLogConsumer(log))
    .waitingFor(Wait.forLogMessage(".*Starting server on port 8083.*", 1));

  @BeforeAll
  static void setup() throws InterruptedException {
    client = SfnClient.builder()
      .endpointOverride(
        URI.create(
          String.format("http://%s:%d", SFN_LOCAL_CONTAINER.getHost(), SFN_LOCAL_CONTAINER.getFirstMappedPort())))
      .build();

    // Important to avoid non-deterministic behavior
    Thread.sleep(2000);

    CreateStateMachineResponse createStateMachineResponse = client.createStateMachine(
      CreateStateMachineRequest.builder()
        .name(STATE_MACHINE_NAME)
        .roleArn(DUMMY_ROLE)
        .definition(
          JsonOutput.toJson(
            new JsonSlurper().parse(new File(STATE_MACHINE_ASL))
          )
        ).build()
    );

    stateMachineArn = createStateMachineResponse.stateMachineArn();
  }

  @Test
  @DisplayName("Check Container is running")
  void testContainerRunning() {
    assertTrue(SFN_LOCAL_CONTAINER.isRunning());
  }

  @Test
  @DisplayName("Test Happy Path Scenario")
  void testHappyPath() throws InterruptedException {
    String executionName = "happyPathExecution";

    StartExecutionResponse executionResponse = client.startExecution(StartExecutionRequest.builder()
      .stateMachineArn(String.join("#", stateMachineArn, "HappyPathTest"))
      .name(executionName)
      .input(EVENT_JSON_STRING)
      .build()
    );

    assertNotNull(executionResponse.executionArn());

    // IMP: Wait until above execution completes in docker
    Thread.sleep(2000);

    GetExecutionHistoryResponse historyResponse = client.getExecutionHistory(GetExecutionHistoryRequest.builder()
      .executionArn(executionResponse.executionArn())
      .build());

    List<HistoryEvent> results = historyResponse.events().stream()
      .filter(h -> h.type() == HistoryEventType.TASK_STATE_EXITED &&
        h.stateExitedEventDetails().name().equalsIgnoreCase("CustomerAddedToFollowup"))
      .toList();

    assertEquals(1, results.size());
  }

  @Test
  @DisplayName("Test Negative Sentiment Scenario")
  void testNegativeSentiment() throws InterruptedException {
    String executionName = "negativeSentimentExecution";

    StartExecutionResponse executionResponse = client.startExecution(StartExecutionRequest.builder()
      .stateMachineArn(String.join("#", stateMachineArn, "NegativeSentimentTest"))
      .name(executionName)
      .input(EVENT_JSON_STRING)
      .build()
    );

    Thread.sleep(2000);

    GetExecutionHistoryResponse historyResponse = client.getExecutionHistory(GetExecutionHistoryRequest.builder()
      .executionArn(executionResponse.executionArn())
      .build());

    List<HistoryEvent> results = historyResponse.events().stream()
      .filter(h -> h.type() == HistoryEventType.TASK_STATE_EXITED &&
        h.stateExitedEventDetails().name().equalsIgnoreCase("NegativeSentimentDetected"))
      .toList();

    assertEquals(1, results.size());
  }

  @Test
  @DisplayName("Test Retry on Service Exception")
  void testRetryOnServiceException() throws InterruptedException {
    String executionName = "retryExecution";

    StartExecutionResponse executionResponse = client.startExecution(StartExecutionRequest.builder()
      .stateMachineArn(String.join("#", stateMachineArn, "RetryOnServiceExceptionTest"))
      .name(executionName)
      .input(EVENT_JSON_STRING)
      .build()
    );

    // IMP: State Machine has retries with exponential backoff, therefore 4 seconds
    Thread.sleep(4000);

    GetExecutionHistoryResponse historyResponse = client.getExecutionHistory(GetExecutionHistoryRequest.builder()
      .executionArn(executionResponse.executionArn())
      .build());

    List<HistoryEvent> results = historyResponse.events().stream()
      .filter(h ->
        (
          h.type() == HistoryEventType.TASK_FAILED &&
            h.taskFailedEventDetails().error().equalsIgnoreCase("InternalServerException")
        ) || (
          h.type() == HistoryEventType.TASK_SUCCEEDED &&
            h.taskSucceededEventDetails().resource().equalsIgnoreCase("comprehend:detectSentiment")
        )
      )
      .toList();

    assertEquals(4, results.size());
    assertEquals(
      Set.of("InternalServerException"),
      results.subList(0, 2).stream().map(h -> h.taskFailedEventDetails().error()).collect(Collectors.toSet())
    );

    String resource = results.get(3).taskSucceededEventDetails().resource();
    assertEquals("comprehend:detectSentiment", resource);
  }
}
