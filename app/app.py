from flask import Flask, request, send_file, make_response
from flask_cors import CORS, cross_origin

import torch

from shap_e.diffusion.sample import sample_latents
from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
from shap_e.models.download import load_model, load_config
from shap_e.util.notebooks import create_pan_cameras, decode_latent_images, decode_latent_mesh

import os

# To remove on diploy
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:768'

app = Flask(__name__)

app.config['CORS_HEADERS'] = 'Content-Type'
cors = CORS(app, resources={r"/generate_3d_mock": {"origins": "http://localhost:1234"}})

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

print('Device loaded: ', device)
print('Loading models...')

xm = load_model('transmitter', device=device)
model = load_model('text300M', device=device)
diffusion = diffusion_from_config(load_config('diffusion'))


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

    filename = f'tmp_mesh.obj'

    t = decode_latent_mesh(xm, latents[0]).tri_mesh()
    with open(filename, 'w') as f:
        t.write_obj(f)

    print('3D asset generated')

    return send_file(filename, as_attachment=True)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5005, debug=True)
