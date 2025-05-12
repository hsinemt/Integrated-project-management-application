import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Question {
  _id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  quizId: string;
  taskTheme: string;
  questions: Question[];
}

interface CourseQuizProps {
  courseId: string;
  quizTheme: string;
  onClose: () => void;
  onSubmit: (courseId: string, score: number) => void;
}

const CourseQuiz: React.FC<CourseQuizProps> = ({ courseId, quizTheme, onClose, onSubmit }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({}); // Store option index
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required');

        console.log(`Fetching quiz for taskId: ${courseId}, theme: ${quizTheme}`);
        const response = await axios.get(`http://localhost:9777/api/tasks/${courseId}/quiz`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { theme: quizTheme },
          timeout: 15000,
        });

        if (!response.data.success) throw new Error(response.data.message);

        console.log('Quiz fetched successfully:', response.data.quiz);
        setQuiz(response.data.quiz);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || err.message || 'Failed to fetch quiz');
          console.error('Quiz fetch error:', err.response?.data || err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch quiz');
          console.error('Quiz fetch error:', err);
        }
      }
    };

    fetchQuiz();
  }, [courseId, quizTheme]);

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    try {
      setSubmitting(true);
      setError('');

      if (Object.keys(answers).length !== quiz.questions.length) {
        throw new Error('Please answer all questions');
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required');

      console.log('Submitting quiz for taskId:', courseId, 'with quizId:', quiz.quizId);
      const response = await axios.post(
        `http://localhost:9777/api/tasks/${courseId}/quiz-submit`,
        {
          answers: Object.values(answers), // Send array of option indices
          quizId: quiz.quizId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }
      );

      if (!response.data.success) throw new Error(response.data.message);

      const newScore = response.data.score;
      setScore(newScore);

      if (onSubmit) onSubmit(courseId, newScore);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message || 'Submission failed');
        console.error('Quiz submission error:', err.response?.data || err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Submission failed');
        console.error('Quiz submission error:', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="alert alert-danger">
        {error}
        <button className="btn btn-secondary mt-3" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  if (!quiz) {
    return <div>Loading quiz...</div>;
  }

  if (score !== null) {
    return (
      <div className="alert alert-success">
        Quiz submitted successfully! Your score: {score}%
        <button className="btn btn-secondary mt-3" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="course-quiz">
      <h4>Quiz for Task</h4>
      {quiz.questions.map((question, index) => (
        <div key={question._id} className="mb-3">
          <p>{question.text}</p>
          {question.options.map((option, optIndex) => (
            <div key={`${question._id}-${optIndex}`} className="form-check">
              <input
                type="radio"
                name={`question-${index}`}
                value={optIndex} // Use option index as value
                checked={answers[index] === optIndex}
                onChange={() => handleAnswerChange(index, optIndex)}
                className="form-check-input"
              />
              <label className="form-check-label">{option}</label>
            </div>
          ))}
        </div>
      ))}
      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={submitting || Object.keys(answers).length !== quiz.questions.length}
      >
        {submitting ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </div>
  );
};

export default CourseQuiz;