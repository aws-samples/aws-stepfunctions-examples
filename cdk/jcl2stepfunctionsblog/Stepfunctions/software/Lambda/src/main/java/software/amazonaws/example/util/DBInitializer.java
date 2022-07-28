// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import java.sql.Connection;
import java.sql.SQLException;

public class DBInitializer {
    private static final Logger logger = LogManager.getLogger(DBInitializer.class);

    private Connection connection;

    public DBInitializer() {
        try {

            String databaseName = System.getenv("DATABASE_NAME");
            String endpoint = System.getenv("END_POINT");
            String dbUserName = System.getenv("DB_USER_NAME");
            String region = System.getenv("REGION");
            int port = Integer.parseInt(System.getenv("DB_PORT"));

            DBUtil dbUtil = new DBUtil();
            this.connection = dbUtil.createConnectionViaIamAuth(dbUserName, endpoint, region, port);
            connection.setCatalog(databaseName);

            logger.info("Finished Creating connection");

        } catch (SQLException e) {
            logger.info("Error initializing the DB", e);
            throw new RuntimeException("Error initializing the DB", e);
        }
    }

    public Connection getConnection() {
        return this.connection;
    }


}
