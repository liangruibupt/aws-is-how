# Pull base image. We reference a pre-built image available on DockerHub
FROM tomcat:8-jre8 

# Maintainer for this Image 
MAINTAINER "ruiliang@amazon.com" 

# Copy to war file to tomcat path  
ADD sample.war /usr/local/tomcat/webapps/ 

# Typically you would add custom configuration for 
# the tomcat server using the following files. Skipping this for simplicity
# ADD settings.xml /usr/local/tomcat/conf/
# ADD tomcat-users.xml /usr/local/tomcat/conf/