import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from '/node_modules/three/examples/jsm/loaders/OBJLoader.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue color

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 10);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const renderContainer = document.getElementById('canvas-container');
renderContainer.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 100);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const planeMesh = new THREE.Mesh(geometry, material);
material.side = THREE.DoubleSide;

planeMesh.rotation.x = Math.PI / 2;
planeMesh.position.y = -0.001;
scene.add(planeMesh);

const size = 10;
const divisions = 10;
const gridHelper = new THREE.GridHelper(size, divisions);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

const controls = new OrbitControls(camera, renderer.domElement);

const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};
animate();


function loadAndAddModel(modelPath) {
  const loader = new OBJLoader();
  loader.load(modelPath, (object) => {
    object.position.set(0, 1, 0);
    object.rotation.set(-Math.PI/2, 0, 0);
    object.scale.set(1, 1, 1);

    scene.add(object);
  });
}

document.getElementById('prompt-form').addEventListener('submit', function(event) {
  event.preventDefault();

  var prompt = document.getElementById('prompt').value;

  fetch('http://localhost:5000/generate_3d', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Origin': 'http://127.0.0.1:8080',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({ prompt: prompt })
  })
  .then(response => response.blob())
  .then(blob => {
    console.log('3d model generated');
    var url = URL.createObjectURL(blob);

    loadAndAddModel(url);
  });
});
