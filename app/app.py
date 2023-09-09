from flask import Flask, request, send_file, make_response
from flask import jsonify, send_from_directory
from flask_cors import CORS, cross_origin

import torch

from shap_e.diffusion.sample import sample_latents
from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
from shap_e.models.download import load_model, load_config
from shap_e.util.notebooks import create_pan_cameras, decode_latent_images, decode_latent_mesh

import random

import os, io, base64

import trimesh
from trimesh.visual import ColorVisuals
import numpy as np


#### CONFIG

DEPLOY = False
OUTPUT_FORMAT = 'gif' # GLB FILES ARE PREFERRABLE TO GLTF FOR THIRD PARTY IMPORTS

MANUAL_SEED = None

PARENT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(PARENT_DIR, 'generated')
                          
if not os.path.exists(ASSETS_DIR):
    print(f"Creating assets dir: ', {ASSETS_DIR}")
    os.makedirs(ASSETS_DIR)

if not DEPLOY:
    os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:768'
    URL = "http://localhost:3000"
elif DEPLOY:
    pass


### APP

app = Flask(__name__)

app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app, resources={r"/generate_3d_mock": {"origins": URL}})

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

print('Device loaded: ', device)
print('Loading models...')

# LOAD THE SHAP-E MODEL
xm = load_model('transmitter', device=device)
model = load_model('text300M', device=device)
diffusion = diffusion_from_config(load_config('diffusion'))


# TESTING ENDPOINT to fetch pre-generated 3d assets
@app.route('/generate_3d_mock', methods=['POST', 'OPTIONS'])
@cross_origin(origin='localhost', headers=['Content-Type','Authorization'])
def generate_3d_mock():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "localhost")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "*")
        return response

    print('Returning 3d mocks')

    # Read file from generated folder and return to client
    filename = f'generated/airplane.glb'
    return send_file(filename, as_attachment=True)





@app.route('/generate_3d', methods=['POST', 'OPTIONS'])
def generate_3d():

    if MANUAL_SEED:
        seed = MANUAL_SEED
    else:
        seed = random.randint(0, 1000000)
    
    torch.manual_seed(seed)

    if request.method == 'OPTIONS':
        return '', 200

    print('Generating 3D...')

    batch_size = 1
    guidance_scale = 15.0
    prompt = request.json['prompt']

    latents = sample_latents(
        batch_size=batch_size,
        model=model,
        diffusion=diffusion,
        guidance_scale=guidance_scale,
        model_kwargs=dict(texts=[prompt] * batch_size),
        progress=True,
        clip_denoised=True,
        use_fp16=True,
        use_karras=True,
        karras_steps=64,
        sigma_min=1E-3,
        sigma_max=160,
        s_churn=0,
    )

    render_mode = 'nerf'
    size = 64

    cameras = create_pan_cameras(size, device)
    for i, latent in enumerate(latents):
        images = decode_latent_images(xm, latent, cameras, rendering_mode=render_mode)


    if(OUTPUT_FORMAT == 'obj'):
        filename = f'{prompt}_{seed}.obj'.replace(' ', '_')
        
        FILENAME = f'{prompt}_{seed}.{OUTPUT_FORMAT}'.replace(' ', '_')
        FILEPATH = os.path.join(ASSETS_DIR,  FILENAME)
        
        t = decode_latent_mesh(xm, latents[0]).tri_mesh()
        with open(FILEPATH, 'w') as f: 
            t.write_obj(FILEPATH)


    elif(OUTPUT_FORMAT == 'gltf' or OUTPUT_FORMAT == 'glb'):
        
        FILENAME = f'{prompt}_{seed}.{OUTPUT_FORMAT}'.replace(' ', '_')
        FILEPATH = os.path.join(ASSETS_DIR,  FILENAME)

        latent_mesh = decode_latent_mesh(xm, latents[0]).tri_mesh()
        
        vertex_colors = np.vstack((
            latent_mesh.vertex_channels['R'],
            latent_mesh.vertex_channels['G'],
            latent_mesh.vertex_channels['B']
        )).T
        
        mesh = trimesh.Trimesh(vertices=latent_mesh.verts,
                            faces=latent_mesh.faces,
                            face_normals=latent_mesh.normals,
                            visual=ColorVisuals(vertex_colors=vertex_colors))
        
        scene = trimesh.Scene()
        scene.add_geometry(mesh)

        with open(FILEPATH, "wb") as f:
            f.write(trimesh.exchange.gltf.export_glb(scene))

    
    elif(OUTPUT_FORMAT == 'gif'):
        
        for i, latent in enumerate(latents):
            images = decode_latent_images(
                xm, latent, cameras, rendering_mode=render_mode
            )
            writer = io.BytesIO()
            images[0].save(
                writer,
                format="GIF",
                save_all=True,
                append_images=images[1:],
                duration=100,
                loop=0,
            )
            writer.seek(0)
            data = base64.b64encode(writer.read()).decode("ascii")

            FILENAME = f'{prompt}.gif'.replace(' ', '_')
            FILEPATH = os.path.join(ASSETS_DIR,  FILENAME)

            with open(FILEPATH, "wb") as f:
                f.write(writer.getbuffer())


    print('3D asset generated')
    return send_file(FILEPATH, as_attachment=True)



# ENDPOINT FOR GIFS FILE - MOCKUP
@app.route('/api/items', methods=['GET'])
def get_items():
    items = {
      "items": [
        {
          "name": "blue car",
          "url": request.url_root.replace('http', 'https') + "blue_car.gif"
        },
        {
            "name": "red car",
            "url": request.url_root.replace('http', 'https') + "red_car.gif"
        },
        {
            "name": "dog",
            "url": request.url_root.replace('http', 'https') + "dog.gif"
        }
        ]
    }

    return jsonify(items)



@app.route('/<filename>.gif', methods=['GET'])
def get_file(filename):
    return send_from_directory('', f'generated/{filename}.gif')


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5005, debug=True)
