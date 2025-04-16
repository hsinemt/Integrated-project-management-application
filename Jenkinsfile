pipeline {
    agent any
    
    environment {
        // Nexus Configuration
        registryCredentials = "nexus"
        registry = "192.168.65.129:8083"
        
        // Image Tags with Git commit hash and build number
        BACKEND_IMAGE = "${registry}/backend:${GIT_COMMIT.take(7)}-${BUILD_NUMBER}"
        FRONTEND_IMAGE = "${registry}/frontend:${GIT_COMMIT.take(7)}-${BUILD_NUMBER}"
        
        // Git Configuration
        GIT_REPO = "https://github.com/your-username/your-repo.git"
        GIT_BRANCH = "main"
        
        // Node Configuration
        NODE_VERSION = "18.x"
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: "${GIT_BRANCH}", 
                url: "${GIT_REPO}",
                credentialsId: 'github-credentials'
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('backend') {
                            sh "nvm use ${NODE_VERSION} || nvm install ${NODE_VERSION}"
                            sh 'npm ci --prefer-offline'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('frontend') {
                            sh "nvm use ${NODE_VERSION} || nvm install ${NODE_VERSION}"
                            sh 'npm ci --prefer-offline'
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
                            sh 'npm run lint'
                            
                            // Security Audit
                            sh 'npm run security-check || true'
                            
                            // Unit Tests
                            sh 'npm run test'
                            
                            // Integration Tests
                            sh 'npm run test:integration'
                            
                            // SonarQube Analysis
                            script {
                                if (fileExists('sonar-project.properties')) {
                                    def scannerHome = tool name: 'sonar-scanner', type: 'hudson.plugins.sonar.SonarRunnerInstallation'
                                    withSonarQubeEnv('sonarqube') {
                                        sh """
                                            ${scannerHome}/bin/sonar-scanner \
                                            -Dproject.settings=./sonar-project.properties \
                                            -Dsonar.working.directory=.scannerwork
                                        """
                                    }
                                }
                            }
                            
                            // Build Docker Image
                            sh "docker build --no-cache -t ${BACKEND_IMAGE} ."
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
                            sh 'npm run lint'
                            
                            // Security Audit
                            sh 'npm run security-check || true'
                            
                            // Unit Tests
                            sh 'npm run test:ci'
                            
                            // Build Production Bundle
                            sh 'npm run build'
                            
                            // Build Docker Image
                            sh "docker build --no-cache -t ${FRONTEND_IMAGE} ."
                            
                            // Run Accessibility Tests
                            sh 'npm run test:a11y'
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
                        sh "docker push ${BACKEND_IMAGE}"
                        sh "docker push ${FRONTEND_IMAGE}"
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
                        sh """
                            sed -i "s|image: ${registry}/backend:.*|image: ${BACKEND_IMAGE}|g" docker-compose.yml
                            sed -i "s|image: ${registry}/frontend:.*|image: ${FRONTEND_IMAGE}|g" docker-compose.yml
                        """
                        
                        // Deploy to staging environment
                        sshagent(['staging-server-credentials']) {
                            sh """
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
                    sh 'npm install'
                    sh 'npm run test'
                }
            }
        }
    }

    post {
        always {
            // Clean up Docker to save space
            sh 'docker system prune -f --volumes'
            
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
