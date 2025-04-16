pipeline {
    agent any
    
    environment {
        // Nexus Configuration
        registryCredentials = "nexus"
        registry = "192.168.65.129:8083"
        
        // Image Tags with Git commit hash and build number
        BACKEND_IMAGE = "${registry}/backend:${GIT_COMMIT.take(7)}-${BUILD_NUMBER}"
        FRONTEND_IMAGE = "${registry}/frontend:${GIT_COMMIT.take(7)}-${BUILD_NUMBER}"
        
        // Node Configuration
        NODE_VERSION = "18"
    }

    stages {
        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            bat "nvm use ${NODE_VERSION} || nvm install ${NODE_VERSION}"
                            bat 'npm ci --prefer-offline'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            bat "nvm use ${NODE_VERSION} || nvm install ${NODE_VERSION}"
                            bat 'npm ci --prefer-offline'
                        }
                    }
                }
            }
        }

        stage('Build & Test') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            // Linting
                            bat 'npm run lint'
                            
                            // Security Audit
                            bat 'npm run security-check || exit 0'
                            
                            // Unit Tests
                            bat 'npm run test'
                            
                            // Integration Tests
                            bat 'npm run test:integration'
                            
                            // SonarQube Analysis
                            script {
                                if (fileExists('sonar-project.properties')) {
                                    def scannerHome = tool name: 'sonar-scanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                                    withSonarQubeEnv('sonarqube') {
                                        bat """
                                            "${scannerHome}\\bin\\sonar-scanner" ^
                                            -Dproject.settings=./sonar-project.properties ^
                                            -Dsonar.working.directory=.scannerwork
                                        """
                                    }
                                }
                            }
                            
                            // Build Docker Image
                            bat "docker build --no-cache -t ${BACKEND_IMAGE} ."
                        }
                    }
                    
                    post {
                        always {
                            junit 'backend/test-results.xml'
                            archiveArtifacts 'backend/coverage/**/*'
                        }
                    }
                }

                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            // Linting
                            bat 'npm run lint'
                            
                            // Security Audit
                            bat 'npm run security-check || exit 0'
                            
                            // Unit Tests
                            bat 'npm run test:ci'
                            
                            // Build Production Bundle
                            bat 'npm run build'
                            
                            // Build Docker Image
                            bat "docker build --no-cache -t ${FRONTEND_IMAGE} ."
                            
                            // Run Accessibility Tests
                            bat 'npm run test:a11y'
                        }
                    }
                    
                    post {
                        always {
                            junit 'frontend/junit.xml'
                            publishHTML(
                                target: [
                                    allowMissing: true,
                                    alwaysLinkToLastBuild: true,
                                    keepAll: true,
                                    reportDir: 'frontend/coverage/lcov-report',
                                    reportFiles: 'index.html',
                                    reportName: 'Frontend Coverage Report'
                                ]
                            )
                        }
                    }
                }
            }
        }

        stage('Push Images') {
            steps {
                script {
                    docker.withRegistry("http://${registry}", registryCredentials) {
                        bat "docker push ${BACKEND_IMAGE}"
                        bat "docker push ${FRONTEND_IMAGE}"
                    }
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                script {
                    dir('deploy') {
                        // Update docker-compose with new images
                        bat """
                            powershell -Command "(Get-Content docker-compose.yml) -replace 'image: ${registry}/backend:.*', 'image: ${BACKEND_IMAGE}' | Set-Content docker-compose.yml"
                            powershell -Command "(Get-Content docker-compose.yml) -replace 'image: ${registry}/frontend:.*', 'image: ${FRONTEND_IMAGE}' | Set-Content docker-compose.yml"
                        """
                        
                        // Deploy to staging environment
                        sshagent(['staging-server-credentials']) {
                            bat """
                                scp docker-compose.yml staging-server:/app/
                                ssh staging-server "cd /app && docker-compose down && docker-compose up -d"
                            """
                        }
                    }
                }
            }
        }

        stage('Run E2E Tests') {
            when {
                branch 'main'
            }
            steps {
                dir('tests/e2e') {
                    bat 'npm install'
                    bat 'npm run test'
                }
            }
        }
    }

    post {
        always {
            // Clean up Docker to save space
            bat 'docker system prune -f --volumes'
            
            // Clean workspace
            cleanWs()
            
            // Archive important files
            archiveArtifacts artifacts: '**/reports/**/*', allowEmptyArchive: true
        }
        success {
            slackSend(
                color: 'good',
                message: """SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}
                | Branch: ${env.GIT_BRANCH}
                | Commit: ${env.GIT_COMMIT.take(7)}
                | Backend Image: ${BACKEND_IMAGE}
                | Frontend Image: ${FRONTEND_IMAGE}
                | ${env.BUILD_URL}"""
            )
        }
        failure {
            slackSend(
                color: 'danger',
                message: """FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}
                | Branch: ${env.GIT_BRANCH}
                | Commit: ${env.GIT_COMMIT.take(7)}
                | ${env.BUILD_URL}"""
            )
        }
        unstable {
            slackSend(
                color: 'warning',
                message: """UNSTABLE: ${env.JOB_NAME} #${env.BUILD_NUMBER}
                | Tests failed but pipeline continued
                | ${env.BUILD_URL}"""
            )
        }
    }
}
