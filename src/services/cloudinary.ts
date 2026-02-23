/**
 * Client-side Cloudinary utilities for fetching simulation files.
 *
 * These functions run in the browser or in Next.js API routes to
 * dynamically load file contents from Cloudinary raw URLs.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CloudinaryFileRef {
    filename: string;
    cloudinaryUrl: string;
}

export interface FetchedFile {
    filename: string;
    content: string;
}

// ─── Fetch a single file's content from its Cloudinary URL ──────────────────

export async function fetchFileContent(url: string): Promise<string> {
    const response = await fetch(url, {
        cache: "no-store", // always get latest version
    });

    if (!response.ok) {
        throw new Error(
            `Failed to fetch file from Cloudinary: ${response.status} ${response.statusText}`,
        );
    }

    return response.text();
}

// ─── Fetch multiple simulation files in parallel ─────────────────────────────

export async function fetchSimulationFiles(
    files: CloudinaryFileRef[],
): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    const settled = await Promise.allSettled(
        files.map(async (file) => {
            const content = await fetchFileContent(file.cloudinaryUrl);
            return { filename: file.filename, content };
        }),
    );

    for (const result of settled) {
        if (result.status === "fulfilled") {
            results[result.value.filename] = result.value.content;
        } else {
            console.error("Failed to fetch simulation file:", result.reason);
        }
    }

    return results;
}
