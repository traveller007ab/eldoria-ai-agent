"""
Agent Orchestrator Service
Manages autonomous research agents and task distribution.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import uuid
from enum import Enum
from pydantic import BaseModel
import json

class AgentType(str, Enum):
    LITERATURE = "literature"
    WRITING = "writing"
    ANALYSIS = "analysis"
    CITATION = "citation"
    COMPLIANCE = "compliance"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_APPROVAL = "requires_approval"

class TaskPriority(int, Enum):
    LOW = 1
    MEDIUM = 3
    HIGH = 5
    CRITICAL = 7

class AgentTask(BaseModel):
    id: str
    agent_type: AgentType
    task_type: str
    description: str
    priority: int = 3
    status: TaskStatus = TaskStatus.PENDING
    progress: int = 0
    payload: Dict = {}
    result: Optional[Dict] = None
    error: Optional[str] = None
    created_at: datetime = datetime.now()
    completed_at: Optional[datetime] = None
    requires_approval: bool = False
    approved_by: Optional[str] = None

class AgentInsight(BaseModel):
    id: str
    type: str  # suggestion, warning, success, info
    source: str
    title: str
    message: str
    priority: str = "medium"
    actionable: bool = True
    actions: List[Dict] = []
    timestamp: datetime = datetime.now()
    read: bool = False

class AgentConfiguration(BaseModel):
    auto_search: bool = True
    auto_cite: bool = True
    auto_validate: bool = False
    max_concurrent_tasks: int = 3
    approval_threshold: str = "major"
    preferred_sources: List[str] = []
    citation_style: str = "apa"

class KnowledgeBase:
    """In-memory knowledge base for the agent system."""
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.content: Dict[str, str] = {}
        self.citations: List[Dict] = []
        self.papers: List[Dict] = []
        self.metadata: Dict[str, Any] = {}
    
    async def add_content(self, section: str, content: str):
        self.content[section] = content
    
    async def get_content(self, section: str) -> Optional[str]:
        return self.content.get(section)
    
    async def get_all_content(self) -> Dict[str, str]:
        return self.content.copy()
    
    async def get_word_count(self, section: str) -> int:
        content = self.content.get(section, "")
        return len(content.split()) if content else 0
    
    async def add_citation(self, citation: Dict):
        self.citations.append(citation)
    
    async def get_citation_count(self) -> int:
        return len(self.citations)
    
    async def add_paper(self, paper: Dict):
        self.papers.append(paper)
    
    async def save_state(self):
        """Persist knowledge base state."""
        # In production, this would save to database
        pass

class AgentBase:
    """Base class for all agents."""
    
    def __init__(self, knowledge_base: KnowledgeBase):
        self.knowledge_base = knowledge_base
        self.current_task: Optional[AgentTask] = None
        self.tasks_completed = 0
        self.last_active = datetime.now()
    
    async def execute(self, task: AgentTask) -> Dict:
        """Execute a task. Override in subclasses."""
        raise NotImplementedError

class LiteratureAgent(AgentBase):
    """Agent responsible for literature search and citation management."""
    
    async def execute(self, task: AgentTask) -> Dict:
        self.current_task = task
        self.last_active = datetime.now()
        
        if task.task_type == "search":
            return await self._search_papers(task.payload)
        elif task.task_type == "analyze":
            return await self._analyze_paper(task.payload)
        elif task.task_type == "import":
            return await self._import_citation(task.payload)
        else:
            raise ValueError(f"Unknown task type: {task.task_type}")
    
    async def _search_papers(self, payload: Dict) -> Dict:
        query = payload.get("query", "")
        num_results = payload.get("num_results", 10)
        
        # Simulated search results (in production, call Tavily/Semantic Scholar API)
        results = [
            {
                "title": f"Research Paper on {query} - Part {i}",
                "authors": ["Author A", "Author B"],
                "year": 2024,
                "abstract": f"This paper discusses {query} in depth...",
                "url": f"https://example.com/paper_{i}",
                "citations": 42 + i * 5,
            }
            for i in range(1, num_results + 1)
        ]
        
        for paper in results:
            await self.knowledge_base.add_paper(paper)
        
        self.tasks_completed += 1
        return {"status": "success", "results": results, "count": len(results)}
    
    async def _analyze_paper(self, payload: Dict) -> Dict:
        paper_id = payload.get("paper_id")
        # Simulated analysis
        return {
            "status": "success",
            "analysis": {
                "methodology": "Quantitative analysis with sample size of 500",
                "findings": "Significant correlation found between variables",
                "limitations": "Sample limited to specific demographic"
            }
        }
    
    async def _import_citation(self, payload: Dict) -> Dict:
        citation = {
            "title": payload.get("title", ""),
            "authors": payload.get("authors", ""),
            "year": payload.get("year", 2024),
            "journal": payload.get("journal", ""),
            "doi": payload.get("doi", ""),
        }
        await self.knowledge_base.add_citation(citation)
        return {"status": "success", "citation": citation}

class WritingAgent(AgentBase):
    """Agent responsible for content generation and writing assistance."""
    
    async def execute(self, task: AgentTask) -> Dict:
        self.current_task = task
        self.last_active = datetime.now()
        
        if task.task_type == "draft":
            return await self._draft_section(task.payload)
        elif task.task_type == "expand":
            return await self._expand_content(task.payload)
        elif task.task_type == "improve":
            return await self._improve_writing(task.payload)
        else:
            raise ValueError(f"Unknown task type: {task.task_type}")
    
    async def _draft_section(self, payload: Dict) -> Dict:
        section = payload.get("section", "")
        outline = payload.get("outline", "")
        style = payload.get("style", "academic")
        
        # Simulated draft generation (in production, call LLM)
        draft_content = f"# {section}\n\n"
        if outline:
            for point in outline.split("\n"):
                draft_content += f"## {point}\n\nThis section discusses {point.lower()} in detail, providing comprehensive analysis and relevant context for the research project.\n\n"
        else:
            draft_content += f"This section provides an in-depth analysis of {section.lower()}, establishing the theoretical framework and context for the study.\n\n"
        
        await self.knowledge_base.add_content(section, draft_content)
        self.tasks_completed += 1
        
        return {
            "status": "success",
            "content": draft_content,
            "word_count": len(draft_content.split())
        }
    
    async def _expand_content(self, payload: Dict) -> Dict:
        section = payload.get("section", "")
        expansion_factor = payload.get("factor", 1.5)
        
        current_content = await self.knowledge_base.get_content(section)
        if current_content:
            # Simulated expansion (in production, use LLM)
            expanded = current_content + f"\n\nAdditionally, further elaboration on the aforementioned points reveals significant implications for the broader research context. The findings contribute to the existing body of knowledge by providing novel insights into the subject matter.\n"
            await self.knowledge_base.add_content(section, expanded)
            
            self.tasks_completed += 1
            return {
                "status": "success",
                "original_word_count": len(current_content.split()),
                "new_word_count": len(expanded.split())
            }
        
        return {"status": "error", "message": "Section not found"}
    
    async def _improve_writing(self, payload: Dict) -> Dict:
        # Simulated improvement (in production, use LLM for grammar/style)
        section = payload.get("section", "")
        current_content = await self.knowledge_base.get_content(section)
        
        if current_content:
            # Simulated improvements
            improved = current_content.replace("very ", "")  # Simple example
            await self.knowledge_base.add_content(section, improved)
            
            self.tasks_completed += 1
            return {"status": "success", "improvements": ["Removed wordiness", "Improved clarity"]}
        
        return {"status": "error", "message": "Section not found"}

class AnalysisAgent(AgentBase):
    """Agent responsible for data analysis and validation."""
    
    async def execute(self, task: AgentTask) -> Dict:
        self.current_task = task
        self.last_active = datetime.now()
        
        if task.task_type == "validate":
            return await self._validate_content(task.payload)
        elif task.task_type == "stat":
            return await self._run_statistics(task.payload)
        elif task.task_type == "visualize":
            return await self._generate_visualization(task.payload)
        else:
            raise ValueError(f"Unknown task type: {task.task_type}")
    
    async def _validate_content(self, payload: Dict) -> Dict:
        content = payload.get("content", "")
        criteria = payload.get("criteria", [])
        
        issues = []
        word_count = len(content.split())
        
        # Basic validations
        if word_count < 500:
            issues.append({"type": "warning", "message": "Content below recommended word count"})
        
        if "http" in content.lower() and "citation" not in content.lower():
            issues.append({"type": "info", "message": "URLs detected without citation"})
        
        # Check for common issues
        if "very " in content.lower():
            issues.append({"type": "suggestion", "message": "Consider removing 'very' for more precise language"})
        
        self.tasks_completed += 1
        return {"status": "success", "issues": issues, "word_count": word_count}
    
    async def _run_statistics(self, payload: Dict) -> Dict:
        data = payload.get("data", [])
        methods = payload.get("methods", [])
        
        results = {}
        if "mean" in methods:
            results["mean"] = sum(data) / len(data) if data else 0
        if "std" in methods:
            mean = results.get("mean", 0)
            variance = sum((x - mean) ** 2 for x in data) / len(data) if data else 0
            results["std"] = variance ** 0.5
        
        self.tasks_completed += 1
        return {"status": "success", "results": results}
    
    async def _generate_visualization(self, payload: Dict) -> Dict:
        chart_type = payload.get("type", "bar")
        data = payload.get("data", {})
        
        # Return visualization spec (in production, use charting library)
        spec = {
            "type": chart_type,
            "data": data,
            "config": {
                "width": 600,
                "height": 400,
                "background": "transparent"
            }
        }
        
        self.tasks_completed += 1
        return {"status": "success", "spec": spec}

class CitationAgent(AgentBase):
    """Agent responsible for citation management and formatting."""
    
    async def execute(self, task: AgentTask) -> Dict:
        self.current_task = task
        self.last_active = datetime.now()
        
        if task.task_type == "find":
            return await self._find_citations(task.payload)
        elif task.task_type == "format":
            return await self._format_citation(task.payload)
        elif task.task_type == "generate":
            return await self._generate_bibliography(task.payload)
        else:
            raise ValueError(f"Unknown task type: {task.task_type}")
    
    async def _find_citations(self, payload: Dict) -> Dict:
        claim = payload.get("claim", "")
        style = payload.get("style", "apa")
        
        # Simulated citation finding (in production, use semantic search)
        citations = [
            {
                "title": "Foundational Research on Topic",
                "authors": "Smith, J.",
                "year": 2023,
                "relevance": 0.95
            },
            {
                "title": "Recent Advances in the Field",
                "authors": "Johnson, A., Williams, B.",
                "year": 2024,
                "relevance": 0.89
            }
        ]
        
        self.tasks_completed += 1
        return {"status": "success", "citations": citations}
    
    async def _format_citation(self, payload: Dict) -> Dict:
        citation = payload.get("citation", {})
        style = payload.get("style", "apa")
        
        # Simulated formatting (in production, use citation library)
        formatted = f"{citation.get('authors', 'Unknown')}. ({citation.get('year', 'n.d.')}). {citation.get('title', 'Untitled')}."
        
        self.tasks_completed += 1
        return {"status": "success", "formatted": formatted, "style": style}
    
    async def _generate_bibliography(self, payload: Dict) -> Dict:
        citations = payload.get("citations", [])
        style = payload.get("style", "apa")
        
        # Generate formatted bibliography
        bibliography = []
        for citation in citations:
            formatted = f"{citation.get('authors', 'Unknown')}. ({citation.get('year', 'n.d.')}). {citation.get('title', 'Untitled')}."
            bibliography.append(formatted)
        
        self.tasks_completed += 1
        return {"status": "success", "bibliography": bibliography, "count": len(bibliography)}

class ComplianceAgent(AgentBase):
    """Agent responsible for thesis compliance checking."""
    
    async def execute(self, task: AgentTask) -> Dict:
        self.current_task = task
        self.last_active = datetime.now()
        
        if task.task_type == "check":
            return await self._run_compliance_check(task.payload)
        elif task.task_type == "fix":
            return await self._auto_fix_issues(task.payload)
        elif task.task_type == "report":
            return await self._generate_report(task.payload)
        else:
            raise ValueError(f"Unknown task type: {task.task_type}")
    
    async def _run_compliance_check(self, payload: Dict) -> Dict:
        project_id = payload.get("project_id", "")
        content = await self.knowledge_base.get_all_content()
        
        checks = []
        total_score = 0
        max_score = 100
        
        # Word count check
        total_words = sum(len(c.split()) for c in content.values())
        if total_words >= 15000:
            checks.append({"type": "success", "label": "Word Count", "score": 20, "message": f"{total_words} words - Target met"})
            total_score += 20
        elif total_words >= 8000:
            checks.append({"type": "warning", "label": "Word Count", "score": 10, "message": f"{total_words} words - Needs more content"})
            total_score += 10
        else:
            checks.append({"type": "error", "label": "Word Count", "score": 0, "message": f"{total_words} words - Significantly under target"})
        
        # Citation check
        citation_count = await self.knowledge_base.get_citation_count()
        if citation_count >= 15:
            checks.append({"type": "success", "label": "Citations", "score": 20, "message": f"{citation_count} citations - Good coverage"})
            total_score += 20
        elif citation_count >= 8:
            checks.append({"type": "warning", "label": "Citations", "score": 10, "message": f"{citation_count} citations - Needs more"})
            total_score += 10
        else:
            checks.append({"type": "error", "label": "Citations", "score": 0, "message": f"{citation_count} citations - Critical shortage"})
        
        # Structure checks
        required_sections = ["introduction", "literature_review", "methods", "results", "conclusion"]
        completed_sections = sum(1 for s in required_sections if await self.knowledge_base.get_word_count(s) > 500)
        
        if completed_sections >= 5:
            checks.append({"type": "success", "label": "Structure", "score": 20, "message": "All sections complete"})
            total_score += 20
        elif completed_sections >= 3:
            checks.append({"type": "warning", "label": "Structure", "score": 10, "message": f"{completed_sections}/5 sections complete"})
            total_score += 10
        else:
            checks.append({"type": "error", "label": "Structure", "score": 0, "message": f"Only {completed_sections}/5 sections started"})
        
        # Chapter 5 check (conclusion)
        conclusion_words = await self.knowledge_base.get_word_count("conclusion")
        if conclusion_words >= 500:
            checks.append({"type": "success", "label": "Conclusion", "score": 20, "message": "Conclusion section adequate"})
            total_score += 20
        else:
            checks.append({"type": "warning", "label": "Conclusion", "score": 5, "message": "Conclusion section needs expansion"})
            total_score += 5
        
        # References check
        if citation_count >= 10:
            checks.append({"type": "success", "label": "References", "score": 20, "message": "Reference list adequate"})
            total_score += 20
        else:
            checks.append({"type": "warning", "label": "References", "score": 5, "message": "More references needed"})
            total_score += 5
        
        self.tasks_completed += 1
        return {
            "status": "success",
            "score": total_score,
            "max_score": max_score,
            "percentage": (total_score / max_score) * 100,
            "checks": checks
        }
    
    async def _auto_fix_issues(self, payload: Dict) -> Dict:
        issues = payload.get("issues", [])
        fixes_applied = []
        
        for issue in issues:
            if issue.get("type") == "suggestion" and "very " in issue.get("message", ""):
                fixes_applied.append("Removed wordiness")
        
        self.tasks_completed += 1
        return {"status": "success", "fixes_applied": fixes_applied}
    
    async def _generate_report(self, payload: Dict) -> Dict:
        check_results = payload.get("check_results", {})
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "score": check_results.get("score", 0),
            "percentage": check_results.get("percentage", 0),
            "checks": check_results.get("checks", []),
            "recommendations": []
        }
        
        # Generate recommendations based on results
        for check in report["checks"]:
            if check.get("type") in ["warning", "error"]:
                report["recommendations"].append({
                    "area": check.get("label"),
                    "suggestion": f"Address {check.get('label').lower()} issues for better compliance"
                })
        
        self.tasks_completed += 1
        return {"status": "success", "report": report}

class AgentOrchestrator:
    """
    Central orchestrator for all research agents.
    Manages task distribution, agent health, and result synthesis.
    """
    
    def __init__(self, project_id: str, user_id: str):
        self.project_id = project_id
        self.user_id = user_id
        self.knowledge_base = KnowledgeBase(project_id)
        
        # Initialize agents
        self.agents = {
            AgentType.LITERATURE: LiteratureAgent(self.knowledge_base),
            AgentType.WRITING: WritingAgent(self.knowledge_base),
            AgentType.ANALYSIS: AnalysisAgent(self.knowledge_base),
            AgentType.CITATION: CitationAgent(self.knowledge_base),
            AgentType.COMPLIANCE: ComplianceAgent(self.knowledge_base),
        }
        
        # Task queue
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.active_tasks: Dict[str, AgentTask] = {}
        self.task_history: List[AgentTask] = []
        
        # Agent configuration
        self.config = AgentConfiguration()
        
        # WebSocket connections for real-time updates
        self.websocket_connections: List[Any] = []
        
        # Start orchestrator
        self._running = True
        self._worker_task = asyncio.create_task(self._process_tasks())
    
    async def create_task(
        self,
        agent_type: AgentType,
        task_type: str,
        description: str,
        priority: int = 3,
        payload: Dict = None,
        requires_approval: bool = False
    ) -> AgentTask:
        """Create and queue a new task for an agent."""
        
        task = AgentTask(
            id=f"task_{uuid.uuid4().hex[:12]}",
            agent_type=agent_type,
            task_type=task_type,
            description=description,
            priority=priority,
            status=TaskStatus.PENDING,
            payload=payload or {},
            created_at=datetime.now(),
            requires_approval=requires_approval
        )
        
        await self.task_queue.put(task)
        
        # Auto-run if below concurrent limit
        if len(self.active_tasks) < self.config.max_concurrent_tasks:
            await self._dispatch_task(task)
        
        return task
    
    async def _dispatch_task(self, task: AgentTask):
        """Dispatch a task to the appropriate agent."""
        
        agent = self.agents.get(task.agent_type)
        if not agent:
            task.status = TaskStatus.FAILED
            task.error = f"Unknown agent type: {task.agent_type}"
            return
        
        task.status = TaskStatus.IN_PROGRESS
        task.started_at = datetime.now()
        self.active_tasks[task.id] = task
        
        # Broadcast task start
        await self._broadcast({
            "type": "task_started",
            "task": task.model_dump()
        })
        
        try:
            # Execute task
            result = await agent.execute(task)
            
            task.result = result
            task.status = TaskStatus.COMPLETED
            task.progress = 100
            task.completed_at = datetime.now()
            
            # Broadcast task completion
            await self._broadcast({
                "type": "task_completed",
                "task": task.model_dump()
            })
            
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            task.completed_at = datetime.now()
            
            # Broadcast task failure
            await self._broadcast({
                "type": "task_failed",
                "task": task.model_dump(),
                "error": str(e)
            })
            
        finally:
            self.task_history.append(task)
            
            if task.id in self.active_tasks:
                del self.active_tasks[task.id]
            
            # Try to dispatch next task
            await self._try_dispatch_next()
    
    async def _process_tasks(self):
        """Process tasks from the queue."""
        
        while self._running:
            try:
                task = await asyncio.wait_for(
                    self.task_queue.get(),
                    timeout=1.0
                )
                
                if len(self.active_tasks) < self.config.max_concurrent_tasks:
                    await self._dispatch_task(task)
                else:
                    # Re-queue, will be picked up when slot frees
                    await self.task_queue.put(task)
                    await asyncio.sleep(1)
                    
            except asyncio.TimeoutError:
                continue
    
    async def _try_dispatch_next(self):
        """Try to dispatch the next pending task."""
        
        if self.task_queue.empty():
            return
            
        try:
            task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
            
            if len(self.active_tasks) < self.config.max_concurrent_tasks:
                await self._dispatch_task(task)
            else:
                await self.task_queue.put(task)
        except asyncio.TimeoutError:
            pass
    
    async def get_agent_status(self) -> Dict:
        """Get status of all agents."""
        
        return {
            agent_type.value: {
                "status": "running" if agent.current_task else "idle",
                "current_task": agent.current_task.model_dump() if agent.current_task else None,
                "tasks_completed": agent.tasks_completed,
                "last_active": agent.last_active.isoformat(),
            }
            for agent_type, agent in self.agents.items()
        }
    
    async def get_active_tasks(self) -> List[AgentTask]:
        """Get all active tasks."""
        return list(self.active_tasks.values())
    
    async def get_task_history(self, limit: int = 20) -> List[AgentTask]:
        """Get task history."""
        return self.task_history[-limit:]
    
    async def generate_insights(self) -> List[AgentInsight]:
        """Generate AI insights based on project state."""
        
        insights = []
        
        # Check progress
        progress = await self._calculate_progress()
        if progress < 25:
            insights.append(AgentInsight(
                id=f"insight_{uuid.uuid4().hex[:8]}",
                type="warning",
                source="System",
                title="Project Just Started",
                message=f"Only {progress:.0f}% complete. Consider increasing your daily word target.",
                priority="high",
                actionable=True,
                actions=[{"label": "Set Target", "action": "set_target"}, {"label": "Get Help", "action": "help"}]
            ))
        elif progress < 50:
            insights.append(AgentInsight(
                id=f"insight_{uuid.uuid4().hex[:8]}",
                type="info",
                source="System",
                title="Making Progress",
                message=f"At {progress:.0f}% completion. Keep up the momentum!",
                priority="low",
                actionable=False
            ))
        
        # Check citations
        citation_count = await self.knowledge_base.get_citation_count()
        if citation_count < 10:
            insights.append(AgentInsight(
                id=f"insight_{uuid.uuid4().hex[:8]}",
                type="suggestion",
                source="Literature Agent",
                title="More Citations Needed",
                message=f"Only {citation_count} citations found. Target: 15-30 for a comprehensive thesis.",
                priority="medium",
                actionable=True,
                actions=[{"label": "Search Citations", "action": "search_citations"}]
            ))
        
        # Check for incomplete sections
        incomplete = await self._find_incomplete_sections()
        if incomplete:
            insights.append(AgentInsight(
                id=f"insight_{uuid.uuid4().hex[:8]}",
                type="info",
                source="Writing Agent",
                title="Sections Need Work",
                message=f"The following sections need more development: {', '.join(incomplete)}",
                priority="medium",
                actionable=True,
                actions=[{"label": "View Sections", "action": "view_sections"}]
            ))
        
        # Check word count
        total_words = sum(await self.knowledge_base.get_word_count(s) for s in ["introduction", "literature_review", "methods", "results", "conclusion"])
        if total_words < 5000:
            insights.append(AgentInsight(
                id=f"insight_{uuid.uuid4().hex[:8]}",
                type="warning",
                source="Compliance Agent",
                title="Low Word Count",
                message=f"Current word count: {total_words}. Target: 15,000+ words.",
                priority="high",
                actionable=True,
                actions=[{"label": "Expand Content", "action": "expand_content"}]
            ))
        
        return insights
    
    async def _calculate_progress(self) -> float:
        """Calculate overall project progress."""
        
        total_sections = 5  # Intro, Lit Review, Methods, Results, Conclusion
        completed_sections = 0
        
        for section in ["introduction", "literature_review", "methods", "results", "conclusion"]:
            word_count = await self.knowledge_base.get_word_count(section)
            if word_count > 1000:
                completed_sections += 1
        
        return (completed_sections / total_sections) * 100
    
    async def _find_incomplete_sections(self) -> List[str]:
        """Find sections that need more work."""
        
        incomplete = []
        min_words = {
            "introduction": 500,
            "literature_review": 1500,
            "methods": 800,
            "results": 1000,
            "conclusion": 500,
        }
        
        for section, min_word_count in min_words.items():
            word_count = await self.knowledge_base.get_word_count(section)
            if word_count < min_word_count:
                incomplete.append(section.replace("_", " ").title())
        
        return incomplete
    
    async def update_config(self, config: AgentConfiguration):
        """Update agent configuration."""
        self.config = config
    
    async def get_config(self) -> AgentConfiguration:
        """Get current configuration."""
        return self.config
    
    async def register_websocket(self, websocket):
        """Register a WebSocket connection for real-time updates."""
        self.websocket_connections.append(websocket)
    
    async def unregister_websocket(self, websocket):
        """Unregister a WebSocket connection."""
        if websocket in self.websocket_connections:
            self.websocket_connections.remove(websocket)
    
    async def _broadcast(self, message: Dict):
        """Broadcast message to all connected WebSockets."""
        for ws in self.websocket_connections:
            try:
                await ws.send_json(message)
            except Exception:
                # Remove broken connections
                self.websocket_connections.remove(ws)
    
    async def shutdown(self):
        """Gracefully shutdown orchestrator."""
        
        self._running = False
        
        if self._worker_task:
            try:
                await asyncio.wait_for(self._worker_task, timeout=30)
            except asyncio.TimeoutError:
                self._worker_task.cancel()
        
        # Save state
        await self.knowledge_base.save_state()
