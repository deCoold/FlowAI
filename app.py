from flask import Flask, request, send_file
import torch
from shap_e.diffusion.sample import sample_latents
from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
from shap_e.models.download import load_model, load_config
from shap_e.util.notebooks import create_pan_cameras, decode_latent_images, decode_latent_mesh
import os



# To remove on diploy
os.environ['PYTORCH_CUDA_ALLOC_CONF'] = 'max_split_size_mb:768'


app = Flask(__name__)
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


print('Device loaded: ', device)
print('Loading models...')


xm = load_model('transmitter', device=device)
model = load_model('text300M', device=device)
diffusion = diffusion_from_config(load_config('diffusion'))

@app.route('/generate_3d', methods=['POST'])
def generate_3d():

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

    return send_file(filename, as_attachment=True)
    

if __name__ == '__main__':
    app.run(port=5000, debug=True)
