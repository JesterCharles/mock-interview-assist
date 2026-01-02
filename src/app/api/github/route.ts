import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'JesterCharles';
const REPO = 'mock-question-bank';
const BRANCH = 'main';

// Helper to fetch from GitHub
async function fetchFromGitHub(path: string, isRaw: boolean = false) {
    const fileUrl = isRaw
        ? `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`
        : `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;

    // Note: For raw content via API, we use specific Accept header
    // For file listings, we use standard JSON

    const headers: Record<string, string> = {
        'Accept': isRaw ? 'application/vnd.github.v3.raw' : 'application/vnd.github.v3+json',
    };

    if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(`${fileUrl}?ref=${BRANCH}`, { headers });

    if (!response.ok) {
        if (response.status === 404) {
            // Return null to signal not found/empty
            return null;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    if (isRaw) {
        return await response.text();
    }
    return await response.json();
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    const type = searchParams.get('type'); // 'content' or 'list'

    try {
        const data = await fetchFromGitHub(path, type === 'content');

        if (data === null) {
            // Handle 404/Empty
            if (type === 'content') {
                return new NextResponse('File not found', { status: 404 });
            }
            // For list, return empty array (valid for empty folder/repo)
            return NextResponse.json([]);
        }

        if (type === 'content') {
            // Return text for file content
            return new NextResponse(data as string, {
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('GitHub Proxy Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
