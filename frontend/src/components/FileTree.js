// FileTree - Collapsible file tree for multi-file project display
// Shows project structure with icons, click to select, streaming indicators

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Language/file icon mapping
const FILE_ICONS = {
  js: '📄', jsx: '⚛️', ts: '📘', tsx: '⚛️',
  py: '🐍', html: '🌐', css: '🎨', scss: '🎨',
  json: '📋', md: '📝', txt: '📄', yml: '⚙️', yaml: '⚙️',
  env: '🔒', gitignore: '🙈', dockerfile: '🐳',
  sql: '🗄️', sh: '🖥️', bat: '🖥️', ps1: '🖥️',
  toml: '⚙️', cfg: '⚙️', ini: '⚙️', xml: '📋',
  svg: '🖼️', png: '🖼️', jpg: '🖼️',
  default: '📄'
};

const FOLDER_ICON_OPEN = '📂';
const FOLDER_ICON_CLOSED = '📁';

/**
 * Get file icon based on extension
 */
const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
};

/**
 * Build a nested tree structure from flat file paths
 * Input: [{path: "src/App.js", ...}, {path: "src/index.css", ...}]
 * Output: nested tree with folders and files
 */
const buildTree = (files) => {
  const root = { name: '', children: {}, files: [] };

  for (const file of files) {
    // Guard against undefined/null paths
    if (!file?.path || typeof file.path !== 'string') continue;

    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];
      if (!current.children[folderName]) {
        current.children[folderName] = { name: folderName, children: {}, files: [] };
      }
      current = current.children[folderName];
    }

    current.files.push({
      ...file,
      name: parts[parts.length - 1]
    });
  }

  return root;
};

/**
 * TreeFolder - Collapsible folder node
 */
const TreeFolder = ({ name, node, depth, activeFile, onFileSelect, streamingFile, completedFiles }) => {
  const [expanded, setExpanded] = useState(true);

  const folderChildren = Object.entries(node.children);
  const hasContent = folderChildren.length > 0 || node.files.length > 0;

  if (!hasContent) return null;

  return (
    <div className="tree-folder">
      <div
        className="tree-item folder"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="tree-chevron">{expanded ? '▾' : '▸'}</span>
        <span className="tree-icon">{expanded ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED}</span>
        <span className="tree-name">{name}</span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="tree-children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Sub-folders first */}
            {folderChildren
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([childName, childNode]) => (
                <TreeFolder
                  key={childName}
                  name={childName}
                  node={childNode}
                  depth={depth + 1}
                  activeFile={activeFile}
                  onFileSelect={onFileSelect}
                  streamingFile={streamingFile}
                  completedFiles={completedFiles}
                />
              ))}

            {/* Files */}
            {node.files
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((file) => (
                <TreeFile
                  key={file.path}
                  file={file}
                  depth={depth + 1}
                  isActive={activeFile === file.path}
                  isStreaming={streamingFile === file.path}
                  isCompleted={completedFiles?.has(file.path)}
                  onSelect={() => onFileSelect(file.path)}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * TreeFile - Individual file node
 */
const TreeFile = ({ file, depth, isActive, isStreaming, isCompleted, onSelect }) => {
  return (
    <div
      className={`tree-item file ${isActive ? 'active' : ''} ${isStreaming ? 'streaming' : ''} ${isCompleted ? 'completed' : ''}`}
      style={{ paddingLeft: `${depth * 16 + 24}px` }}
      onClick={onSelect}
    >
      <span className="tree-icon">{getFileIcon(file.name)}</span>
      <span className="tree-name">{file.name}</span>
      {isStreaming && <span className="tree-status streaming-dot">●</span>}
      {isCompleted && !isStreaming && <span className="tree-status">✓</span>}
      {file.lines > 0 && !isStreaming && (
        <span className="tree-meta">{file.lines}L</span>
      )}
    </div>
  );
};

/**
 * FileTree - Main component
 * 
 * Props:
 *   files: Array of {path, language, purpose, content, lines}
 *   activeFile: Currently selected file path
 *   onFileSelect: (path) => void
 *   streamingFile: File currently being generated (path)
 *   completedFiles: Set of completed file paths
 *   projectName: Name of the project
 */
const FileTree = ({
  files = [],
  activeFile,
  onFileSelect,
  streamingFile,
  completedFiles,
  projectName = 'Project'
}) => {
  const tree = useMemo(() => buildTree(files), [files]);

  const totalLines = useMemo(
    () => files.reduce((sum, f) => sum + (f.lines || 0), 0),
    [files]
  );

  const rootFolders = Object.entries(tree.children);
  const rootFiles = tree.files;

  return (
    <div className="file-tree">
      {/* Project header */}
      <div className="file-tree-header">
        <span className="project-icon">📦</span>
        <span className="project-name">{projectName}</span>
        <span className="project-meta">{files.length} files • {totalLines} lines</span>
      </div>

      {/* Tree content */}
      <div className="file-tree-content">
        {/* Root-level folders */}
        {rootFolders
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, node]) => (
            <TreeFolder
              key={name}
              name={name}
              node={node}
              depth={0}
              activeFile={activeFile}
              onFileSelect={onFileSelect}
              streamingFile={streamingFile}
              completedFiles={completedFiles}
            />
          ))}

        {/* Root-level files */}
        {rootFiles
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((file) => (
            <TreeFile
              key={file.path}
              file={file}
              depth={0}
              isActive={activeFile === file.path}
              isStreaming={streamingFile === file.path}
              isCompleted={completedFiles?.has(file.path)}
              onSelect={() => onFileSelect(file.path)}
            />
          ))}
      </div>
    </div>
  );
};

export default FileTree;
