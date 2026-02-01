import React from 'react';

const Input = React.forwardRef(({ label, error, icon: Icon, className = '', ...props }, ref) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    ref={ref}
                    className={`
                        w-full bg-white border border-slate-200 rounded-xl outline-none transition-all
                        focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500
                        placeholder:text-slate-300 text-slate-700 font-medium
                        disabled:bg-slate-50 disabled:text-slate-400
                        ${Icon ? 'pl-11 pr-4 py-3.5' : 'px-4 py-3.5'}
                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' : ''}
                        ${className}
                    `}
                    {...props}
                />
            </div>
            {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
