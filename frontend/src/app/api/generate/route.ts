import { NextResponse, NextRequest } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: 'r8_2QAlQAX80PC4rU6wGeBupTOwjjcMP1s15DBL8'
})
export const POST = async (req: NextRequest) => {
  const { prompt } = await req.json()
  console.log(`Received request to generate 3D model from prompt: ${prompt}`)

  try {
    const output = (await replicate.run(
      process.env.REPLICATE_TOKEN as any,
      {
        input: {
          prompt
        }
      }
    )) as string[]

    console.log('Output from replicate', output)
    return NextResponse.json({
      url: output[0]
    })
  } catch (e) {
    console.error('Error running replicate', e)
  }
}