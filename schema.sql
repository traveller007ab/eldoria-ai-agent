-- Database Schema for Academic Hub
-- PostgreSQL schema with all necessary tables for projects, agents, and compliance

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50) DEFAULT 'rsu-mech-eng',
    status VARCHAR(50) DEFAULT 'drafting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wizard State Table
CREATE TABLE IF NOT EXISTS wizard_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    basics JSONB DEFAULT '{}',
    objectives JSONB DEFAULT '{}',
    scope JSONB DEFAULT '{}',
    literature JSONB DEFAULT '{}',
    methodology JSONB DEFAULT '{}',
    finishing JSONB DEFAULT '{}',
    generation_config JSONB DEFAULT '{"target_page_count": 80}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft Content Table
CREATE TABLE IF NOT EXISTS draft_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,
    content TEXT,
    word_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, section_name)
);

-- References Table
CREATE TABLE IF NOT EXISTS references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    authors TEXT,
    year INTEGER,
    journal VARCHAR(255),
    doi VARCHAR(100),
    url TEXT,
    abstract TEXT,
    citation_text TEXT,
    source_type VARCHAR(50),
    relevance_score DECIMAL(3, 2) DEFAULT 1.0,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research Papers Table
CREATE TABLE IF NOT EXISTS research_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    external_id VARCHAR(255),
    source VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    abstract TEXT,
    authors TEXT[],
    year INTEGER,
    venue VARCHAR(255),
    url TEXT,
    pdf_url TEXT,
    citations INTEGER DEFAULT 0,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    summary TEXT,
    key_findings TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Tasks Table
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    payload JSONB DEFAULT '{}',
    result JSONB,
    error TEXT,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Agent Insights Table
CREATE TABLE IF NOT EXISTS agent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_type VARCHAR(50),
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    actions JSONB DEFAULT '[]',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Checks Table
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    check_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    score DECIMAL(5, 2),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Configuration Table
CREATE TABLE IF NOT EXISTS agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    auto_search BOOLEAN DEFAULT TRUE,
    auto_cite BOOLEAN DEFAULT TRUE,
    auto_validate BOOLEAN DEFAULT FALSE,
    max_concurrent_tasks INTEGER DEFAULT 3,
    approval_threshold VARCHAR(20) DEFAULT 'major',
    preferred_sources TEXT[],
    citation_style VARCHAR(20) DEFAULT 'apa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Knowledge Base Table (stores indexed content)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embeddings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_project ON draft_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_references_project ON references(project_id);
CREATE INDEX IF NOT EXISTS idx_papers_project ON research_papers(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_project ON agent_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_insights_project ON agent_insights(project_id);
CREATE INDEX IF NOT EXISTS idx_insights_unread ON agent_insights(project_id) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_compliance_project ON compliance_checks(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_project ON knowledge_base(project_id);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wizard_states_updated_at BEFORE UPDATE ON wizard_states
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_draft_sections_updated_at BEFORE UPDATE ON draft_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_references_updated_at BEFORE UPDATE ON references
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_configurations_updated_at BEFORE UPDATE ON agent_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
