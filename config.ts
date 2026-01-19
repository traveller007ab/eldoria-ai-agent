
// --- Centralized Configuration ---
// This file manages all API keys and configuration variables for the application.
// SECURITY: All sensitive values should be sourced from environment variables.
// The fallback values below are for development/demo purposes only.

/**
 * Supabase URL - Source from environment variable for production
 * Fallback is provided for development convenience only.
 */
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL
    || "https://ejiwzdtksmgxmesenmli.supabase.co";

/**
 * Supabase Anonymous Key - Source from environment variable for production
 * This key is designed to be public but should still be managed via env vars
 * for easier rotation and environment-specific configuration.
 */
export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
    || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaXd6ZHRrc21neG1lc2VubWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MTU5ODQsImV4cCI6MjA3MzA5MTk4NH0.UzWfkNbDkbDzkd8rhpngT6_PcGgPHemSZ0zZdKXvBu8";

/**
 * AI Provider API Keys - MUST be set via environment variables
 */
export const API_KEY = (import.meta as any).env?.VITE_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || (process.env?.API_KEY as string);

export const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY || (process.env?.GROQ_API_KEY as string);
export const TAVILY_API_KEY = (import.meta as any).env?.VITE_TAVILY_API_KEY || (process.env?.TAVILY_API_KEY as string);
export const OPENROUTER_API_KEY = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || (process.env?.OPENROUTER_API_KEY as string);

