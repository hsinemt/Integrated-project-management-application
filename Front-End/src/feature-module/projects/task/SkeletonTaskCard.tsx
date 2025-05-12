import React from 'react';

const SkeletonTaskCard: React.FC = () => {
    return (
        <div className="card kanban-card mb-3 shadow-sm position-relative">
            <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center">
                        <span className="badge me-2 px-2 py-1 bg-light" style={{ width: '60px', height: '20px' }}></span>
                    </div>
                </div>
                <div className="mb-2">
                    <div className="bg-light mb-1" style={{ width: '120px', height: '16px', borderRadius: '4px' }}></div>
                    <div className="bg-light mb-1" style={{ width: '180px', height: '20px', borderRadius: '4px' }}></div>
                    <div className="bg-light mb-0" style={{ width: '100%', height: '60px', borderRadius: '4px' }}></div>
                </div>
                <div className="mb-2">
                    <div className="bg-light mb-1" style={{ width: '150px', height: '16px', borderRadius: '4px' }}></div>
                    <div className="bg-light mb-0" style={{ width: '180px', height: '16px', borderRadius: '4px' }}></div>
                </div>
                
                <div className="mb-3">
                    <div className="bg-light mb-1" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div>
                    <div className="bg-light mb-0" style={{ width: '100%', height: '20px', borderRadius: '4px' }}></div>
                </div>

                <div className="d-flex align-items-center justify-content-between border-top pt-2 mb-2">
                    <div className="avatar-list-stacked avatar-group-sm me-3">
                        <span className="avatar avatar-rounded bg-light" style={{ width: '40px', height: '40px' }}></span>
                    </div>
                    <div className="bg-light" style={{ width: '80px', height: '20px', borderRadius: '4px' }}></div>
                </div>
            </div>
            <div 
                className="skeleton-animation"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.5s infinite',
                    borderRadius: 'inherit',
                    zIndex: 1
                }}
            ></div>
        </div>
    );
};

export default SkeletonTaskCard;