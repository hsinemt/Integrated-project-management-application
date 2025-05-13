FROM node:20-slim

# Install system dependencies for node-canvas, TensorFlow, and ONNX Runtime
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies with native TensorFlow bindings
RUN npm install --legacy-peer-deps
RUN npm install @tensorflow/tfjs-node --legacy-peer-deps

# Copy the rest of the app source code
COPY . .

# Ensure the uploads and models directories exist
RUN mkdir -p uploads
RUN mkdir -p models

# Copy face detection models into the lowercase 'models' folder
COPY Models/ssd_mobilenetv1_model* models/
COPY Models/face_landmark_68_model* models/
COPY Models/face_recognition_model* models/
COPY Models/tiny_face_detector_model* models/

# Set environment variables for better stability
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV TF_FORCE_GPU_ALLOW_GROWTH=true
ENV TF_CPP_MIN_LOG_LEVEL=1
ENV ORT_LOGGING_LEVEL=info

# Expose app port
EXPOSE 9777

# Run app
CMD ["node", "server.js"]