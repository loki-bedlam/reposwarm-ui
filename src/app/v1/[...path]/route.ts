import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.REPOSWARM_API_URL || 'http://api:3000'

async function proxyToApi(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/')
  const search = req.nextUrl.search
  const url = `${API_URL}/v1/${path}${search}`

  const headers = new Headers(req.headers)

  // Inject auth if not already present
  if (!headers.has('authorization')) {
    const token = process.env.API_BEARER_TOKEN
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // Remove host header (would be wrong for the API server)
  headers.delete('host')

  const response = await fetch(url, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  })

  const data = await response.text()
  return new NextResponse(data, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  })
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyToApi(req, params)
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyToApi(req, params)
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyToApi(req, params)
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyToApi(req, params)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  return proxyToApi(req, params)
}
