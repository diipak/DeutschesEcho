from google import genai

client = genai.Client()

for model in client.models.list():
    if "bidiGenerateContent" in model.supported_methods:
        print(model.name)
