import json
import os
from typing import Literal, Optional
from uuid import uuid4
from fastapi import FastAPI, HTTPException
import random
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from mangum import Mangum
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
load_dotenv('.env')


def complete_prompt_with_context(prompt,template):
  with open(template, 'r') as f:
    prompt_text=f.read() 
  complete_prompt= prompt_text.replace('{context}',prompt)
  return complete_prompt


class Prompt(BaseModel):
    message: str
    prompt_id: Optional[str] = uuid4().hex


app = FastAPI()
handler = Mangum(app)


@app.get("/")
async def root():
    return {"message": "Welcome to Flow.AI's prompt to object parser API"}

@app.post("/get-objects")
async def parse_message(prompt: Prompt):
    prompt.prompt_id = uuid4().hex
    try:
        llm = OpenAI(openai_api_key=os.getenv('OPENAI_API_KEY'), max_tokens = 2056)
    except:
        print('unable to authenticate with openai')
    prompt2=llm.predict(complete_prompt_with_context(prompt.message,'prompt_template_1.txt'))
    response=llm.predict(complete_prompt_with_context(prompt2,'prompt_template_2.txt'))

    return {"response":response}
