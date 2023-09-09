// Fetches a file from S3 and returns as an ArrayBuffer
export const fetchFromS3 = async (url: string): Promise<ArrayBuffer> => {
  console.log(`Fetching from S3: ${url}`)
  return fetch(url)
    .then(_ => _.arrayBuffer())
    .catch(e => {
      console.error('Error fetching from S3', e)
      throw e
    })
}

export type SilasEntity = {
  title: string
  position?: {
    x: number
    y: number
    z: number
  }
  scale?: {
    length: number
    width: number
    height: number
  }
}

// The API returns strings within strings and weird quote symbols that barf in JSON.parse
export const fetchFromSilas = async (message: string): Promise<Array<SilasEntity>> => {
  const func = () => {
    return fetch('https://looz2lqanh2e35fgmjrbvo4yde0dywuu.lambda-url.us-west-2.on.aws/get-objects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, prompt_id: '62e9559fd0b14f0386262ca1f7a852e6' })
    })
      .then(_ => _.json())
      .then((data: { response: string }) => {
        console.log('Response from Silas', data)
        const parsed: {
          assets: Array<{
            title: string
            position?: string
            scale?: string
          }>
        } = JSON.parse(data.response)
        return parsed
      })
      .then(data => {
        return data.assets.map(a => ({
          title: a.title.toLowerCase().replace('ruined', 'damaged').trim(),
          position: a.position ? JSON.parse(a.position?.replaceAll('“', '"').replaceAll('”', '"')) : undefined,
          scale: a.scale ? JSON.parse(a.scale?.replaceAll('“', '"').replaceAll('”', '"')) : undefined
        }))
      })
  }

  return await func()
    .catch(e => {
      console.error('Error fetching from Silas', { e })
      return func()
    })
    .catch(e => {
      console.error('SECOND error fetching from Silas', { e })
      return func()
    })
    .catch(e => {
      console.error('THIRD error fetching from Silas', { e })
      return func()
    })
}
