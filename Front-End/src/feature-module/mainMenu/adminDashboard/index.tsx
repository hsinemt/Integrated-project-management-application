import React, { useState } from "react";
import axios, { AxiosError } from "axios";

interface QuizQuestion {
  question: string;
  correctAnswer: string;
}

const API_URL = "http://localhost:9777";

const AdminDashboard: React.FC = () => {
  // États pour le quiz
  const [taskId, setTaskId] = useState<string>("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Récupérer le quiz
  const fetchQuiz = async () => {
    if (!taskId) {
      setQuizError("Veuillez entrer un ID de tâche.");
      return;
    }

    setLoading(true);
    setQuizError(null);
    setQuestions([]);
    setAnswers([]);
    setScore(null);

    try {
      const response = await axios.get<{ taskId: string; questions: QuizQuestion[] }>(
        `${API_URL}/quiz/${taskId}`,
        {
          headers: { Authorization: `Bearer <votre-token>` }, // Remplacez par un token valide si nécessaire
        }
      );
      setQuestions(response.data.questions);
      // Initialiser les réponses avec des champs vides
      setAnswers(
        response.data.questions.map((q: QuizQuestion) => ({
          question: q.question,
          answer: "",
        }))
      );
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setQuizError(error.response?.data?.message || "Erreur serveur lors de la récupération du quiz.");
      console.error("Erreur récupération quiz :", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Gérer les changements dans les champs de réponse
  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index].answer = value;
    setAnswers(newAnswers);
  };

  // Soumettre le quiz
  const submitQuiz = async () => {
    if (!taskId || answers.some((ans) => !ans.answer)) {
      setQuizError("Veuillez répondre à toutes les questions.");
      return;
    }

    setLoading(true);
    setQuizError(null);

    try {
      const response = await axios.post<{ score: number; message: string }>(
        `${API_URL}/quiz/${taskId}/submit`,
        { answers },
        {
          headers: { Authorization: `Bearer <votre-token>` }, // Remplacez par un token valide si nécessaire
        }
      );
      setScore(response.data.score);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setQuizError(error.response?.data?.message || "Erreur lors de la soumission du quiz.");
      console.error("Erreur soumission quiz :", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2>Tableau de bord Admin</h2>

      {/* Section Tester le Quiz */}
      <div className="card mb-4">
        <div className="card-header">
          <h5>Tester le Quiz</h5>
        </div>
        <div className="card-body">
          <div className="form-group mb-3">
            <label htmlFor="taskIdInput">ID de la tâche :</label>
            <input
              type="text"
              className="form-control"
              id="taskIdInput"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Entrez l'ID de la tâche"
            />
          </div>
          <button
            className="btn btn-primary mb-3"
            onClick={fetchQuiz}
            disabled={loading}
          >
            {loading ? "Chargement..." : "Générer le Quiz"}
          </button>

          {quizError && <div className="alert alert-danger">{quizError}</div>}

          {/* Afficher les questions et champs de réponse */}
          {questions.length > 0 && (
            <div className="mt-3">
              <h6>Questions du Quiz :</h6>
              {questions.map((q, index) => (
                <div key={index} className="mb-3">
                  <p>
                    <strong>Question {index + 1}:</strong> {q.question}
                  </p>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Entrez votre réponse"
                    value={answers[index]?.answer || ""}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                  />
                </div>
              ))}
              <button
                className="btn btn-success mt-2"
                onClick={submitQuiz}
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          )}

          {/* Afficher la note après soumission */}
          {score !== null && (
            <div className="alert alert-info mt-3">
              Votre note : {score} / 5
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;