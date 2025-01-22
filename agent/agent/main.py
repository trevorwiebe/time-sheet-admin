import os
import instructor
import openai

from rich.console import Console
from rich.text import Text

from atomic_agents.agents.base_agent import BaseAgent, BaseAgentConfig, BaseAgentInputSchema, BaseAgentOutputSchema
from atomic_agents.lib.components.system_prompt_generator import SystemPromptGenerator
from tools.code_base_provider import CodeBaseProvider
from tools.get_code_changes import CodeChangesProvider

console = Console()

API_KEY = os.getenv("API_KEY")
client = instructor.from_openai(openai.OpenAI(api_key=API_KEY))

agent = BaseAgent(
    config=BaseAgentConfig(
        client=client,
        model="gpt-4o-mini"
    )
)

commitMessageAgent = BaseAgent(
    config=BaseAgentConfig(
        client=client,
        model="gpt-4o-mini"
    )
)

initial_message = "Hello, how can I help you today?"
agent.memory.add_message("assistant", content=BaseAgentOutputSchema(chat_message=initial_message))

console.print(Text(f"Assistant:\n{initial_message}", style="bold green"))

def getCodeBase():
    folder_path = '/Users/trevorwiebe/Documents/WebApps/timesheet/build'
    ignore_path = '/Users/trevorwiebe/Documents/WebApps/timesheet/'
    processor = CodeBaseProvider(folder_path, ignore_path)
    processor.run()
    return processor.output

def getLastCodeChanges():
    folder_path = '/Users/trevorwiebe/Documents/WebApps/timesheet'
    changesProcessor = CodeChangesProvider(folder_path)
    changesProcessor.run()
    return changesProcessor.output

def mainPrompt(code_base):
    return SystemPromptGenerator(
        background=[
            "You are a helpful programming assistant that in knowledgable in html, css and javascript. Please review the codebase to determine best answer.",
            "Each each new file starts with //----------file-starts--------",
            "Then the file name like this //example.js or whatever the file is named",
            "Then each file ends with //-----------file-ends---------",
            "The codebase is in between triple back ticks."
            f"```{code_base}```"
        ],
        steps=[
            "Analyze the user's question and determine how to reply in a clear, succinct manner.",
            "Look at the provided code base and say which file should be updated.",
            "Make sure the response is no longer then necessary.",
        ],
        output_instructions=["Your output should human readable with no added formatting characters."]
    )

def commitMessageGenPrompt(changes):
    return SystemPromptGenerator(
        background=[
            "You are a helpful programming assistant that generates clear commit message explaining what has changes in the code by looking at the output from 'git diff'.",
            "The output from 'git diff' is between triple back ticks",
            f"```{changes}```"
        ],
        steps=[
            "Go through and look at which files have changes.",
            "Create short message about what has changes"
        ],
        output_instructions=["Your output should only contain letters, numbers and puctuation.  No additional formatting characters."]
    )

while True:
    user_input = console.input("You: ")

    if user_input == "gcc":
        # generate a commit message based on changes
        changes = getLastCodeChanges()
        commit_message_prompt = commitMessageGenPrompt(changes=changes)
        commitMessageAgent.system_prompt_generator = commit_message_prompt
        commitMessageResponse = commitMessageAgent.run(BaseAgentInputSchema(chat_message="Please create a commit messages for me based on the code changes."))
        console.print(Text(f"Commit Message Assistant:\n{commitMessageResponse.chat_message}", style="bold blue"))
    else:
        # get existing code base into a variable
        code_base = getCodeBase()
        system_prompt_generator_custom = mainPrompt(code_base=code_base)
        agent.system_prompt_generator = system_prompt_generator_custom

        response = agent.run(BaseAgentInputSchema(chat_message=user_input))
        console.print(Text(f"Assistant:\n{response.chat_message}", style="bold green"))