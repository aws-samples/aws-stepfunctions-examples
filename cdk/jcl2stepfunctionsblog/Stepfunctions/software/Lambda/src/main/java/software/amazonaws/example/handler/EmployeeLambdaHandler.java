// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example.handler;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazonaws.example.service.EmployeeService;
import software.amazonaws.example.util.DBInitializer;
import software.amazonaws.example.entity.Employee;

import java.sql.Connection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


public class EmployeeLambdaHandler implements RequestHandler<Map<String, Object>, List<Employee>> {

    private static final Logger logger = LogManager.getLogger(EmployeeLambdaHandler.class);

    private EmployeeService employeeService;

    public EmployeeLambdaHandler() {
        DBInitializer dbInitializer = new DBInitializer();
        Connection connection = dbInitializer.getConnection();
        this.employeeService = new EmployeeService(connection);
    }


    @Override
    public List<Employee> handleRequest(Map<String, Object> event, Context context) {
        try {
            logger.info("Input Event :: " + event);
            return processEvent(event);
        } catch (Exception e) {
            logger.error(e);
            throw new RuntimeException(e);
        }
    }

    private List<Employee> processEvent(Map<String, Object> event) throws Exception {
        String[] lines = event.get("body").toString().split(System.lineSeparator());
        Map<String, Employee> employeeMap = employeeService.getEmployeeMap(lines);
        List<String> dbEmployeeIds = employeeService.findEmployeeIds(employeeMap);
        employeeMap.keySet().removeAll(dbEmployeeIds);
        return employeeMap.values().stream().collect(Collectors.toList());
    }


}
