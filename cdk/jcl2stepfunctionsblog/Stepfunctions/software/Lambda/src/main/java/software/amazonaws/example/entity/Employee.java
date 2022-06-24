// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example.entity;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
@Setter
public class Employee {
    private String employeeId;
    private String birthDate;
    private String firstName;
    private String lastName;
    private String gender;
    private String hireDate;

}
