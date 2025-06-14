# Use OpenJDK 24 as the base image
FROM openjdk:24-jdk

# Define an argument for the JAR file path.
# This is crucial: For Gradle projects, the JAR is typically found in 'build/libs/'.
# Ensure you build your project with './gradlew clean build' BEFORE building the Docker image.
ARG JAR_FILE=build/libs/*.jar

# Copy the built JAR file from the host into the Docker image's root directory
# Renaming it to 'app.jar' for simplicity.
# IMPORTANT: Corrected 'app.ja.' to 'app.jar'
COPY ${JAR_FILE} app.jar

# Define the working directory inside the container (optional but good practice)
# If you set a WORKDIR, your ENTRYPOINT might need to be adjusted relative to it.
# For now, since app.jar is at /, we don't strictly need WORKDIR, but adding it
# prepares for a more structured image.
WORKDIR /app

# Move the app.jar to the WORKDIR, or copy directly to WORKDIR in previous step
# If you use WORKDIR /app, the COPY should ideally copy to ./app.jar or /app/app.jar
# Let's adjust COPY to copy directly into /app/app.jar to be explicit
# and then adjust ENTRYPOINT if needed.
# For simplicity, if WORKDIR is /app, and COPY target is app.jar, it copies to /app/app.jar.
# So, changing the COPY and ENTRYPOINT accordingly.

# Let's adjust the COPY and ENTRYPOINT for clarity and best practice:
# 1. Set WORKDIR to /app
# 2. Copy the JAR to /app/app.jar
# 3. ENTRYPOINT refers to /app/app.jar

# Re-structuring for clarity:
# Ensure you have your upload directory as planned.
RUN mkdir -p /upload_dir
# Set permissions for the upload directory.
RUN chmod 777 /upload_dir

# Define ARG for JAR_FILE as before
ARG JAR_FILE=build/libs/*.jar

# Set the working directory inside the container
WORKDIR /app

# Copy the JAR file into the working directory, naming it app.jar
# This will result in the JAR being at /app/app.jar
COPY ${JAR_FILE} app.jar

# Command to run the Spring Boot application when the container starts
# It executes the 'app.jar' which is now located at /app/app.jar
ENTRYPOINT ["java","-jar","/app/app.jar"]

