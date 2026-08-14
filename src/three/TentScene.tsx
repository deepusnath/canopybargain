import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useStore } from '../store'
import type { Design, PartId } from '../model/types'
import { FRAMES, ridgeLen } from '../model/parts'
import { partSpecs } from '../model/parts'
import { renderPanel } from '../render/panelRenderer'
import { onImageReady } from '../render/imageCache'

type V3 = [number, number, number]

interface PartMesh {
  id: PartId
  mesh: THREE.Mesh
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture
}

/** Quad face (bl→br bottom edge, tl→tr top edge) with uv oriented for an outside viewer. */
function quadGeometry(bl: V3, br: V3, tl: V3, tr: V3): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const verts = new Float32Array([...bl, ...br, ...tr, ...tl])
  const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
  g.setIndex([0, 1, 2, 0, 2, 3])
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.computeVertexNormals()
  return g
}

function triGeometry(bl: V3, br: V3, apex: V3): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  const verts = new Float32Array([...bl, ...br, ...apex])
  const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1])
  g.setIndex([0, 1, 2])
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  g.computeVertexNormals()
  return g
}

const CAMERA_PRESETS: Record<string, V3> = {
  '¾ View': [16, 10, 20],
  Front: [0, 7, 27],
  Side: [27, 8, 0],
  Top: [0.5, 33, 0.5],
}

export function TentScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [webglOk, setWebglOk] = useState(true)
  const apiRef = useRef<{
    setCamera: (p: V3) => void
    setAutoRotate: (v: boolean) => void
    snapshot: () => string
  } | null>(null)
  const [autoRotate, setAutoRotateState] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
      if (!renderer.getContext()) throw new Error('no context')
    } catch {
      setWebglOk(false)
      return
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#e8ecf1')
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)
    camera.position.set(...CAMERA_PRESETS['¾ View'])

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 5, 0)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.minDistance = 8
    controls.maxDistance = 80

    scene.add(new THREE.HemisphereLight('#ffffff', '#c8cdd4', 1.15))
    const sun = new THREE.DirectionalLight('#fff8ec', 1.4)
    sun.position.set(18, 30, 14)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    const cam = sun.shadow.camera
    cam.left = -18; cam.right = 18; cam.top = 18; cam.bottom = -18
    scene.add(sun)

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(26, 48),
      new THREE.MeshLambertMaterial({ color: '#d7dce2' }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    let tentGroup = new THREE.Group()
    scene.add(tentGroup)
    let partMeshes: PartMesh[] = []

    const disposeTent = () => {
      tentGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => {
            const mm = m as THREE.MeshLambertMaterial
            if (mm.map) mm.map.dispose()
            mm.dispose()
          })
        }
      })
      scene.remove(tentGroup)
      partMeshes = []
    }

    const IN = 1 / 12 // inches → feet scene units

    const buildTent = (design: Design) => {
      disposeTent()
      tentGroup = new THREE.Group()
      const frame = FRAMES[design.tentSize]
      const hw = (frame.wFt / 2)
      const hd = (frame.dFt / 2)
      const eave = frame.eaveIn * IN
      const top = eave + frame.riseIn * IN
      const rh = (ridgeLen(frame) / 2) * IN
      const specs = partSpecs(design.tentSize)

      const addPart = (
        id: PartId,
        geom: THREE.BufferGeometry,
        opts: { doubleSide?: boolean } = {},
      ) => {
        const canvas = document.createElement('canvas')
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        const mat = new THREE.MeshLambertMaterial({
          map: texture,
          side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
        })
        const mesh = new THREE.Mesh(geom, mat)
        mesh.castShadow = true
        tentGroup.add(mesh)
        partMeshes.push({ id, mesh, canvas, texture })
      }

      // eave corners
      const FR: V3 = [hw, eave, hd]
      const FL: V3 = [-hw, eave, hd]
      const BR: V3 = [hw, eave, -hd]
      const BL: V3 = [-hw, eave, -hd]
      // ridge ends (front end +z, back end -z)
      const RF: V3 = [0, top, rh]
      const RB: V3 = [0, top, -rh]

      // roof peaks — bl/br chosen so the outside viewer reads left→right
      addPart('peak0', triGeometry(FL, FR, RF))
      addPart('peak2', triGeometry(BR, BL, RB))
      if (rh > 0.001) {
        addPart('peak1', quadGeometry(FR, BR, RF, RB))
        addPart('peak3', quadGeometry(BL, FL, RB, RF))
      } else {
        addPart('peak1', triGeometry(FR, BR, RF))
        addPart('peak3', triGeometry(BL, FL, RF))
      }

      // valances — vertical strips hanging just below the eave, pushed slightly outward
      const vh = 15 * IN
      const off = 0.04
      const vTop = eave + 0.01
      const vBot = eave - vh
      addPart('valance0', quadGeometry(
        [-hw, vBot, hd + off], [hw, vBot, hd + off], [-hw, vTop, hd + off], [hw, vTop, hd + off],
      ), { doubleSide: true })
      addPart('valance1', quadGeometry(
        [hw + off, vBot, hd], [hw + off, vBot, -hd], [hw + off, vTop, hd], [hw + off, vTop, -hd],
      ), { doubleSide: true })
      addPart('valance2', quadGeometry(
        [hw, vBot, -hd - off], [-hw, vBot, -hd - off], [hw, vTop, -hd - off], [-hw, vTop, -hd - off],
      ), { doubleSide: true })
      addPart('valance3', quadGeometry(
        [-hw - off, vBot, -hd], [-hw - off, vBot, hd], [-hw - off, vTop, -hd], [-hw - off, vTop, hd],
      ), { doubleSide: true })

      // walls
      if (design.parts.backWall.enabled) {
        addPart('backWall', quadGeometry(
          [hw - 0.05, 0.02, -hd + 0.05], [-hw + 0.05, 0.02, -hd + 0.05],
          [hw - 0.05, eave, -hd + 0.05], [-hw + 0.05, eave, -hd + 0.05],
        ), { doubleSide: true })
      }
      const hwallH = 42 * IN
      if (design.parts.halfWallLeft.enabled) {
        addPart('halfWallLeft', quadGeometry(
          [-hw + 0.05, 0.02, -hd + 0.05], [-hw + 0.05, 0.02, hd - 0.05],
          [-hw + 0.05, hwallH, -hd + 0.05], [-hw + 0.05, hwallH, hd - 0.05],
        ), { doubleSide: true })
      }
      if (design.parts.halfWallRight.enabled) {
        addPart('halfWallRight', quadGeometry(
          [hw - 0.05, 0.02, hd - 0.05], [hw - 0.05, 0.02, -hd + 0.05],
          [hw - 0.05, hwallH, hd - 0.05], [hw - 0.05, hwallH, -hd + 0.05],
        ), { doubleSide: true })
      }

      // frame: legs + eave bars
      const frameMat = new THREE.MeshLambertMaterial({ color: '#5c6470' })
      const legGeom = new THREE.CylinderGeometry(0.09, 0.09, eave, 10)
      for (const [x, z] of [[hw, hd], [-hw, hd], [hw, -hd], [-hw, -hd]] as Array<[number, number]>) {
        const leg = new THREE.Mesh(legGeom, frameMat)
        leg.position.set(x, eave / 2, z)
        leg.castShadow = true
        tentGroup.add(leg)
      }
      const barGeomW = new THREE.BoxGeometry(hw * 2, 0.08, 0.08)
      const barGeomD = new THREE.BoxGeometry(0.08, 0.08, hd * 2)
      const bars: Array<[THREE.BoxGeometry, V3]> = [
        [barGeomW, [0, eave, hd]], [barGeomW, [0, eave, -hd]],
        [barGeomD, [hw, eave, 0]], [barGeomD, [-hw, eave, 0]],
      ]
      for (const [g, pos] of bars) {
        const bar = new THREE.Mesh(g, frameMat)
        bar.position.set(...pos)
        tentGroup.add(bar)
      }

      scene.add(tentGroup)
      const _ = specs // dims come from the texture step
      updateTextures(design)
    }

    const TEX_W = 1024
    const updateTextures = (design: Design) => {
      const specs = partSpecs(design.tentSize)
      for (const pm of partMeshes) {
        const spec = specs[pm.id]
        const ppi = TEX_W / spec.dims.wIn
        const ctx = pm.canvas.getContext('2d')
        if (!ctx) continue
        renderPanel(ctx, design.parts[pm.id], spec.dims, { ppi })
        pm.texture.needsUpdate = true
      }
    }

    const structureKey = (d: Design) =>
      [d.tentSize, d.parts.backWall.enabled, d.parts.halfWallLeft.enabled, d.parts.halfWallRight.enabled].join('|')

    let lastKey = ''
    let pending = false
    const scheduleUpdate = () => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        const design = useStore.getState().design
        const key = structureKey(design)
        if (key !== lastKey) {
          lastKey = key
          buildTent(design)
        } else {
          updateTextures(design)
        }
      })
    }

    lastKey = structureKey(useStore.getState().design)
    buildTent(useStore.getState().design)
    const unsubStore = useStore.subscribe(scheduleUpdate)
    const unsubImages = onImageReady(scheduleUpdate)

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      controls.update()
      renderer.render(scene, camera)
    }
    loop()

    apiRef.current = {
      setCamera: (p) => {
        camera.position.set(...p)
        controls.target.set(0, 5, 0)
        controls.update()
      },
      setAutoRotate: (v) => {
        controls.autoRotate = v
        controls.autoRotateSpeed = 1.6
      },
      snapshot: () => renderer.domElement.toDataURL('image/png'),
    }

    return () => {
      cancelAnimationFrame(raf)
      unsubStore()
      unsubImages()
      ro.disconnect()
      controls.dispose()
      disposeTent()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  const download = () => {
    const url = apiRef.current?.snapshot()
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `${useStore.getState().design.name.replace(/\s+/g, '-')}-3d.png`
    a.click()
  }

  if (!webglOk) {
    return (
      <div className="webgl-fallback">
        <strong>Cannot load 3D preview.</strong>
        <p>Your browser does not support WebGL. The 2D editor remains fully functional.</p>
      </div>
    )
  }

  return (
    <div className="scene-wrap">
      <div ref={containerRef} className="scene-canvas" />
      <div className="scene-toolbar">
        {Object.entries(CAMERA_PRESETS).map(([label, pos]) => (
          <button key={label} className="chip" onClick={() => apiRef.current?.setCamera(pos)}>
            {label}
          </button>
        ))}
        <button
          className={`chip ${autoRotate ? 'chip-on' : ''}`}
          onClick={() => {
            const v = !autoRotate
            setAutoRotateState(v)
            apiRef.current?.setAutoRotate(v)
          }}
        >
          ⟳ Spin
        </button>
        <button className="chip" onClick={download}>📷 Snapshot</button>
      </div>
    </div>
  )
}
