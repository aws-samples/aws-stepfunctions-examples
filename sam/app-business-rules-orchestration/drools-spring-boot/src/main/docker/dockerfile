#FROM java:8
FROM openjdk:17-oracle
VOLUME /tmp
ADD drools-rule-app-0.0.1-SNAPSHOT.jar app.jar
RUN bash -c 'touch /app.jar'
#ENTRYPOINT ["java","-version"]
ENTRYPOINT ["java","-jar", "/app.jar"]
