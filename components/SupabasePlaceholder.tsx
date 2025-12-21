import React from 'react';
import { EldoriaLogo } from './Icons';

export const SupabasePlaceholder: React.FC = () => {
    return (
        <div className="panel p-6 max-w-2xl mx-auto mt-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-cyan-500/20">
                <EldoriaLogo className="w-8 h-8 text-cyan-400" />
                <h2 className="text-xl font-bold text-cyan-300">Supabase Setup Guide</h2>
            </div>

            <div className="space-y-6 text-cyan-200/80 text-sm">
                <section>
                    <h3 className="text-cyan-300 font-semibold mb-2">1. Create Supabase Project</h3>
                    <p>Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">supabase.com</a> and create a new project.</p>
                </section>

                <section>
                    <h3 className="text-cyan-300 font-semibold mb-2">2. Run Database Schema</h3>
                    <p>Execute the SQL script in your Supabase SQL Editor. Find it in:</p>
                    <code className="block bg-cyan-950/50 rounded px-3 py-2 mt-2 text-cyan-400">
                        services/supabaseClient.ts (comments section)
                    </code>
                </section>

                <section>
                    <h3 className="text-cyan-300 font-semibold mb-2">3. Deploy Edge Functions</h3>
                    <div className="bg-cyan-950/50 rounded p-3 mt-2 space-y-1">
                        <code className="block text-cyan-400">supabase functions deploy embed --no-verify-jwt</code>
                        <code className="block text-cyan-400">supabase functions deploy scrape --no-verify-jwt</code>
                    </div>
                </section>

                <section>
                    <h3 className="text-cyan-300 font-semibold mb-2">4. Set API Key Secret</h3>
                    <code className="block bg-cyan-950/50 rounded px-3 py-2 mt-2 text-cyan-400">
                        supabase secrets set API_KEY=your_gemini_api_key
                    </code>
                </section>

                <section>
                    <h3 className="text-cyan-300 font-semibold mb-2">5. Update Config</h3>
                    <p>Add your Supabase URL and Anon Key to <code className="text-cyan-400">config.ts</code></p>
                </section>

                <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                    <p className="text-cyan-300 font-medium">✨ Pro Tip</p>
                    <p className="mt-1 text-cyan-200/70">Enable Row Level Security (RLS) policies to secure your data!</p>
                </div>
            </div>
        </div>
    );
};
