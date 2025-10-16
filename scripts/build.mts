#!/usr/bin/env bun

import { promises as fs } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dirent } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '..') as string;
const SRC_DIR = join(ROOT_DIR, 'src') as string;
const DIST_DIR = join(ROOT_DIR, 'dist') as string;

const CONFIG = {
  MAX_DEPTH: 5,
  INCLUDE_REGEX: /::: include ([^\n]+)\n:::/g,
  PRIVATE_PREFIX: '_',
  MARKDOWN_EXT: '.md',
} as const;

/**
 * Represents the parsed parameters from an include directive.
 * The `path` parameter is required, others are optional key-value pairs for substitution.
 */
type IncludeOptions = {
  readonly path: string;
} & Record<string, string>;

/**
 * Context for processing includes, tracking recursion depth and circular references.
 */
interface ProcessingContext {
  readonly filePath: string;
  readonly includeStack: readonly string[];
  readonly depth: number;
}

/**
 * Represents a matched include directive in the source content.
 */
interface IncludeMatch {
  readonly start: number;
  readonly end: number;
  readonly paramsStr: string;
}

/**
 * Custom error types for better error handling and type safety.
 */
class BuildError extends Error {
  constructor(message: string, public readonly code: string, public readonly filePath?: string) {
    super(message);
    this.name = 'BuildError';
  }
}

class IncludeError extends BuildError {
  constructor(message: string, filePath: string, public readonly includePath: string) {
    super(message, 'INCLUDE_ERROR', filePath);
    this.name = 'IncludeError';
  }
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 * Uses `fs.access` for existence check to avoid unnecessary mkdir operations.
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Parses include directive parameters from a parameter string.
 * Expected format: `key1="value1" key2="value2" path="required/path.md"`
 *
 * @throws {BuildError} If required `path` parameter is missing
 */
function parseIncludeParams(paramsStr: string): IncludeOptions {
  const params = {} as Record<string, string>;
  const paramRegex = /(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = paramRegex.exec(paramsStr)) !== null) {
    const [, key, value] = match;
    params[key] = value;
  }

  if (!params.path) {
    throw new BuildError(
      `Include block missing required 'path' parameter: ${paramsStr}`,
      'MISSING_PATH_PARAM'
    );
  }

  return params as IncludeOptions;
}

/**
 * Reads a fragment file and returns its content.
 *
 * @throws {IncludeError} If the fragment file cannot be read
 */
async function readFragment(fragmentPath: string): Promise<string> {
  try {
    return await fs.readFile(fragmentPath, 'utf-8');
  } catch (error) {
    throw new IncludeError(
      `Fragment not found: ${fragmentPath}`,
      'unknown',
      fragmentPath
    );
  }
}

/**
 * Substitutes parameters in content using {{key}} placeholders.
 * Performs global replacement for each parameter key.
 */
function substituteParams(content: string, params: Omit<IncludeOptions, 'path'>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(
      new RegExp(`{{${key}}}`, 'g'),
      value
    ),
    content
  );
}

/**
 * Processes include directives in content recursively.
 * Handles nested includes, circular reference detection, and parameter substitution.
 *
 * @throws {BuildError} For depth limits, circular references, or processing errors
 */
async function processIncludes(content: string, context: ProcessingContext): Promise<string> {
  if (context.depth > CONFIG.MAX_DEPTH) {
    throw new BuildError(
      `Include depth limit (${CONFIG.MAX_DEPTH}) exceeded in ${context.filePath}`,
      'DEPTH_LIMIT_EXCEEDED',
      context.filePath
    );
  }

  // Find all include directives in the content
  const includes = extractIncludes(content);

  if (includes.length === 0) {
    return content;
  }

  // Process includes and build result
  let result = '';
  let currentPos = 0;

  for (const include of includes) {
    // Add content before this include
    result += content.substring(currentPos, include.start);

    try {
      const processedInclude = await processSingleInclude(include, context);
      result += processedInclude;
    } catch (error) {
      throw new BuildError(
        `Include processing failed in ${context.filePath}: ${(error as Error).message}`,
        'INCLUDE_PROCESSING_FAILED',
        context.filePath
      );
    }

    currentPos = include.end;
  }

  // Add remaining content
  result += content.substring(currentPos);

  return result;
}

/**
 * Extracts all include directives from content and returns their positions.
 */
function extractIncludes(content: string): readonly IncludeMatch[] {
  const includes: IncludeMatch[] = [];
  const regex = new RegExp(CONFIG.INCLUDE_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    includes.push({
      start: match.index,
      end: match.index + match[0].length,
      paramsStr: match[1]
    } as const);
  }

  return includes;
}

/**
 * Processes a single include directive and returns the processed content.
 */
async function processSingleInclude(include: IncludeMatch, context: ProcessingContext): Promise<string> {
  const params = parseIncludeParams(include.paramsStr);
  const fragmentPath = resolve(ROOT_DIR, 'src', params.path);

  // Check for circular reference
  if (context.includeStack.includes(fragmentPath)) {
    throw new BuildError(
      `Circular include detected: ${fragmentPath} in ${context.filePath}`,
      'CIRCULAR_REFERENCE',
      context.filePath
    );
  }

  // Create new context for nested processing
  const newContext: ProcessingContext = {
    filePath: context.filePath,
    includeStack: [...context.includeStack, fragmentPath],
    depth: context.depth + 1,
  };

  // Read and process fragment
  const fragmentContent = await readFragment(fragmentPath);
  const processedFragment = await processIncludes(fragmentContent, newContext);

  // Remove 'path' from params before substitution and apply parameter substitution
  const { path: _, ...substitutionParams } = params;
  return substituteParams(processedFragment, substitutionParams);
}

/**
 * Processes a single file, applying include processing for Markdown files.
 * Non-Markdown files are copied as-is.
 */
async function processFile(srcPath: string, destPath: string): Promise<void> {
  const content = await fs.readFile(srcPath, 'utf-8');

  if (srcPath.endsWith(CONFIG.MARKDOWN_EXT)) {
    // Process includes for markdown files
    const context: ProcessingContext = {
      filePath: srcPath,
      includeStack: [],
      depth: 0,
    };

    const processedContent = await processIncludes(content, context);
    await fs.writeFile(destPath, processedContent);
  } else {
    // Copy non-markdown files as-is
    await fs.copyFile(srcPath, destPath);
  }
}

/**
 * Recursively copies and processes files from source to destination directory.
 * Skips files and directories starting with the private prefix.
 */
async function copyFiles(srcDir: string, destDir: string): Promise<void> {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  // Process entries concurrently for better performance
  await Promise.all(
    entries.map(async (entry: Dirent) => {
      const srcPath = join(srcDir, entry.name);

      // Skip private files and directories
      if (entry.name.startsWith(CONFIG.PRIVATE_PREFIX)) {
        return;
      }

      const destPath = join(destDir, entry.name);

      if (entry.isDirectory()) {
        await ensureDir(destPath);
        await copyFiles(srcPath, destPath);
      } else {
        await processFile(srcPath, destPath);
      }
    })
  );
}

/**
 * Removes the dist directory and all its contents.
 * Gracefully handles the case where the directory doesn't exist.
 */
async function cleanDist(): Promise<void> {
  try {
    await fs.rm(DIST_DIR, { recursive: true, force: true });
  } catch {
    // Directory doesn't exist, that's fine
  }
}

/**
 * Main build function that orchestrates the entire build process.
 * Provides comprehensive error handling and user feedback.
 */
async function build(): Promise<void> {
  console.log('🚀 Starting build process...');

  const startTime = performance.now();

  try {
    // Clean dist directory
    await cleanDist();

    // Ensure dist directory exists
    await ensureDir(DIST_DIR);

    // Copy and process files
    await copyFiles(SRC_DIR, DIST_DIR);

    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`✅ Build completed successfully in ${duration}ms!`);

  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);

    if (error instanceof BuildError) {
      console.error(`❌ Build failed (${error.code}) in ${duration}ms:`, error.message);
      if (error.filePath) {
        console.error(`   File: ${error.filePath}`);
      }
    } else {
      console.error(`❌ Build failed in ${duration}ms:`, (error as Error).message);
    }

    process.exit(1);
  }
}

// Run build if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export { build, type IncludeOptions, type ProcessingContext };