## Monte Carlo Simulations at scale with AWS Step Functions and Distributed Map

Organizations across financial services and other industries have business processes that require executing the same logic across billions of records for their machine learning and compliance needs. Many organizations rely on internal custom orchestration systems or big data frameworks to coordinate the parallel processing of their business logic across many parallel compute nodes. The maintenance and operation of orchestration systems can require significant effort from development resources or even require additional internal dedicated teams to manage these tools. Organizations also often manage large clusters of compute resources for executing business logic at scale requiring significant operational and infrastructure investments.

### Overview
![Overview](./.images/service-layout.png "Overview")

A Monte Carlo simulation is a mathematical technique that allows us to predict different outcomes for various changes to a given system. In financial portfolio analysis the technique can be used to predict likely outcomes for aggregate portfolio across a range of potential conditions such as aggregate rate of return or default rate in various market conditions.  The technique is also valuable in scenarios where your business case requires predicting the likely outcome of individual portfolio assets such detailed portfolio analysis or stress tests.

For this fictitious use case we will be working with a portfolio of personal and commercial loans owned by our company. Each loan is represented by a subset of data housed in individual S3 objects. Our company has tasked us with trying to predict which loans will default in the event of a Federal Reserve rate increase. 

Loan defaults occur when the borrower fails to repay the loan. Predicting which loans in a portfolio would default in various scenarios helps companies understand their risk and plan for future events.

### Getting Started
This repository houses three distinct samples of the same Monte Carlo Simulation, varying by compute option. Each stack will create two Step Functions State Machines, one to generate the data to be processed, and one to process the data and run the simulation. Which stack you deploy will depend on your workload and use case.

- Lambda - This stack will use Lambda functions to process the data synchronously using direct Step Functions integration with Lambda.
- ECS + Fargate (Spot) - This stack will use an ECS Service with a Step Functions Activity to process the data asynchronously. Distributed Map will use the Step Functions Activity to distributed the data in sets that are then consumed by the ECS Service.
- ECS + EC2 (Spot) - This stack will use an ECS Service with a Step Functions Activity to process the data asynchronously. Distributed Map will use the Step Functions Activity to distributed the data in sets that are then consumed by the ECS Service.

1. Clone the Repository

#### CloudFormation
2. Navigate to the CloudFormation [Console]('https://console.aws.amazon.com/cloudformation/home')
3. Choose Create Stack, With new resources (standard)
4. In the Specify template section choose "Upload a template file"
5. Choose "Choose file" and navigate the directory you cloned the repository to. Navigate into the cloudformation directory and the stack you want to deploy. Choose the main.yml
6. Provide a stack name. ex: sfn-sample
7. Leave defaults and choose Next
8. Review the checkboxes at the bottom of the page. If you consent, check the boxes and choose Submit

#### Terraform
2. Navigate to the folder you cloned the repository to
3. Navigate into the terraform directory and the stack you wish to deploy
4. Run "terraform init"
5. Run "terraform plan -out plan"
6. Run "terraform apply plan"