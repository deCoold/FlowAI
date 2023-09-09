'use client'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { useEffect, useRef, useState } from 'react'
import { Toast } from 'primereact/toast'
import { Message } from 'primereact/message'
import { fetchFromS3 } from '@/app/lib/fetch'
import { ModelResponse } from '@/app/api/generate/route'
import { ThreeCanvas } from '@/app/components/three'

export type UIModel = {
  title: string
  scale: ModelResponse['models'][0]['scale']
  position: ModelResponse['models'][0]['position']
  // S3 url
  url: string
  // Local Blob url
  localUrl: string
}

export const Landing = () => {
  // Array of generated models to render
  const [uiModels, setUiModels] = useState<UIModel[]>([])
  // User input
  const [prompt, setPrompt] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>()
  // Shows errors from the server
  const toastRef = useRef<Toast>(null)

  // Handles toggling the Toast
  useEffect(() => {
    if (error) {
      toastRef.current?.show({ severity: 'error', summary: error, detail: 'Please try again soon.' })
    }
  }, [error])

  const onSubmit = async () => {
    console.log('Fetching models from server')
    setIsLoading(true)

    try {
      // Retrieves the public S3 urls pointing to the models
      const { models } = await fetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      }).then(response => response.json() as Promise<ModelResponse>)

      // Fetches models from S3 as buffers and converts into Blobs. S3 bucket has CORS configured
      const modelsWithBuffers = await Promise.all(
        models.map(async model => {
          return {
            ...model,
            buffer: await fetchFromS3(model.url)
          }
        })
      )

      const modelsWithUrls = modelsWithBuffers.map(model => {
        return {
          title: model.title,
          scale: model.scale,
          position: model.position,
          url: model.url,
          localUrl: URL.createObjectURL(new Blob([model.buffer]))
        }
      })

      // Creates local urls for Blobs to feed into Three
      setUiModels([...uiModels, ...modelsWithUrls])
      console.log('Downloaded models from server and S3')
    } catch (e) {
      console.error('Error retrieving models from server', { e })
      setError('An error occurred :(')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='h-screen'>
      <Toast position='center' ref={toastRef} appendTo={'self'} />
      <div className='w-auto'>
        <div className='flex items-start'>
          {/* @ts-expect-error Event does have this key */}
          <InputText onBlur={e => setPrompt(e.target.value)} onMouseLeave={e => setPrompt(e.target.value)} placeholder='Enter a prompt' className='p-inputtext-sm w-72' />
          <Button label='Submit' disabled={!prompt} size={'small'} onClick={onSubmit} loading={isLoading} className={'!ml-3'} />
        </div>
        {uiModels.length > 0 && <Message severity='info' text='Enter a brief prompt describing the scene of your crisis' className='!mt-4' />}
      </div>
      <div className='flex w-full h-screen' id={'canvas-container'}>
        <ThreeCanvas uiModels={uiModels} />
      </div>
    </div>
  )
}
