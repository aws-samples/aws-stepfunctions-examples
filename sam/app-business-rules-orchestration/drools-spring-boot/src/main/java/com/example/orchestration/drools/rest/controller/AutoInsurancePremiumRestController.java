/*
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 
package com.example.orchestration.drools.rest.controller;

import java.util.HashMap;
import java.util.Map;
import java.io.IOException;
import java.util.Collection;

import org.kie.api.runtime.KieContainer;
import org.kie.api.runtime.KieSession;
import org.kie.api.runtime.ObjectFilter;
import org.kie.api.runtime.rule.FactHandle;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.orchestration.drools.vo.Car;
import com.example.orchestration.drools.vo.Driver;
import com.example.orchestration.drools.vo.InsuranceRequest;
import com.example.orchestration.drools.vo.Policy;



@RestController
public class AutoInsurancePremiumRestController {

	@Autowired
	private KieContainer kieContainer;
		
	private void printFactsMessage(KieSession kieSession) {
	  	Collection<FactHandle> allHandles = kieSession.getFactHandles();
	  
	  	String msg = "\nAll facts:\n";
	  	for (FactHandle handle : allHandles) {
	      		msg += "    " + kieSession.getObject(handle) + "\n";
	  	}
	  	
	  	System.out.println(msg);
	}
	

	@PostMapping(value ="/policy/premium", consumes = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE }, produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.APPLICATION_XML_VALUE})
	public ResponseEntity<Policy> getPremium(@RequestBody InsuranceRequest requestObj) {
		
		System.out.println("handling request...");
		
		Car carObj = requestObj.getCar();		
		Car carObj1 = new Car(carObj.getMake(),carObj.getModel(),carObj.getYear(), carObj.getStyle(), carObj.getColor());
		System.out.println("###########CAR##########");
		System.out.println(carObj1.toString());
		
		System.out.println("###########POLICY##########");		
		Policy policyObj = requestObj.getPolicy();
		Policy policyObj1 = new Policy(policyObj.getId(), policyObj.getPremium());
		System.out.println(policyObj1.toString());
			
		System.out.println("###########DRIVER##########");	
		Driver driverObj = requestObj.getDriver();
		Driver driverObj1 = new Driver( driverObj.getAge(), driverObj.getName());
		System.out.println(driverObj1.toString());
		
		KieSession kieSession = kieContainer.newKieSession();
		kieSession.insert(carObj1); 	 
		kieSession.insert(policyObj1); 
		kieSession.insert(driverObj1); 		
		kieSession.fireAllRules(); 
		printFactsMessage(kieSession);
		kieSession.dispose();
	
		
		return ResponseEntity.ok(policyObj1);
	}	
	
	
}
