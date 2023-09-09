'use client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, useTexture } from '@react-three/drei'
import type { UIModel } from '@/app/components/landing'
import * as THREE from 'three'
import { useState } from 'react'
import { Model } from '@/app/components/three/model'

export const ThreeCanvas = ({ uiModels }: { uiModels: Array<UIModel> }) => {
  // Used to disable orbit controls when dragging
  const [isDragging, setIsDragging] = useState(false)
  // Used to constrain dragging to the floor plane I think, this was copied from SO
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

  return (
    <Canvas shadows={'basic'}>
      <ambientLight intensity={10} />
      <OrbitControls maxZoom={50} minZoom={10} enabled={!isDragging} />
      <PerspectiveCamera position={[1, 1, 1]} makeDefault />

      {/*This is a separate component so that useTexture can be used inside the Canvas context*/}
      <Plane uiModels={uiModels} floorPlane={floorPlane} setIsDragging={setIsDragging} />
    </Canvas>
  )
}

const Plane = ({ uiModels, floorPlane, setIsDragging }: { uiModels: Array<UIModel>; floorPlane: any; setIsDragging: (bool: boolean) => void }) => {
  const { map } = useTexture({ map: 'https://images.rawpixel.com/image_1000/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3B4NjI0NzgwLWltYWdlLWt3dnhtcmUwLmpwZw.jpg' })

  return (
    <mesh rotation={[-Math.PI / 2, -0.001, 0]}>
      <planeGeometry args={[200, 200, 2500]} />
      <meshPhongMaterial color={'#4ee44e'} side={THREE.DoubleSide} map={map} />
      {uiModels.length > 0 ? uiModels.map((model, i) => <Model key={i} {...model} setIsDragging={setIsDragging} floorPlane={floorPlane} />) : null}
    </mesh>
  )
}
