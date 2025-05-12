import React from 'react';
import SkeletonTaskCard from './SkeletonTaskCard';

interface SkeletonTaskColumnProps {
    title: string;
    count?: number;
    isCompletedColumn?: boolean;
}

const SkeletonTaskColumn: React.FC<SkeletonTaskColumnProps> = ({ 
    title, 
    count = 3,
    isCompletedColumn = false 
}) => {
    const columnClasses = `p-3 rounded w-100 me-3 ${
        isCompletedColumn 
            ? 'bg-soft-success'
            : 'bg-transparent-secondary'
    }`;

    const headerClasses = `p-2 rounded mb-2 ${
        isCompletedColumn
            ? 'bg-success text-white'
            : 'bg-white'
    }`;

    return (
        <div className={columnClasses}>
            <div className={headerClasses}>
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <span className={`p-1 d-flex rounded-circle me-2 ${
                            isCompletedColumn 
                                ? 'bg-soft-light' 
                                : 'bg-soft-purple'
                        }`}>
                            <span className={`rounded-circle d-block p-1 ${
                                isCompletedColumn 
                                    ? 'bg-light' 
                                    : 'bg-purple'
                            }`} />
                        </span>
                        <h5 className={`me-2 ${isCompletedColumn ? 'text-white' : ''}`}>
                            {title}
                        </h5>
                        <span className={`badge rounded-pill ${
                            isCompletedColumn 
                                ? 'bg-light text-dark' 
                                : 'bg-light'
                        }`}>
                            {count}
                        </span>
                    </div>
                </div>
            </div>
            <div className="kanban-drag-wrap">
                {Array(count).fill(0).map((_, index) => (
                    <SkeletonTaskCard key={index} />
                ))}
            </div>
        </div>
    );
};

export default SkeletonTaskColumn;