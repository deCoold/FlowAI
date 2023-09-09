import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@banana-dev/banana-dev'
import { fetchFromSilas, SilasEntity } from '@/app/lib/fetch'

const useBanana = false

// a broken car, broken buildings & rubble after an earthquake hit with volcano
const map: Record<string, string> = {
  house: 'house.obj',
  fountain: 'fountain.obj',
  tree: 'tree.obj',
  river: 'river.obj',
  // car: 'car.obj',
  street: 'street.obj',
  'street light': 'street-light.obj',
  'street lamp': 'street-light.obj',
  streetlamp: 'street-light.obj',
  streetlight: 'street-light.obj',
  'tall building': 'tall-building.obj',
  firetruck: 'firetruck.obj',
  'fire truck': 'firetruck.obj',
  volcano: 'volcano.obj',
  'live volcano': 'volcano.obj',
  'school bus': 'school bus.obj',
  schoolbus: 'school bus.obj',
  flood: 'flood.obj',
  cottage: 'cottage.obj',
  'burnt car': 'burnt car.glb',
  car: 'burnt car.glb',
  'broken car': 'burnt car.glb',
  'damaged buildings': 'damaged buildings.glb',
  'damaged building': 'damaged buildings.glb',
  'broken buildings': 'damaged buildings.glb',
  building: 'damaged building.glb',
  'broken building': 'damaged buildings.glb',
  'building ruin': 'damaged buildings.glb',
  buildings: 'damaged buildings.glb',
  rubble: 'rubble.glb'
}

const bananaClient = new Client(process.env.BANANA_TOKEN!, '2aa8faa1-1df1-4432-9940-7d1cd61e0e39', 'https://shap-e-banana-dev-lmcc7ibq49.run.banana.dev')

const toS3Url = (key: string) => `https://flow-ai-hackathon.s3.us-west-1.amazonaws.com/${key}`

type SilasEntityWithUrl = SilasEntity & {
  url: string
}

export type ModelResponse = {
  models: Array<SilasEntityWithUrl>
}

export const POST = async (req: NextRequest) => {
  console.time('generate')
  const {
    prompt
  }: {
    prompt: string
  } = await req.json()
  if (!prompt) return new Response('No prompt provided', { status: 400 })
  // The request could be for generating a single entity rather than a scene
  const isSingleEntity = prompt.split(' ').length === 1 || prompt.includes('single')

  console.log(`Received request to generate 3D model from prompt: ${prompt}`)

  const cleanedPrompt = prompt.replace('single', '').trim()

  try {
    // Fetches the entities to generate models for along with their position and scale
    const entities = isSingleEntity ? [{ title: cleanedPrompt }] : await fetchFromSilas(cleanedPrompt)
    // We want to avoid re-generating models that already exist, this looks up the existing models in the cache (i.e. already in S3)
    const existingEntities = entities
      .map(p => {
        if (!map[p.title]) return null

        return {
          title: p.title,
          url: toS3Url(map[p.title]),
          scale: p.scale,
          position: p.position
        }
      })
      .filter(Boolean) as SilasEntityWithUrl[]
    const filteredEntities: SilasEntity[] = entities.filter(p => !existingEntities.some(e => e.title === p.title))

    console.log(`GPT returned ${entities.length} entities`, entities)
    console.log(`Generating ${filteredEntities.length} models`, filteredEntities)

    let models: SilasEntityWithUrl[] = []

    if (useBanana) {
      models = await Promise.all(
        // Generates models through Banana.dev
        filteredEntities.map(async e => {
          const { json } = (await bananaClient.call('/', { prompt: e.title })) as {
            json: {
              url: string
            }
          }
          return { url: json.url, title: e.title, scale: e.scale, position: e.position }
        })
      )
    }

    models.push(...existingEntities)

    console.log(`${models.length} models generated`, models)

    return NextResponse.json<ModelResponse>({ models: existingEntities })
  } catch (e) {
    console.error('Error running Banana.dev', e)
    throw e
  } finally {
    console.timeEnd('generate')
  }
}
