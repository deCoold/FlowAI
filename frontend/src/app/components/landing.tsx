'use client'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Toast } from 'primereact/toast'
import { Message } from 'primereact/message'
// @ts-expect-error It does not like this import
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { useDrag } from '@use-gesture/react'
import { useSpring } from '@react-spring/three'
import { randomNumber } from '@/app/lib/math'
import { fetchFromS3 } from '@/app/lib/fetch'
import { ModelResponse } from '@/app/api/generate/route'

type UIModel = {
  title: string
  scale: ModelResponse['models'][0]['scale']
  position: ModelResponse['models'][0]['position']
  url: string
}

export const Landing = () => {
  const [uiModels, setUiModels] = useState<UIModel[]>([])
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

    try {
      // Retrieves the public S3 urls pointing to the models
      const { models } = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      }).then(response => response.json() as Promise<ModelResponse>)

      // Fetches models from S3 as buffers and converts into Blobs. S3 bucket has CORS configured
      const modelsWithBuffers = await Promise.all(
        models.map(async model => {
          return {
            ...model,
            buffer: await fetchFromS3(model.url)
          }
        })
      )

      const modelsWithUrls = modelsWithBuffers.map(model => {
        return {
          title: model.title,
          scale: model.scale,
          position: model.position,
          url: URL.createObjectURL(new Blob([model.buffer]))
        }
      })

      // Creates local urls for Blobs to feed into Three
      setUiModels([...uiModels, ...modelsWithUrls])
    } catch (e) {
      console.error('Error retrieving models from server', { e })
      setError('An error occurred :(')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='h-screen'>
      <Toast position='center' ref={toastRef} appendTo={'self'} />
      <div className='w-auto'>
        <div className='flex items-start'>
          {/* @ts-expect-error Event does have this key */}
          <InputText onBlur={e => setPrompt(e.target.value)} onMouseLeave={e => setPrompt(e.target.value)} placeholder='Enter a prompt' className='p-inputtext-sm w-72' />
          <Button label='Submit' disabled={!prompt} size={'small'} onClick={onSubmit} loading={isLoading} className={'!ml-3'} />
        </div>
        {uiModels.length > 0 && <Message severity='info' text='Enter a brief prompt describing the scene of your crisis' className='!mt-4' />}
      </div>
      <div className='flex w-full h-screen' id={'canvas-container'}>
        <Canvas shadows>
          <PerspectiveCamera position={[1, 1, 1]} makeDefault />
          <OrbitControls maxZoom={50} minZoom={10} enabled={!isDragging} />
          {uiModels.length > 0 ? uiModels.map((model, i) => <Model key={i} {...model} setIsDragging={setIsDragging} floorPlane={floorPlane} />) : null}
          <Plane />
          <ambientLight intensity={25} />
        </Canvas>
      </div>
    </div>
  )
}

// See for dragging setup, very convoluted: https://stackoverflow.com/questions/69414101/how-can-i-drag-an-object-in-x-and-z-constrained-in-y-in-react-three-fiber-with-a
const Model = ({
  url,
  setIsDragging,
  floorPlane,
  scale,
  position: initialPosition
}: {
  url: string
  setIsDragging: (b: boolean) => void
  floorPlane: any
} & UIModel) => {
  const ref = useRef<any>()
  const { size, viewport } = useThree()
  const aspect = size.width / viewport.width
  const [position, setPosition] = useState<[number, number, number]>(
    initialPosition ? [initialPosition.x, 1, initialPosition.z] : [randomNumber(0, 5), 1, randomNumber(0, 5)]
  )
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

  return (
    // @ts-expect-error This is fine
    <mesh receiveShadow position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale ? [scale.length, scale.width, scale.height] : [1, 1, 1]} {...bind()} ref={ref}>
      <primitive object={obj} />
    </mesh>
  )
}

const Plane = () => {
  return (
    <mesh rotation={[Math.PI / 2, -0.001, 0]} scale={[1, 1, 1]}>
      <planeGeometry args={[50, 50, 2500]} />
      <meshBasicMaterial color={'0xffffff'} side={THREE.DoubleSide} />
    </mesh>
  )
}
