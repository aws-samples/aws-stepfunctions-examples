package com.example.sfn;

import groovy.json.JsonOutput;
import groovy.json.JsonSlurper;
import org.testcontainers.utility.DockerImageName;

import java.io.File;

class StepFunctionsConstants {
  public static final DockerImageName SFN_LOCAL_IMAGE = DockerImageName.parse("amazon/aws-stepfunctions-local");
  public static final String mockFileHostPath = new File("statemachine/test/MockConfigFile.json").getAbsolutePath();
  public static final String mockFileContainerPath = "/home/StepFunctionsLocal/MockConfigFile.json";
  public static final String DUMMY_ROLE = "arn:aws:iam::123456789012:role/DummyRole";
  public static final String EVENT_FILE = "events/sfn_valid_input.json";
  public static final String STATE_MACHINE_ASL = "statemachine/local_testing.asl.json";
  public static final String STATE_MACHINE_NAME = "LocalTesting";
  public static final String EVENT_JSON_STRING = JsonOutput.toJson(new JsonSlurper().parse(new File(EVENT_FILE)));
}
