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
     * Recursive search for markdown files
     */
    async findQuestionBanks(path: string = ''): Promise<GitHubFile[]> {
        const contents = await this.getContents(path);
        const results: GitHubFile[] = [];

        for (const item of contents) {
            if (item.type === 'file' && item.name.endsWith('.md')) {
                results.push(item);
            } else if (item.type === 'dir') {
                try {
                    const subContents = await this.findQuestionBanks(item.path);
                    results.push(...subContents);
                } catch (e) {
                    console.warn(`Skipping directory ${item.path}:`, e);
                }
            }
        }

        return results;
    }
}
