# Docker Setup for Projexus Platform

This document provides detailed instructions for setting up and running the Projexus Platform using Docker. The application has been containerized to ensure consistent deployment across different environments.

## Docker Configuration Files

The following Docker configuration files have been created:

### Backend Dockerfile (`Back-End/Dockerfile`)

```dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 9777

# Command to run the application
CMD ["node", "server.js"]
```

### Frontend Dockerfile (`Front-End/Dockerfile`)

```dockerfile
# Build stage
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add bash for shell script
RUN apk add --no-cache bash

# Create a script to generate env-config.js
RUN echo '#!/bin/bash\n\
echo "window.env = {" > /usr/share/nginx/html/env-config.js\n\
echo "  API_URL: \"${API_URL:-http://localhost:9777}\"" >> /usr/share/nginx/html/env-config.js\n\
echo "};" >> /usr/share/nginx/html/env-config.js\n\
exec "$@"' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Start nginx with our custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration (`Front-End/nginx.conf`)

```nginx
server {
    listen 3000;
    server_name localhost;
    
    # Root directory and index file
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
    }
    
    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./Back-End
      dockerfile: Dockerfile
    container_name: mern-backend
    restart: unless-stopped
    ports:
      - "9777:9777"
    volumes:
      - ./Back-End/uploads:/usr/src/app/uploads
      - backend_node_modules:/usr/src/app/node_modules
    environment:
      - NODE_ENV=production
      - PORT=9777
      # Add other environment variables here or use .env file
    env_file:
      - ./Back-End/.env
    networks:
      - mern-network

  frontend:
    build:
      context: ./Front-End
      dockerfile: Dockerfile
    container_name: mern-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - mern-network
    environment:
      - API_URL=http://backend:9777
      # Add other environment variables here

networks:
  mern-network:
    driver: bridge

volumes:
  backend_node_modules:
```

## Environment Variables

### Backend Environment Variables

The backend service uses environment variables defined in the `.env` file. This file should be located in the `Back-End` directory and should contain:

```
PORT=9777
MONGODB_URL=your_mongodb_atlas_connection_string
NODE_ENV=production
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
# Add other required environment variables
```

### Frontend Environment Variables

The frontend service uses environment variables that are injected at runtime through a custom entrypoint script. The main environment variable is:

- `API_URL`: The URL of the backend API (default: http://localhost:9777)

In the Docker Compose configuration, this is set to `http://backend:9777` to enable communication between containers.

## Building and Running the Application

### Prerequisites

- Docker installed on your machine
- Docker Compose installed on your machine

### Steps to Build and Run

1. **Clone the repository**:
   ```sh
   git clone https://github.com/hsinemt/Integrated-project-management-application
   cd Integrated-project-management-application
   ```

2. **Ensure the `.env` file is set up in the `Back-End` directory**:
   ```sh
   # If you need to create it from an example
   cp Back-End/.env.example Back-End/.env
   # Edit the .env file with your specific configuration
   ```

3. **Build the Docker images**:
   ```sh
   docker-compose build
   ```

4. **Start the containers**:
   ```sh
   docker-compose up -d
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:9777

6. **View logs**:
   ```sh
   docker-compose logs -f
   ```

7. **Stop the containers**:
   ```sh
   docker-compose down
   ```

## Security Best Practices for Environment Variables

### 1. Never Commit .env Files to Version Control

- Add `.env` to your `.gitignore` file
- Provide a `.env.example` file with dummy values as a template

### 2. Use Docker Secrets for Production

For production environments, consider using Docker secrets instead of environment variables:

```yaml
version: '3.8'

services:
  backend:
    # ... other configuration
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### 3. Limit Access to Environment Variables

Only expose environment variables to services that need them. In the docker-compose.yml file, define environment variables only for the services that require them.

### 4. Use Environment-Specific .env Files

For different environments (development, staging, production), use different .env files:

```sh
# Development
docker-compose --env-file .env.development up

# Production
docker-compose --env-file .env.production up
```

### 5. Regularly Rotate Secrets

Implement a process to regularly update sensitive information like API keys and passwords.

## CI/CD Integration

The dockerized application can be easily integrated into a CI/CD pipeline. Here's how it relates to the existing GitHub Actions workflow:

### 1. Building Docker Images in CI

Add steps to build the Docker images in your CI workflow:

```yaml
- name: Build Docker images
  run: docker-compose build
```

### 2. Running Tests in Containers

Run tests inside the Docker containers to ensure they work in the containerized environment:

```yaml
- name: Run backend tests
  run: docker-compose run backend npm test

- name: Run frontend tests
  run: docker-compose run frontend npm test
```

### 3. Pushing Images to a Registry

After successful tests, push the images to a container registry:

```yaml
- name: Login to GitHub Container Registry
  uses: docker/login-action@v1
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}

- name: Push Docker images
  run: |
    docker tag mern-backend:latest ghcr.io/${{ github.repository_owner }}/projexus-backend:latest
    docker tag mern-frontend:latest ghcr.io/${{ github.repository_owner }}/projexus-frontend:latest
    docker push ghcr.io/${{ github.repository_owner }}/projexus-backend:latest
    docker push ghcr.io/${{ github.repository_owner }}/projexus-frontend:latest
```

### 4. Deploying to Production

Deploy the application to your production environment:

```yaml
- name: Deploy to production
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.PROD_HOST }}
    username: ${{ secrets.PROD_USERNAME }}
    key: ${{ secrets.PROD_SSH_KEY }}
    script: |
      cd /path/to/production
      docker-compose pull
      docker-compose up -d
```

## Production Considerations

### 1. Use a Proper Reverse Proxy

For production, consider using a reverse proxy like Nginx or Traefik in front of your services:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - mern-network
```

### 2. Implement Health Checks

Add health check endpoints to your services and configure Docker to use them:

```yaml
services:
  backend:
    # ... other configuration
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9777/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. Set Up Monitoring and Logging

Implement proper monitoring and logging for your containerized application:

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus:/etc/prometheus
    ports:
      - "9090:9090"
    networks:
      - mern-network

  grafana:
    image: grafana/grafana
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "3001:3000"
    networks:
      - mern-network
```

### 4. Scale Your Application

For scaling, consider using Docker Swarm or Kubernetes:

```yaml
version: '3.8'

services:
  backend:
    # ... other configuration
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## Troubleshooting

### Common Issues

1. **Backend can't connect to MongoDB**
   - Check your MongoDB Atlas connection string
   - Ensure network access is configured correctly

2. **Frontend can't connect to backend**
   - Verify the API_URL environment variable
   - Check network connectivity between containers

3. **File upload issues**
   - Ensure the uploads directory has proper permissions
   - Check volume mounting in docker-compose.yml

### Viewing Logs

```bash
# View logs for all Services
docker-compose logs

# View logs for a specific service
docker-compose logs backend
docker-compose logs frontend

# Follow logs
docker-compose logs -f
```

## Conclusion

This Docker setup provides a consistent and reproducible environment for running the Projexus Platform. By following these instructions and best practices, you can ensure that your application runs reliably across different environments, from development to production.