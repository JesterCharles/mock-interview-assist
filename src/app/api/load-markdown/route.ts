// API route to load markdown files from the training folder or custom banks

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BANKS_DIR = path.join(process.cwd(), 'data', 'question-banks');

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    const customFilename = searchParams.get('custom');

    try {
        let fullPath: string;
        let allowedDir: string;

        if (customFilename) {
            // Load from custom question banks directory
            fullPath = path.join(BANKS_DIR, customFilename);
            allowedDir = BANKS_DIR;
        } else if (filePath) {
            // Load from curriculum training folder
            const projectRoot = process.cwd();
            const trainingDir = path.resolve(projectRoot, '..'); // Go up to training folder
            fullPath = path.join(trainingDir, filePath);
            allowedDir = trainingDir;
        } else {
            return NextResponse.json({ error: 'Path or custom parameter required' }, { status: 400 });
        }

        // Security: Ensure the path is within the allowed directory
        const normalizedFullPath = path.normalize(fullPath);
        const normalizedAllowedDir = path.normalize(allowedDir);

        if (!normalizedFullPath.startsWith(normalizedAllowedDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
        }

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            console.error('File not found:', fullPath);
            return NextResponse.json({
                error: 'File not found',
                searchedPath: fullPath,
            }, { status: 404 });
        }

        // Read and return the file content
        const content = fs.readFileSync(fullPath, 'utf-8');

        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    } catch (error) {
        console.error('Error loading markdown file:', error);
        return NextResponse.json({ error: 'Failed to load file', details: String(error) }, { status: 500 });
    }
}
