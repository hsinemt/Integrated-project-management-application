# SonarCloud Integration for MERN Stack Project

This document explains how to set up and use SonarCloud integration with your MERN stack project using GitHub Actions.

## Overview

SonarCloud is a cloud-based code quality and security service that performs automatic reviews of your code to detect bugs, vulnerabilities, and code smells. The integration:

1. Analyzes both backend (Node.js/Express) and frontend (React) code
2. Provides separate quality metrics for each part of the application
3. Acts as a quality gate before deployment
4. Integrates seamlessly with your GitHub Actions CI/CD pipeline

## Required GitHub Secrets

You need to configure the following GitHub secrets for the SonarCloud integration to work:

| Secret Name | Description |
|-------------|-------------|
| `SONAR_TOKEN` | Authentication token for SonarCloud. Generate this in your SonarCloud account under Security settings |
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions, no manual setup needed |

## How to Set Up SonarCloud

1. **Create a SonarCloud Account**:
   - Go to [SonarCloud](https://sonarcloud.io/) and sign up using your GitHub account
   - Create an organization (or use an existing one)

2. **Set Up Your Project**:
   - Add your GitHub repository to SonarCloud
   - Note your organization name and project key

3. **Generate a SonarCloud Token**:
   - Go to your SonarCloud account → Security → Generate Tokens
   - Create a token with the "Execute Analysis" permission
   - Copy this token

4. **Add the Token to GitHub Secrets**:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add a new repository secret named `SONAR_TOKEN` with the value of your SonarCloud token

## How the Integration Works

1. The GitHub Actions workflow runs tests for both backend and frontend
2. After tests pass, the SonarCloud analysis job runs
3. SonarCloud analyzes the code based on the configuration in `sonar-project.properties`
4. The quality gate checks if the code meets the defined quality standards
5. If the quality gate fails, the workflow will fail, preventing deployment of low-quality code

## Quality Gate

The quality gate is configured in the `sonar-project.properties` file with `sonar.qualitygate.wait=true`. This means:

- The GitHub Actions workflow will wait for SonarCloud to analyze the code and evaluate the quality gate
- If the quality gate fails, the GitHub Actions job will fail
- This prevents merging or deploying code that doesn't meet quality standards

## Customizing Analysis

You can customize the SonarCloud analysis by modifying the `sonar-project.properties` file:

- Change exclusion patterns to include/exclude specific files
- Adjust code coverage reporting paths
- Add custom quality profiles or rules

## Viewing Results

After the analysis runs:

1. Go to your SonarCloud dashboard
2. Select your project
3. View detailed reports on code quality, security issues, and technical debt

## Troubleshooting

If the SonarCloud analysis fails:

1. Check the GitHub Actions logs for specific error messages
2. Verify that your `SONAR_TOKEN` is correctly set in GitHub secrets
3. Ensure your `sonar-project.properties` file is properly configured
4. Check that your code coverage reports are being generated in the expected locations

## Additional Resources

- [SonarCloud Documentation](https://docs.sonarcloud.io/)
- [GitHub Actions for SonarCloud](https://github.com/SonarSource/sonarcloud-github-action)
- [Quality Gates Documentation](https://docs.sonarcloud.io/improving/quality-gates/)