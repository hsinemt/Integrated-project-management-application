# Projexus Platform - Integrated Project Management Application

![CI/CD Pipeline](https://github.com/hsinemt/Integrated-project-management-application/actions/workflows/main.yml/badge.svg)

## Overview

Projexus Platform is a comprehensive project management application designed to streamline team collaboration, task management, and project tracking. The platform integrates various features including task boards, chat functionality, file management, calendars, and AI-powered tools to enhance productivity and project coordination.

## Features

- **Project Management**
  - Project creation, tracking, and detailed views
  - Task boards with drag-and-drop functionality
  - Task assignment and progress tracking
  - Project timelines and milestones

- **Team Collaboration**
  - Real-time chat and messaging
  - Video and voice calls
  - File sharing and document management
  - Social feed for team updates

- **Task Management**
  - Kanban boards for visual task management
  - Todo lists and task prioritization
  - Task dependencies and relationships
  - Deadline tracking and notifications

- **User Management**
  - Role-based access control
  - User profiles and authentication
  - Multi-factor authentication
  - OAuth integration (Google, GitHub)

- **Calendar & Scheduling**
  - Interactive calendar views
  - Event scheduling and management
  - Deadline visualization
  - Time tracking

- **AI-Powered Features**
  - Natural language processing for task analysis
  - AI-assisted project planning
  - Generative AI tools for content creation
  - Face recognition for authentication

- **Reporting & Analytics**
  - Project progress dashboards
  - Performance metrics and charts
  - Custom reports generation
  - Data visualization tools

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router v7
- **UI Libraries**: 
  - Bootstrap
  - Material UI
  - Ant Design
  - PrimeReact
- **Data Visualization**: 
  - ApexCharts
  - Chart.js
  - Recharts
- **Additional Features**:
  - FullCalendar for calendar functionality
  - Socket.io client for real-time communication
  - React Beautiful DND for drag-and-drop interfaces
  - Axios for API requests

### Backend
- **Runtime**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: 
  - JWT (JSON Web Tokens)
  - Passport.js with Google and GitHub OAuth
  - Bcrypt for password hashing
- **File Handling**: 
  - Multer for file uploads
  - Cloudinary for cloud storage
- **Real-time Communication**: Socket.io
- **AI/ML Integration**:
  - Google Generative AI
  - Hugging Face Transformers
  - OpenAI
  - Natural language processing libraries
- **Email**: Nodemailer
- **Security**: 
  - Helmet for HTTP security
  - Express Rate Limit for API protection
  - Input validation with Joi

## Project Structure

```
/Front-End           - React frontend application
  /src               - Source code
    /api             - API integration
    /core            - Core components
    /feature-module  - Feature-specific modules
  /public            - Static assets
  /build             - Production build

/Back-End            - Node.js backend application
  /Config            - Configuration files
  /Controllers       - Business logic handlers
  /Middlewares       - Custom middleware functions
  /Models            - Database schemas and models
  /Routes            - API route definitions
  /services          - Service layer
  /uploads           - File upload storage
  server.js          - Main server entry point
```

## Requirements
- Node.js 18.x or higher
- MongoDB 6.x or higher
- Docker and Docker Compose (for containerized deployment)

## Repository URL
[Integrated Project Management Application](https://github.com/hsinemt/Integrated-project-management-application)

## Setup Instructions

### Local Development Setup

#### Backend Setup
1. Navigate to the backend directory:
   ```sh
   cd Back-End
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file based on the example:
   ```sh
   cp .env.example .env
   # Edit the .env file with your specific configuration
   ```
4. Start the backend server:
   ```sh
   npm start
   ```
   The backend will be available at http://localhost:9777

#### Frontend Setup
1. Navigate to the frontend directory:
   ```sh
   cd Front-End
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the frontend development server:
   ```sh
   npm start
   ```
   The frontend will be available at http://localhost:3000

### Docker Setup

This project is containerized using Docker, making it easy to set up and run in any environment.

#### Prerequisites
- Docker and Docker Compose installed on your machine
- Git for cloning the repository

#### Running with Docker Compose
1. **Clone the repository**:
   ```sh
   git clone https://github.com/hsinemt/Integrated-project-management-application
   cd Integrated-project-management-application
   ```

2. **Create a .env file in the root directory**:
   ```sh
   # Copy the example file and update with your values
   cp .env.example .env
   # Edit the .env file with your specific configuration
   ```

3. **Start the application**:
   ```sh
   docker-compose up -d
   ```

4. **Access the application**:
   - Frontend: http://localhost
   - Backend API: http://localhost:9777

#### Using Pre-built Docker Images
You can also use the pre-built Docker images from GitHub Container Registry:

```sh
docker pull ghcr.io/[repository-owner]/projexus-frontend:latest
docker pull ghcr.io/[repository-owner]/projexus-backend:latest
```

#### Docker Image Structure
- **Backend**: Node.js application running on port 9777
  - Base image: node:18-alpine
  - Includes all dependencies and configuration
  - Persistent volume for uploads

- **Frontend**: React application served by Nginx on port 80
  - Multi-stage build for smaller image size
  - Base image: nginx:alpine (for production)
  - Optimized build for better performance

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment. The pipeline is configured to run tests, linting, security checks, and deploy Docker containers.

### Main CI/CD Pipeline (`main.yml`)

The CI/CD pipeline performs the following tasks:

- **Setup**: 
  - Runs on Ubuntu with Node.js 16.x and 18.x
  - Sets up the environment and caches dependencies

- **Backend Checks**:
  - Installs backend dependencies
  - Runs security audit on backend dependencies
  - Verifies the backend server can start

- **Frontend Checks**:
  - Installs frontend dependencies
  - Runs ESLint for code quality checks
  - Runs frontend tests
  - Builds the frontend application
  - Runs security audit on frontend dependencies

- **SonarCloud Analysis**:
  - Performs code quality analysis
  - Checks for code smells, bugs, and vulnerabilities

The CI pipeline runs on pushes and pull requests to the main, development, and Code-Overview branches.

### Docker CI/CD Pipeline (`docker-ci-cd.yml`)

This dedicated Docker CI/CD pipeline automates the containerization and deployment process:

- **Build and Push**:
  - Builds Docker images for both frontend and backend
  - Pushes images to GitHub Container Registry (ghcr.io)
  - Tags images with commit SHA and latest tag
  - Sets up proper caching for faster builds
  - Creates necessary environment files for both services

- **Deployment** (only on push to main or Code-Overview branches):
  - Creates a production docker-compose file
  - Deploys the application to a server using SSH
  - Pulls the latest Docker images
  - Manages container lifecycle (stop, remove, start)
  - Cleans up old images to save disk space

The Docker CI/CD pipeline runs on pushes to the main, development, and Code-Overview branches, as well as on pull requests to the main branch. The deployment step only runs on pushes to the main or Code-Overview branches.

## Contribution Guidelines
- No one should push directly to the `main` branch.
- Use feature branches for development.
- Create a pull request and get approval before merging to `main`.

### Steps to Contribute
1. **Clone the Repository**
   ```sh
   git clone https://github.com/hsinemt/Integrated-project-management-application
   cd Integrated-project-management-application
   ```
2. **Create a New Branch**
   ```sh
   git checkout -b feature-branch-name
   ```
3. **Make Changes and Commit**
   ```sh
   git add .
   git commit -m "Describe your changes"
   ```
4. **Push the Branch to Remote**
   ```sh
   git push origin feature-branch-name
   ```
5. **Create a Pull Request (PR)**
   - Go to the repository on GitHub.
   - Click on `New Pull Request`.
   - Select your feature branch and compare it with `main`.
   - Add a description and submit the PR for review.
6. **Wait for Review & Merge**
   - Once approved, your changes will be merged into `main`.
   - Delete your feature branch after merging to keep the repository clean.

## Contact
For questions or support, please open an issue in the GitHub repository.
