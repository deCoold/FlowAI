import requests

response = requests.post('http://localhost:5000/generate_3d', json={"prompt": "a christmas tree"})

# Save the returned file
with open('model.obj', 'wb') as f:
    f.write(response.content)
