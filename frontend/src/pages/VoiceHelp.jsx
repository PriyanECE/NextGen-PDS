import React from 'react';
import { Mic, ArrowLeft, Navigation, Database, ShoppingBag, UserPlus, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VoiceHelp = () => {
    const navigate = useNavigate();

    const commandCategories = [
        {
            title: "Navigation",
            icon: <Navigation className="w-6 h-6 text-blue-500" />,
            commands: [
                "Go to Home / Open Dashboard",
                "Open Scanner / Scan QR",
                "Open Payment Page",
                "Open Shop History / Reports",
                "Open Admin Dashboard",
                "Register new beneficiary",
                "Go Back / Previous Page"
            ]
        },
        {
            title: "Stock & Inventory",
            icon: <Database className="w-6 h-6 text-purple-500" />,
            commands: [
                "How much rice is left?",
                "What is the current stock status?",
                "Show me the dhal inventory",
                "Do we have enough sugar?"
            ]
        },
        {
            title: "Shops & Distribution",
            icon: <ShoppingBag className="w-6 h-6 text-green-500" />,
            commands: [
                "How many active shops do we have?",
                "Tell me about the ration shops",
                "Total number of shops?"
            ]
        },
        {
            title: "Beneficiaries",
            icon: <UserPlus className="w-6 h-6 text-orange-500" />,
            commands: [
                "I want to register a new person",
                "Add a beneficiary named [Name]",
                "Start registration called [Name]"
            ]
        },
        {
            title: "General",
            icon: <HelpCircle className="w-6 h-6 text-indigo-500" />,
            commands: [
                "Change language to Tamil",
                "speak in Hindi",
                "Stop / Quiet",
                "Hello / Start Listening"
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                            <Mic className="w-8 h-8 text-indigo-600" />
                            Voice Commands
                        </h1>
                        <p className="text-slate-500 mt-1">Guide to all trained questions and actions</p>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {commandCategories.map((cat, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                                <div className="p-2 bg-slate-50 rounded-lg">
                                    {cat.icon}
                                </div>
                                <h2 className="text-xl font-semibold text-slate-800">{cat.title}</h2>
                            </div>
                            <ul className="space-y-3">
                                {cat.commands.map((cmd, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-600">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                                        <span className="italic">"{cmd}"</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Tip Box */}
                <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex gap-4">
                    <div className="shrink-0 p-2 bg-indigo-100 rounded-full h-fit">
                        <HelpCircle className="text-indigo-600 w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-indigo-900 mb-1">Did you know?</h3>
                        <p className="text-indigo-700 text-sm leading-relaxed">
                            You can switch languages anytime by saying <strong>"Switch to Tamil"</strong> or <strong>"Hindi"</strong>.
                            The assistant will respond in the selected language.
                            If the AI is offline, basic navigation commands will still work!
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VoiceHelp;
