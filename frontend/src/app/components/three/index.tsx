'use client'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { UIModel } from '@/app/components/landing'
import * as THREE from 'three'
import { useState } from 'react'
import { Model } from '@/app/components/three/model'
import { TextureLoader } from 'three'

export const ThreeCanvas = ({ uiModels }: { uiModels: Array<UIModel> }) => {
  // Used to disable orbit controls when dragging
  const [isDragging, setIsDragging] = useState(false)
  // Used to constrain dragging to the floor plane I think, this was copied from SO
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const grass = useLoader(TextureLoader, 'https://images.rawpixel.com/image_1000/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3B4NjI0NzgwLWltYWdlLWt3dnhtcmUwLmpwZw.jpg')

  return (
    <Canvas shadows={'basic'}>
      <hemisphereLight color='0xB1E1FF' groundColor='0xB97A20' intensity={5} />
      <OrbitControls maxZoom={50} minZoom={10} enabled={!isDragging} />
      <PerspectiveCamera position={[1, 1, 1]} makeDefault fov={75} />

      {/*Plane*/}
      <mesh rotation={[-Math.PI / 2, -0.001, 0]}>
        <planeGeometry args={[200, 200, 2500]} />
        <meshPhongMaterial color={'#4ee44e'} side={THREE.DoubleSide} map={grass} />
        {uiModels.length > 0 ? uiModels.map((model, i) => <Model key={i} {...model} setIsDragging={setIsDragging} floorPlane={floorPlane} />) : null}
      </mesh>
    </Canvas>
  )
}
