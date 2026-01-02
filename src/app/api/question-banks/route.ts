// API route for managing question banks stored on the file system

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BANKS_DIR = path.join(process.cwd(), 'data', 'question-banks');

// Ensure directory exists
function ensureDir() {
    if (!fs.existsSync(BANKS_DIR)) {
        fs.mkdirSync(BANKS_DIR, { recursive: true });
    }
}

// GET - List all question banks
export async function GET() {
    try {
        ensureDir();

        const files = fs.readdirSync(BANKS_DIR);
        const banks = files
            .filter(f => f.endsWith('.md'))
            .map(filename => {
                const filePath = path.join(BANKS_DIR, filename);
                const stats = fs.statSync(filePath);
                const content = fs.readFileSync(filePath, 'utf-8');

                // Count questions (look for ## Question pattern)
                const questionMatches = content.match(/##\s*Question\s*\d+/gi) || [];

                return {
                    id: filename.replace('.md', ''),
                    name: filename.replace('.md', '').replace(/_/g, ' '),
                    filename,
                    questionCount: questionMatches.length,
                    createdAt: stats.birthtime.toISOString(),
                    modifiedAt: stats.mtime.toISOString(),
                    size: stats.size,
                };
            });

        return NextResponse.json({ banks });
    } catch (error) {
        console.error('Error listing question banks:', error);
        return NextResponse.json({ error: 'Failed to list question banks' }, { status: 500 });
    }
}

// POST - Upload a new question bank
export async function POST(request: NextRequest) {
    try {
        ensureDir();

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Sanitize filename
        let filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!filename.endsWith('.md')) {
            filename += '.md';
        }

        // Check for duplicates and add number if needed
        let finalFilename = filename;
        let counter = 1;
        while (fs.existsSync(path.join(BANKS_DIR, finalFilename))) {
            const baseName = filename.replace('.md', '');
            finalFilename = `${baseName}_${counter}.md`;
            counter++;
        }

        const content = await file.text();
        const filePath = path.join(BANKS_DIR, finalFilename);

        fs.writeFileSync(filePath, content, 'utf-8');

        // Count questions
        const questionMatches = content.match(/##\s*Question\s*\d+/gi) || [];

        return NextResponse.json({
            success: true,
            bank: {
                id: finalFilename.replace('.md', ''),
                name: finalFilename.replace('.md', '').replace(/_/g, ' '),
                filename: finalFilename,
                questionCount: questionMatches.length,
            },
        });
    } catch (error) {
        console.error('Error uploading question bank:', error);
        return NextResponse.json({ error: 'Failed to upload question bank' }, { status: 500 });
    }
}

// DELETE - Remove a question bank
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
        }

        const filePath = path.join(BANKS_DIR, filename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        fs.unlinkSync(filePath);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting question bank:', error);
        return NextResponse.json({ error: 'Failed to delete question bank' }, { status: 500 });
    }
}
