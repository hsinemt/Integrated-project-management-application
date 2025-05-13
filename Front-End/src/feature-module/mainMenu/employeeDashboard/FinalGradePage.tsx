import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const FinalGradePage = () => {
  const { projectId, studentId } = useParams();
  const [role, setRole] = useState("");
  const [data, setData] = useState<any>(null);
  const [weights, setWeights] = useState({ quizWeight: 0, progressWeight: 0, gitWeight: 0, codeWeight: 0 });
  const [customGrade, setCustomGrade] = useState({ score: 0, weight: 0 });
  const [finalGrade, setFinalGrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pour édition des notes
  const [editableNotes, setEditableNotes] = useState({
    quiz: 0,
    progress: 0,
    git: 0,
    code: 0,
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:9777";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user && user.role) setRole(user.role);
  }, []);

  useEffect(() => {
    if (!studentId || !projectId) return;
    setLoading(true);
    setError(null);
    axios.get(`${API_URL}/grades/${studentId}/${projectId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => {
        setData(res.data.data);
        setWeights(res.data.data.weights || { quizWeight: 0, progressWeight: 0, gitWeight: 0, codeWeight: 0 });
        setCustomGrade(res.data.data.customGrade || { score: 0, weight: 0 });
        setFinalGrade(res.data.data.finalGrade ?? null);
        setEditableNotes({
          quiz: res.data.data.averages?.quiz ?? 0,
          progress: res.data.data.averages?.progress ?? 0,
          git: res.data.data.averages?.git ?? 0,
          code: res.data.data.averages?.code ?? 0,
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [studentId, projectId, API_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    const totalWeight = weights.quizWeight + weights.progressWeight + weights.gitWeight + weights.codeWeight + customGrade.weight;
    if (totalWeight !== 100) {
      setError("La somme des pondérations doit être égale à 100%.");
      return;
    }
    try {
      const body = {
        studentId,
        projectId,
        customGrade,
        weights
      };
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/grades/calculate`, body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      setFinalGrade(res.data.data.finalGrade);
      setData(res.data.data);
      setSuccessMsg("Note finale calculée avec succès !");
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du calcul de la note finale.");
    }
  };

  if (loading) return <div style={{ textAlign: "center", marginTop: "100px" }}>Chargement...</div>;

 // ... existing code ...
 return (
  <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
    <div className="col-md-8 col-lg-6">
      <div className="card shadow p-4" style={{ marginTop: "40px" }}>
        <h2 className="text-center mb-4">Note finale du projet</h2>
        {data && (
          <>
            <h4 className="text-center">Étudiant : {data.finalGrade?.studentId?.name || data.studentId?.name} {data.finalGrade?.studentId?.lastname || data.studentId?.lastname}</h4>
            <h5 className="text-center">Projet : {data.finalGrade?.projectId?.title || data.projectId?.title}</h5>
            <div className="mt-3">
              <strong>Détails de la note :</strong>
              <ul>
                <li>Quiz : <b>{data.averages?.quiz ?? 0}/20</b> (pondération : {data.weights?.quizWeight ?? 0}%)</li>
                <li>Progress : <b>{data.averages?.progress ?? 0}/20</b> (pondération : {data.weights?.progressWeight ?? 0}%)</li>
                <li>Git : <b>{data.averages?.git ?? 0}/20</b> (pondération : {data.weights?.gitWeight ?? 0}%)</li>
                <li>Code : <b>{data.averages?.code ?? 0}/20</b> (pondération : {data.weights?.codeWeight ?? 0}%)</li>
                <li>Note personnalisée : <b>{data.customGrade?.score ?? 0}/20</b> (pondération : {data.customGrade?.weight ?? 0}%)</li>
              </ul>
            </div>
            {/* Formulaire pour le tuteur */}
            {(
              <form onSubmit={handleSubmit} className="mt-4 d-flex flex-column align-items-center">
                <div className="row g-2 align-items-center justify-content-center mb-2">
                  <div className="col-auto">
                    <label htmlFor="customScore" className="col-form-label">Note personnalisée :</label>
                  </div>
                  <div className="col-auto">
                    <input
                      type="number"
                      id="customScore"
                      className="form-control"
                      min={0}
                      max={20}
                      value={customGrade.score}
                      onChange={e => setCustomGrade({ ...customGrade, score: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="col-auto">
                    <label htmlFor="customWeight" className="col-form-label">Pondération (%) :</label>
                  </div>
                  <div className="col-auto">
                    <input
                      type="number"
                      id="customWeight"
                      className="form-control"
                      min={0}
                      max={100}
                      value={customGrade.weight}
                      onChange={e => setCustomGrade({ ...customGrade, weight: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-2">Générer la note</button>
                {error && <div className="alert alert-danger mt-3 w-100 text-center">{error}</div>}
                {successMsg && <div className="alert alert-success mt-3 w-100 text-center">{successMsg}</div>}
              </form>
            )}
            <div className="alert alert-info mt-4 text-center" style={{ fontSize: "1.3rem" }}>
              <h5>Votre note finale :</h5>
              {data.finalGrade && typeof data.finalGrade.finalGrade === "number" ? (
                <span className="fw-bold" style={{ color: '#1976d2', fontSize: '2rem' }}>{data.finalGrade.finalGrade.toFixed(2)}/20</span>
              ) : (
                <span>Non disponible</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);
// ... existing code ...
};

export default FinalGradePage;