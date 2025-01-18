import os
import instructor
import openai

from rich.console import Console
from rich.text import Text

from atomic_agents.agents.base_agent import BaseAgent, BaseAgentConfig, BaseAgentInputSchema, BaseAgentOutputSchema
from atomic_agents.lib.components.system_prompt_generator import SystemPromptGenerator
from agent.agent.code_base_provider import CodeBaseProcessor

console = Console()

API_KEY = os.getenv("API_KEY")
client = instructor.from_openai(openai.OpenAI(api_key=API_KEY))

agent = BaseAgent(
    config=BaseAgentConfig(
        client=client,
        model="gpt-4o-mini",
    )
)

initial_message = "Hello, how can I help you today?"
agent.memory.add_message("assistant", content=BaseAgentOutputSchema(chat_message=initial_message))

console.print(Text(f"Assistant:\n{initial_message}", style="bold green"))

while True:
    user_input = console.input("You: ")

    folder_path = '/Users/trevorwiebe/Documents/WebApps/timesheet/build'
    processor = CodeBaseProcessor(folder_path)
    processor.run()
    code_base = processor.output

    system_prompt_generator_custom = SystemPromptGenerator(
        background=[
            "You are a helpful programming assistant that in knowledgable in html, css and javascript. Please review the codebase to determine best answer.",
            code_base
        ],
        steps=[
            "Analyze the user's question and determine how to reply in a clear, succinct manner.",
            "Look at the provided code base at say which file should be updated.",
            "Make sure the response is no longer then necessary.",
        ],
        output_instructions=["Your output should human readable with no added formatting characters."]
    )

    agent.system_prompt_generator = system_prompt_generator_custom

    response = agent.run(BaseAgentInputSchema(chat_message=user_input))
    console.print(Text(f"Assistant:\n{response.chat_message}", style="bold green"))