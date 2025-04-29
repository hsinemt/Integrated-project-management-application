# Integrated Project Management Application

![CI Pipeline](https://github.com/hsinemt/Integrated-project-management-application/actions/workflows/main.yml/badge.svg)

## Project Structure
```
/Config        - Configuration files
/Controllers   - Handles business logic
/Middlewares   - Custom middleware functions
/Models        - Database schemas and models
/Routes        - API route handlers
.env           - Environment variables
package.json   - Node.js project configuration
server.js      - Main server entry point
```

## Requirements
- Node.js 22.12.0

## Repository URL
[Integrated Project Management Application](https://github.com/hsinemt/Integrated-project-management-application)

## Setup Instructions
1. Initialize the project:
   ```sh
   npm init -y
   ```
2. Install dependencies:
   ```sh
   npm i express nodemon bcrypt dotenv nodemailer mongoose joi body-parser cookie-parser cors jsonwebtoken
   ```
3. Modify `package.json` to include:
   ```json
   "scripts": {
     "start": "nodemon server.js"
   }
   ```
4. Start the project:
   ```sh
   npm start
   ```

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

## CI Pipeline

This project uses GitHub Actions for continuous integration. The pipeline is configured to run tests, linting, and security checks on the codebase.

### Main CI Pipeline (`main.yml`)

The CI pipeline performs the following tasks:

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

The pipeline runs on pushes and pull requests to the main, development, and Code-Overview branches.
