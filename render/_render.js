import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from '/node_modules/three/examples/jsm/loaders/OBJLoader.js';


const scene = new THREE.Scene();

scene.background = new THREE.Color(0x87ceeb); // Sky blue color

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); // Adjust far clipping plane
camera.position.set(0, 10, 10); // Move the camera higher

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const renderContainer = document.getElementById('canvas-container');
renderContainer.appendChild(renderer.domElement);


const geometry = new THREE.PlaneGeometry(10, 10, 100);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Change color to white (0xffffff)
const planeMesh = new THREE.Mesh(geometry, material);
material.side = THREE.DoubleSide;

planeMesh.rotation.x = Math.PI / 2;
scene.add(planeMesh);

const size = 10;
const divisions = 10;

// Create a grid helper and add it to the scene
const gridHelper = new THREE.GridHelper(size, divisions);
gridHelper.position.y = 0.001; // Set the grid slightly above the plane
scene.add(gridHelper);

// Create OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
};
animate();

function onClick(event) {
    raycaster.setFromCamera(mouse, camera);

    // Find intersected objects
    const intersects = raycaster.intersectObjects([gridHelper]);

    if (intersects.length > 0) {
        // Get the first intersection point
        const intersectionPoint = intersects[0].point;

        // Convert intersection point to grid cell indices
        const cellX = Math.floor(intersectionPoint.x / size + divisions / 2);
        const cellZ = Math.floor(intersectionPoint.z / size + divisions / 2);

        // Perform actions based on the selected cell
        console.log('Selected cell:', cellX, cellZ);
    }
}