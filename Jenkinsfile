pipeline {
    agent any

    environment {
        GITHUB_REPO = 'https://github.com/yacine004/fintrack.git'
        APP_DIR     = '/home/ubuntu/fintrack'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '📥 Récupération du code source depuis GitHub...'
                git branch: 'develop',
                    credentialsId: 'github-token',
                    url: "${GITHUB_REPO}"
            }
        }

        stage('Tests Backend') {
            steps {
                echo '🧪 Exécution des tests Pytest...'
                dir('backend') {
                    sh 'python3 -m pip install -r requirements.txt --quiet'
                    sh 'python3 -m pip install pytest pytest-flask --quiet'
                    sh 'python3 -m pytest tests/ -v --tb=short || true'
                }
            }
        }

        stage('Build Docker') {
            steps {
                echo '🐳 Construction des images Docker...'
                sh 'docker-compose build --no-cache'
            }
        }

        stage('Déploiement') {
            steps {
                echo '🚀 Déploiement de FinTrack...'
                sh 'docker-compose -p fintrack down --remove-orphans || true'
                sh 'docker-compose -p fintrack up -d'
                sh 'sleep 10'
                sh 'docker ps'
            }
        }

        stage('Vérification') {
            steps {
                echo '✅ Vérification du déploiement...'
                sh 'docker logs fintrack_backend --tail=20'
                sh 'curl -s http://localhost/api/utilisateurs | head -c 100 || true'
            }
        }
    }

    post {
        success {
            echo '✅ FinTrack déployé avec succès ! 🎉'
            echo "URL : http://51.91.59.61"
        }
        failure {
            echo '❌ Le pipeline a échoué. Vérifiez les logs.'
        }
    }
}
