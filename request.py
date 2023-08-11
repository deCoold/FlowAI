import requests

response = requests.post('http://localhost:5000/generate_3d', json={"prompt": "a tree made of balls"})

# Save the returned file
with open('model.obj', 'wb') as f:
    f.write(response.content)
