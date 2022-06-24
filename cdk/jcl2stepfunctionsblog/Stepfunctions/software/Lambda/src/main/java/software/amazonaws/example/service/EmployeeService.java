// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example.service;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazonaws.example.entity.Employee;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.stream.Collectors;

public class EmployeeService {

    private static final Logger logger = LogManager.getLogger(EmployeeService.class);

    private Connection connection;

    public EmployeeService(Connection connection) {
        this.connection = connection;
    }

    public List<String> findEmployeeIds(Map<String, Employee> employeeMap) throws SQLException {
        List<String> employeeList = new ArrayList<>();
        PreparedStatement preparedStatement = connection.prepareStatement(getSQLQuery(employeeMap.keySet()));
        ResultSet results = preparedStatement.executeQuery();

        while (results.next()) {
            employeeList.add(results.getString("employee_id"));
        }

        return employeeList;
    }

    private String getSQLQuery(Set<String> fullList) {

        String temp = fullList.stream().map(id -> "'" + id + "'")
                .collect(Collectors.joining(","));
        String sql = "select employee_id from employee e where employee_id in ( " + temp + ")";
        logger.info("SQL to Execute : " + sql);
        return sql;
    }

    public Map<String, Employee> getEmployeeMap(String[] lines) {

        Map<String, Employee> employeeMap = new HashMap<>();
        for (String line : lines) {
            String[] attributes = line.split(",");
            Employee e = Employee.builder()
                    .employeeId(attributes[0].replaceAll("^\"|\"$", ""))
                    .birthDate(attributes[1].replaceAll("^\"|\"$", ""))
                    .firstName(attributes[2].replaceAll("^\"|\"$", ""))
                    .lastName(attributes[3].replaceAll("^\"|\"$", ""))
                    .gender(attributes[4].replaceAll("^\"|\"$", ""))
                    .hireDate(attributes[5].replaceAll("^\"|\"$", ""))
                    .build();
            employeeMap.put(e.getEmployeeId(), e);
        }
        return employeeMap;
    }
}
