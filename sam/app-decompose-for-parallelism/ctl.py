#!/usr/local/bin/python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import toml
import sys
import boto3
import time
import json
import datetime
import argparse

default_sam_config_filename = 'samconfig.toml'

def handler_datetime(field):
    if isinstance(field, datetime.datetime):
        return field.isoformat()
    raise TypeError("Type not recognized")

def load_sam_config(file_name = default_sam_config_filename):
    cfg = {}
    try:
        with open(file_name) as f:
            content = f.read()
            cfg = toml.loads(content)
        
        return cfg
    except:
        print("Error: Couldn't load sam config file: {}".format(sys.exc_info()[0]))
        exit()

def get_stack_name(file_name = default_sam_config_filename):
    sam_config = load_sam_config(file_name)
    stack_name = ''
    try:
        stack_name = sam_config['default']['dedploy']['parameters']['stack_name']
    except(KeyError):
        print("Error: stack name not found in sam config: {}".format(sam_config))
    
    return stack_name
        
def get_parameter(parameter,file_name = default_sam_config_filename):
    sam_config = load_sam_config(file_name)

    parameters = {}
    try:
        parameters = sam_config['default']['deploy']['parameters']
    except(KeyError):
        print("Error: parameters list not found in sam config: {}".format(sam_config))
        exit()

    r_val = ''
    try:
        r_val = parameters[parameter]
    except(KeyError):
        print("Error: parameter {} not found in parameters: {}".format(parameter,parameters))
        exit()
    
    return r_val

def describe_stack(file_name = default_sam_config_filename):
    profile = get_parameter('profile',file_name)
    stack_name = get_parameter('stack_name',file_name)
    region = get_parameter('region',file_name)
    stack = {}

    try:
        boto3.setup_default_session(profile_name=profile,region_name=region)
        client = boto3.client('cloudformation')
        stack = client.describe_stacks(StackName=stack_name)
    except:
        print("Error: Failed to describe stack {}: {}".format(stack_name,sys.exc_info()[0]))
        exit()
    return stack

def get_stack_output(file_name = default_sam_config_filename):
    stack = describe_stack(file_name=file_name)
    output = {}
    try:
        output = stack['Stacks'][0]['Outputs']
    except:
        print("Error: Failed to get stack output for stack: {}".format(sys.exc_info()[0]))
        exit()

    return output

def get_output_value(key_name):

    r_val = ''
    output = get_stack_output()
    for o in output:
        if 'OutputKey' in o:
            if o['OutputKey'] == key_name:
                r_val = o['OutputValue']
    
    return r_val

def process_execution_description(execution_description):
    if 'output' in execution_description:
        output_string = execution_description['output']
        output_obj = json.loads(output_string)
        # Clear the test results detail
        output_obj['test_results'] = 'TRUNCATED'
        execution_description['output'] = output_obj

    if 'input' in execution_description:
        input_string = execution_description['input']
        input_obj = json.loads(input_string)
        execution_description['input'] = input_obj

    return(execution_description)

def cmd_create_dashboard(cli_args):
    profile = get_parameter('profile')
    region = get_parameter('region')

    dashboard_json = ''
    with open('./dashboards/summary_dashboard.json','r') as file:
        dashboard_json = file.read()

    # Get data to substitute
    metrics_namespace = get_output_value('MetricNamesapce')
    dashboard_json = dashboard_json.replace('!!!METRICNAMESPACE!!!',metrics_namespace)
    
    log_group = get_output_value('StateMachineLogGroup')
    log_group = log_group.split(':')[6]
    dashboard_json = dashboard_json.replace('!!!LOGGROUP!!!',log_group)

    dashboard_json = dashboard_json.replace('!!!REGION!!!',region)


    try:
        boto3.setup_default_session(profile_name=profile,region_name=region)
        client = boto3.client('cloudwatch')
        client.put_dashboard(
            DashboardName='{}Summary-{}'.format(metrics_namespace,region),
            DashboardBody=dashboard_json
        )
        
    except:
        print("Error: Failed to create dashboard: {}".format(sys.exc_info()))
        exit()

def cmd_run_smoke_test(cli_args):

    iteration_count = 1
    try:
        iteration_count = int(cli_args[0])
    except:
        iteration_count = 1

    profile = get_parameter('profile')
    region = get_parameter('region')

    state_machine_arn = get_output_value('StateMachineMain')

    if state_machine_arn == '':
        print("Error: Failed to find statemachine arn in output: {}".format(get_stack_output()))
        exit()
    else:
        print("statemachine arn is {}".format(state_machine_arn))

    exec_input = {'iteration_count': iteration_count}
    exec_name = "smoketest_{}iterations_{}".format(iteration_count,int(time.time()))
    try:
        boto3.setup_default_session(profile_name=profile,region_name=region)
        client = boto3.client('stepfunctions')
        start_time = time.time()
        test_execution = client.start_execution(stateMachineArn=state_machine_arn,input=json.dumps(exec_input),name=exec_name)
        print("Started execution test execution {} at {} with input {}".format(test_execution['executionArn'],start_time,exec_input))
        print(".", end="",flush=True)

        # Poll for completion
        while 1==1:
            time.sleep(2)
            try:
                execution_description = client.describe_execution(executionArn=test_execution['executionArn'])
                if not execution_description['status'] == 'RUNNING':
                    # Then this finished
                    print("")
                    print("Test execution complete after {} seconds with result:".format(int(time.time() - start_time)))
                    print(json.dumps(process_execution_description(execution_description),indent=2,default=handler_datetime))
                    break
                else:
                    print(".", end="",flush=True)
            except:
                print("\nError: Failure describing execution for {}: {}".format(test_execution['executionArn'],sys.exc_info()))
    except:
        # Just pring an error and continue
        print("Error: Failed to execute {}: {}".format(test_execution['executionArn'],sys.exc_info()))

def cmd_print_entry_point(cli_args):
    print(get_output_value('StateMachineMain'))

if __name__ == "__main__":

    # Available commands to be run along with a description of each
    commands = {
        'run_smoke_test': (cmd_run_smoke_test,"Run a smoke test"),
        'print_entry_point': (cmd_print_entry_point,"Print the ARN of the entry point statemachine for this app"),
        'create_dashboard': (cmd_create_dashboard,"Create a dashboard for monitoring the app")
    }

    args = sys.argv
    if (len(args) < 2):
        print("Error: No command provided.\n")
    else:
        if args[1] in commands:
            cmd = commands[args[1]]
            nargs = args[2:]
            #print(nargs)
            cmd[0](nargs)
            quit()
        else:
            print("{} is not a recognized command\n".format(args[1]))

    print("Supported commands:")
    for cn in commands:
        print("\t{}: {}".format(cn,commands[cn][1]))






