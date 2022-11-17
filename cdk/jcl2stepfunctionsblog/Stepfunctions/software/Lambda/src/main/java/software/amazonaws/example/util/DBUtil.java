// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package software.amazonaws.example.util;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Properties;
import lombok.NonNull;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rds.RdsUtilities;
import software.amazon.awssdk.services.rds.model.GenerateAuthenticationTokenRequest;

public class DBUtil {
    public static final String SSL_CERTIFICATE = "https://s3.amazonaws.com/rds-downloads/rds-ca-2019-root.pem";
    private static final String KEY_STORE_TYPE = "JKS";
    private static final String KEY_STORE_PROVIDER = "SUN";
    private static final String KEY_STORE_FILE_PREFIX = "sys-connect-via-ssl-test-cacerts";
    private static final String KEY_STORE_FILE_SUFFIX = ".jks";
    private static final String DEFAULT_KEY_STORE_PASSWORD = "delivery";
    private static final String JDBC_PREFIX = "jdbc:mysql://";
    private static final Logger logger = LogManager.getLogger(DBUtil.class);

    public Connection createConnectionViaIamAuth(@NonNull String username,
                                                 @NonNull String dbEndpoint,
                                                 @NonNull String region,
                                                 Integer port) {
        Connection connection;
        try {
            File keyStoreFile = createKeyStoreFile(createCertificate(SSL_CERTIFICATE));
            System.setProperty("javax.net.ssl.trustStore", keyStoreFile.getPath());
            System.setProperty("javax.net.ssl.trustStoreType", KEY_STORE_TYPE);
            System.setProperty("javax.net.ssl.trustStorePassword", DEFAULT_KEY_STORE_PASSWORD);

            connection = DriverManager.getConnection(
                    JDBC_PREFIX + dbEndpoint,
                    setMySqlConnectionProperties(username, dbEndpoint, region, port));

            return connection;

        } catch (Exception e) {
            logger.info("Connection FAILED");
            logger.error(e.getMessage(), e);
        }
        return null;
    }

    public static String generateAuthToken(String username, String dbEndpoint, String region, Integer port) {
        RdsUtilities utilities = RdsUtilities.builder()
                .credentialsProvider(DefaultCredentialsProvider.create())
                .region(Region.of(region))
                .build();

        GenerateAuthenticationTokenRequest authTokenRequest = GenerateAuthenticationTokenRequest.builder()
                .username(username)
                .hostname(dbEndpoint)
                .port(port)
                .build();

        String authenticationToken = utilities.generateAuthenticationToken(authTokenRequest);

        return authenticationToken;
    }

    private static Properties setMySqlConnectionProperties(String username,
                                                           String dbEndpoint,
                                                           String region,
                                                           Integer port) {
        Properties mysqlConnectionProperties = new Properties();
        mysqlConnectionProperties.setProperty("useSSL", "true");
        mysqlConnectionProperties.setProperty("user", username);
        mysqlConnectionProperties.setProperty("password", generateAuthToken(username, dbEndpoint, region, port));

        return mysqlConnectionProperties;
    }

    public static X509Certificate createCertificate(String certFile) throws  GeneralSecurityException, IOException {
        CertificateFactory certFactory = CertificateFactory.getInstance("X.509");
        URL url = new URL(certFile);
        try (InputStream certInputStream = url.openStream()) {
            return (X509Certificate) certFactory.generateCertificate(certInputStream);
        }
    }

    private static File createKeyStoreFile(X509Certificate rootX509Certificate)
            throws GeneralSecurityException, IOException {
        File keyStoreFile = File.createTempFile(KEY_STORE_FILE_PREFIX, KEY_STORE_FILE_SUFFIX);

        try (FileOutputStream fos = new FileOutputStream(keyStoreFile.getPath())) {
            KeyStore ks = KeyStore.getInstance(KEY_STORE_TYPE, KEY_STORE_PROVIDER);
            ks.load(null);
            ks.setCertificateEntry("rootCaCertificate", rootX509Certificate);
            ks.store(fos, DEFAULT_KEY_STORE_PASSWORD.toCharArray());
        }

        return keyStoreFile;
    }
}
