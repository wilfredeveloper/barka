[Skip to content](https://www.siddharthbharath.com/the-complete-guide-to-googles-agent-development-kit-adk/#wp--skip-link--target)

![](https://www.siddharthbharath.com/wp-content/uploads/2025/04/AI-Agent-Blog-Image-Apr-16-2025.png)

# The Complete Guide to Google’s Agent Development Kit (ADK)

April 16, 2025

The Agent Development Kit (ADK) is a new open-source framework released by Google that simplifies the end-to-end development of intelligent agent systems.

Do we really need another [agent framework](https://www.siddharthbharath.com/openai-agents-sdk/)? Probably not. But hey, Google’s been on a roll and Gemini 2.5 Pro is my new favourite model (we’ll see if this changes next month), so if they’re offering something that makes it easy to build complex agentic systems, I’m all ears.

In this mammoth guide, I’ll explore all that the Agent Development Kit has to offer, starting from it’s capabilities and primitives, all the way to building a complex multi-agent system with all the bells and whistles.

**PS** – I also recommend reading my guide on [How To Design AI Agents](https://www.siddharthbharath.com/ultimate-guide-ai-agents/), where I talk through different architectures and components of effective AI agents.

## Key Features and Capabilities

ADK offers a rich set of features designed to address the entire agent development lifecycle:

- **Multi-Agent Architecture**: create modular, scalable applications where different agents handle specific tasks, working in concert to achieve complex goals
- **Model Flexibility**: use Gemini models directly, access models available via Vertex AI Model Garden, or leverage LiteLLM integration to work with models from providers like Anthropic, Meta, Mistral AI, and AI21 Labs.
- **Rich Tool Ecosystem**: use pre-built tools (like Search and Code Execution), create custom tools, implement Model Context Protocol (MCP) tools, integrate third-party libraries (such as LangChain and LlamaIndex), or even use other agents as tools.
- **Built-in Streaming**: native bidirectional audio and video streaming capabilities, enabling natural, human-like interactions beyond just text.
- **Flexible Orchestration**: structured workflows using specialized workflow agents (Sequential, Parallel, Loop) for predictable execution patterns, and dynamic, LLM-driven routing for more adaptive behavior.
- **Integrated Developer Experience**: powerful CLI and visual Web UI for local development, testing, and debugging.
- **Built-in Evaluation**: systematically assess agent performance, evaluating both final response quality and step-by-step execution trajectories against predefined test cases.
- **Deployment Options**: Agents built with ADK can be containerized and deployed anywhere, including integration with Google Cloud services for production environments.

## The Architecture of ADK

At a high level, ADK’s architecture is designed around several key components that work together to create functional agent systems:

### Core Components:

1. **Agents**: The central entities that make decisions and take actions. ADK supports various types of agents, including LLM-powered agents and workflow agents that orchestrate others.
2. **Tools**: Functions or capabilities that agents can use to perform specific actions, such as searching the web, executing code, or retrieving information from databases.
3. **Runners**: Components that manage the execution flow of agents, handling the orchestration of messages, events, and state management.
4. **Sessions**: Maintain the context and state of conversations, allowing agents to persist information across interactions.
5. **Events**: The communication mechanism between components in the system, representing steps in agent execution.

### Architectural Patterns:

ADK is built around a flexible, event-driven architecture that enables:

- **Modular Design**: Components can be combined and reconfigured to create different agent behaviors
- **Extensibility**: The system can be extended with new tools, models, and agent types
- **Separation of Concerns**: Clear boundaries between reasoning (agents), capabilities (tools), execution (runners), and state management (sessions)

This architecture allows developers to focus on defining what their agents should do, while ADK handles the complex orchestration of execution, communication, and state management.

## Get The ADK Quickstart Repo

Grab the ready-to-run repo with the weather-time agent scaffold, pre-wired CLI scripts, `.env` sample, and Makefile

Subscribe

We won't send you spam. Unsubscribe at any time.

## Getting Started with ADK

Getting started with the Agent Development Kit is straightforward, requiring just a few steps to set up your development environment. ADK is designed to work with Python 3.9 or later, and it’s recommended to use a virtual environment to manage dependencies.

### Basic Installation

To install ADK, you’ll need to have Python installed on your system. Then, you can use pip to install the package:

Bash

```
# Create a virtual environment (recommended)
python -m venv .venv

# Activate the virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows (CMD):
.venv\Scripts\activate.bat
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Install ADK
pip install google-adk
```

This installs the core ADK package, which includes all the necessary components to build and run agents locally. You’ll need to add your GOOGLE\_API\_KEY in a .env file.

### Creating Your First Basic Agent

Let’s create a simple agent that can tell you the weather and time for a specific city. This example will demonstrate the basic structure of an ADK project.

This is the directory structure for our agent:

Plaintext

```
parent_folder/
    weather_time_agent/
        __init__.py
        agent.py
        .env
```

Create the necessary files in your terminal:

Bash

```
mkdir -p weather_time_agent
echo "from . import agent" > weather_time_agent/__init__.py
touch weather_time_agent/agent.py
touch weather_time_agent/.env
```

Now edit agent.py to create your agent:

Python

```
import datetime
from zoneinfo import ZoneInfo
from google.adk.agents import Agent

def get_weather(city: str) -> dict:
    """Retrieves the current weather report for a specified city.

    Args:
        city (str): The name of the city for which to retrieve the weather report.

    Returns:
        dict: status and result or error msg.
    """
    if city.lower() == "new york":
        return {
            "status": "success",
            "report": (
                "The weather in New York is sunny with a temperature of 25 degrees"
                " Celsius (41 degrees Fahrenheit)."
            ),
        }
    else:
        return {
            "status": "error",
            "error_message": f"Weather information for '{city}' is not available.",
        }

def get_current_time(city: str) -> dict:
    """Returns the current time in a specified city.

    Args:
        city (str): The name of the city for which to retrieve the current time.

    Returns:
        dict: status and result or error msg.
    """

    if city.lower() == "new york":
        tz_identifier = "America/New_York"
    else:
        return {
            "status": "error",
            "error_message": (
                f"Sorry, I don't have timezone information for {city}."
            ),
        }

    tz = ZoneInfo(tz_identifier)
    now = datetime.datetime.now(tz)
    report = (
        f'The current time in {city} is {now.strftime("%Y-%m-%d %H:%M:%S %Z%z")}'
    )
    return {"status": "success", "report": report}

weather_time_agent = Agent(
    name="weather_time_agent",
    model="gemini-2.0-flash-exp",
    description=(
        "Agent to answer questions about the time and weather in a city."
    ),
    instruction=(
        "I can answer your questions about the time and weather in a city."
    ),
    tools=[get_weather, get_current_time],
)
```

Finally, add your API keys to the .env file. You can directly use Gemini but if you want to use other models, like Anthropic or OpenAI, you’ll need to ‘ `pip install litellm`‘ first.

Once done, you can run the agent with ‘ `adk run`‘

Of course, this is a really basic agent and doesn’t need a framework. Let’s dive deeper into the core components of the ADK and build a more complex agent.

## Building Agents: The Foundation

ADK provides several agent types to address different needs and use cases:

### LLM Agent

The `LlmAgent` (often simply referred to as `Agent`) is the most commonly used agent type. It leverages a Large Language Model to understand user requests, make decisions, and generate responses. This is the [“thinking” component](https://www.siddharthbharath.com/the-age-of-reasoning-ai/) of your application.

Python

```
from google.adk.agents import Agent  # This is actually an LlmAgent

my_agent = Agent(
    name="my_first_agent",
    model="gemini-2.0-flash-exp",
    description="A helpful assistant that answers general questions.",
    instruction="You are a friendly AI assistant. Be concise and helpful.",
    tools=[]  # Optional tools
)
```

The `LlmAgent` is non-deterministic – its behaviour depends on the LLM’s interpretation of instructions and context. It can use tools, transfer to other agents, or directly respond to users based on its reasoning.

### Workflow Agents

Workflow agents provide deterministic orchestration for sub-agents. Unlike LLM agents, they follow predefined execution patterns:

**SequentialAgent**: Executes sub-agents one after another, in order:

Python

```
from google.adk.agents import SequentialAgent

step1 = Agent(name="data_collector", model="gemini-2.0-flash-exp")
step2 = Agent(name="data_analyzer", model="gemini-2.0-flash-exp")

pipeline = SequentialAgent(
    name="analysis_pipeline",
    sub_agents=[step1, step2]  # Will execute in this order
)
```

**ParallelAgent**: Executes sub-agents concurrently:

Python

```
from google.adk.agents import ParallelAgent

fetch_weather = Agent(name="weather_fetcher", model="gemini-2.0-flash-exp")
fetch_news = Agent(name="news_fetcher", model="gemini-2.0-flash-exp")

parallel_agent = ParallelAgent(
    name="information_gatherer",
    sub_agents=[fetch_weather, fetch_news]  # Will execute in parallel
)
```

**LoopAgent**: Repeatedly executes sub-agents until a condition is met:

Python

```
from google.adk.agents import LoopAgent

process_step = Agent(name="process_item", model="gemini-2.0-flash-exp")
check_condition = Agent(name="check_complete", model="gemini-2.0-flash-exp")

loop_agent = LoopAgent(
    name="processing_loop",
    sub_agents=[process_step, check_condition],
    max_iterations=5  # Optional maximum iterations
)
```

### Custom Agents

For specialized needs, you can create custom agents by extending the `BaseAgent` class:

Python

```
from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from typing import AsyncGenerator

class MyCustomAgent(BaseAgent):
    name: str = "custom_agent"
    description: str = "A specialized agent with custom behavior"

    async def _run_async_impl(self, context: InvocationContext) -> AsyncGenerator[Event, None]:
        # Custom implementation logic here
        # You must yield at least one Event
        yield Event(author=self.name, content=...)
```

Custom agents are useful when you need deterministic behavior that doesn’t fit into the existing workflow agent patterns, or when you want to integrate with external systems in custom ways.

### Configuring an Agent: Models, Instructions, Descriptions

The behaviour of an agent is largely determined by its configuration parameters:

#### Model Selection

The `model` parameter specifies which LLM powers your agent’s reasoning (for `LlmAgent`). This choice affects the agent’s capabilities, cost, and performance characteristics:

Python

```
# Using a Gemini model directly
agent = Agent(
    name="gemini_agent",
    model="gemini-2.0-flash-exp",  # Choose model variant based on needs
    # Other parameters...
)
```

#### Setting Instructions

The `instruction` parameter provides guidance to the agent on how it should behave. This is one of the most important parameters for shaping agent behaviour:

Python

```
agent = Agent(
    name="customer_support",
    model="gemini-2.0-flash-exp",
    instruction="""
    You are a customer support agent for TechGadgets Inc.

    When helping customers:
    1. Greet them politely and introduce yourself
    2. Ask clarifying questions if the issue isn't clear
    3. Provide step-by-step troubleshooting when appropriate
    4. For billing issues, use the check_account_status tool
    5. For technical problems, use the diagnostic_tool
    6. Always end by asking if there's anything else you can help with

    Never share internal company information or promise specific refund amounts.
    """
)
```

Best practices for effective instructions:

- Be specific about the agent’s role and persona
- Include clear guidelines for when and how to use available tools
- Use formatting (headers, numbered lists) for readability
- Provide examples of good and bad responses
- Specify any constraints or boundaries

#### Defining Descriptions

The `description` parameter provides a concise summary of the agent’s purpose:

Python

```
agent = Agent(
    name="billing_specialist",
    description="Handles customer billing inquiries and invoice issues.",
    # Other parameters...
)
```

While the description is optional for standalone agents, it becomes critical in multi-agent systems. Other agents use this description to determine when to delegate tasks to this agent. A good description should:

- Clearly state the agent’s specific domain of expertise
- Be concise (usually 1-2 sentences)
- Differentiate the agent from others in the system

#### Setting Output Key

The optional `output_key` parameter allows an agent to automatically save its response to the session state:

Python

```
recommendation_agent = Agent(
    name="product_recommender",
    # Other parameters...
    output_key="product_recommendation"
)
```

This is particularly useful in multi-agent workflows, as it allows subsequent agents to access the output without additional code.

### Working with Multiple LLM Providers

One of ADK’s powerful features is its ability to work with different LLM providers through LiteLLM integration. This gives you flexibility to choose the right model for each agent in your system.

First, install the LiteLLM package: `pip install litellm`

Then, configure your API keys for the models you want to use: `
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
# Add others as needed`

Use the `LiteLlm` wrapper when defining your agent:

Python

```
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm

# Using OpenAI's GPT-4o
gpt_agent = Agent(
    name="gpt_agent",
    model=LiteLlm(model="openai/gpt-4o"),
    description="A GPT-powered agent",
    # Other parameters...
)

# Using Anthropic's Claude Sonnet
claude_agent = Agent(
    name="claude_agent",
    model=LiteLlm(model="anthropic/claude-3-sonnet-20240229"),
    description="A Claude-powered agent",
    # Other parameters...
)

# Using Mistral AI's model
mistral_agent = Agent(
    name="mistral_agent",
    model=LiteLlm(model="mistral/mistral-medium"),
    description="A Mistral-powered agent",
    # Other parameters...
)
```

This approach allows you to:

- Match models to specific tasks based on their strengths
- Build resilience by having alternatives if one provider has issues
- Optimize for cost by using less expensive models for simpler tasks

In the next section, we’ll explore how to extend your agent’s capabilities using tools.

## 5-Day Agent Challenge

**In just 5 days, I'll show you how to design, build, and launch your first functional agent.**

Send me the series

We respect your privacy. Unsubscribe at any time.

## Tools: Extending Agent Capabilities

Tools extend an agent’s capabilities beyond the core language model’s reasoning abilities. While an LLM can generate text and make decisions, tools allow agents to take concrete actions in the world: fetching real-time data, performing calculations, calling external APIs, executing code, and more.

The agent’s language model decides when to use tools, with which parameters, and how to incorporate the results into its reasoning, but the tools themselves execute the agent’s intentions in predictable ways.

### Creating Custom Function Tools

The most common way to create tools in ADK is by defining Python functions. These functions can then be passed to an agent, which will be able to call them when appropriate based on its reasoning.

#### Basic Tool Definition

Here’s a simple example of defining a function tool:

Python

```
def calculate_mortgage_payment(principal: float, annual_interest_rate: float, years: int) -> dict:
    """Calculates the monthly payment for a mortgage loan.

    Use this tool to determine monthly payments for a home loan based on
    principal amount, interest rate, and loan term.

    Args:
        principal: The initial loan amount in dollars.
        annual_interest_rate: The annual interest rate as a percentage (e.g., 5.5 for 5.5%).
        years: The loan term in years.

    Returns:
        dict: A dictionary containing the status ("success" or "error") and
              either the monthly payment or an error message.
    """
    try:
        # Convert annual interest rate to monthly decimal rate
        monthly_rate = (annual_interest_rate / 100) / 12
        # Calculate number of monthly payments
        num_payments = years * 12

        # Guard against division by zero or negative values
        if monthly_rate <= 0 or principal <= 0 or num_payments <= 0:
            return {
                "status": "error",
                "error_message": "All inputs must be positive, and interest rate cannot be zero."
            }

        # Calculate monthly payment using the mortgage formula
        if monthly_rate == 0:
            monthly_payment = principal / num_payments
        else:
            monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** num_payments) / ((1 + monthly_rate) ** num_payments - 1)

        return {
            "status": "success",
            "monthly_payment": round(monthly_payment, 2),
            "total_payments": round(monthly_payment * num_payments, 2),
            "total_interest": round((monthly_payment * num_payments) - principal, 2)
        }
    except Exception as e:
        return {
            "status": "error",
            "error_message": f"Failed to calculate mortgage payment: {str(e)}"
        }

# Add this tool to an agent
from google.adk.agents import Agent

mortgage_advisor = Agent(
    name="mortgage_advisor",
    model="gemini-2.0-flash-exp",
    description="Helps calculate and explain mortgage payments.",
    instruction="You are a mortgage advisor that helps users understand their potential mortgage payments. When asked about payments, use the calculate_mortgage_payment tool.",
    tools=[calculate_mortgage_payment]  # Simply include the function in the tools list
)
```

### Tool Context and State Management

For more advanced tools that need to access or modify the conversation state, ADK provides the `ToolContext` object. By adding this parameter to your function, you gain access to the session state and can influence the agent’s subsequent actions.

#### Accessing and Modifying State

Python

```
from google.adk.tools.tool_context import ToolContext

def update_user_preference(category: str, preference: str, tool_context: ToolContext) -> dict:
    """Updates a user's preference for a specific category.

    Args:
        category: The category for which to set a preference (e.g., "theme", "notifications").
        preference: The preference value to set.
        tool_context: Automatically provided by ADK, do not specify when calling.

    Returns:
        dict: Status of the preference update operation.
    """
    # Access current preferences or initialize if none exist
    user_prefs_key = "user:preferences"  # Using user: prefix makes this persistent across sessions
    preferences = tool_context.state.get(user_prefs_key, {})

    # Update the preferences
    preferences[category] = preference

    # Save back to state
    tool_context.state[user_prefs_key] = preferences

    print(f"Tool: Updated user preference '{category}' to '{preference}'")
    return {
        "status": "success",
        "message": f"Your {category} preference has been set to {preference}"
    }
```

#### Controlling Agent Flow

The `ToolContext` also allows tools to influence the agent’s execution flow through the `actions` attribute:

Python

```
def escalate_to_support(issue_type: str, severity: int, tool_context: ToolContext) -> dict:
    """Escalates an issue to a human support agent.

    Args:
        issue_type: The type of issue being escalated.
        severity: The severity level (1-5, where 5 is most severe).
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status of the escalation.
    """
    # Record the escalation details in state
    tool_context.state["escalation_details"] = {
        "issue_type": issue_type,
        "severity": severity,
        "timestamp": datetime.datetime.now().isoformat()
    }

    # For high severity issues, transfer to the support agent
    if severity >= 4:
        tool_context.actions.transfer_to_agent = "human_support_agent"
        return {
            "status": "success",
            "message": "This is a high-severity issue. Transferring you to a human support specialist."
        }

    # For medium severity, just note it but don't transfer
    return {
        "status": "success",
        "message": f"Your {issue_type} issue has been logged with severity {severity}."
    }
```

#### Handling Tool Results

When an agent uses a tool, it needs to interpret the results correctly. This is why returning structured data with clear status indicators is important. Here’s how to guide your agent to handle tool results:

Python

```
weather_agent = Agent(
    name="weather_assistant",
    model="gemini-2.0-flash-exp",
    instruction="""
    You help users get weather information.

    When using the get_weather tool:
    1. Check the "status" field of the result.
    2. If status is "success", present the "report" information in a friendly way.
    3. If status is "error", apologize and share the "error_message" with the user.
    4. Always thank the user for their query.
    """,
    tools=[get_weather]
)
```

### Built-in Tools and Integrations

ADK provides several built-in tools that you can use without having to implement them yourself:

#### Google Search

Python

```
from google.adk.tools import google_search

search_agent = Agent(
    name="research_assistant",
    model="gemini-2.0-flash-exp",
    instruction="You help users research topics. When asked, use the google_search tool to find up-to-date information.",
    tools=[google_search]
)
```

#### Code Execution

Python

```
from google.adk.tools import code_interpreter

coding_assistant = Agent(
    name="coding_assistant",
    model="gemini-2.0-flash-exp",
    instruction="You help users with coding tasks. When appropriate, use the code_interpreter to execute Python code and demonstrate solutions.",
    tools=[code_interpreter]
)
```

#### Retrieval-Augmented Generation (RAG)

Python

```
from google.adk.tools import rag_tool

# Configure RAG with your documents
my_rag_tool = rag_tool.configure(
    document_store="your-document-source",
    embedding_model="your-embedding-model"
)

documentation_assistant = Agent(
    name="docs_assistant",
    model="gemini-2.0-flash-exp",
    instruction="You help users find information in the company documentation. Use the RAG tool to retrieve relevant information.",
    tools=[my_rag_tool]
)
```

#### Third-Party Integrations

ADK supports integration with popular tools from other frameworks:

Python

```
# LangChain tool example
from langchain.tools import BaseTool as LangChainTool
from google.adk.tools.langchain_tool import LangChainTool

langchain_tool = LangChainTool(langchain_tool=your_langchain_tool_instance)

# LlamaIndex tool example
from google.adk.tools.llama_index_tool import LlamaIndexTool

llama_index_tool = LlamaIndexTool(llama_index_tool=your_llama_index_tool_instance)
```

### Best Practices for Tool Design

Creating effective tools is crucial for agent performance. Here are expanded best practices:

#### 1\. Function Naming and Signature

- **Verb-Noun Names**: Use descriptive names that clearly indicate action (e.g., `fetch_stock_price` is better than `get_stock` or simply `stocks`).
- **Parameter Naming**: Use clear, self-documenting parameter names ( `city` is better than `c`).
- **Default Values**: Avoid setting default values for parameters. The LLM should decide all parameter values based on context.
- **Type Consistency**: Ensure parameters have consistent types throughout your application.

#### 2\. Error Handling and Result Structure

- **Comprehensive Error Handling**: Catch all possible exceptions within your tool.
- **Informative Error Messages**: Return error messages that help both the agent and user understand what went wrong.
- **Consistent Result Structure**: Use a consistent pattern across all tools: python `# Success case return {"status": "success", "data": result_data} # Error case return {"status": "error", "error_message": "Detailed explanation of what went wrong"}`

#### 3\. Documentation and Clarity

- **Rich Docstrings**: Include comprehensive documentation explaining the tool’s purpose, parameters, return values, and usage guidelines.
- **Usage Examples**: Consider including examples in the docstring for complex tools.
- **Logging**: Add logging statements within tools to aid debugging.

#### 4\. Tool Design Principles

- **Single Responsibility**: Each tool should do one thing well.
- **Granularity Balance**: Not too specific, not too general; find the right level of abstraction.
- **Idempotent When Possible**: Tools should be safe to call multiple times when appropriate.
- **Input Validation**: Validate inputs early to prevent cascading errors.

#### 5\. Performance Considerations

- **Asynchronous Operations**: For time-consuming operations, consider using async functions.
- **Timeout Handling**: Implement timeouts for external API calls.
- **Caching**: Consider caching results for frequently used, unchanging data.

#### Example of a Well-Designed Tool

Python

```
def search_product_catalog(
    query: str,
    category: str = None,
    price_max: float = None,
    sort_by: str = None,
    tool_context: ToolContext = None
) -> dict:
    """Searches the product catalog for items matching the query and filters.

    Use this tool to find products in our inventory based on customer requests.

    Args:
        query: The search term entered by the customer (required).
        category: Optional category to filter results (e.g., "electronics", "clothing").
        price_max: Optional maximum price filter.
        sort_by: Optional sorting method ("price_low", "price_high", "popularity", "rating").
        tool_context: Automatically provided by ADK.

    Returns:
        dict: A dictionary containing:
            - "status": "success" or "error"
            - If success: "products" list of matching products (up to 5 items)
            - If error: "error_message" explaining what went wrong

    Example success:
        {"status": "success", "products": [{"name": "42-inch TV", "price": 299.99, ...}, ...]}
    Example error:
        {"status": "error", "error_message": "No products found matching 'flying car'"}
    """
    try:
        # Log the tool execution for debugging
        print(f"Tool: search_product_catalog called with query='{query}', category='{category}', price_max={price_max}")

        # Track the search in user history if tool_context is available
        if tool_context:
            search_history = tool_context.state.get("user:search_history", [])
            search_history.append({
                "query": query,
                "timestamp": datetime.datetime.now().isoformat()
            })
            # Keep only last 10 searches
            if len(search_history) > 10:
                search_history = search_history[-10:]
            tool_context.state["user:search_history"] = search_history

        # ... actual catalog search implementation ...
        # (For demo, we'll return mock data)

        mock_products = [\
            {"name": "42-inch Smart TV", "price": 299.99, "category": "electronics", "rating": 4.5},\
            {"name": "Wireless Headphones", "price": 89.99, "category": "electronics", "rating": 4.2},\
        ]

        # Apply filters if provided
        filtered_products = mock_products
        if category:
            filtered_products = [p for p in filtered_products if p["category"].lower() == category.lower()]
        if price_max:
            filtered_products = [p for p in filtered_products if p["price"] <= price_max]

        # Apply sorting if requested
        if sort_by == "price_low":
            filtered_products = sorted(filtered_products, key=lambda p: p["price"])
        elif sort_by == "price_high":
            filtered_products = sorted(filtered_products, key=lambda p: p["price"], reverse=True)
        elif sort_by == "rating":
            filtered_products = sorted(filtered_products, key=lambda p: p["rating"], reverse=True)

        # Return formatted response
        if filtered_products:
            return {
                "status": "success",
                "products": filtered_products[:5],  # Limit to 5 results
                "total_matches": len(filtered_products)
            }
        else:
            return {
                "status": "error",
                "error_message": f"No products found matching '{query}' with the specified filters."
            }

    except Exception as e:
        print(f"Tool Error: search_product_catalog failed: {str(e)}")
        return {
            "status": "error",
            "error_message": f"Failed to search catalog: {str(e)}"
        }
```

Tools are the primary way to extend your agents’ capabilities beyond just language generation. You can now create agents that interact effectively with the world and provide genuinely useful services to users.

## State and Memory: Creating Context-Aware Agents

In ADK, “state” refers to the persistent data associated with a conversation that allows agents to remember information across multiple interactions. Unlike the conversation history (which records the sequence of messages), state is a structured key-value store that agents can read from and write to, enabling them to track user preferences, remember previous decisions, maintain contextual information, and build personalized experiences.

### The Role of Session State

Session state serves several critical functions in agent applications:

1. **Contextual Memory**: Allows agents to remember information from earlier in the conversation
2. **Preference Storage**: Maintains user preferences across interactions
3. **Workflow Tracking**: Keeps track of where users are in multi-step processes
4. **Data Persistence**: Stores data that needs to be accessible between different agents or across multiple turns
5. **Configuration Management**: Maintains settings that affect agent behavior

### State Structure and Scope

ADK’s state management system is designed with different scopes to address various persistence needs:

Plaintext

```
session.state = {
    # Session-specific state (default scope)
    "last_query": "What's the weather in London?",
    "current_step": 3,

    # User-specific state (persists across sessions)
    "user:preferred_temperature_unit": "Celsius",
    "user:name": "Alex",

    # Application-wide state (shared across all users)
    "app:version": "1.2.3",
    "app:maintenance_mode": False,

    # Temporary state (not persisted beyond current execution)
    "temp:calculation_result": 42
}
```

The prefixes determine the scope:

- No prefix: Session-specific, persists only for the current session
- `user:`: User-specific, persists across all sessions for a particular user
- `app:`: Application-wide, shared across all users and sessions
- `temp:`: Temporary, exists only during the current execution cycle

### Implementing Memory with State Management

Let’s explore how to implement memory capabilities using session state:

#### Basic State Access

The most straightforward way to access state is through the session object:

Python

```
# Getting a session
from google.adk.sessions import InMemorySessionService

session_service = InMemorySessionService()
APP_NAME = "my_application"
USER_ID = "user_123"
SESSION_ID = "session_456"

# Create or retrieve a session
session = session_service.create_session(
    app_name=APP_NAME,
    user_id=USER_ID,
    session_id=SESSION_ID
)

# Reading from state
last_city = session.state.get("last_city", "New York")  # Default if key doesn't exist

# Writing to state
session.state["last_city"] = "London"
```

However, in real agent applications, you’ll often access state through more integrated methods.

#### Accessing State in Tools

Tools can access and modify state through the `ToolContext` parameter:

Python

```
from google.adk.tools.tool_context import ToolContext

def remember_favorite_city(city: str, tool_context: ToolContext) -> dict:
    """Remembers the user's favorite city.

    Args:
        city: The city to remember as favorite.
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status of the operation.
    """
    # Store at user scope so it persists across sessions
    tool_context.state["user:favorite_city"] = city

    # Also store when this preference was set
    tool_context.state["user:favorite_city_set_at"] = datetime.datetime.now().isoformat()

    return {
        "status": "success",
        "message": f"I've remembered that your favorite city is {city}."
    }
```

#### Using output\_key for Automatic State Updates

The `output_key` parameter of `Agent` provides a convenient way to automatically save an agent’s response to state:

Python

```
weather_reporter = Agent(
    name="weather_reporter",
    model="gemini-2.0-flash-exp",
    instruction="You provide weather reports for cities. Be concise but informative.",
    tools=[get_weather],
    output_key="last_weather_report"  # Automatically saves response to this state key
)
```

When the agent responds, its final text output will be stored in `session.state["last_weather_report"]` automatically.

#### State in Agent Instructions

To make agents state-aware, include instructions on how to use state:

Python

```
personalized_agent = Agent(
    name="personalized_assistant",
    model="gemini-2.0-flash-exp",
    instruction="""
    You are a personalized assistant.

    CHECK THESE STATE VALUES AT THE START OF EACH INTERACTION:
    - If state["user:name"] exists, greet the user by name.
    - If state["user:favorite_city"] exists, personalize weather or travel recommendations.
    - If state["current_workflow"] exists, continue that workflow where you left off.

    MAINTAIN THESE STATE VALUES:
    - When the user mentions their name, use the remember_name tool to store it.
    - When discussing a city positively, use the remember_favorite_city tool.
    - When starting a multi-step workflow, set state["current_workflow"] and state["current_step"].
    """
)
```

### Persisting Information Across Conversation Turns

To create truly context-aware agents, you need to implement patterns that effectively use state across conversation turns.

#### Pattern 1: Preference Tracking

This pattern stores user preferences discovered through conversation:

Python

```
def set_preference(category: str, value: str, tool_context: ToolContext) -> dict:
    """Stores a user preference.

    Args:
        category: The preference category (e.g., "language", "theme").
        value: The preference value.
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status of the operation.
    """
    preferences = tool_context.state.get("user:preferences", {})
    preferences[category] = value
    tool_context.state["user:preferences"] = preferences
    return {"status": "success", "message": f"Preference set: {category} = {value}"}

def get_preferences(tool_context: ToolContext) -> dict:
    """Retrieves all user preferences.

    Args:
        tool_context: Automatically provided by ADK.

    Returns:
        dict: The user's stored preferences.
    """
    preferences = tool_context.state.get("user:preferences", {})
    return {"status": "success", "preferences": preferences}

preference_agent = Agent(
    name="preference_aware_agent",
    model="gemini-2.0-flash-exp",
    instruction="""
    You help users and remember their preferences.

    At the start of each conversation:
    1. Use the get_preferences tool to check stored preferences.
    2. Adapt your responses based on these preferences.

    During conversations:
    1. When a user expresses a preference, use set_preference to store it.
    2. Acknowledge when you've saved a preference.

    Examples of preferences to track:
    - Language preferences
    - Communication style (brief/detailed)
    - Topic interests
    """,
    tools=[set_preference, get_preferences]
)
```

#### Pattern 2: Workflow State Tracking

This pattern manages progress through multi-step processes:

Python

```
def start_workflow(workflow_name: str, tool_context: ToolContext) -> dict:
    """Starts a new workflow and tracks it in state.

    Args:
        workflow_name: The name of the workflow to start.
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status and the initial workflow state.
    """
    workflow = {
        "name": workflow_name,
        "current_step": 1,
        "started_at": datetime.datetime.now().isoformat(),
        "data": {}
    }
    tool_context.state["current_workflow"] = workflow
    return {"status": "success", "workflow": workflow}

def update_workflow_step(step: int, data: dict, tool_context: ToolContext) -> dict:
    """Updates the current workflow step and associated data.

    Args:
        step: The new step number.
        data: Data to associate with this step.
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status and the updated workflow state.
    """
    workflow = tool_context.state.get("current_workflow", {})
    if not workflow:
        return {"status": "error", "message": "No active workflow found."}

    workflow["current_step"] = step
    workflow["last_updated"] = datetime.datetime.now().isoformat()
    workflow["data"].update(data)
    tool_context.state["current_workflow"] = workflow
    return {"status": "success", "workflow": workflow}

workflow_agent = Agent(
    name="workflow_agent",
    model="gemini-2.0-flash-exp",
    instruction="""
    You guide users through structured workflows.

    At the start of each interaction:
    1. Check if state["current_workflow"] exists.
    2. If it exists, continue from the current_step.
    3. If not, determine if the user wants to start a workflow.

    Available workflows:
    - "account_setup": A 3-step process to set up a new account
    - "support_request": A 4-step process to file a support ticket

    Use start_workflow and update_workflow_step to track progress.
    """,
    tools=[start_workflow, update_workflow_step]
)
```

#### Pattern 3: Conversation History Summarization

This pattern maintains condensed summaries of conversation context:

Python

```
def update_conversation_summary(new_insight: str, tool_context: ToolContext) -> dict:
    """Updates the running summary of the conversation with a new insight.

    Args:
        new_insight: New information to add to the summary.
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status and the updated summary.
    """
    summary = tool_context.state.get("conversation_summary", "")
    if summary:
        summary += "\n- " + new_insight
    else:
        summary = "Conversation Summary:\n- " + new_insight

    tool_context.state["conversation_summary"] = summary
    return {"status": "success", "summary": summary}

summarizing_agent = Agent(
    name="summarizing_agent",
    model="gemini-2.0-flash-exp",
    instruction="""
    You help users while maintaining a summary of key points.

    At the start of each interaction:
    1. Check state["conversation_summary"] to recall context.

    During conversations:
    1. When you learn important information (preferences, goals, constraints),
       use update_conversation_summary to store it.
    2. Focus on facts and insights, not general chat.

    Keep your internal summary up-to-date to provide consistent, contextual help.
    """,
    tools=[update_conversation_summary]
)
```

### Personalizing Responses with State

By effectively using state, you can create deeply personalized agent experiences. Here’s an example of a comprehensive personalization approach:

Python

```
from google.adk.agents import Agent, SequentialAgent
from google.adk.tools.tool_context import ToolContext

# --- Tools for personalization ---

def get_user_profile(tool_context: ToolContext) -> dict:
    """Retrieves the user's stored profile information.

    Args:
        tool_context: Automatically provided by ADK.

    Returns:
        dict: The user's profile data.
    """
    profile = tool_context.state.get("user:profile", {})
    return {
        "status": "success",
        "profile": profile,
        "is_returning_user": bool(profile)
    }

def update_user_profile(field: str, value: str, tool_context: ToolContext) -> dict:
    """Updates a specific field in the user's profile.

    Args:
        field: The profile field to update (e.g., "name", "occupation").
        value: The value to store.
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status of the operation.
    """
    profile = tool_context.state.get("user:profile", {})
    profile[field] = value
    tool_context.state["user:profile"] = profile
    return {"status": "success", "field": field, "value": value}

def log_user_interest(topic: str, score: float, tool_context: ToolContext) -> dict:
    """Records a user's interest in a topic with a relevance score.

    Args:
        topic: The topic of interest.
        score: Relevance score (0.0-1.0, higher means more interested).
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Status of the operation.
    """
    interests = tool_context.state.get("user:interests", {})
    interests[topic] = max(interests.get(topic, 0), score) # Take highest score
    tool_context.state["user:interests"] = interests
    return {"status": "success", "topic": topic, "score": score}

def get_personalization_strategy(tool_context: ToolContext) -> dict:
    """Analyzes user data and returns a personalization strategy.

    Args:
        tool_context: Automatically provided by ADK.

    Returns:
        dict: Personalization recommendations based on user data.
    """
    profile = tool_context.state.get("user:profile", {})
    interests = tool_context.state.get("user:interests", {})
    interaction_count = tool_context.state.get("user:interaction_count", 0)

    # Increment interaction count
    tool_context.state["user:interaction_count"] = interaction_count + 1

    # Determine name usage style
    name_style = "formal"
    if interaction_count > 5 and "name" in profile:
        name_style = "casual"

    # Identify top interests
    top_interests = sorted(
        [(topic, score) for topic, score in interests.items()],
        key=lambda x: x[1],
        reverse=True
    )[:3]

    return {
        "status": "success",
        "strategy": {
            "name_usage": {
                "style": name_style,
                "name": profile.get("name", ""),
                "use_name": "name" in profile
            },
            "experience_level": "new" if interaction_count < 3 else "returning",
            "top_interests": top_interests,
            "verbosity": profile.get("preferred_verbosity", "balanced")
        }
    }

# --- Creating a personalized agent ---

personalization_agent = Agent(
    name="profile_manager",
    model="gemini-2.0-flash-exp",
    instruction="""
    You manage user profile information and personalization strategy.
    Your job is to extract and store relevant user information, then provide
    personalization guidance to other agents.

    YOU MUST:
    1. Use get_user_profile at the start of conversation to check existing data.
    2. During conversation, identify personal details and preferences.
    3. Use update_user_profile to store name, age, occupation, etc.
    4. Use log_user_interest when the user shows interest in topics.
    5. Use get_personalization_strategy to generate guidance for personalization.

    Do not explicitly tell the user you are storing this information.
    """,
    tools=[get_user_profile, update_user_profile, log_user_interest, get_personalization_strategy],
    output_key="personalization_strategy"
)

response_agent = Agent(
    name="personalized_responder",
    model="gemini-2.0-flash-exp",
    instruction="""
    You provide personalized responses based on the personalization strategy.

    At the beginning of each interaction:
    1. Check state["personalization_strategy"] for guidance on personalization.
    2. Adapt your tone, detail level, and content based on this strategy.

    Personalization Elements:
    1. If strategy says to use name, address the user by name per the specified style.
    2. Adapt verbosity based on preference.
    3. Reference top interests when relevant.
    4. Provide more explanation for new users, be more direct with returning users.

    Always keep your personalization subtle and natural, never explicit.
    """,
)

# Combine as a sequential workflow
personalized_assistant = SequentialAgent(
    name="personalized_assistant",
    sub_agents=[personalization_agent, response_agent]
)
```

This approach uses multiple state-related techniques:

1. **Profile Storage**: Maintains persistent user information
2. **Interest Tracking**: Records and scores user interests
3. **Interaction Counting**: Tracks user familiarity with the system
4. **Personalization Strategy**: Generates a comprehensive approach to personalization
5. **Sequential Agent Pattern**: First agent focuses on updating state, second agent uses it for personalization

### Advanced State Management

For production applications, you’ll likely need more sophisticated state management approaches.

#### Custom Session Services

The `InMemorySessionService` is suitable for development, but for production, you’ll want persistent storage. Create a custom session service by extending the `SessionService` abstract class:

Python

```
from google.adk.sessions import InMemorySessionService, Session
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import firestore

class FirestoreSessionService(InMemorySessionService):
    """A session service that persists state in Firestore."""

    def __init__(self, collection_name: str = "adk_sessions"):
        """Initialize with a Firestore collection name."""
        self.collection_name = collection_name
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        self.db = firestore.client()

    def create_session(
        self, app_name: str, user_id: str, session_id: str, state: Optional[Dict[str, Any]] = None
    ) -> Session:
        """Create a new session or get existing session."""
        session_ref = self._get_session_ref(app_name, user_id, session_id)
        doc = session_ref.get()

        if doc.exists:
            # Session exists, retrieve it
            session_data = doc.to_dict()
            return Session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id,
                state=session_data.get("state", {}),
                last_update_time=session_data.get("last_update_time", 0)
            )
        else:
            # Create new session
            session = Session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id,
                state=state or {}
            )
            self._save_session(session)
            return session

    def get_session(
        self, app_name: str, user_id: str, session_id: str
    ) -> Optional[Session]:
        """Get an existing session."""
        session_ref = self._get_session_ref(app_name, user_id, session_id)
        doc = session_ref.get()

        if not doc.exists:
            return None

        session_data = doc.to_dict()
        return Session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state=session_data.get("state", {}),
            last_update_time=session_data.get("last_update_time", 0)
        )

    def update_session(self, session: Session) -> None:
        """Update a session in the database."""
        self._save_session(session)

    def _get_session_ref(self, app_name: str, user_id: str, session_id: str):
        """Get a reference to the session document."""
        return self.db.collection(self.collection_name).document(
            f"{app_name}_{user_id}_{session_id}"
        )

    def _save_session(self, session: Session) -> None:
        """Save a session to Firestore."""
        session_ref = self._get_session_ref(
            session.app_name, session.user_id, session.session_id
        )
        session_ref.set({
            "state": session.state,
            "last_update_time": session.last_update_time
        })
```

By implementing state management, you can now create agents with memory, context awareness, and personalization capabilities that significantly enhance the user experience.

## Get The ADK Quickstart Repo

Grab the ready-to-run repo with the weather-time agent scaffold, pre-wired CLI scripts, `.env` sample, and Makefile

Subscribe

We won't send you spam. Unsubscribe at any time.

## Building Multi-Agent Systems

Multi-agent systems (MAS) in ADK are typically organized in hierarchical structures, where agents can have parent-child relationships. This hierarchical organization provides a clear framework for delegation, specialization, and coordination among agents.

### Creating an Agent Hierarchy

The foundation of agent hierarchies in ADK is the `sub_agents` parameter. When you create an agent, you can specify other agents as its sub-agents:

Python

```
from google.adk.agents import Agent

# Create specialized sub-agents
weather_specialist = Agent(
    name="weather_specialist",
    model="gemini-2.0-flash-exp",
    description="Provides detailed weather information for any location.",
    instruction="You are a weather specialist. Provide accurate, detailed weather information when asked.",
    tools=[get_weather]  # Assume get_weather is defined
)

restaurant_specialist = Agent(
    name="restaurant_specialist",
    model="gemini-2.0-flash-exp",
    description="Recommends restaurants based on location, cuisine, and preferences.",
    instruction="You are a restaurant specialist. Recommend restaurants based on user preferences.",
    tools=[find_restaurants]  # Assume find_restaurants is defined
)

# Create a parent agent with sub-agents
coordinator = Agent(
    name="travel_assistant",
    model="gemini-2.0-flash-exp",
    description="Helps plan trips and activities.",
    instruction="""
    You are a travel assistant that helps users plan trips and activities.

    You have two specialized sub-agents:
    - weather_specialist: For weather-related questions
    - restaurant_specialist: For restaurant recommendations

    When a user asks about weather, delegate to the weather_specialist.
    When a user asks about restaurants or food, delegate to the restaurant_specialist.
    For general travel questions, handle them yourself.
    """,
    sub_agents=[weather_specialist, restaurant_specialist]
)
```

In this example, `coordinator` is the parent agent, and `weather_specialist` and `restaurant_specialist` are its sub-agents. ADK automatically establishes the parent-child relationship by setting the `parent_agent` attribute on each sub-agent.

### Understanding the Hierarchy Rules

The agent hierarchy in ADK follows several important rules:

1. **Single Parent Rule**: An agent can have only one parent. If you try to add an agent as a sub-agent to multiple parents, ADK will raise an error.
2. **Name Uniqueness**: Each agent in the hierarchy must have a unique name. This is crucial because delegation and finding agents rely on these names.
3. **Hierarchical Navigation**: You can navigate the hierarchy programmatically:

   - `agent.parent_agent`: Access an agent’s parent
   - `agent.sub_agents`: Access an agent’s children
   - `root_agent.find_agent(name)`: Find any agent in the hierarchy by name
4. **Scope of Control**: The hierarchy defines the scope for potential agent transfers. By default, an agent can transfer control to its parent, its siblings (other sub-agents of its parent), or its own sub-agents.

### Agent-to-Agent Delegation and Communication

The power of multi-agent systems comes from the ability of agents to collaborate and delegate tasks to each other. ADK provides several mechanisms for agent-to-agent communication and delegation.

#### LLM-Driven Delegation (Auto-Flow)

The most flexible approach is LLM-driven delegation, where the agent’s language model decides when to transfer control to another agent based on its understanding of the query and the available agents’ capabilities:

Python

```
# LLM-driven delegation relies on clear agent descriptions
customer_service = Agent(
    name="customer_service",
    model="gemini-2.0-flash-exp",
    description="Handles general customer inquiries and routes to specialists.",
    instruction="""
    You are the main customer service agent.

    Analyze each customer query and determine the best way to handle it:
    - For billing questions, transfer to the billing_specialist
    - For technical issues, transfer to the tech_support
    - For product questions, handle yourself

    Make your delegation decisions based on the query content.
    """,
    sub_agents=[\
        Agent(\
            name="billing_specialist",\
            model="gemini-2.0-flash-exp",\
            description="Handles all billing, payment, and invoice inquiries."\
        ),\
        Agent(\
            name="tech_support",\
            model="gemini-2.0-flash-exp",\
            description="Resolves technical issues and troubleshooting problems."\
        )\
    ]
)
```

When a user sends a message like “I have a problem with my last bill,” the LLM in `customer_service` recognizes this as a billing question and automatically generates a transfer request to the `billing_specialist` agent. This is handled through ADK’s Auto-Flow mechanism, which is enabled by default when sub-agents are present.

The key elements for successful LLM-driven delegation are:

- Clear, distinctive descriptions for each agent
- Explicit instructions to the parent agent about when to delegate
- Appropriate model capabilities in the parent agent to understand and classify queries

#### Explicit Agent Invocation with AgentTool

For more controlled delegation, you can wrap an agent as a tool and explicitly invoke it from another agent:

Python

```
from google.adk.agents import Agent
from google.adk.tools import AgentTool

# Create a specialized agent
calculator_agent = Agent(
    name="calculator",
    model="gemini-2.0-flash-exp",
    description="Performs complex mathematical calculations.",
    instruction="You perform mathematical calculations with precision."
)

# Wrap it as a tool
calculator_tool = AgentTool(
    agent=calculator_agent,
    description="Use this tool to perform complex calculations."
)

# Create a parent agent that uses the agent tool
math_tutor = Agent(
    name="math_tutor",
    model="gemini-2.0-flash-exp",
    description="Helps students learn mathematics.",
    instruction="""
    You are a math tutor helping students learn.

    When a student asks a question requiring complex calculations:
    1. Explain the mathematical concept
    2. Use the calculator tool to compute the result
    3. Explain the significance of the result
    """,
    tools=[calculator_tool]
)
```

With this approach:

- The parent agent ( `math_tutor`) decides when to use the calculator tool based on its instructions
- When invoked, the tool executes the wrapped agent ( `calculator_agent`)
- The result is returned to the parent agent, which can then incorporate it into its response
- State changes made by the sub-agent are preserved in the shared session

This approach gives you more explicit control over when and how sub-agents are invoked.

#### Using Shared Session State for Communication

Agents can also communicate through shared session state:

Python

```
from google.adk.agents import Agent, SequentialAgent

# First agent gathers information and stores it in state
information_gatherer = Agent(
    name="information_gatherer",
    model="gemini-2.0-flash-exp",
    instruction="Gather travel information from the user and store it in state.",
    tools=[\
        # Tool to save travel details to state\
        save_travel_details  # Assume this is defined and writes to state\
    ],
    output_key="information_gathering_complete"  # Saves final response to state
)

# Second agent uses information from state
recommendation_generator = Agent(
    name="recommendation_generator",
    model="gemini-2.0-flash-exp",
    instruction="""
    Generate travel recommendations based on information in state.

    Look for:
    - destination in state["travel_destination"]
    - dates in state["travel_dates"]
    - preferences in state["travel_preferences"]
    """,
    tools=[\
        # Tool to retrieve recommendations based on state information\
        get_recommendations  # Assume this is defined and reads from state\
    ]
)

# Sequential agent ensures these run in order
travel_planner = SequentialAgent(
    name="travel_planner",
    sub_agents=[information_gatherer, recommendation_generator]
)
```

In this example:

1. `information_gatherer` collects information and stores it in the session state
2. `recommendation_generator` reads this information from state and uses it to generate recommendations
3. The `SequentialAgent` ensures they run in the correct order

This pattern is particularly useful for workflows where information needs to be collected, processed, and then used by subsequent agents.

### Workflow Patterns: Sequential, Parallel, Loop

ADK provides specialized workflow agents that orchestrate the execution of sub-agents according to different patterns.

#### Sequential Workflow

The `SequentialAgent` executes its sub-agents one after another in a defined order:

Python

```
from google.adk.agents import SequentialAgent, Agent

data_processor = SequentialAgent(
    name="data_processor",
    sub_agents=[\
        Agent(name="data_validator", output_key="validation_result"),\
        Agent(name="data_transformer", output_key="transformed_data"),\
        Agent(name="data_analyzer", output_key="analysis_result"),\
        Agent(name="report_generator")\
    ]
)
```

In this example:

1. `data_validator` runs first and validates the input data
2. `data_transformer` runs next, potentially using the validation result
3. `data_analyzer` analyzes the transformed data
4. `report_generator` creates a final report based on the analysis

Each agent’s output can be saved to state (using `output_key`) for the next agent to use. The same `InvocationContext` is passed sequentially from one agent to the next, ensuring state changes persist throughout the workflow.

#### Parallel Workflow

The `ParallelAgent` executes its sub-agents concurrently, which can improve efficiency for independent tasks:

Python

```
from google.adk.agents import ParallelAgent, Agent

data_gatherer = ParallelAgent(
    name="data_gatherer",
    sub_agents=[\
        Agent(name="weather_fetcher", output_key="weather_data"),\
        Agent(name="traffic_fetcher", output_key="traffic_data"),\
        Agent(name="news_fetcher", output_key="news_data")\
    ]
)
```

In this example, all three fetchers run concurrently. Each operates in its own branch of the invocation context ( `ParentBranch.ChildName`), but they share the same session state. This means they can all write to state without conflicts (as long as they use different keys).

Parallel execution is particularly useful for:

- Reducing total processing time for independent tasks
- Gathering information from different sources simultaneously
- Implementing competing approaches to the same problem

#### Loop Workflow

The `LoopAgent` repeatedly executes its sub-agents until a condition is met:

Python

```
from google.adk.agents import LoopAgent, Agent, BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from typing import AsyncGenerator

# Custom agent that checks if the loop should continue
class ConditionChecker(BaseAgent):
    name: str = "condition_checker"

    async def _run_async_impl(self, context: InvocationContext) -> AsyncGenerator[Event, None]:
        # Check if the condition for stopping the loop is met
        completed = context.session.state.get("task_completed", False)
        max_iterations = context.session.state.get("max_iterations", 5)
        current_iteration = context.session.state.get("current_iteration", 0)

        # Increment iteration counter
        context.session.state["current_iteration"] = current_iteration + 1

        # If task is completed or max iterations reached, escalate to stop the loop
        if completed or current_iteration >= max_iterations:
            yield Event(
                author=self.name,
                actions=EventActions(escalate=True)  # This signals loop termination
            )
        else:
            yield Event(
                author=self.name,
                content=None  # No content needed, just continuing the loop
            )

# Create task processor agent
task_processor = Agent(
    name="task_processor",
    model="gemini-2.0-flash-exp",
    instruction="""
    Process the current task step.

    Check state["current_iteration"] to see which step you're on.
    When the task is complete, set state["task_completed"] = True.
    """,
    tools=[\
        # Tool to process the current step\
        process_step,  # Assume this is defined\
        # Tool to mark the task as completed\
        mark_completed  # Assume this is defined\
    ]
)

# Create loop agent that combines processing and condition checking
iterative_processor = LoopAgent(
    name="iterative_processor",
    sub_agents=[\
        task_processor,\
        ConditionChecker()\
    ],
    max_iterations=10  # Optional backup limit
)
```

In this example:

1. `iterative_processor` repeatedly executes its sub-agents
2. Each iteration runs `task_processor` followed by `ConditionChecker`
3. The loop continues until `ConditionChecker` escalates (when the task is completed or max iterations reached)
4. State is maintained across iterations, allowing tracking of progress

Loop agents are ideal for:

- Incremental processing of large datasets
- Implementing retry logic with backoff
- Iterative refinement of results
- Multi-step workflows where the number of steps isn’t known in advance

### Designing Effective Agent Teams

Creating effective multi-agent systems requires thoughtful design. Here are key principles and patterns for building successful agent teams:

#### Principle 1: Clear Agent Specialization

Each agent in the system should have a clearly defined area of expertise:

Python

```
# Financial advisory team with clear specializations
mortgage_specialist = Agent(
    name="mortgage_specialist",
    description="Expert on mortgage products, rates, and qualification requirements.",
    # Other parameters...
)

investment_specialist = Agent(
    name="investment_specialist",
    description="Expert on investment strategies, market trends, and portfolio management.",
    # Other parameters...
)

tax_specialist = Agent(
    name="tax_specialist",
    description="Expert on tax planning, deductions, and regulatory compliance.",
    # Other parameters...
)
```

The specializations should be:

- Non-overlapping to avoid confusion in delegation decisions
- Comprehensive to cover all expected user queries
- Clearly communicated in agent descriptions and instructions

#### Principle 2: Effective Coordination Strategies

There are multiple strategies for coordinating agents. Choose the approach that best fits your application’s needs:

**Centralized Coordination (Hub and Spoke)**

Python

```
# Hub agent coordinates specialists
financial_advisor = Agent(
    name="financial_advisor",
    description="Coordinates financial advice across multiple domains.",
    instruction="""
    You are the main financial advisor.

    For mortgage questions, delegate to mortgage_specialist.
    For investment questions, delegate to investment_specialist.
    For tax questions, delegate to tax_specialist.

    Only handle general financial questions yourself.
    """,
    sub_agents=[mortgage_specialist, investment_specialist, tax_specialist]
)
```

**Workflow-Based Coordination (Pipeline)**

Python

```
# Sequential workflow for loan processing
loan_processor = SequentialAgent(
    name="loan_processor",
    sub_agents=[\
        Agent(name="application_validator"),\
        Agent(name="credit_checker"),\
        Agent(name="risk_assessor"),\
        Agent(name="decision_maker"),\
        Agent(name="notification_sender")\
    ]
)
```

**Hierarchical Decomposition (Tree Structure)**

Python

```
# Multi-level hierarchy for complex tasks
project_manager = Agent(
    name="project_manager",
    sub_agents=[\
        Agent(\
            name="design_lead",\
            sub_agents=[\
                Agent(name="ui_designer"),\
                Agent(name="ux_researcher")\
            ]\
        ),\
        Agent(\
            name="development_lead",\
            sub_agents=[\
                Agent(name="frontend_developer"),\
                Agent(name="backend_developer")\
            ]\
        ),\
        Agent(name="qa_lead")\
    ]
)
```

#### Principle 3: State Management Strategy

Develop a clear strategy for how agents share information through state:

Python

```
# First agent gathers information
data_collector = Agent(
    name="data_collector",
    instruction="""
    Collect information from the user. Store each piece in the appropriate state key:
    - Personal details in state["user_details"]
    - Goals in state["financial_goals"]
    - Current situation in state["current_situation"]
    """,
    tools=[save_to_state],  # Assume this tool saves data to specific state keys
    output_key="collection_complete"
)

# Specialist agents use collected information
retirement_planner = Agent(
    name="retirement_planner",
    instruction="""
    Create a retirement plan based on information in state.
    Use state["user_details"] for age and income information.
    Use state["financial_goals"] for retirement targets.
    Store your plan in state["retirement_plan"].
    """,
    tools=[create_retirement_plan],  # Assume this tool creates and saves a plan
    output_key="retirement_planning_complete"
)
```

Consider:

- Which state keys each agent will read from and write to
- How to structure state data for easy access by multiple agents
- Whether to use scoped state (session, user, app) based on persistence needs

#### Principle 4: Error Handling and Fallbacks

Design your agent team to handle failures gracefully:

Python

```
from google.adk.agents import Agent, SequentialAgent
from google.adk.tools.tool_context import ToolContext

# Tool to check if the previous agent encountered an error
def check_previous_result(tool_context: ToolContext) -> dict:
    """Checks if the previous agent step was successful.

    Returns:
        dict: Status and whether a fallback is needed.
    """
    error_detected = tool_context.state.get("error_detected", False)
    return {
        "status": "success",
        "fallback_needed": error_detected,
        "error_details": tool_context.state.get("error_details", "Unknown error")
    }

# Tool to handle error recovery
def recover_from_error(error_details: str, tool_context: ToolContext) -> dict:
    """Attempts to recover from an error.

    Args:
        error_details: Details about the error that occurred.

    Returns:
        dict: Status of recovery attempt.
    """
    # Record the recovery attempt
    tool_context.state["recovery_attempted"] = True

    # Clear the error flag
    tool_context.state["error_detected"] = False

    return {
        "status": "success",
        "message": f"Recovered from error: {error_details}"
    }

# Primary agent that might encounter errors
primary_handler = Agent(
    name="primary_handler",
    model="gemini-2.0-flash-exp",
    instruction="""
    You handle the primary task.
    If you encounter an error, set state["error_detected"] = True and
    state["error_details"] = "description of error".
    """,
    tools=[process_task, set_error_state]  # Assume these are defined
)

# Fallback agent for error recovery
fallback_handler = Agent(
    name="fallback_handler",
    model="gemini-2.0-flash-exp",
    instruction="""
    You handle error recovery when the primary agent fails.

    First, use check_previous_result to see if you need to act.
    If fallback is needed, use recover_from_error to attempt recovery.
    Provide a simplified but functional response to the user.
    """,
    tools=[check_previous_result, recover_from_error]
)

# Combine with sequential flow
robust_handler = SequentialAgent(
    name="robust_handler",
    sub_agents=[primary_handler, fallback_handler]
)
```

This pattern ensures that even if the primary agent encounters an error, the fallback agent can provide a degraded but functional response.

#### Principle 5: Monitoring and Debugging

Design your agent team with observability in mind:

Python

```
from google.adk.tools.tool_context import ToolContext

def log_agent_action(action: str, details: str, tool_context: ToolContext) -> dict:
    """Logs an agent action to the trace log in state.

    Args:
        action: The type of action being logged.
        details: Details about the action.

    Returns:
        dict: Status of the logging operation.
    """
    # Get existing log or initialize new one
    trace_log = tool_context.state.get("agent_trace_log", [])

    # Add new entry with timestamp
    import time
    trace_log.append({
        "timestamp": time.time(),
        "agent": tool_context.agent_name,
        "action": action,
        "details": details
    })

    # Update state with new log
    tool_context.state["agent_trace_log"] = trace_log

    return {
        "status": "success"
    }

# Add this tool to all agents in your system for comprehensive tracing
```

By following these principles and patterns, you can design effective agent teams that leverage specialization, coordination, shared state, and robust error handling to deliver complex capabilities.

In the next section, we’ll explore advanced features of ADK, including callbacks for implementing safety guardrails and other sophisticated control mechanisms.

## Advanced Features and Patterns

### Implementing Safety Guardrails with Callbacks

Callbacks are powerful hooks that allow you to intercept and potentially modify agent behavior at key points in the execution flow. They’re particularly valuable for implementing safety guardrails, logging, monitoring, and custom business logic.

ADK provides several callback points, but two of the most important are:

- **before\_model\_callback**: Executes just before sending a request to the LLM
- **before\_tool\_callback**: Executes just before a tool is called

#### Input Validation with before\_model\_callback

The `before_model_callback` lets you inspect and potentially block user inputs before they reach the language model:

Python

```
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.genai import types
from typing import Optional
import re

def profanity_filter(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """
    Checks user input for profanity and blocks requests containing prohibited language.

    Args:
        callback_context: Provides context about the agent and session
        llm_request: The request about to be sent to the LLM

    Returns:
        LlmResponse if the request should be blocked, None if it should proceed
    """
    # Simple profanity detection (in a real system, use a more sophisticated approach)
    prohibited_terms = ["badword1", "badword2", "badword3"]

    # Extract the last user message
    last_user_message = ""
    if llm_request.contents:
        for content in reversed(llm_request.contents):
            if content.role == 'user' and content.parts:
                if content.parts[0].text:
                    last_user_message = content.parts[0].text
                    break

    # Check for prohibited terms
    contains_profanity = any(term in last_user_message.lower() for term in prohibited_terms)

    if contains_profanity:
        # Log the blocking action
        print(f"Profanity filter blocked message: '{last_user_message[:20]}...'")

        # Record the event in state
        callback_context.state["profanity_filter_triggered"] = True

        # Return a response that will be sent instead of calling the LLM
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part(text="I'm sorry, but I cannot respond to messages containing inappropriate language. Please rephrase your request without using prohibited terms.")]
            )
        )

    # If no profanity detected, return None to allow the request to proceed
    return None

# Add the callback to an agent
safe_agent = Agent(
    name="safe_agent",
    model="gemini-2.0-flash-exp",
    instruction="You are a helpful assistant.",
    before_model_callback=profanity_filter
)
```

This example implements a simple profanity filter that:

1. Extracts the most recent user message from the LLM request
2. Checks it against a list of prohibited terms
3. If prohibited terms are found, blocks the LLM call and returns a predefined response
4. Otherwise, allows the request to proceed to the LLM

You can extend this pattern to implement more sophisticated content moderation, sensitive information detection, or other input validation rules.

#### Tool Usage Control with before\_tool\_callback

The `before_tool_callback` allows you to validate tool arguments, restrict certain operations, or modify how tools are used:

Python

```
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext
from typing import Optional, Dict, Any

def restricted_city_guardrail(
    tool: BaseTool, args: Dict[str, Any], tool_context: ToolContext
) -> Optional[Dict]:
    """
    Prevents the get_weather tool from being called for restricted cities.

    Args:
        tool: Information about the tool being called
        args: The arguments passed to the tool
        tool_context: Access to session state and other context

    Returns:
        Dict if the tool call should be blocked, None if it should proceed
    """
    # Check if this is the get_weather tool
    if tool.name == "get_weather" and "city" in args:
        city = args["city"].lower()

        # List of restricted cities (example - could be loaded dynamically)
        restricted_cities = ["restricted_city_1", "restricted_city_2"]

        if city in restricted_cities:
            # Log the blocking action
            print(f"Blocked get_weather call for restricted city: {city}")

            # Record the event in state
            tool_context.state["restricted_city_blocked"] = city

            # Return a response that will be used instead of calling the tool
            return {
                "status": "error",
                "error_message": f"Sorry, weather information for {city} is not available due to policy restrictions."
            }

    # For other tools or non-restricted cities, allow the call to proceed
    return None

# Add the callback to an agent
restricted_agent = Agent(
    name="restricted_agent",
    model="gemini-2.0-flash-exp",
    instruction="You provide weather information using the get_weather tool.",
    tools=[get_weather],  # Assume get_weather is defined
    before_tool_callback=restricted_city_guardrail
)
```

This example implements a city restriction guardrail that:

1. Checks if the `get_weather` tool is being called
2. Inspects the `city` argument against a list of restricted cities
3. If the city is restricted, blocks the tool call and returns a predefined error response
4. Otherwise, allows the tool call to proceed

You can use this pattern to implement various business rules, usage limits, or user-based access controls for your tools.

#### Combining Multiple Callbacks

For comprehensive safety and control, you can use multiple callbacks together:

Python

```
# Agent with multiple safety measures
comprehensive_agent = Agent(
    name="comprehensive_agent",
    model="gemini-2.0-flash-exp",
    instruction="You help users with various tasks safely and responsibly.",
    tools=[get_weather, search_web, send_email],  # Assume these are defined
    before_model_callback=content_safety_filter,  # Filter unsafe user input
    after_model_callback=output_sanitizer,        # Clean up model responses
    before_tool_callback=tool_usage_validator,    # Validate tool usage
    after_tool_callback=tool_result_logger        # Log tool results
)
```

Each callback serves a specific purpose in the safety and monitoring pipeline:

- `before_model_callback`: Prevents unsafe inputs from reaching the LLM
- `after_model_callback`: Ensures model outputs meet safety and quality standards
- `before_tool_callback`: Controls how and when tools can be used
- `after_tool_callback`: Monitors and logs tool results for auditing

### Building Evaluation Frameworks

Robust evaluation is essential for developing reliable agent systems. ADK provides built-in mechanisms for evaluating agent performance.

#### Creating Test Cases

Start by defining test cases that cover the range of interactions your agent should handle:

Python

```
# Define test cases in a structured format
test_cases = [\
    {\
        "name": "Basic weather query",\
        "input": "What's the weather in New York?",\
        "expected_tool_calls": ["get_weather"],\
        "expected_tool_args": {"city": "New York"},\
        "expected_response_contains": ["weather", "New York"]\
    },\
    {\
        "name": "Ambiguous city query",\
        "input": "How's the weather in Springfield?",\
        "expected_tool_calls": ["clarify_city"],\
        "expected_response_contains": ["multiple cities", "which Springfield"]\
    },\
    {\
        "name": "City not supported",\
        "input": "What's the weather in Atlantis?",\
        "expected_tool_calls": ["get_weather"],\
        "expected_tool_args": {"city": "Atlantis"},\
        "expected_response_contains": ["don't have information", "Atlantis"]\
    }\
]
```

#### Using the AgentEvaluator

ADK provides an `AgentEvaluator` class to run test cases against your agent:

Python

```
from google.adk.evaluation import AgentEvaluator

# Create the evaluator
evaluator = AgentEvaluator(agent=weather_agent)

# Run evaluation
evaluation_results = evaluator.evaluate(test_cases=test_cases)

# Print results
for result in evaluation_results:
    print(f"Test: {result.test_case['name']}")
    print(f"  Status: {'PASS' if result.success else 'FAIL'}")
    print(f"  Feedback: {result.feedback}")
    if not result.success:
        print(f"  Expected: {result.expected}")
        print(f"  Actual: {result.actual}")
    print()

# Calculate overall metrics
success_rate = sum(1 for r in evaluation_results if r.success) / len(evaluation_results)
print(f"Overall success rate: {success_rate:.2%}")
```

#### Custom Evaluation Metrics

For more specialized evaluation needs, you can implement custom metrics:

Python

```
def evaluate_response_correctness(test_case, agent_response, tool_calls):
    """Evaluates the correctness of the agent's response for weather queries."""
    # Exact city match checker
    if "expected_tool_args" in test_case and "city" in test_case["expected_tool_args"]:
        expected_city = test_case["expected_tool_args"]["city"]

        # Find the actual city used in tool calls
        actual_city = None
        for call in tool_calls:
            if call["name"] == "get_weather" and "city" in call["args"]:
                actual_city = call["args"]["city"]
                break

        # Check city match
        city_match = (actual_city == expected_city)

        # Temperature format checker (should include °C or °F)
        temp_format_correct = False
        if "°C" in agent_response or "°F" in agent_response:
            temp_format_correct = True

        return {
            "city_match": city_match,
            "temp_format_correct": temp_format_correct,
            "overall_correct": city_match and temp_format_correct
        }

    return {"overall_correct": None}  # Not applicable for this test case

# Apply custom evaluation to results
for result in evaluation_results:
    correctness = evaluate_response_correctness(
        result.test_case,
        result.actual_response,
        result.actual_tool_calls
    )
    print(f"Test: {result.test_case['name']}")
    print(f"  Overall correct: {correctness['overall_correct']}")
    if "city_match" in correctness:
        print(f"  City match: {correctness['city_match']}")
    if "temp_format_correct" in correctness:
        print(f"  Temperature format: {correctness['temp_format_correct']}")
    print()
```

#### Automated Regression Testing

Integrate agent evaluation into your CI/CD pipeline for automated regression testing:

Python

```
import unittest
from google.adk.evaluation import AgentEvaluator

class WeatherAgentTests(unittest.TestCase):
    def setUp(self):
        self.agent = create_weather_agent()  # Assume this function creates your agent
        self.evaluator = AgentEvaluator(agent=self.agent)

    def test_basic_weather_queries(self):
        results = self.evaluator.evaluate(test_cases=[\
            {\
                "name": "New York weather",\
                "input": "What's the weather in New York?",\
                "expected_tool_calls": ["get_weather"]\
            }\
        ])
        self.assertTrue(results[0].success, results[0].feedback)

    def test_ambiguous_cities(self):
        results = self.evaluator.evaluate(test_cases=[\
            {\
                "name": "Springfield ambiguity",\
                "input": "How's the weather in Springfield?",\
                "expected_response_contains": ["which Springfield", "multiple"]\
            }\
        ])
        self.assertTrue(results[0].success, results[0].feedback)

    def test_error_handling(self):
        results = self.evaluator.evaluate(test_cases=[\
            {\
                "name": "Nonexistent city",\
                "input": "What's the weather in Narnia?",\
                "expected_response_contains": ["don't have information", "Narnia"]\
            }\
        ])
        self.assertTrue(results[0].success, results[0].feedback)

if __name__ == "__main__":
    unittest.main()
```

This approach allows you to catch regressions automatically when updating your agent or its components.

### Streaming and Real-Time Interactions

ADK provides built-in support for streaming responses, enabling real-time interactions with agents.

#### Implementing Streaming Responses

To implement streaming with ADK, you use the asynchronous API:

Python

```
import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Set up session and runner
session_service = InMemorySessionService()
APP_NAME = "streaming_app"
USER_ID = "user_123"
SESSION_ID = "session_456"

session = session_service.create_session(
    app_name=APP_NAME,
    user_id=USER_ID,
    session_id=SESSION_ID
)

runner = Runner(
    agent=streaming_agent,  # Assume this is defined
    app_name=APP_NAME,
    session_service=session_service
)

async def stream_response(query: str):
    """Streams the agent's response token by token."""
    content = types.Content(role='user', parts=[types.Part(text=query)])

    print(f"User: {query}")
    print("Agent: ", end="", flush=True)

    # Process events as they arrive
    async for event in runner.run_async(
        user_id=USER_ID,
        session_id=SESSION_ID,
        new_message=content
    ):
        # For token-by-token streaming, look for ContentPartDelta events
        if hasattr(event, 'content_part_delta') and event.content_part_delta:
            delta = event.content_part_delta
            if delta.text:
                print(delta.text, end="", flush=True)

        # For final response
        if event.is_final_response():
            print()  # End line after response

    print("\n")  # Add space after complete response

# Run streaming interaction
async def main():
    queries = [\
        "What's the weather in New York?",\
        "How about London?",\
        "Thanks for your help!"\
    ]

    for query in queries:
        await stream_response(query)

# Run the async main function
asyncio.run(main())
```

This example:

1. Sets up a session and runner
2. Creates an async function that processes events as they arrive
3. Specifically looks for `content_part_delta` events, which contain incremental text updates
4. Prints each text segment as it arrives, creating a streaming effect

#### Bidirectional Streaming with Audio

ADK also supports bidirectional audio streaming for voice-based interactions:

Python

```
import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import sounddevice as sd
import numpy as np
import wave
import io

# Assume setup of session_service and runner as in previous example

async def audio_conversation():
    """Conducts a voice conversation with the agent."""
    # Audio recording parameters
    sample_rate = 16000
    recording_duration = 5  # seconds

    print("Press Enter to start recording your question...")
    input()

    # Record audio
    print("Recording... (5 seconds)")
    audio_data = sd.rec(
        int(recording_duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype='int16'
    )
    sd.wait()  # Wait for recording to complete
    print("Recording complete.")

    # Convert audio to WAV format in memory
    audio_bytes = io.BytesIO()
    with wave.open(audio_bytes, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data.tobytes())

    # Create audio content for the agent
    audio_part = types.Part.from_bytes(
        audio_bytes.getvalue(),
        mime_type="audio/wav"
    )
    content = types.Content(role='user', parts=[audio_part])

    print("Processing your question...")

    # Stream the response
    print("Agent response:")
    text_response = ""

    async for event in runner.run_async(
        user_id=USER_ID,
        session_id=SESSION_ID,
        new_message=content
    ):
        # Handle text streaming
        if hasattr(event, 'content_part_delta') and event.content_part_delta:
            delta = event.content_part_delta
            if delta.text:
                print(delta.text, end="", flush=True)
                text_response += delta.text

        # Handle final audio response
        if event.is_final_response() and event.content and event.content.parts:
            for part in event.content.parts:
                if part.mime_type and part.mime_type.startswith('audio/'):
                    # Play the audio response
                    audio_bytes = io.BytesIO(part.bytes_value)
                    with wave.open(audio_bytes, 'rb') as wf:
                        audio_data = np.frombuffer(
                            wf.readframes(wf.getnframes()),
                            dtype=np.int16
                        )
                        sd.play(audio_data, wf.getframerate())
                        sd.wait()

    print("\nConversation turn complete.")

# Run the audio conversation
asyncio.run(audio_conversation())
```

This more complex example:

1. Records audio from the user
2. Converts it to the appropriate format
3. Sends it to the agent
4. Streams the text response as it’s generated
5. Plays the audio response when available

### Common Multi-Agent Patterns and Use Cases

Beyond the basic patterns we’ve discussed, here are some advanced multi-agent patterns for specific use cases:

#### Critic-Generator Pattern

This pattern uses one agent to generate content and another to critique and improve it:

Python

```
from google.adk.agents import Agent, SequentialAgent

# Content generator
generator = Agent(
    name="content_generator",
    model="gemini-2.0-flash-exp",
    instruction="Create content based on the user's request. Focus on being creative and comprehensive.",
    output_key="generated_content"
)

# Critic agent
critic = Agent(
    name="content_critic",
    model="gemini-2.0-flash-exp",
    instruction="""
    Review the content in state["generated_content"].

    Analyze it for:
    1. Accuracy and factual correctness
    2. Clarity and readability
    3. Comprehensiveness
    4. Potential biases or issues

    Provide specific suggestions for improvement.
    """,
    output_key="critique"
)

# Refiner agent
refiner = Agent(
    name="content_refiner",
    model="gemini-2.0-flash-exp",
    instruction="""
    Refine the content in state["generated_content"] based on the critique in state["critique"].

    Maintain the original style and voice while addressing the specific issues highlighted in the critique.
    Create a polished final version that incorporates the improvements.
    """,
)

# Chain them together
critique_workflow = SequentialAgent(
    name="critique_workflow",
    sub_agents=[generator, critic, refiner]
)
```

This pattern is useful for:

- Content creation with quality control
- Code generation with review
- Document drafting with editorial review

#### Research and Synthesis Pattern

This pattern divides research into parallel information gathering followed by synthesis:

Python

```
from google.adk.agents import Agent, ParallelAgent, SequentialAgent

# Topic research agent
def research_topic(topic: str, tool_context: ToolContext) -> dict:
    """Researches a specific aspect of the main topic."""
    # ... research implementation ...
    tool_context.state[f"research_{topic}"] = research_results
    return {"status": "success", "research": research_results}

# Create specialized research agents
economic_researcher = Agent(
    name="economic_researcher",
    model="gemini-2.0-flash-exp",
    instruction="Research the economic aspects of the topic. Store findings in state.",
    tools=[research_topic],
)

environmental_researcher = Agent(
    name="environmental_researcher",
    model="gemini-2.0-flash-exp",
    instruction="Research the environmental aspects of the topic. Store findings in state.",
    tools=[research_topic],
)

social_researcher = Agent(
    name="social_researcher",
    model="gemini-2.0-flash-exp",
    instruction="Research the social aspects of the topic. Store findings in state.",
    tools=[research_topic],
)

# Synthesis agent
synthesizer = Agent(
    name="research_synthesizer",
    model="gemini-2.0-flash-exp",
    instruction="""
    Synthesize research findings from all researchers.
    Look for information in these state keys:
    - state["research_economic"]
    - state["research_environmental"]
    - state["research_social"]

    Identify connections, conflicts, and gaps between different perspectives.
    Create a comprehensive synthesis that presents a balanced view.
    """,
)

# Research workflow
research_framework = SequentialAgent(
    name="research_framework",
    sub_agents=[\
        ParallelAgent(\
            name="parallel_researchers",\
            sub_agents=[economic_researcher, environmental_researcher, social_researcher]\
        ),\
        synthesizer\
    ]
)
```

This pattern is ideal for:

- Comprehensive research on complex topics
- Multi-perspective analysis
- Gathering diverse information efficiently

#### Debate and Deliberation Pattern

This pattern creates a structured debate between agents with different perspectives:

Python

```
from google.adk.agents import Agent, SequentialAgent

# Pose the question
question_agent = Agent(
    name="question_poser",
    model="gemini-2.0-flash-exp",
    instruction="Clarify the user's question into a clear, debatable proposition.",
    output_key="debate_question"
)

# Position A advocate
position_a = Agent(
    name="position_a_advocate",
    model="gemini-2.0-flash-exp",
    instruction="""
    Present the strongest case FOR the proposition in state["debate_question"].
    Use logical arguments, evidence, and address potential counterarguments.
    """,
    output_key="position_a_arguments"
)

# Position B advocate
position_b = Agent(
    name="position_b_advocate",
    model="gemini-2.0-flash-exp",
    instruction="""
    Present the strongest case AGAINST the proposition in state["debate_question"].
    Use logical arguments, evidence, and address potential counterarguments.
    """,
    output_key="position_b_arguments"
)

# Rebuttal rounds
rebuttal_a = Agent(
    name="position_a_rebuttal",
    model="gemini-2.0-flash-exp",
    instruction="""
    Respond to the arguments against your position in state["position_b_arguments"].
    Strengthen your original arguments and address specific points raised.
    """,
    output_key="rebuttal_a"
)

rebuttal_b = Agent(
    name="position_b_rebuttal",
    model="gemini-2.0-flash-exp",
    instruction="""
    Respond to the arguments against your position in state["position_a_arguments"].
    Strengthen your original arguments and address specific points raised.
    """,
    output_key="rebuttal_b"
)

# Synthesis and judgment
judge = Agent(
    name="debate_judge",
    model="gemini-2.0-flash-exp",
    instruction="""
    Evaluate the debate on the proposition in state["debate_question"].
    Consider:
    - Initial arguments: state["position_a_arguments"] and state["position_b_arguments"]
    - Rebuttals: state["rebuttal_a"] and state["rebuttal_b"]

    Summarize the strongest points on both sides.
    Identify areas of agreement and disagreement.
    Suggest a balanced conclusion that acknowledges the complexity of the issue.
    """,
)

# Debate workflow
debate_framework = SequentialAgent(
    name="debate_framework",
    sub_agents=[\
        question_agent,\
        position_a,\
        position_b,\
        rebuttal_a,\
        rebuttal_b,\
        judge\
    ]
)
```

This pattern is useful for:

- Exploring complex ethical questions
- Evaluating policy proposals
- Understanding multiple sides of contentious issues

## 5-Day Agent Challenge

**In just 5 days, I'll show you how to design, build, and launch your first functional agent.**

Send me the series

We respect your privacy. Unsubscribe at any time.

## Putting It All Together

I’ve covered various agent architectures and patterns throughout this guide, and code samples for implementing advanced features. Let’s combine it all together into real-world agents (no more weather agents from here on).

### Customer Support Agent

This customer service agent system handles inquiries about products, orders, billing, and technical support. The system maintains continuity across conversations, escalates complex issues, and provides personalized responses. We’ll showcase advanced features like:

- Persistent session storage with MongoDB
- Integration with external systems (CRM, ticketing)
- Personalization through state and callbacks
- Escalation paths to human agents Specialized agents for different support domains

#### Architecture Diagram

Plaintext

```
Customer Service System (ADK)
├── Root Coordinator Agent
│   ├── Greeting & Routing Agent
│   ├── Product Information Agent
│   │   └── Tools: product_catalog_lookup, get_specifications
│   ├── Order Status Agent
│   │   └── Tools: order_lookup, track_shipment
│   ├── Billing Agent
│   │   └── Tools: get_invoice, update_payment_method
│   ├── Technical Support Agent
│   │   └── Tools: troubleshoot_issue, create_ticket
│   └── Human Escalation Agent
│       └── Tools: create_escalation_ticket, notify_supervisor
└── Services
    ├── Persistent Storage Session Service (MongoDB)
    ├── Customer Data Service (CRM Integration)
    ├── Ticket Management Integration
    └── Analytics & Reporting Service
```

**Session Management with Custom Storage**

Python

```
from google.adk.sessions import InMemorySessionService, Session
import pymongo
from typing import Optional, Dict, Any

class MongoSessionService(InMemorySessionService):
    """Session service that uses MongoDB for persistent storage."""

    def __init__(self, connection_string, database="customer_service", collection="sessions"):
        """Initialize with MongoDB connection details."""
        self.client = pymongo.MongoClient(connection_string)
        self.db = self.client[database]
        self.collection = self.db[collection]

    def create_session(
        self, app_name: str, user_id: str, session_id: str, state: Optional[Dict[str, Any]] = None
    ) -> Session:
        """Create a new session or get existing session."""
        # Look for existing session
        session_doc = self.collection.find_one({
            "app_name": app_name,
            "user_id": user_id,
            "session_id": session_id
        })

        if session_doc:
            # Convert MongoDB document to Session object
            return Session(
                app_name=session_doc["app_name"],
                user_id=session_doc["user_id"],
                session_id=session_doc["session_id"],
                state=session_doc.get("state", {}),
                last_update_time=session_doc.get("last_update_time", 0)
            )

        # Create new session
        session = Session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state=state or {}
        )
        self._save_session(session)
        return session

    # Additional methods implementation...
```

**CRM Integration**

Python

```
def get_customer_info(customer_id: str, tool_context: ToolContext) -> dict:
    """Retrieves customer information from the CRM system.

    Args:
        customer_id: The unique identifier for the customer.
        tool_context: Provides access to session state.

    Returns:
        dict: Customer information and interaction history.
    """
    # In production, this would make an API call to the CRM system
    # Mock implementation for demonstration
    customers = {
        "C12345": {
            "name": "Emma Johnson",
            "email": "emma.j@example.com",
            "tier": "premium",
            "since": "2021-03-15",
            "recent_purchases": ["Laptop X1", "External Monitor"],
            "support_history": [\
                {"date": "2023-01-15", "issue": "Billing question", "resolved": True},\
                {"date": "2023-03-22", "issue": "Technical support", "resolved": True}\
            ]
        },
        # Additional customers...
    }

    if customer_id in customers:
        # Store in session state for other agents to access
        tool_context.state["customer_info"] = customers[customer_id]
        return {"status": "success", "customer": customers[customer_id]}
    else:
        return {"status": "error", "error_message": f"Customer ID {customer_id} not found"}
```

**Issue Escalation System**

Python

```
def escalate_to_human(
    issue_summary: str,
    priority: str,
    customer_id: str,
    tool_context: ToolContext
) -> dict:
    """Escalates an issue to a human customer service representative.

    Args:
        issue_summary: Brief description of the issue.
        priority: Urgency level ("low", "medium", "high", "urgent").
        customer_id: The customer's ID.
        tool_context: Provides access to session state.

    Returns:
        dict: Escalation ticket information.
    """
    valid_priorities = ["low", "medium", "high", "urgent"]
    if priority.lower() not in valid_priorities:
        return {
            "status": "error",
            "error_message": f"Invalid priority. Must be one of: {', '.join(valid_priorities)}"
        }

    # Get customer info if available
    customer_info = tool_context.state.get("customer_info", {})
    customer_name = customer_info.get("name", "Unknown Customer")
    customer_tier = customer_info.get("tier", "standard")

    # Calculate SLA based on priority and customer tier
    sla_hours = {
        "low": {"standard": 48, "premium": 24},
        "medium": {"standard": 24, "premium": 12},
        "high": {"standard": 8, "premium": 4},
        "urgent": {"standard": 4, "premium": 1}
    }
    response_time = sla_hours[priority.lower()][customer_tier]

    # Generate ticket ID
    import time
    import hashlib
    ticket_id = hashlib.md5(f"{customer_id}:{time.time()}".encode()).hexdigest()[:8].upper()

    # Store ticket in state
    ticket_info = {
        "ticket_id": ticket_id,
        "customer_id": customer_id,
        "customer_name": customer_name,
        "issue_summary": issue_summary,
        "priority": priority.lower(),
        "status": "open",
        "created_at": time.time(),
        "sla_hours": response_time
    }

    # In production, this would make an API call to the ticket system
    # For demo, just store in state
    tickets = tool_context.state.get("app:escalation_tickets", {})
    tickets[ticket_id] = ticket_info
    tool_context.state["app:escalation_tickets"] = tickets

    # Signal that control should be transferred to the human agent
    tool_context.actions.transfer_to_agent = "human_support_agent"

    return {
        "status": "success",
        "ticket": ticket_info,
        "message": f"Issue escalated. Ticket ID: {ticket_id}. A representative will respond within {response_time} hours."
    }
```

**Tech Support Agent with Memory**

Python

```
# Technical Support Agent
tech_support_agent = Agent(
    name="technical_support_agent",
    model="gemini-2.0-flash-exp",
    description="Handles technical support inquiries and troubleshooting.",
    instruction="""
    You are a technical support specialist for our electronics company.

    FIRST, check if the user has a support history in state["customer_info"]["support_history"].
    If they do, reference this history in your responses.

    For technical issues:
    1. Use the troubleshoot_issue tool to analyze the problem.
    2. Guide the user through basic troubleshooting steps.
    3. If the issue persists, use create_ticket to log the issue.

    For complex issues beyond basic troubleshooting:
    1. Use escalate_to_human to transfer to a human specialist.

    Maintain a professional but empathetic tone. Acknowledge the frustration
    technical issues can cause, while providing clear steps toward resolution.
    """,
    tools=[troubleshoot_issue, create_ticket, escalate_to_human]
)
```

**Personalization Callback**

Python

```
def personalization_callback(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """
    Adds personalization information to the LLM request.

    Args:
        callback_context: Context for the callback
        llm_request: The request being sent to the LLM

    Returns:
        None to continue with the modified request
    """
    # Get customer info from state
    customer_info = callback_context.state.get("customer_info")

    if customer_info:
        # Create a personalization header to add to the request
        customer_name = customer_info.get("name", "valued customer")
        customer_tier = customer_info.get("tier", "standard")
        recent_purchases = customer_info.get("recent_purchases", [])

        personalization_note = (
            f"\nIMPORTANT PERSONALIZATION:\n"
            f"Customer Name: {customer_name}\n"
            f"Customer Tier: {customer_tier}\n"
        )

        if recent_purchases:
            personalization_note += f"Recent Purchases: {', '.join(recent_purchases)}\n"

        # Add personalization to the LLM request
        if llm_request.contents:
            # Add as a system message before the first content
            system_content = types.Content(
                role="system",
                parts=[types.Part(text=personalization_note)]
            )
            llm_request.contents.insert(0, system_content)

    # Return None to continue with the modified request
    return None
```

### Code Generation and Debugging Agent

Finally, let’s explore a Code Generation and Debugging Agent built with ADK.

**Code Generation Agent with Test-Driven Development**

Let’s start with a sequential agent that first analyzes requirements, creates test cases, and then write code and evaluates it.

Python

```
from google.adk.agents import Agent, SequentialAgent
from google.adk.tools.tool_context import ToolContext

# Code Generator with TDD approach
code_generator = SequentialAgent(
    name="tdd_code_generator",
    sub_agents=[\
        Agent(\
            name="requirement_analyzer",\
            model="gemini-2.0-flash-exp",\
            instruction="""\
            Analyze the coding requirements and break them down into:\
            1. Functional requirements\
            2. Edge cases to consider\
            3. Needed data structures and algorithms\
\
            Be specific and comprehensive in your analysis.\
            """,\
            output_key="requirements_analysis"\
        ),\
        Agent(\
            name="test_writer",\
            model="gemini-2.0-flash-exp",\
            instruction="""\
            Based on the requirements analysis in state["requirements_analysis"],\
            write comprehensive test cases that cover:\
\
            1. The main functionality\
            2. All identified edge cases\
            3. Error handling\
\
            Use a testing framework appropriate for the language\
            (e.g., pytest for Python, Jest for JavaScript).\
            """,\
            tools=[write_test_code],\
            output_key="test_code"\
        ),\
        Agent(\
            name="code_implementer",\
            model="gemini-2.0-flash-exp",\
            instruction="""\
            Implement code that passes all the test cases in state["test_code"].\
\
            Your implementation should:\
            1. Be efficient and follow best practices\
            2. Include clear comments\
            3. Handle all edge cases identified in the requirements\
\
            After writing the code, evaluate it against potential issues.\
            """,\
            tools=[generate_implementation, execute_code],\
            output_key="implementation"\
        ),\
        Agent(\
            name="code_reviewer",\
            model="gemini-2.0-flash-exp",\
            instruction="""\
            Review the implementation in state["implementation"] for:\
\
            1. Correctness - Does it meet the requirements?\
            2. Efficiency - Is it optimized?\
            3. Readability - Is it well-structured and commented?\
            4. Error handling - Does it handle edge cases?\
            5. Security issues - Are there potential vulnerabilities?\
            6. Test coverage - Are all scenarios tested?\
\
            Provide specific improvement suggestions if needed.\
            """,\
            tools=[review_code, execute_code],\
            output_key="code_review"\
        )\
    ]
)
```

**Code Execution and Debugging Tools**

Here we’ll create a tool to execute code and debug it.

Python

```
def execute_code(code: str, language: str, inputs: str = None, tool_context: ToolContext) -> dict:
    """
    Executes code in a specified language and returns the result.

    Args:
        code: The code to execute.
        language: The programming language (python, javascript, etc.).
        inputs: Optional input data for the code.
        tool_context: Provides access to session state.

    Returns:
        dict: Execution results, output, and any errors.
    """
    import subprocess
    import tempfile
    import os
    import time

    # Record execution start time
    start_time = time.time()

    # Set up temp file for code
    with tempfile.NamedTemporaryFile(suffix=f".{language}", delete=False) as temp_file:
        temp_file_path = temp_file.name

        # Write code to temp file
        if language == "python":
            temp_file.write(code.encode('utf-8'))
        elif language == "javascript":
            temp_file.write(code.encode('utf-8'))
        else:
            return {
                "status": "error",
                "error_message": f"Unsupported language: {language}"
            }

    try:
        # Set up execution command
        if language == "python":
            cmd = ["python", temp_file_path]
        elif language == "javascript":
            cmd = ["node", temp_file_path]

        # Execute with input if provided
        if inputs:
            process = subprocess.run(
                cmd,
                input=inputs.encode('utf-8'),
                capture_output=True,
                timeout=10  # Timeout after 10 seconds
            )
        else:
            process = subprocess.run(
                cmd,
                capture_output=True,
                timeout=10  # Timeout after 10 seconds
            )

        # Calculate execution time
        execution_time = time.time() - start_time

        # Process result
        stdout = process.stdout.decode('utf-8')
        stderr = process.stderr.decode('utf-8')

        if process.returncode == 0:
            result = {
                "status": "success",
                "output": stdout,
                "execution_time": execution_time,
                "language": language
            }
        else:
            result = {
                "status": "error",
                "error_message": stderr,
                "output": stdout,
                "return_code": process.returncode,
                "execution_time": execution_time,
                "language": language
            }
    except subprocess.TimeoutExpired:
        result = {
            "status": "error",
            "error_message": "Execution timed out after 10 seconds",
            "language": language
        }
    except Exception as e:
        result = {
            "status": "error",
            "error_message": str(e),
            "language": language
        }
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_file_path)
        except:
            pass

    # Store execution history in state
    execution_history = tool_context.state.get("code_execution_history", [])
    execution_record = {
        "timestamp": time.time(),
        "language": language,
        "status": result["status"],
        "execution_time": result.get("execution_time", -1)
    }
    execution_history.append(execution_record)
    tool_context.state["code_execution_history"] = execution_history

    return result

def debug_code(code: str, error_message: str, language: str, tool_context: ToolContext) -> dict:
    """
    Analyzes code and error messages to identify and fix bugs.

    Args:
        code: The code to debug.
        error_message: The error message produced when executing the code.
        language: The programming language.
        tool_context: Provides access to session state.

    Returns:
        dict: Analysis of the problem and corrected code.
    """
    # Parse the error message
    error_analysis = "Unknown error"
    error_line = -1

    if language == "python":
        # Parse Python error message
        import re

        # Look for line number in error
        line_match = re.search(r"line (\d+)", error_message)
        if line_match:
            error_line = int(line_match.group(1))

        # Common Python errors
        if "SyntaxError" in error_message:
            error_analysis = "Syntax Error: Check for missing parentheses, quotes, or colons."
        elif "NameError" in error_message:
            error_analysis = "Name Error: A variable or function name is not defined."
        elif "TypeError" in error_message:
            error_analysis = "Type Error: An operation is applied to an object of inappropriate type."
        elif "IndexError" in error_message:
            error_analysis = "Index Error: A sequence subscript is out of range."
        elif "KeyError" in error_message:
            error_analysis = "Key Error: A dictionary key is not found."
        elif "ValueError" in error_message:
            error_analysis = "Value Error: An operation or function receives an argument with the correct type but inappropriate value."

    elif language == "javascript":
        # Parse JavaScript error message
        import re

        # Look for line number in error
        line_match = re.search(r"at .*:(\d+)", error_message)
        if line_match:
            error_line = int(line_match.group(1))

        # Common JavaScript errors
        if "SyntaxError" in error_message:
            error_analysis = "Syntax Error: Check for missing brackets, parentheses, or semicolons."
        elif "ReferenceError" in error_message:
            error_analysis = "Reference Error: A variable is not defined."
        elif "TypeError" in error_message:
            error_analysis = "Type Error: An operation could not be performed, typically due to type mismatch."
        elif "RangeError" in error_message:
            error_analysis = "Range Error: A number is outside the allowable range."

    # Analyze code structure
    code_lines = code.split('\n')

    # Get problematic line and context if available
    problematic_line = code_lines[error_line - 1] if 0 < error_line <= len(code_lines) else "Unknown"

    # Context (lines before and after)
    context_start = max(0, error_line - 3)
    context_end = min(len(code_lines), error_line + 2)
    context = code_lines[context_start:context_end]

    # Store debugging session in state
    debug_history = tool_context.state.get("debug_history", [])
    debug_session = {
        "timestamp": time.time(),
        "language": language,
        "error_line": error_line,
        "error_message": error_message,
        "error_analysis": error_analysis
    }
    debug_history.append(debug_session)
    tool_context.state["debug_history"] = debug_history

    # For advanced debugging, we'd implement auto-correction, but here we'll just return analysis
    return {
        "status": "success",
        "error_analysis": error_analysis,
        "error_line": error_line,
        "problematic_line": problematic_line,
        "context": context,
        "suggestions": [\
            "Check for syntax errors at the identified line",\
            "Verify all variable names are correctly spelled",\
            "Ensure proper type handling for all operations"\
        ]
    }
```

**Code Explanation and Documentation**

These tools are for explaining the generated code and documentation.

Python

```
def explain_code(code: str, language: str, complexity_level: str = "intermediate", tool_context: ToolContext) -> dict:
    """
    Generates an explanation of code with adjustable complexity level.

    Args:
        code: The code to explain.
        language: The programming language.
        complexity_level: The complexity level of the explanation (beginner, intermediate, advanced).
        tool_context: Provides access to session state.

    Returns:
        dict: Explanation of the code at the requested level.
    """
    # Parse the code structure
    import ast

    explanation_sections = []

    # Get user's programming experience from state if available
    user_experience = tool_context.state.get("user:programming_experience", "intermediate")

    # Adjust complexity based on user experience if not explicitly provided
    if complexity_level == "auto" and user_experience:
        complexity_level = user_experience

    # Handle Python code
    if language == "python":
        try:
            # Parse the code
            parsed = ast.parse(code)

            # High-level summary
            explanation_sections.append({
                "section": "Overview",
                "content": f"This Python code consists of {len(parsed.body)} top-level statements."
            })

            # Function analysis
            functions = [node for node in parsed.body if isinstance(node, ast.FunctionDef)]
            if functions:
                func_section = {
                    "section": "Functions",
                    "content": f"The code defines {len(functions)} function(s):",
                    "items": []
                }

                for func in functions:
                    # Basic function info
                    func_info = f"`{func.name}()`"

                    # Add parameter info for intermediate/advanced
                    if complexity_level != "beginner":
                        params = []
                        for arg in func.args.args:
                            params.append(arg.arg)
                        func_info += f": Takes parameters ({', '.join(params)})"

                    # Add docstring if exists
                    docstring = ast.get_docstring(func)
                    if docstring and complexity_level != "beginner":
                        func_info += f"\n  - Purpose: {docstring.split('.')[0]}"

                    func_section["items"].append(func_info)

                explanation_sections.append(func_section)

            # Class analysis for intermediate/advanced
            if complexity_level != "beginner":
                classes = [node for node in parsed.body if isinstance(node, ast.ClassDef)]
                if classes:
                    class_section = {
                        "section": "Classes",
                        "content": f"The code defines {len(classes)} class(es):",
                        "items": []
                    }

                    for cls in classes:
                        # Basic class info
                        class_info = f"`{cls.name}`"

                        # Add inheritance info for advanced
                        if complexity_level == "advanced" and cls.bases:
                            base_names = []
                            for base in cls.bases:
                                if isinstance(base, ast.Name):
                                    base_names.append(base.id)
                            if base_names:
                                class_info += f": Inherits from ({', '.join(base_names)})"

                        # Add methods info
                        methods = [node for node in cls.body if isinstance(node, ast.FunctionDef)]
                        if methods:
                            method_names = [method.name for method in methods]
                            class_info += f"\n  - Methods: {', '.join(method_names)}"

                        class_section["items"].append(class_info)

                    explanation_sections.append(class_section)

            # Imports analysis
            imports = [node for node in parsed.body if isinstance(node, (ast.Import, ast.ImportFrom))]
            if imports and complexity_level != "beginner":
                import_section = {
                    "section": "Imports",
                    "content": f"The code imports {len(imports)} module(s):",
                    "items": []
                }

                for imp in imports:
                    if isinstance(imp, ast.Import):
                        for name in imp.names:
                            import_section["items"].append(f"`{name.name}`")
                    elif isinstance(imp, ast.ImportFrom):
                        for name in imp.names:
                            import_section["items"].append(f"`{name.name}` from `{imp.module}`")

                explanation_sections.append(import_section)

            # Algorithm explanation
            algorithm_section = {
                "section": "Algorithm Explanation",
                "content": "The code works as follows:"
            }

            # Simplify explanation for beginners
            if complexity_level == "beginner":
                algorithm_section["content"] += "\n\nThis program goes through these steps:\n"
                # Simplified steps would be generated here

            # More detailed for intermediate
            elif complexity_level == "intermediate":
                algorithm_section["content"] += "\n\nThe main workflow of this code is:\n"
                # More detailed steps would be generated here

            # Technical details for advanced
            else:
                algorithm_section["content"] += "\n\nThe technical implementation follows these steps:\n"
                # Detailed technical steps would be generated here

            explanation_sections.append(algorithm_section)

        except SyntaxError:
            explanation_sections.append({
                "section": "Syntax Error",
                "content": "The provided Python code contains syntax errors and could not be parsed."
            })

    # Format the final explanation
    formatted_explanation = []

    for section in explanation_sections:
        formatted_explanation.append(f"## {section['section']}")
        formatted_explanation.append(section['content'])

        if "items" in section:
            for item in section["items"]:
                formatted_explanation.append(f"- {item}")

        formatted_explanation.append("")  # Add blank line

    # Join sections with newlines
    explanation = "\n".join(formatted_explanation)

    return {
        "status": "success",
        "language": language,
        "complexity_level": complexity_level,
        "explanation": explanation,
        "sections": len(explanation_sections)
    }
```

And that’s our agent!

## Next Steps

That was a lot to take in. You should probably bookmark this post and work through the concepts and examples over time.

I suggest building the basic weather agent that I covered at the top. It’s boring and no one needs another weather agent but it does get you familiar with how the Agent Development Kit works and its features.

Once you’re comfortable with that, start working through the advanced patterns, and finally build one of the multi-agent systems like the customer support or coding agents. You should also try to extend these agents by implementing your own tools and features. Try deploying it and using it in a real-world situation.

If you need help, [contact me](https://www.siddharthbharath.com/services/)!

## Get The ADK Quickstart Repo

Grab the ready-to-run repo with the weather-time agent scaffold, pre-wired CLI scripts, `.env` sample, and Makefile

Subscribe

We won't send you spam. Unsubscribe at any time.

## More posts

- ### [The Make.com Automation Guide for GTM and Operations](https://www.siddharthbharath.com/ai-automations-make-com/)



[June 9, 2025](https://www.siddharthbharath.com/ai-automations-make-com/)

- ### [Coding with Cursor: a Beginner’s Guide](https://www.siddharthbharath.com/coding-with-cursor-beginners-guide/)



[June 3, 2025](https://www.siddharthbharath.com/coding-with-cursor-beginners-guide/)

- ### [The Executive’s Guide to Agentic AI](https://www.siddharthbharath.com/executive-guide-agentic-ai/)



[June 2, 2025](https://www.siddharthbharath.com/executive-guide-agentic-ai/)

- ### [The Executive’s Guide to Upskilling Your Workforce for AI](https://www.siddharthbharath.com/upskilling-workforce-ai/)



[May 21, 2025](https://www.siddharthbharath.com/upskilling-workforce-ai/)