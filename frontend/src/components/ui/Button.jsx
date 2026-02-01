import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
    children,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    disabled,
    className = '',
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";

    const variants = {
        primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/30",
        secondary: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100",
        outline: "bg-transparent border-2 border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600",
        ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
        danger: "bg-red-50 hover:bg-red-100 text-red-600 border border-red-100",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        default: "px-6 py-3 text-sm",
        lg: "px-8 py-4 text-base",
        icon: "p-3"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Processing...</span>
                </>
            ) : children}
        </button>
    );
};

export default Button;
