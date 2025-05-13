import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

interface GradeData {
  studentId: {
    _id: string;
    name: string;
    lastname: string;
  };
  projectId: {
    _id: string;
    title: string;
  };
  averages: {
    quiz: number;
    progress: number;
    git: number;
    code: number;
  };
  weights: {
    quizWeight: number;
    progressWeight: number;
    gitWeight: number;
    codeWeight: number;
  };
  customGrade: {
    score: number;
    weight: number;
  };
  finalGrade: number | null;
  updatedAt?: string;
}

const FinalGradePage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<GradeData | null>(null);
  const [weights, setWeights] = useState({ quizWeight: 0, progressWeight: 0, gitWeight: 0, codeWeight: 0 });
  const [customGrade, setCustomGrade] = useState({ score: 0, weight: 0 });
  const [editableNotes, setEditableNotes] = useState({ quiz: 0, progress: 0, git: 0, code: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:9777";

  useEffect(() => {
    if (!studentId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/grades/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });

        const responseData = response.data.data;
        const formattedData: GradeData = {
          studentId: responseData.finalGrade.studentId,
          projectId: responseData.finalGrade.projectId,
          finalGrade: responseData.finalGrade.finalGrade || null,
          averages: responseData.averages,
          weights: responseData.weights,
          customGrade: responseData.customGrade,
          updatedAt: responseData.finalGrade.updatedAt
        };

        setData(formattedData);
        setWeights(responseData.weights);
        setCustomGrade(responseData.customGrade);
        setEditableNotes({
          quiz: responseData.averages.quiz,
          progress: responseData.averages.progress,
          git: responseData.averages.git,
          code: responseData.averages.code,
        });

      } catch (err) {
        console.error("Error fetching grade data:", err);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, API_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const totalWeight = weights.quizWeight + weights.progressWeight + weights.gitWeight + weights.codeWeight + customGrade.weight;
    if (totalWeight !== 100) {
      setError("La somme des pondérations doit être égale à 100%");
      return;
    }

    try {
      const body = {
        studentId,
        customGrade,
        weights,
        averages: editableNotes
      };

      const token = localStorage.getItem("token");
      const response = await axios.post(`${API_URL}/grades/calculate`, body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const responseData = response.data.data;
      setData({
        ...data!,
        finalGrade: responseData.finalGrade.finalGrade,
        averages: responseData.averages,
        weights: responseData.weights,
        customGrade: responseData.customGrade,
        updatedAt: responseData.finalGrade.updatedAt
      });

      setSuccessMsg("Note finale mise à jour avec succès !");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du calcul de la note finale");
    }
  };

  const formatFinalGrade = (grade: number | null) => {
    if (grade === null || isNaN(grade)) return 'N/A';
    return grade.toFixed(2);
  };

  if (loading) return <div className="text-center mt-5">Chargement en cours...</div>;
  if (error) return <div className="alert alert-danger text-center mt-5">{error}</div>;
  if (!data) return <div className="alert alert-warning text-center mt-5">Aucune donnée disponible</div>;

  return (
      <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
        <div className="col-md-8 col-lg-6">
          <div className="card shadow p-4" style={{ marginTop: "40px" }}>
            <h2 className="text-center mb-4">Note finale du projet</h2>

            <h4 className="text-center">
              Étudiant : {data.studentId.name} {data.studentId.lastname}
            </h4>
            <h5 className="text-center">Projet : {data.projectId.title}</h5>

            <form onSubmit={handleSubmit} className="mt-4">
              <div className="row g-3 mb-3">
                {(['quiz', 'progress', 'git', 'code'] as const).map((key) => (
                    <React.Fragment key={key}>
                      <div className="col-md-6">
                        <label className="form-label">{key.charAt(0).toUpperCase() + key.slice(1)} (0-20)</label>
                        <input
                            type="number"
                            className="form-control"
                            min={0}
                            max={20}
                            step="0.01"
                            value={editableNotes[key].toFixed(2)} // Format to 2 decimal places
                            onChange={(e) => setEditableNotes({
                              ...editableNotes,
                              [key]: parseFloat(e.target.value) || 0
                            })}
                            required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Pondération (%)</label>
                        <input
                            type="number"
                            className="form-control"
                            min={0}
                            max={100}
                            value={weights[`${key}Weight` as keyof typeof weights]}
                            onChange={(e) => setWeights({
                              ...weights,
                              [`${key}Weight`]: parseFloat(e.target.value) || 0
                            })}
                            required
                        />
                      </div>
                    </React.Fragment>
                ))}

                <div className="col-md-6">
                  <label className="form-label">Note personnalisée (0-20)</label>
                  <input
                      type="number"
                      className="form-control"
                      min={0}
                      max={20}
                      step="0.01"
                      value={customGrade.score.toFixed(2)} // Format to 2 decimal places
                      onChange={(e) => setCustomGrade({
                        ...customGrade,
                        score: parseFloat(e.target.value) || 0
                      })}
                      required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Pondération (%)</label>
                  <input
                      type="number"
                      className="form-control"
                      min={0}
                      max={100}
                      value={customGrade.weight}
                      onChange={(e) => setCustomGrade({
                        ...customGrade,
                        weight: parseFloat(e.target.value) || 0
                      })}
                      required
                  />
                </div>
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn" style={{ backgroundColor: '#FF6200', color: 'white' }}>
                  Calculer la note finale
                </button>
              </div>
            </form>

            {successMsg && <div className="alert alert-success mt-3">{successMsg}</div>}

            <div className="alert alert-info mt-4 text-center">
              <h5>Note finale :</h5>
              <span className="fw-bold" style={{ color: '#1976d2', fontSize: '2rem' }}>
              {formatFinalGrade(data.finalGrade)}/20
            </span>
            </div>
          </div>
        </div>
      </div>
  );
};

export default FinalGradePage;