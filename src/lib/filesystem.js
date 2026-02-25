// Helper to natural sort strings (alphanumeric)
const naturalSort = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }).compare;

/**
 * Processes a list of items into tree and sorted flat list.
 * Can accept:
 * 1. Raw FileList (from input)
 * 2. Array of pre-processed objects (from DB)
 */
export function processFilesForPlayer(inputList) {
  let fileArray = [];

  // Normalize input
  if (inputList instanceof FileList || (Array.isArray(inputList) && inputList[0] instanceof File)) {
    // Case 1: Raw Files
    fileArray = Array.from(inputList).map((f) => {
      const fullPath = f.webkitRelativePath || f.name;
      return {
        originalFile: f,
        path: fullPath,
        name: f.name,
        id: `${fullPath}-${f.size}-${f.lastModified}`,
      };
    });
  } else if (Array.isArray(inputList)) {
    // Case 2: Already processed/DB objects
    // Expects { id, name, path, file }
    fileArray = inputList.map((item) => ({
      originalFile: item.file || item.originalFile, // Handle both DB format and internal format
      path: item.path,
      name: item.name,
      id: item.id,
      url: item.url,
    }));
  }

  // Filter Audio
  const audioFiles = fileArray.filter((f) => {
    const type = f.originalFile?.type || '';
    const name = f.name || '';
    return type.startsWith('audio/') || name.match(/\.(mp3|wav|m4a|aac|ogg)$/i);
  });

  // 1. Build Tree
  const root = { name: 'Root', path: '', type: 'folder', children: [] };

  audioFiles.forEach((fileObj) => {
    const parts = fileObj.path.split('/');
    let currentLevel = root.children;

    for (let i = 0; i < parts.length - 1; i++) {
      const partName = parts[i];
      let folder = currentLevel.find((n) => n.type === 'folder' && n.name === partName);
      if (!folder) {
        folder = {
          name: partName,
          path: parts.slice(0, i + 1).join('/'),
          type: 'folder',
          children: [],
        };
        currentLevel.push(folder);
      }
      currentLevel = folder.children;
    }

    fileObj.parentFolder = parts.length > 1 ? parts[parts.length - 2] : 'Root';

    currentLevel.push({
      name: parts[parts.length - 1],
      path: fileObj.path,
      type: 'file',
      fileData: fileObj,
    });
  });

  // 2. Sort & Flatten
  const flatList = [];

  function sortAndFlatten(nodes) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return naturalSort(a.name, b.name);
    });

    nodes.forEach((node) => {
      if (node.type === 'folder') {
        sortAndFlatten(node.children);
      } else {
        flatList.push(node.fileData);
      }
    });
  }

  sortAndFlatten(root.children);

  return { sortedFiles: flatList, fileTree: root.children };
}
