figma.showUI(__html__, { width: 360, height: 480 });

function isTargetNode(node) {
  return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
}

function getTargetCount() {
  return figma.currentPage.selection.filter(isTargetNode).length;
}

function postSelectionState() {
  figma.ui.postMessage({
    type: 'selection-changed',
    count: getTargetCount()
  });
}

// 启动时同步一次当前选区状态
postSelectionState();

// 监听选区变化
figma.on('selectionchange', () => {
  postSelectionState();
});

function addFieldToFirstLine(description, field) {
  const original = description || '';

  // 空描述：直接写入字段
  if (original.trim() === '') {
    return field;
  }

  // 非空描述：新字段在第一行，原描述整体下移到第二行
  return `${field}\n${original}`;
}

// 从 description 中解析出 ID：后面的字段值
// 兼容中英文冒号；ID 不区分大小写；取该行 ID:/ID： 之后到行尾的内容
function extractIdFromDescription(description) {
  const text = description || '';
  if (!text.trim()) return '';

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/ID\s*[:：]\s*(.+)\s*$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

// 文件名安全化：去除 Windows / macOS 不允许的字符
function sanitizeFileName(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

async function handleApplyField(field) {
  const trimmed = (field || '').trim();
  if (!trimmed) {
    figma.notify('请输入自定义字段');
    return;
  }

  const selected = figma.currentPage.selection;
  const targets = selected.filter(isTargetNode);

  if (targets.length === 0) {
    figma.notify('请先选中至少一个组件或组件集');
    return;
  }

  let updatedCount = 0;
  for (const node of targets) {
    if ('description' in node) {
      node.description = addFieldToFirstLine(node.description, trimmed);
      updatedCount += 1;
    }
  }

  figma.notify(`已更新 ${updatedCount} 个组件的 Description 首行`);
}

async function handleExportSelection() {
  const selected = figma.currentPage.selection;
  const targets = selected.filter(isTargetNode);

  if (targets.length === 0) {
    figma.notify('请先选中至少一个组件或组件集');
    return;
  }

  const files = [];
  const usedNames = new Set();
  let missingIdCount = 0;

  for (const node of targets) {
    const description = 'description' in node ? node.description : '';
    let id = extractIdFromDescription(description);

    if (!id) {
      missingIdCount += 1;
      // 没有 ID 字段：用节点名称兜底，避免直接丢弃
      id = node.name || 'untitled';
    }

    let fileName = sanitizeFileName(id);
    if (!fileName) fileName = 'untitled';

    // 去重：相同 ID 的组件追加序号
    let finalName = fileName;
    let dupIndex = 1;
    while (usedNames.has(finalName)) {
      dupIndex += 1;
      finalName = `${fileName}-${dupIndex}`;
    }
    usedNames.add(finalName);

    try {
      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 }
      });
      files.push({ name: `${finalName}.png`, bytes });
    } catch (err) {
      console.error('导出失败:', node.name, err);
    }
  }

  if (files.length === 0) {
    figma.notify('没有可导出的组件');
    figma.ui.postMessage({ type: 'export-finished' });
    return;
  }

  figma.ui.postMessage({ type: 'download-files', files });

  let tip = `已导出 ${files.length} 个组件 PNG`;
  if (missingIdCount > 0) {
    tip += `（${missingIdCount} 个未在 Description 中找到 ID，使用节点名作为文件名）`;
  }
  figma.notify(tip);
}

async function handleExportJson() {
  const selected = figma.currentPage.selection;
  const targets = selected.filter(isTargetNode);

  if (targets.length === 0) {
    figma.notify('请先选中至少一个组件或组件集');
    figma.ui.postMessage({ type: 'export-finished' });
    return;
  }

  const result = {};
  const usedKeys = new Set();
  let missingIdCount = 0;
  let missingLinkCount = 0;

  for (const node of targets) {
    const description = 'description' in node ? node.description : '';
    let id = extractIdFromDescription(description);

    if (!id) {
      missingIdCount += 1;
      id = node.name || 'untitled';
    }

    // 同一 key 已存在时追加 -2、-3 后缀，避免静默覆盖
    let key = id;
    let dupIndex = 1;
    while (usedKeys.has(key)) {
      dupIndex += 1;
      key = `${id}-${dupIndex}`;
    }
    usedKeys.add(key);

    // documentationLinks：Component configuration 面板中的 Link
    const links = ('documentationLinks' in node && Array.isArray(node.documentationLinks))
      ? node.documentationLinks
      : [];
    const firstLink = links.length > 0 && links[0] ? (links[0].uri || '') : '';
    if (!firstLink) missingLinkCount += 1;

    result[key] = firstLink;
  }

  const jsonStr = JSON.stringify(result, null, 2);

  figma.ui.postMessage({
    type: 'download-json',
    fileName: 'tag2json-dict.json',
    content: jsonStr
  });

  let tip = `已导出 ${Object.keys(result).length} 个组件的 JSON`;
  const extras = [];
  if (missingIdCount > 0) extras.push(`${missingIdCount} 个缺少 ID，使用节点名兜底`);
  if (missingLinkCount > 0) extras.push(`${missingLinkCount} 个未设置 Link`);
  if (extras.length > 0) tip += `（${extras.join('；')}）`;
  figma.notify(tip);
}

figma.ui.onmessage = async (msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === 'apply-field') {
    await handleApplyField(msg.field);
    return;
  }

  if (msg.type === 'export-selection') {
    await handleExportSelection();
    return;
  }

  if (msg.type === 'export-json') {
    await handleExportJson();
    return;
  }
};