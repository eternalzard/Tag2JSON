figma.showUI(__html__, { width: 360, height: 200 });

function isTargetNode(node) {
  return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
}

function addFieldToFirstLine(description, field) {
  const original = description || '';

  // 空描述：直接写入字段
  if (original.trim() === '') {
    return field;
  }

  // 非空描述：新字段在第一行，原描述整体下移到第二行
  return `${field}\n${original}`;
}

figma.ui.onmessage = (msg) => {
  if (msg.type !== 'apply-field') return;

  const field = (msg.field || '').trim();
  if (!field) {
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
      node.description = addFieldToFirstLine(node.description, field);
      updatedCount += 1;
    }
  }

  figma.notify(`已更新 ${updatedCount} 个组件的 Description 首行`);
};