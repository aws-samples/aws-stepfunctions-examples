## AWS Step Functions Business rules orchestration

Orchestration is the coordination and management of multiple components and their pieces to carry out certain tasks in a certain order. In this project, we are more interested in looking at the transient orchestration model. i.e., once started, it will finish immediately. This project uses Drools as a business rules engine and, for orchestration, uses AWS Step Functions to execute a sequence of tasks . These tasks are typical in most cases for any application: auditing the incoming request, invoking the business rule engine  and auditing the outgoing response. This project can be taken and enhanced to add or change tasks to suit your requirements. For instance, you can add incoming request validation performed against a schema or branch the request into smaller chunks of requests and merge the responses into one. 

## Getting Started

You will need an AWS account to use this solution. Sign up for an account [here](https://aws.amazon.com/). The solution artifacts are included in this GitHub repository for reference.ness-rules-orchestration

## Contents

* `Audit/`
  * `app.py`: Lambda function that audits the incoming request and outgoing response into Amazon DynamoDB
* `ExecuteRuleset/`
  * `app.py`: Lambda function that execute the ruleset deployed as part of drools springboot
* `drools-spring-boot/`
    * `src`
      * `main`
        * `docker`: Docker file 
        * `java`: Java code for restcontroller, Value object classes, code for rule server interaction
        * `resources`: Rules written using Drools Rule Language    
  * `statemachine/`
    * `businessrules_orchestration.asl.json`: Amazon States Language JSON-based, structured language used to define state machine, collection of states.
  * `template.yaml`: AWS SAM template for building serverless applications for this project
    


Pre-requisite :
  The following should be installed and configured
  1. OpenJDK 17
  2. docker version 20.10.12 
  3. maven 3.8.4
  4. python 3.9
  5. verify the installations 
      a. java --version
      b. docker --version
      c. mvn --version
      d. docker-machine env
      e. python --verion


Deploy the business rules springboot application: 

 1. git clone the repository
 
 2. Build the spring boot drools java application 
        cd drools-spring-boot
        mvn clean install

 2. Build the docker image ( pre-requisite docker should be installed and started )
    mvn docker:build

 3. Create the ECR private repository which will host our docker image
    aws ecr create-repository --repository-name drools_private_repo --image-tag-mutability MUTABLE --image-scanning-configuration scanOnPush=false

 4. Push the docker image to ECR repository and tag the same 
    aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ##########.dkr.ecr.us-east-1.amazonaws.com
    docker tag drools-rule-app:latest  ##########.dkr.ecr.us-east-1.amazonaws.com/drools_private_repo:latest    
    docker push ##########.dkr.ecr.us-east-1.amazonaws.com/drools_private_repo:latest

Deploy rest of the application components:

    cd ..
    sam build
    sam deploy --guided




## License

This library is licensed under the MIT-0 License. See the LICENSE file.

