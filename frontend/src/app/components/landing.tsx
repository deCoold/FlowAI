'use client'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Toast } from 'primereact/toast'
import { Message } from 'primereact/message'
// @ts-expect-error It does not like this import
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { useDrag } from '@use-gesture/react'
import { useSpring } from '@react-spring/three'
import { randomNumber } from '@/app/lib/math'

export const Landing = () => {
  const [model, setModel] = useState<string>()
  const [prompt, setPrompt] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>()
  const toastRef = useRef<Toast>(null)
  const [isDragging, setIsDragging] = useState(false)
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  useEffect(() => {
    if (error) {
      toastRef.current?.show({ severity: 'error', summary: error, detail: 'Please try again soon.' })
    }
  }, [error])
  const onSubmit = async () => {
    console.log('Fetching models from server')
    setIsLoading(true)

    // This calls the Next API function
    await fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt })
    }).then(response => response.blob())
      .then(blob => {
        console.log(blob)
        const url = URL.createObjectURL(blob)
        setModel(url)
      }).catch(e => {
        console.error('Error retrieving models from server', { e })
        setError('An error occurred :(')
      })
      .finally(() => setIsLoading(false))


    // This calls the local Python server
    // await fetch('http://localhost:5005/generate_3d_mock', {
    //   method: 'POST',
    //   mode: 'cors',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Access-Control-Allow-': '*'
    //   },
    //   body: JSON.stringify({ prompt: prompt })
    // }).then(response => response.blob())
    //   .then(blob => {
    //     const url = URL.createObjectURL(blob)
    //     setModel(url)
    //     console.log('Fetched model')
    //   })
    //   .catch(e => {
    //     console.error('Error retrieving models from server', { e })
    //     setError('An error occurred :(')
    //   })
    //   .finally(() => setIsLoading(false))

  }

  return (
    <div className='h-screen'>
      <Toast position='center' ref={toastRef} appendTo={'self'} />
      <div className='w-auto'>
        <div className='flex items-start'>
          {/* @ts-expect-error Event does have this key */}
          <InputText onBlur={e => setPrompt(e.target.value)} onMouseLeave={e => setPrompt(e.target.value)}
                     placeholder='Enter a prompt'
                     className='p-inputtext-sm w-72' />
          <Button label='Submit' disabled={!prompt} size={'small'} onClick={onSubmit} loading={isLoading}
                  className={'!ml-3'} />
        </div>
        {!model &&
          <Message severity='info' text='Enter a brief prompt describing the scene of your crisis' className='!mt-4' />}
      </div>
      <div
        className='flex w-full h-screen' id={'canvas-container'}>
        <Canvas shadows>
          <PerspectiveCamera position={[1, 1, 1]} makeDefault />
          <OrbitControls maxZoom={50} minZoom={10} enabled={!isDragging} />
          {model && <Model url={model} setIsDragging={setIsDragging} floorPlane={floorPlane} />}
          <Plane />
          <ambientLight intensity={25} />
        </Canvas>
      </div>
    </div>
  )
}

// See for dragging setup, very convoluted: https://stackoverflow.com/questions/69414101/how-can-i-drag-an-object-in-x-and-z-constrained-in-y-in-react-three-fiber-with-a
const Model = ({ url, setIsDragging, floorPlane }: {
  url: string,
  setIsDragging: (b: boolean) => void,
  floorPlane: any
}) => {
  const ref = useRef<any>()
  const { size, viewport } = useThree()
  const aspect = size.width / viewport.width
  const [position, setPosition] = useState<[number, number, number]>([randomNumber(0, 5), 1, randomNumber(0, 5)])
  let planeIntersectPoint = new THREE.Vector3()

  const [_, api] = useSpring(() => ({
    position,
    scale: 1,
    rotation: [0, 0, 0],
    config: { friction: 1 }
  }))

  const bind = useDrag(
    ({ active, movement: [x, y], timeStamp, event }) => {
      if (active) {
        // @ts-expect-error Typing missing?
        event.ray.intersectPlane(floorPlane, planeIntersectPoint)
        setPosition([planeIntersectPoint.x, 1.5, planeIntersectPoint.z])
      }

      setIsDragging(active)

      api.start({
        position,
        scale: active ? 1.2 : 1,
        rotation: [y / aspect, x / aspect, 0]
      })
      return timeStamp
    },
    { delay: true }
  )

  const obj = useLoader(OBJLoader, url)

  // @ts-expect-error This is fine
  return <mesh receiveShadow position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1, 1]} {...bind()}
               ref={ref}>
    <primitive object={obj} />
  </mesh>
}

const Plane = () => {
  return (
    <mesh
      rotation={[Math.PI / 2, -0.001, 0]}
      scale={[1, 1, 1]}>
      <planeGeometry args={[11, 11, 100]} />
      <meshBasicMaterial color={'0xffffff'} side={THREE.DoubleSide} />
    </mesh>
  )
}
