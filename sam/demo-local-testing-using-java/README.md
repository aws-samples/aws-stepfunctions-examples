## Step Functions Local Testing using JUnit and Spock
[Step Functions Local testing with mock configuration](https://aws.amazon.com/blogs/compute/mocking-service-integrations-with-aws-step-functions-local/) 
provides the capability to mock AWS service integrations that are present in a state machine. This helps in testing the 
state machine in isolation.

This is sample project which showcases how to run Step Functions local tests with mocks using JUnit and Spock framework
instead of running ad-hoc CLI commands. Both type of tests use [Testcontainers](https://www.testcontainers.org/) to run [Step Functions Local Docker image](https://docs.aws.amazon.com/step-functions/latest/dg/sfn-local-docker.html).

This is not a replacement of the strategy shown in above blog but another way to test Step Functions state machine with
better assertion capabilities. Teams currently using Java for Serverless development can leverage this strategy in their
current applications.

### Prerequisites
 - Java 19
 - [Gradle](https://gradle.org/) 
 - [JUnit 5](https://junit.org/junit5/docs/current/user-guide/)
 - [Spock Framework](https://spockframework.org/spock/docs/2.0/all_in_one.html)
 - [Testcontainers](https://www.testcontainers.org/)
 - [Docker](https://www.docker.com/)

### Running Tests
> Make sure docker engine is running before running the tests.

In order to run the tests, just run below `gradlew` task from project directory:
```bash
./gradlew test
```

Tests can also be run individually via IntelliJ's native integrations or your choice of an IDE.

### Explanation
Checkout these test classes for details:

 - [`StepFunctionsLocalSpockSpec`](src/test/groovy/com/example/sfn/StepFunctionsLocalSpockSpec.groovy)
 - [`StepFunctionsLocalJUnitTest`](src/test/java/com/example/sfn/StepFunctionsLocalJUnitTest.java)