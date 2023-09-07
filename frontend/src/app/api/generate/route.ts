import { NextResponse, NextRequest } from 'next/server'
import { Client } from '@banana-dev/banana-dev'

const map: Record<string, string> = {
  house: 'house.obj',
  fountain: 'fountain.obj',
  tree: 'tree.obj',
  river: 'river.obj',
  car: 'car.obj',
  street: 'street.obj',
  'street light': 'street-light.obj',
}

const fetchFromS3 = async (url: string) => {
  const blob = await fetch(url).then(_ => _.blob()).catch(e => {
    console.error('Error fetching from S3', e)
    throw e
  })

  return new NextResponse(blob, { status: 200 })
}

export const POST = async (req: NextRequest) => {
  const { prompt } = await req.json()
  console.log(`Received request to generate 3D model from prompt: ${prompt}`)

  const model = new Client(
    process.env.BANANA_TOKEN!,
    '2aa8faa1-1df1-4432-9940-7d1cd61e0e39',
    'https://shap-e-banana-dev-lm8kjszq49.run.banana.dev'
  )

  try {
    if (map[prompt]) {
      return fetchFromS3(`https://flow-ai-hackathon.s3.us-west-1.amazonaws.com/${map[prompt]}`)
    }

    const { json, meta } = await model.call('/', { prompt })

    console.log('Output from Banana.dev', json)

    return fetchFromS3(json.url)
  } catch (e) {
    console.error('Error running Banana.dev', e)
  }
}