from openai import OpenAI

# Configuration (better to use environment variables)
# Set OpenAI's API key and API base to use vLLM's API server.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "EMPTY")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "http://localhost:8000/v1")

def initialize_client() -> OpenAI:
    """Initialize and return the OpenAI client."""
    return OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_API_BASE,
    )

def process_response(chat_response, is_answering):
    reasoning_content = ""
    content = ""

    print("\n" + "=" * 20 + "reasoning content" + "=" * 20 + "\n")
    for chunk in chat_response:
    # If chunk.choices is empty, print usage
        if not chunk.choices:
            print("\nUsage:")
            print(chunk.usage)
        else:
            delta = chunk.choices[0].delta
        # Print reasoning content
            if hasattr(delta, 'reasoning_content') and delta.reasoning_content is not None:
                print(delta.reasoning_content, end='', flush=True)
                reasoning_content += delta.reasoning_content
            else:
                if delta.content != "" and is_answering is False:
                    print("\n" + "=" * 20 + "content" + "=" * 20 + "\n")
                    is_answering = True
            # Print content
                print(delta.content, end='', flush=True)
                content += delta.content


def make_chat_request(client, model, messages, 
                     stream: bool = False, temperature: float = 0.7, top_p: float = 1.0):
    try:
        return client.chat.completions.create(
            model=model,
            messages=messages,
            stream=stream,
            temperature=temperature,
            top_p=top_p
        )
    except Exception as e:
        print(f"Error making API request: {e}")
        return None

def main():
    client = initialize_client()

    # Example 1: Simple joke request

    chat_response = make_chat_request(
        client,
        model="Qwen/Qwen2.5-1.5B-Instruct",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Tell me a joke."},
        ]
    )
    print("Chat response:", chat_response)

    # Example 2: World series question
    chat_response = make_chat_request(
        client,
        model="Qwen/Qwen2.5-1.5B-Instruct",
        messages=[
            {"role": "user", "content": "Who won the world series in 2020?"},
        ]
    )
    print("Chat response:", chat_response)

    # Example 3: Streaming comparison question
    is_answering = False

    chat_response = make_chat_request(
        client,
        model="Qwen/QwQ-32B",
        messages=[
            {"role": "user", "content": "Which is larger, 9.9 or 9.11?"}
        ],
        temperature=0.6,
        top_p=0.95,
        stream=True
    )
    if chat_response:
        process_response(chat_response, is_answering)

    # Example 4: Streaming complex game creation

    chat_response = make_chat_request(
        client,
        model="Qwen/QwQ-32B",
        temperature=0.6,
        top_p=0.95,
        stream=True,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Create a Flappy Bird game in Python. You must include these things:\n 1. You must pygame.\n 2. The background color should be randomly chosen and is a light shade. Start with a light blue color.\nPressing SPACE multiple times will accelerate the bird.\n 4. The bird's shape should be randomly chosen as a squacircle or triangle. The color should be randomly chosen as a dark color.\n 5. Place on the bottom some land coloreddark brown or yellow chosen randomly.\n 6. Make a score shown on the top right side. Increment if you pass pipes and dohit them.\n 7. Make randomly spaced pipes with enough space. Color them randomly as dark green or light brown or a dgray shade.\n 8. When you lose, show the best score. Make the text inside the screen. Pressing q or Esc will quit game. Restarting is pressing SPACE again.\n The final game should be inside a markdown section in Python. Check your cfor errors and fix them before the final markdown section."}
        ]
    )
    if chat_response:
        process_response(chat_response, is_answering)

if __name__ == "__main__":
    main()