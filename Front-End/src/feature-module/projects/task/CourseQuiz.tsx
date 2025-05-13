import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './page.module.css';

interface Question {
  _id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface CourseQuizProps {
  courseId: string;
  quizTheme: string;
  onClose: () => void;
  onSubmit: (taskId: string, score: number) => void;
}

const CourseQuiz: React.FC<CourseQuizProps> = ({ courseId, quizTheme, onClose, onSubmit }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizId, setQuizId] = useState<string | null>(null); // Store quizId
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const API_BASE_URL = 'http://localhost:9777';

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required. Please log in.');
        }

        const response = await axios.get(
          `${API_BASE_URL}/api/tasks/tasks/${courseId}/quiz`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success && response.data.quiz.questions) {
          setQuestions(response.data.quiz.questions);
          setQuizId(response.data.quiz.quizId); // Store quizId from response
        } else {
          throw new Error(response.data.message || 'No quiz questions found for this task.');
        }
      } catch (err) {
        console.error('Quiz fetch error:', err);
        let errorMessage = 'Failed to load quiz. Please try again.';
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            errorMessage = `Quiz not found for this task. Ensure the task has a quiz configured.`;
          } else if (err.response?.status === 400) {
            errorMessage = err.response.data.message || 'Invalid task ID or no quiz theme defined.';
          } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
          }
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [courseId]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      if (!quizId) {
        throw new Error('Quiz ID is missing. Please reload the quiz.');
      }

      // Format answers
      const formattedAnswers = questions.map((question) => {
        const selectedOption = answers[question._id];
        return question.options.findIndex((option) => option === selectedOption);
      });

      // Check if all questions are answered
      if (formattedAnswers.includes(-1)) {
        throw new Error('Please answer all questions before submitting.');
      }

      const response = await axios.post(
          `${API_BASE_URL}/api/tasks/tasks/${courseId}/quiz-submit`,
          {
            answers: formattedAnswers,
            quizId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
          }
      );

      // Handle PDF response (both certificate and error report)
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      // Determine filename based on content
      const filename = response.headers['content-disposition']?.split('filename=')[1] ||
          (response.data.byteLength > 5000 ? 'certificat.pdf' : 'rapport-erreurs.pdf');

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Parse score from response if possible
      let score = 0;
      try {
        const decoder = new TextDecoder('utf-8');
        const jsonStr = decoder.decode(response.data.slice(0, 100)); // Check start of buffer
        if (jsonStr.includes('{')) {
          const jsonResponse = JSON.parse(jsonStr);
          score = jsonResponse.score || 0;
        }
      } catch (e) {
        // Not a JSON response, assume it's a PDF
        score = filename.includes('certificat') ? 100 : 0;
      }

      onSubmit(courseId, score);
      onClose();

    } catch (err) {
      console.error('Quiz submission error:', err);
      setError(
          axios.isAxiosError(err)
              ? err.response?.data?.message || 'Failed to submit quiz. Please try again.'
              : err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setSubmitting(false);
    }
  };



  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading quiz...</span>
        </div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
        <button className="btn btn-secondary ml-2" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className={styles.quizContainer}>
      <h4>{quizTheme} Quiz</h4>
      {questions.length === 0 ? (
        <p>No questions available for this quiz.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {questions.map((question) => (
            <div key={question._id} className="mb-3">
              <p className="fw-medium">{question.text}</p>
              {question.options.map((option, index) => (
                <div key={index} className="form-check">
                  <input
                    type="radio"
                    className="form-check-input"
                    name={question._id}
                    value={option}
                    checked={answers[question._id] === option}
                    onChange={() => handleAnswerChange(question._id, option)}
                    disabled={submitting}
                  />
                  <label className="form-check-label">{option}</label>
                </div>
              ))}
            </div>
          ))}
          <div className="d-flex justify-content-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || Object.keys(answers).length < questions.length}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Submitting...
                </>
              ) : (
                'Submit Quiz'
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary ml-2"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CourseQuiz;