
import fs from 'fs/promises';
import path from 'path';

// Files with these extensions will be read and embedded.
const INCLUDE_EXTENSIONS = ['.js', '.mjs', '.ts', '.tsx', '.json', '.md', '.css', '.html'];
// Directories to exclude from the scan.
const EXCLUDE_DIRECTORIES = ['node_modules', '.next', '.git', 'out', 'dist', 'postgres-data', '.idx'];

async function main() {
  console.log('Starting project embedding process...');

  const projectRoot = process.cwd();
  const memory = {};

  async function scanDirectory(directory) {
    try {
      const items = await fs.readdir(directory, { withFileTypes: true });
      for (const item of items) {
        if (EXCLUDE_DIRECTORIES.includes(item.name)) {
          continue;
        }

        const fullPath = path.join(directory, item.name);
        if (item.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (INCLUDE_EXTENSIONS.includes(path.extname(item.name))) {
          try {
            const relativePath = path.relative(projectRoot, fullPath);
            console.log(`Embedding: ${relativePath}`);
            const content = await fs.readFile(fullPath, 'utf-8');
            memory[relativePath] = content;
          } catch (error) {
            // Log errors for individual file reads but continue the process
            console.error(`Error reading file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      // Log errors for directory reads but continue the process
      console.error(`Error scanning directory ${directory}:`, error);
    }
  }

  await scanDirectory(projectRoot);

  const memoryPath = path.join(projectRoot, '.idx');
  await fs.mkdir(memoryPath, { recursive: true });
  await fs.writeFile(path.join(memoryPath, 'project_memory.json'), JSON.stringify(memory, null, 2));

  console.log('Project embedding complete!');
  console.log('Memory saved to .idx/project_memory.json');
}

main().catch(console.error);
