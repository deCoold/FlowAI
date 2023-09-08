import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@banana-dev/banana-dev'
import { fetchFromSilas, SilasEntity } from '@/app/lib/fetch'

const map: Record<string, string> = {
  house: 'house.obj',
  fountain: 'fountain.obj',
  tree: 'tree.obj',
  river: 'river.obj',
  car: 'car.obj',
  street: 'street.obj',
  'street light': 'street-light.obj',
  'street lamp': 'street-light.obj',
  streetlamp: 'street-light.obj',
  streetlight: 'street-light.obj',
  'tall building': 'tall-building.obj',
  firetruck: 'firetruck.obj',
  'fire truck': 'firetruck.obj',
  volcano: 'volcano.obj',
  'school bus': 'school bus.obj',
  schoolbus: 'school bus.obj'
}

const shapeModel = new Client(process.env.BANANA_TOKEN!, '2aa8faa1-1df1-4432-9940-7d1cd61e0e39', 'https://shap-e-banana-dev-lm8kjszq49.run.banana.dev')

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
  console.log(`Received request to generate 3D model from prompt: ${prompt}`)

  if (!prompt) return new Response('No prompt provided', { status: 400 })

  try {
    // Fetches the entities to generate models for along with their position and sclae
    const entities = await fetchFromSilas(prompt)
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

    if (filteredEntities.length > 0) {
      throw new Error('Should not be this')
    }

    const models: SilasEntityWithUrl[] = await Promise.all(
      filteredEntities.map(async e => {
        const { json } = (await shapeModel.call('/', { prompt: e.title })) as {
          json: {
            url: string
          }
        }
        return { url: json.url, title: e.title, scale: e.scale, position: e.position }
      })
    )

    models.push(...existingEntities)

    console.log(`${models.length} models generated`, models)

    return NextResponse.json<ModelResponse>({ models })
  } catch (e) {
    console.error('Error running Banana.dev', e)
    throw e
  } finally {
    console.timeEnd('generate')
  }
}
