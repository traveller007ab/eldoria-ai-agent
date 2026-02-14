import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';

interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  mimeType: string;
  projectId?: string;
}

export class FileStorageService {
  private storageRoot: string;
  private maxFileSize: number;

  constructor() {
    // Use the upload directory from environment or default
    this.storageRoot = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760', 10); // 10MB default
    
    // Ensure storage directory exists
    this.ensureStorageDirectory();
    
    logger.info(`📁 File storage service initialized (root: ${this.storageRoot})`);
  }

  private ensureStorageDirectory(): void {
    try {
      if (!fs.existsSync(this.storageRoot)) {
        fs.mkdirSync(this.storageRoot, { recursive: true });
      }
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
      throw new Error('Could not initialize file storage');
    }
  }

  private getProjectDirectory(projectId: string): string {
    return path.join(this.storageRoot, projectId);
  }

  private ensureProjectDirectory(projectId: string): void {
    const projectDir = this.getProjectDirectory(projectId);
    try {
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }
    } catch (error) {
      logger.error(`Failed to create project directory for ${projectId}:`, error);
      throw new Error(`Could not create project directory: ${projectId}`);
    }
  }

  private generateSafeFilename(originalName: string): string {
    // Remove special characters and spaces
    const safeName = originalName.replace(/[^a-zA-Z0-9\.\-]/g, '_');
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext);
    
    // Add UUID to prevent collisions
    return `${base}_${uuidv4().substring(0, 8)}${ext}`;
  }

  private getFileMetadata(filePath: string, projectId?: string): FileMetadata {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    
    return {
      id: uuidv4(),
      name: fileName,
      path: filePath,
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      mimeType: this.getMimeType(fileName),
      projectId,
    };
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.py': 'text/x-python',
      '.js': 'application/javascript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.md': 'text/markdown',
      '.bib': 'application/x-bibtex',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private validateFileSize(size: number): void {
    if (size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize / 1048576}MB`);
    }
  }

  private validateFilePath(filePath: string, projectId?: string): void {
    // Security: Ensure the file path is within the allowed storage directory
    const fullPath = path.resolve(filePath);
    const storagePath = projectId 
      ? path.resolve(this.getProjectDirectory(projectId))
      : path.resolve(this.storageRoot);
    
    if (!fullPath.startsWith(storagePath)) {
      throw new Error('File access outside allowed directory');
    }
  }

  async writeFile(
    projectId: string,
    filePath: string,
    content: string,
    options: { overwrite?: boolean } = {}
  ): Promise<FileMetadata> {
    try {
      this.ensureProjectDirectory(projectId);
      
      // Resolve full path
      const fullPath = path.join(this.getProjectDirectory(projectId), filePath);
      const dir = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Check if file exists and overwrite is not allowed
      if (fs.existsSync(fullPath) && !options.overwrite) {
        throw new Error(`File already exists: ${filePath}`);
      }
      
      // Validate file size
      this.validateFileSize(Buffer.byteLength(content, 'utf8'));
      
      // Write file
      fs.writeFileSync(fullPath, content, 'utf8');
      
      return this.getFileMetadata(fullPath, projectId);
    } catch (error) {
      logger.error(`Failed to write file ${filePath}:`, error);
      throw error instanceof Error ? error : new Error('File write failed');
    }
  }

  async readFile(projectId: string, filePath: string): Promise<{ content: string; metadata: FileMetadata }> {
    try {
      const fullPath = path.join(this.getProjectDirectory(projectId), filePath);
      
      // Validate path security
      this.validateFilePath(fullPath, projectId);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Read file
      const content = fs.readFileSync(fullPath, 'utf8');
      const metadata = this.getFileMetadata(fullPath, projectId);
      
      return { content, metadata };
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error);
      throw error instanceof Error ? error : new Error('File read failed');
    }
  }

  async uploadFile(
    projectId: string,
    file: { name: string; content: Buffer },
    options: { overwrite?: boolean; subDirectory?: string } = {}
  ): Promise<FileMetadata> {
    try {
      this.ensureProjectDirectory(projectId);
      
      // Validate file size
      this.validateFileSize(file.content.length);
      
      // Generate safe filename
      const safeFilename = this.generateSafeFilename(file.name);
      
      // Determine target directory
      const targetDir = options.subDirectory 
        ? path.join(this.getProjectDirectory(projectId), options.subDirectory)
        : this.getProjectDirectory(projectId);
      
      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      const filePath = path.join(targetDir, safeFilename);
      
      // Check if file exists and overwrite is not allowed
      if (fs.existsSync(filePath) && !options.overwrite) {
        throw new Error(`File already exists: ${safeFilename}`);
      }
      
      // Write file
      fs.writeFileSync(filePath, file.content);
      
      return this.getFileMetadata(filePath, projectId);
    } catch (error) {
      logger.error(`Failed to upload file ${file.name}:`, error);
      throw error instanceof Error ? error : new Error('File upload failed');
    }
  }

  async deleteFile(projectId: string, filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.getProjectDirectory(projectId), filePath);
      
      // Validate path security
      this.validateFilePath(fullPath, projectId);
      
      if (!fs.existsSync(fullPath)) {
        return false;
      }
      
      // Delete file
      fs.unlinkSync(fullPath);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error);
      throw error instanceof Error ? error : new Error('File deletion failed');
    }
  }

  async listFiles(projectId: string, subDirectory: string = ''): Promise<FileMetadata[]> {
    try {
      const targetDir = subDirectory 
        ? path.join(this.getProjectDirectory(projectId), subDirectory)
        : this.getProjectDirectory(projectId);
      
      // Validate path security
      this.validateFilePath(targetDir, projectId);
      
      if (!fs.existsSync(targetDir)) {
        return [];
      }
      
      const files = fs.readdirSync(targetDir);
      
      return files.map(file => {
        const filePath = path.join(targetDir, file);
        return this.getFileMetadata(filePath, projectId);
      });
    } catch (error) {
      logger.error(`Failed to list files in ${subDirectory}:`, error);
      throw error instanceof Error ? error : new Error('File listing failed');
    }
  }

  async createDirectory(projectId: string, dirPath: string): Promise<FileMetadata> {
    try {
      const fullPath = path.join(this.getProjectDirectory(projectId), dirPath);
      
      // Validate path security
      this.validateFilePath(fullPath, projectId);
      
      if (fs.existsSync(fullPath)) {
        throw new Error(`Directory already exists: ${dirPath}`);
      }
      
      // Create directory
      fs.mkdirSync(fullPath, { recursive: true });
      
      return this.getFileMetadata(fullPath, projectId);
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}:`, error);
      throw error instanceof Error ? error : new Error('Directory creation failed');
    }
  }

  async fileExists(projectId: string, filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.getProjectDirectory(projectId), filePath);
      
      // Validate path security
      this.validateFilePath(fullPath, projectId);
      
      return fs.existsSync(fullPath);
    } catch (error) {
      logger.error(`Failed to check file existence ${filePath}:`, error);
      return false;
    }
  }

  async getFileInfo(projectId: string, filePath: string): Promise<FileMetadata | null> {
    try {
      const fullPath = path.join(this.getProjectDirectory(projectId), filePath);
      
      // Validate path security
      this.validateFilePath(fullPath, projectId);
      
      if (!fs.existsSync(fullPath)) {
        return null;
      }
      
      return this.getFileMetadata(fullPath, projectId);
    } catch (error) {
      logger.error(`Failed to get file info for ${filePath}:`, error);
      return null;
    }
  }

  async searchFiles(
    projectId: string,
    searchTerm: string,
    options: { subDirectory?: string; caseSensitive?: boolean } = {}
  ): Promise<FileMetadata[]> {
    try {
      const targetDir = options.subDirectory 
        ? path.join(this.getProjectDirectory(projectId), options.subDirectory)
        : this.getProjectDirectory(projectId);
      
      // Validate path security
      this.validateFilePath(targetDir, projectId);
      
      if (!fs.existsSync(targetDir)) {
        return [];
      }
      
      const searchRegex = new RegExp(
        options.caseSensitive ? searchTerm : searchTerm,
        options.caseSensitive ? 'g' : 'gi'
      );
      
      const allFiles = await this.listFiles(projectId, options.subDirectory);
      
      return allFiles.filter(file => 
        searchRegex.test(file.name) || 
        (file.metadata && searchRegex.test(JSON.stringify(file.metadata)))
      );
    } catch (error) {
      logger.error(`Failed to search files for "${searchTerm}":`, error);
      return [];
    }
  }

  cleanupOldFiles(maxAgeDays: number = 30): void {
    try {
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      
      if (fs.existsSync(this.storageRoot)) {
        const projects = fs.readdirSync(this.storageRoot);
        
        projects.forEach(project => {
          const projectPath = path.join(this.storageRoot, project);
          
          if (fs.statSync(projectPath).isDirectory()) {
            this.cleanupProjectFiles(project, maxAgeDays);
          }
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
    }
  }

  private cleanupProjectFiles(projectId: string, maxAgeDays: number): void {
    try {
      const projectPath = this.getProjectDirectory(projectId);
      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      
      if (fs.existsSync(projectPath)) {
        const files = this.walkDirectory(projectPath);
        
        files.forEach(file => {
          const stats = fs.statSync(file);
          
          if (now - stats.mtimeMs > maxAgeMs) {
            try {
              fs.unlinkSync(file);
              logger.info(`🗑️ Cleaned up old file: ${file}`);
            } catch (error) {
              logger.warn(`Failed to cleanup old file ${file}:`, error);
            }
          }
        });
      }
    } catch (error) {
      logger.error(`Failed to cleanup files for project ${projectId}:`, error);
    }
  }

  private walkDirectory(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...this.walkDirectory(fullPath));
        } else {
          files.push(fullPath);
        }
      });
    } catch (error) {
      logger.error(`Failed to walk directory ${dir}:`, error);
    }
    
    return files;
  }

  getStorageInfo(): {
    rootDirectory: string;
    maxFileSizeMb: number;
    usedSpaceMb: number;
    totalSpaceMb: number;
  } {
    try {
      const stats = fs.statfsSync(this.storageRoot);
      const usedSpace = this.calculateDirectorySize(this.storageRoot);
      
      return {
        rootDirectory: this.storageRoot,
        maxFileSizeMb: this.maxFileSize / 1048576,
        usedSpaceMb: usedSpace / 1048576,
        totalSpaceMb: (stats.bsize * stats.blocks) / 1048576,
      };
    } catch (error) {
      logger.error('Failed to get storage info:', error);
      return {
        rootDirectory: this.storageRoot,
        maxFileSizeMb: this.maxFileSize / 1048576,
        usedSpaceMb: 0,
        totalSpaceMb: 0,
      };
    }
  }

  private calculateDirectorySize(directory: string): number {
    let totalSize = 0;
    
    try {
      const files = this.walkDirectory(directory);
      
      files.forEach(file => {
        try {
          totalSize += fs.statSync(file).size;
        } catch (error) {
          logger.warn(`Failed to get size for ${file}:`, error);
        }
      });
    } catch (error) {
      logger.error(`Failed to calculate directory size for ${directory}:`, error);
    }
    
    return totalSize;
  }

  async copyFile(
    projectId: string,
    sourcePath: string,
    destinationPath: string,
    options: { overwrite?: boolean } = {}
  ): Promise<FileMetadata> {
    try {
      const sourceFullPath = path.join(this.getProjectDirectory(projectId), sourcePath);
      const destFullPath = path.join(this.getProjectDirectory(projectId), destinationPath);
      
      // Validate paths
      this.validateFilePath(sourceFullPath, projectId);
      this.validateFilePath(destFullPath, projectId);
      
      if (!fs.existsSync(sourceFullPath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      
      if (fs.existsSync(destFullPath) && !options.overwrite) {
        throw new Error(`Destination file already exists: ${destinationPath}`);
      }
      
      // Ensure destination directory exists
      const destDir = path.dirname(destFullPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(sourceFullPath, destFullPath);
      
      return this.getFileMetadata(destFullPath, projectId);
    } catch (error) {
      logger.error(`Failed to copy file from ${sourcePath} to ${destinationPath}:`, error);
      throw error instanceof Error ? error : new Error('File copy failed');
    }
  }

  async moveFile(
    projectId: string,
    sourcePath: string,
    destinationPath: string,
    options: { overwrite?: boolean } = {}
  ): Promise<FileMetadata> {
    try {
      const sourceFullPath = path.join(this.getProjectDirectory(projectId), sourcePath);
      const destFullPath = path.join(this.getProjectDirectory(projectId), destinationPath);
      
      // Validate paths
      this.validateFilePath(sourceFullPath, projectId);
      this.validateFilePath(destFullPath, projectId);
      
      if (!fs.existsSync(sourceFullPath)) {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      
      if (fs.existsSync(destFullPath) && !options.overwrite) {
        throw new Error(`Destination file already exists: ${destinationPath}`);
      }
      
      // Ensure destination directory exists
      const destDir = path.dirname(destFullPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // Move file
      fs.renameSync(sourceFullPath, destFullPath);
      
      return this.getFileMetadata(destFullPath, projectId);
    } catch (error) {
      logger.error(`Failed to move file from ${sourcePath} to ${destinationPath}:`, error);
      throw error instanceof Error ? error : new Error('File move failed');
    }
  }
}