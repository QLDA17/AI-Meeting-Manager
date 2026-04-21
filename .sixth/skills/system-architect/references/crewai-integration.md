# CrewAI Integration for MUTI_AI

## Adding a new Agent
1. Update `config/agents/agent_config.yaml`:
```yaml
new_agent:
  role: "Role name"
  goal: "What to achieve"
  backstory: "AI personality"
```

2. Update `src/crewai/agents.py`:
```python
def new_agent(self) -> Agent:
    return Agent(
        config=self.config['new_agent'],
        tools=[self.tools['relevant_tool']],
        llm=self.llm
    )
```
