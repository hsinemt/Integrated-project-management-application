import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

type Project = {
    _id: string;
    title: string;
    description: string;
};

const ProjectsPage = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch all projects
    useEffect(() => {
        fetch('http://localhost:9777/project/getAllProjects')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                //console.log('Fetched projects:', data);
                // Check if data has a projects property that's an array
                if (data && data.projects && Array.isArray(data.projects)) {
                    setProjects(data.projects);
                } else {
                    // Fallback in case the API response format changes
                    const projectsArray = Array.isArray(data) ? data : [data];
                    setProjects(projectsArray);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching projects:', error);
                setLoading(false);
            });
    }, []);

    return (
        <div className="page-wrapper">
            <div className="content">
                <div className="card">
                    <div className="card-header">
                        <h5>Projects List</h5>
                    </div>
                    <div className="card-body">
                        {loading ? (
                            <div>Loading...</div>
                        ) : projects.length === 0 ? (
                            <div>No projects found.</div>
                        ) : (
                            <ul>
                                {projects.map(project => (
                                    <li key={project._id}>
                                        <Link to={`/motivations/${project._id}`}>
                                            {project.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectsPage;