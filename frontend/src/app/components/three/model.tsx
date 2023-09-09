'use client'
import { useRef, useState } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { randomNumber } from '@/app/lib/math'
import * as THREE from 'three'
import { useSpring } from '@react-spring/three'
import { useDrag } from '@use-gesture/react'
// @ts-expect-error It does not like this import
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
// @ts-expect-error It does not like this import
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { UIModel } from '@/app/components/landing'

// Displays an arbitrary .obj file with full dragging support with custom scale and position
// See for dragging setup, very convoluted: https://stackoverflow.com/questions/69414101/how-can-i-drag-an-object-in-x-and-z-constrained-in-y-in-react-three-fiber-with-a
export const Model = ({
  url,
  localUrl,
  setIsDragging,
  floorPlane,
  scale,
  title,
  position: initialPosition
}: {
  url: string
  setIsDragging: (b: boolean) => void
  floorPlane: any
} & UIModel) => {
  const newScale = scale ? [scale.length > 30 ? 30 : scale.length, scale.width > 30 ? 30 : scale.width, scale.height > 30 ? 30 : scale.height] : [5, 5, 1]
  const ref = useRef<any>()
  const { size, viewport } = useThree()
  const aspect = size.width / viewport.width
  const [position, setPosition] = useState<[number, number, number]>(
    initialPosition ? [initialPosition.x, initialPosition.y, newScale[1] > 10 ? newScale[1] - 5 : initialPosition.z || 1] : [randomNumber(0, 5), randomNumber(0, 5), 1]
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

  const isGLTF = url.endsWith('.gltf') || url.endsWith('.glb')
  const obj = useLoader(isGLTF ? GLTFLoader : OBJLoader, localUrl)

  console.log(`${title} object type: ${isGLTF ? 'GLTF/GLB' : 'OBJ'}`)

  const props = {
    receiveShadow: true,
    position,
    scale: newScale,
    ref,
    ...(isGLTF && { rotation: [Math.PI / 2, 0, 0] })
  }

  return (
    // @ts-expect-error This is fine
    <mesh {...props} {...bind()}>
      <primitive object={isGLTF ? obj.scene : obj} />
    </mesh>
  )
}
