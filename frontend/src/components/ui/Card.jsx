import React from 'react';

const Card = ({ children, className = '', hover = false, ...props }) => {
    return (
        <div
            className={`
                bg-white border border-slate-100 rounded-2xl shadow-sm
                ${hover ? 'hover:shadow-premium hover:-translate-y-1 transition-all duration-300' : ''}
                ${className}
            `}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
