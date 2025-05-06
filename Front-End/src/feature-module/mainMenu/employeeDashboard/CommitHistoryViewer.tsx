import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
interface Commit {
    sha: string;
    message: string;
    date: string;
    author: string;
    url: string;
    additions?: number;
    deletions?: number;
    changes?: number;
  }
  
  interface Task {
    // ... existing fields ...
    git?: string;
    commits?: Commit[];
    commitStats?: {
      totalCommits: number;
      lastWeekCommits: number;
      averageChanges: number;
    };
  }
const CommitHistoryViewer = () => {
  const { taskId } = useParams();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const response = await axios.get(`/api/tasks/${taskId}/commits`);
        setCommits(response.data.commits);
        setStats(response.data.commitStats);
      } catch (err) {
        setError('Failed to load commit history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommits();
  }, [taskId]);

  if (loading) return <div className="spinner-border" />;
  if (error) return <div className="alert alert-danger">{error}</div>;

  // Prepare data for chart (last 7 days)
  const commitData = commits
    .filter(c => new Date(c.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .reduce((acc: Record<string, number>, commit) => {
          const date = new Date(commit.date).toLocaleDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

  const chartData = Object.entries(commitData).map(([date, count]) => ({
    date,
    commits: count
  }));

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h4>Git Commit History</h4>
          {stats && (
            <div className="stats-badges">
              <span className="badge bg-primary me-2">
                Total: {stats.totalCommits} commits
              </span>
              <span className="badge bg-success me-2">
                Last Week: {stats.lastWeekCommits}
              </span>
              <span className="badge bg-info">
                Avg Changes: {stats.averageChanges.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <h5>Recent Activity</h5>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="commits" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="col-md-4">
              <h5>Code Change Distribution</h5>
              <ul className="list-group">
                <li className="list-group-item d-flex justify-content-between">
                  <span>Additions</span>
                  <span className="text-success">
                    +{commits.reduce((sum, c) => sum + (c.additions || 0), 0)}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Deletions</span>
                  <span className="text-danger">
                    -{commits.reduce((sum, c) => sum + (c.deletions || 0), 0)}
                  </span>
                </li>
                <li className="list-group-item d-flex justify-content-between">
                  <span>Total Changes</span>
                  <span className="text-primary">
                    {commits.reduce((sum, c) => sum + (c.changes || 0), 0)}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <h5>Detailed Commit History</h5>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>SHA</th>
                    <th>Message</th>
                    <th>Author</th>
                    <th>Date</th>
                    <th>Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {commits.map(commit => (
                    <tr key={commit.sha}>
                      <td>
                        <a href={commit.url} target="_blank" rel="noopener noreferrer">
                          {commit.sha}
                        </a>
                      </td>
                      <td>{commit.message}</td>
                      <td>{commit.author}</td>
                      <td>{new Date(commit.date).toLocaleString()}</td>
                      <td>
                        <span className="text-success">+{commit.additions}</span>{' '}
                        <span className="text-danger">-{commit.deletions}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommitHistoryViewer;