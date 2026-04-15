export interface GitHubFile {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: 'file' | 'dir';
}

export class GitHubService {
    // Config properties are now less relevant as they are hardcoded on server,
    // but we keep them to satisfy existing interface or for debugging context if needed.
    private owner: string;
    private repo: string;
    private branch: string;

    constructor(owner: string, repo: string, branch: string = 'main') {
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
    }

    /**
     * Fetch contents of a path via proxy
     */
    async getContents(path: string = ''): Promise<GitHubFile[]> {
        try {
            const response = await fetch(`/api/github?path=${encodeURIComponent(path)}&type=list`);

            if (!response.ok) {
                throw new Error('Failed to fetch via proxy');
            }

            const data = await response.json();
            return Array.isArray(data) ? data : [data];
        } catch (error) {
            console.error('Failed to fetch GitHub contents:', error);
            throw error;
        }
    }

    /**
     * Fetch raw content of a file via proxy
     */
    async getFileContent(path: string): Promise<string> {
        try {
            const response = await fetch(`/api/github?path=${encodeURIComponent(path)}&type=content`);

            if (!response.ok) {
                throw new Error('Failed to fetch via proxy');
            }

            return await response.text();
        } catch (error) {
            console.error('Failed to fetch file content:', error);
            throw error;
        }
    }

    /**
     * Load the full question-bank manifest from the server-side cached endpoint.
     * Returns a normalized {files, lastSynced} pair. Prefer this over
     * `findQuestionBanks` — it collapses what used to be N recursive GitHub
     * contents calls into a single cached Trees-API read.
     */
    async loadManifest(): Promise<{ files: GitHubFile[]; lastSynced: string }> {
        const response = await fetch('/api/github?type=manifest');
        if (!response.ok) {
            throw new Error('Failed to load manifest');
        }
        const data = await response.json();
        return { files: data.files, lastSynced: data.lastSynced };
    }

    /**
     * Recursive search for markdown files
     */
    async findQuestionBanks(path: string = ''): Promise<GitHubFile[]> {
        const contents = await this.getContents(path);

        const files = contents.filter(item => item.type === 'file' && item.name.endsWith('.md'));
        const dirs = contents.filter(item => item.type === 'dir');

        // Fetch all subdirectories in parallel instead of sequentially
        const subResults = await Promise.all(
            dirs.map(dir =>
                this.findQuestionBanks(dir.path).catch(e => {
                    console.warn(`Skipping directory ${dir.path}:`, e);
                    return [] as GitHubFile[];
                })
            )
        );

        return [...files, ...subResults.flat()];
    }
}
