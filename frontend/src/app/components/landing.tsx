'use client'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { useState } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
// @ts-expect-error It does not like this import
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'



export const Landing = () => {
  const [model, setModel] = useState<string>()
  const [prompt, setPrompt] = useState<string>('')

  const onSubmit = async () => {
    console.log('Fetching models from server')

    // This call the Next API function
    // await fetch('/api/generate', {
    //   method: 'POST',
    //   body: JSON.stringify({ prompt }),
    // })

    // This calls the local Python server
    await fetch('http://localhost:5005/generate_3d_mock', {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-': '*'
      },
      body: JSON.stringify({ prompt: prompt })
    }).then(response => response.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        setModel(url)
        console.log('Fetched model')
      })
      .catch(e => console.error('Error retrieving models from server', { e }))
    console.log('Fetched model')

  }

  return (
    <div className='h-screen'>
      <div className='w-96 flex justify-between'>
        <InputText onBlur={e => setPrompt(e.target.value)} placeholder='Enter a prompt'
                   className='p-inputtext-sm w-72' />
        <Button label='Submit' size={'small'} onClick={onSubmit} />
      </div>
      <div
        className='flex w-full h-screen' id={'canvas-container'}>
        <Canvas>
          <PerspectiveCamera position={[2, 2, 2]} makeDefault />
          <OrbitControls />
          <ambientLight intensity={0.5} />
          {model && <Model url={model} />}
          <Plane />
        </Canvas>
      </div>
    </div>
  )
}

const Model = ({ url }: { url: string }) => {
  const { scene } = useLoader(GLTFLoader, url)
  scene.position.set(0, 1, 0)
  scene.rotation.set(-Math.PI / 2, 0, 0)
  scene.scale.set(1, 1, 1)

  return <primitive object={scene} />
}

const Plane = () => {
  return (
    <mesh
      rotation={[Math.PI / 2, -0.001, 0]}
      scale={[1, 1, 1]}>
      <planeGeometry args={[10, 10, 100]} />
      <meshBasicMaterial color={'0xffffff'} side={THREE.DoubleSide} />
    </mesh>
  )
}
