import React from 'react';
import { Mic, ArrowLeft, Navigation, Database, ShoppingBag, UserPlus, HelpCircle, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const VoiceHelp = () => {
    const navigate = useNavigate();

    const categories = [
        {
            title: "Navigation",
            icon: Navigation,
            color: "text-blue-500 bg-blue-50",
            cmds: ["Go to Home", "Open Scanner", "Open Payment Page", "Show History", "Open Admin Dashboard", "Go Back"]
        },
        {
            title: "Inventory Checks",
            icon: Database,
            color: "text-purple-500 bg-purple-50",
            cmds: ["How much rice is left?", "Current stock status?", "Show dhal inventory", "Do we have enough sugar?"]
        },
        {
            title: "Shop Info",
            icon: ShoppingBag,
            color: "text-emerald-500 bg-emerald-50",
            cmds: ["How many active shops?", "Tell me about ration shops", "Total shops count"]
        },
        {
            title: "Registration",
            icon: UserPlus,
            color: "text-orange-500 bg-orange-50",
            cmds: ["Register new person", "Add beneficiary [Name]", "Start registration"]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Voice Commands</h1>
                        <p className="text-slate-500">Say "Hello" to wake up the assistant</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {categories.map((cat, idx) => (
                        <Card key={idx} className="p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.color}`}>
                                    <cat.icon size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">{cat.title}</h2>
                            </div>
                            <ul className="space-y-3">
                                {cat.cmds.map((cmd, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-600 bg-slate-50 p-2 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        <span className="font-medium">"{cmd}"</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    ))}
                </div>

                <div className="bg-indigo-600 text-white rounded-3xl p-8 shadow-xl shadow-indigo-200 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Volume2 size={200} />
                    </div>

                    <div className="relative z-10 shrink-0 bg-white/10 p-4 rounded-full backdrop-blur-sm border border-white/20">
                        <Mic size={48} />
                    </div>

                    <div className="relative z-10 flex-1">
                        <h3 className="text-2xl font-bold mb-2">Multilingual Support Available</h3>
                        <p className="text-indigo-100 leading-relaxed">
                            You can speak to the assistant in <span className="font-bold text-white">English, Tamil, Hindi, Telugu, Kannada, or Malayalam</span>.
                            Just say <span className="italic bg-white/10 px-2 rounded">"Speak in Tamil"</span> to switch languages instantly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceHelp;
