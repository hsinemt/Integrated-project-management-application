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

# Copy the entrypoint script from the build stage
COPY --from=build /app/docker-entrypoint.sh /docker-entrypoint.sh

# Make sure the entrypoint script is executable
RUN chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Start nginx with our custom entrypoint
#ENTRYPOINT ["/docker-entrypoint.sh"]
#RUN chmod +x /docker-entrypoint.sh
CMD ["nginx", "-g", "daemon off;"]
