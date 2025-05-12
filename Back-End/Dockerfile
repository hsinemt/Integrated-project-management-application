FROM node:20-alpine

WORKDIR /app

# Install Python and build dependencies
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

# Create symbolic link for python
RUN ln -sf python3 /usr/bin/python

COPY package*.json ./

# Install dependencies
RUN npm install

COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose the port the app runs on
EXPOSE 9777

# Command to run the application
CMD ["npm", "start"]