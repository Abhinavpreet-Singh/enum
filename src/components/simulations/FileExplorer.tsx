"use client";

import { useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import type { FileNode } from "@/types/simulation";

interface FileExplorerProps {
  tree: FileNode[];
  activeFilePath: string | null;
  onFileSelect: (path: string) => void;
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  activeFilePath: string | null;
  onFileSelect: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
}

function getFileIcon(name: string): string {
  if (name.endsWith(".js")) return "text-yellow-500";
  if (name.endsWith(".ts")) return "text-blue-500";
  if (name.endsWith(".json")) return "text-green-500";
  if (name.endsWith(".md")) return "text-gray-400";
  if (name.endsWith(".env")) return "text-orange-400";
  return "text-gray-500";
}

function TreeNode({
  node,
  depth,
  activeFilePath,
  onFileSelect,
  expandedFolders,
  toggleFolder,
}: TreeNodeProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.path);
  const isActive = node.path === activeFilePath;

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(node.path);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1.5 py-1 pr-2 text-left text-sm transition-colors rounded-sm ${
          isActive
            ? "bg-gray-200 text-black font-medium"
            : "text-gray-700 hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-gray-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-gray-500 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileText className={`w-4 h-4 shrink-0 ${getFileIcon(node.name)}`} />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFilePath={activeFilePath}
              onFileSelect={onFileSelect}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer({
  tree,
  activeFilePath,
  onFileSelect,
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Auto-expand all folders on mount
    const expanded = new Set<string>();
    const walk = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "folder") {
          expanded.add(node.path);
          if (node.children) walk(node.children);
        }
      }
    };
    walk(tree);
    return expanded;
  });

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-3 py-2 border-b border-gray-200">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Explorer
        </p>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
          />
        ))}
      </div>
    </div>
  );
}
