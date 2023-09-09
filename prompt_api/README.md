# Prompt API overview

Prompt API takes a written description of a crises situation within a JSON array and returns all key entities with their spacial location and relative sizes.  

Here's a basic descrition of the API set up.  For details on FastAPI go to FastAPI on github.

## Requirements
- AWS account  
 - openai API key


## main.py

Replace the OPENAI_API_KEY with your key.

## Deploying to AWS Lambda

Set up an AWS Lambda function using Python 9 or above. 

Note that FastAPI uses:

```python
from mangum import Mangum

app = FastAPI()
handler = Mangum(app)
```

Modify AWS Lambda's event handler to `main.handler` in the Lambda's runtime settings. main.py will be the name of script.

Install dependencies into a local directory so we can zip it up and upload it to Lambda.

```bash
pip install -t lib -r requirements.txt
```

We now need to zip it up.

```bash
(cd lib; zip ../lambda_function.zip -r .)
```

Now add our FastAPI file and the JSON file.

```bash
zip lambda_function.zip -u main.py prompt_template_1.txt prompt_template_2.txt .env
```

In the Lambda console upload the .zip file.
In the `configuration` tab, select `function url`. Select `NONE` for IAM permissions.
In the advanced settings below, select `CORS` and save the changes. 

**Now we are ready to go!** 

Click the `Function url` provided. 

See FastAPI documentation by adding /docs to the url, for example:
https://looz2lqanh2e35fgmjrbvo4yde0dywuu.lambda-url.us-west-2.on.aws/docs

From your terminal use Curl for /get-objects:

```
curl -X 'POST'   'https://{complete url here}/get-objects'   -H 'accept: application/json'   -H 'Content-Type: application/json'   -d '{
  "message": "there are two trees that have fallen in the river and a boat is capsized",
  "prompt_id": "62e9559fd0b14f0386262ca1f7a852e6"
}'
```


An example output should look like the following:
```
{"response":"{  \"assets\": [    {      \"title\": \"tree1\",      \"position\": \"{“x”: 1, “y”: 3, “z”: 0}\",      \"scale\":  \"{“length”: 6, “width”: 2, “height”: 5}\"      },    {      \"title\": \"tree2\",      \"position\": \"{“x”: 4, “y”: 4, “z”: 0}\",      \"scale\":  \"{“length”: 8, “width”: 3, “height”: 6}\"      },    {      \"title\": \"river\",      \"position\": \"{“x”: 0, “y”: 0, “z”: 0}\",      \"scale\":  \"{“length”: 10, “width”: 5, “height”: 0}\"      },    {      \"title\": \"boat\",      \"position"}
```

