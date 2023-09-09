'use client'
import { useRef, useState } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { randomNumber } from '@/app/lib/math'
import * as THREE from 'three'
import { useSpring } from '@react-spring/three'
import { useDrag } from '@use-gesture/react'
// @ts-expect-error It does not like this import
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { UIModel } from '@/app/components/landing'

// Displays an arbitrary .obj file with full dragging support with custom scale and position
// See for dragging setup, very convoluted: https://stackoverflow.com/questions/69414101/how-can-i-drag-an-object-in-x-and-z-constrained-in-y-in-react-three-fiber-with-a
export const Model = ({
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
    initialPosition
      ? [initialPosition.x, initialPosition.y, scale?.height && scale.height > 10 ? scale.height - 5 : initialPosition.z || 1]
      : [randomNumber(0, 5), 1, randomNumber(0, 5)]
  )
  let planeIntersectPoint = new THREE.Vector3()

  console.log('POX', position)

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
    <mesh receiveShadow position={position} scale={scale ? [scale.length, scale.width, scale.height] : [1, 1, 1]} {...bind()} ref={ref}>
      <primitive object={obj} />
    </mesh>
  )
}
