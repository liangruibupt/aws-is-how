import time
from playwright.sync_api import sync_playwright, Playwright, BrowserType
from bedrock_agentcore.tools.browser_client import browser_session
from rich.console import Console
console = Console()
region="us-west-2"
def run(playwright: Playwright):
 # Create the browser session and keep it alive
    with browser_session('us-west-2') as client:
        ws_url, headers = client.generate_ws_headers() 
        chromium: BrowserType = playwright.chromium
        browser = chromium.connect_over_cdp(
        ws_url,
        headers=headers
        )
        context = browser.contexts[0]
        page = context.pages[0]
        try:
            page.goto("https://amazon.com/")
            console.print("Page title:",page.title())
            page.screenshot(path="screenshot.png")
            console.print("screenshot.png saved successfully.")
            # Keep running
            console.print("Please ctrl-c to exit")
            while True:
                time.sleep(120)
        except KeyboardInterrupt:
            console.print("\n\n[yellow]Shutting down...[/yellow]")
            if 'client' in locals():
                client.stop()
                console.print("# Browser session terminated")
        except Exception as e:
            console.print(f"\n[red]Error: {e}[/red]")
            import traceback
            traceback.print_exc()


with sync_playwright() as playwright:
 run(playwright)
 
 
 
from bedrock_agentcore.tools.browser_client import BrowserClient
from browser_use import Agent
from browser_use.browser.session import BrowserSession
from browser_use.browser import BrowserProfile
from langchain_aws import ChatBedrockConverse
from rich.console import Console
from contextlib import suppress
import asyncio
console = Console()
from boto3.session import Session
boto_session = Session()
region = boto_session.region_name
client = BrowserClient(region)
client.start()
# Extract ws_url and headers
ws_url, headers = client.generate_ws_headers()
async def run_browser_task(browser_session: BrowserSession, bedrock_chat: ChatBedrockConverse, task: str) -> None:
    """
    Run a browser automation task using browser_use

    Args:
        browser_session: Existing browser session to reuse
        bedrock_chat: Bedrock chat model instance
        task: Natural language task for the agent
    """
    try:
        # Show task execution
        console.print(f"\n[bold blue]🤖 Executing task:[/bold blue] {task}")

        # Create and run the agent
        agent = Agent(
            task=task,
            llm=bedrock_chat,
            browser_session=browser_session
        )

        # Run with progress indicator
        with console.status("[bold green]Running browser automation...[/bold green]", spinner="dots"):
            await agent.run()

        console.print("[bold green]✅ Task completed successfully![/bold green]")

    except Exception as e:
        console.print(f"[bold red]❌ Error during task execution:[/bold red] {str(e)}")
        import traceback
        if console.is_terminal:
            traceback.print_exc()
async def main():
    """
    Main async function to run browser automation tasks
    """
    # Create persistent browser session and model
    browser_session = None
    bedrock_chat = None
    try:
        # Create browser profile with headers
        browser_profile = BrowserProfile(
            headers=headers,
            timeout=1500000,  # 150 seconds timeout
        )
        # Create a browser session with CDP URL and keep_alive=True for persistence
        browser_session = BrowserSession(
            cdp_url=ws_url,
            browser_profile=browser_profile,
            keep_alive=True  # Keep browser alive between tasks
        )
        # Initialize the browser session
        console.print("[cyan]🔄 Initializing browser session...[/cyan]")
        await browser_session.start()
        # Create ChatBedrockConverse once
        bedrock_chat = ChatBedrockConverse(
            #model_id="anthropic.claude-3-5-sonnet-20240620-v1:0",
            model_id="us.anthropic.claude-3-7-sonnet-20250219-v1:0",
            region_name="us-west-2"
        )
        console.print("[green]✅ Browser session initialized and ready for tasks[/green]\n")
        # Define your task here - modify as needed
        task = "Search for a coffee maker on amazon.com and extract details of the first one"
        # Execute the browser task
        await run_browser_task(browser_session, bedrock_chat, task)
    finally:
        # Close the browser session
        if browser_session:
            console.print("\n[yellow]🔌 Closing browser session...[/yellow]")
            with suppress(Exception):
                await browser_session.close()
            console.print("[green]✅ Browser session closed[/green]")
if __name__ == "__main__":
    try:
        # Run the async main function
        asyncio.run(main())
    finally:
        # Stop the browser client
        client.stop()
        print("Browser session stopped successfully!")