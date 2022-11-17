// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example.handler;

import com.amazonaws.services.lambda.runtime.events.CloudFormationCustomResourceEvent;
import com.google.gson.JsonObject;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazonaws.example.util.DBInitializer;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Arrays;
import java.util.List;


public class DBInitLambdaHandler implements RequestHandler<CloudFormationCustomResourceEvent, String> {

    private static final Logger logger = LogManager.getLogger(DBInitLambdaHandler.class);
    private Connection connection = null;

    public DBInitLambdaHandler() {
        DBInitializer dbInitializer = new DBInitializer();
        this.connection = dbInitializer.getConnection();
    }


    @Override
    public String handleRequest(CloudFormationCustomResourceEvent event, Context context) {
        String requestType = event.getRequestType();

        logger.info("Properties :: " + event.getResourceProperties());

        String sqlScript = event.getResourceProperties().get("SqlScript").toString();

        executeSQLStatements(getSQLStatements(sqlScript));

        JsonObject retJson = new JsonObject();
        if (requestType != null) {
            retJson.addProperty("RequestType", requestType);
        }

        if ("Update".equals(requestType) || "Delete".equals(requestType)) {
            retJson.addProperty("PhysicalResourceId", event.getPhysicalResourceId());
        }

        retJson.addProperty("scriptRun", Boolean.TRUE.toString());
        return retJson.toString();
    }

    private List<String> getSQLStatements(String sqlScript) {
        return Arrays.asList(sqlScript.split(";"));
    }

    private void executeSQLStatements(List<String> stmts) {
        try (Statement stmt = connection.createStatement()) {
            for (String sqlStmt : stmts) {
                logger.info("Executing ... " + sqlStmt);
                stmt.execute(sqlStmt);
            }
        } catch (SQLException e) {
            logger.error(e.getMessage(), e);
            throw new RuntimeException(e);
        }
    }


}
